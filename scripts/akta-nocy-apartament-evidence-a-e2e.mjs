import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-evidence-a";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readState(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/akta-nocy/${roomCode}`, { cache: "no-store" });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  }, code);
}

async function postGame(page, code, action) {
  return page.evaluate(async ({ roomCode, actionName }) => {
    const response = await fetch(`/api/gra/akta-nocy/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  }, { roomCode: code, actionName: action });
}

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
}

async function waitEvidence(page, code, count, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    if (state.status === 200 && Array.isArray(state.body?.evidence) && state.body.evidence.length === count) {
      return state.body;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`Nie osiągnięto liczby ${count} dowodów`);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = { baseURL, roomCode: null, checks: [], errors };
const check = (label, details = null) => report.checks.push({ label, details, at: new Date().toISOString() });

function watch(page, label) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon") || text.includes("qrserver")) return;
    errors.push(`${label} console: ${text}`);
  });
}

try {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage();
  watch(host, "host");

  await host.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await host.getByRole("button", { name: "UTWÓRZ POKÓJ", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;

  const players = [];
  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`);
    players.push(page);
    await joinGuest(page, code, `E2E Paczka A ${index + 1}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await host.getByRole("button", { name: "START GRY", exact: true }).click();
  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);

  const roleIds = [];
  for (const page of players) {
    const state = await readState(page, code);
    roleIds.push(state.body?.roleCard?.id);
    const opened = await postGame(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt podczas przygotowania");
  }

  const statements = await postGame(host, code, "advance");
  assert(statements.body?.phase === "pierwsze_zeznania", `Nie udało się wejść do zeznań: ${JSON.stringify(statements.body)}`);
  const firstEvidence = await postGame(host, code, "advance");
  assert(firstEvidence.status === 200, "Nie udało się otworzyć Paczki A");
  const afterFirst = await waitEvidence(host, code, 1);
  assert(String(afterFirst.room.phase).startsWith("dowody_a_"), `Nieoczekiwana faza po 1 dowodzie: ${afterFirst.room.phase}`);
  check("przygotowanie kroku 4: Paczka A ma dokładnie 1 dowód", afterFirst.evidence[0]?.id);

  await host.reload({ waitUntil: "domcontentloaded" });

  const seenIds = new Set(afterFirst.evidence.map(item => item.id));
  for (const expectedCount of [2, 3, 4]) {
    const revealButton = host.getByRole("button", { name: "UJAWNIJ KOLEJNY DOWÓD →", exact: true });
    await revealButton.waitFor({ state: "visible", timeout: 10000 });
    await revealButton.click();
    const state = await waitEvidence(host, code, expectedCount);
    assert(String(state.room.phase).startsWith("dowody_a_"), `Gra opuściła Paczkę A przy ${expectedCount} dowodach`);
    assert(new Set(state.evidence.map(item => item.id)).size === expectedCount, `Dowody nie są unikalne przy liczbie ${expectedCount}`);
    for (const evidence of state.evidence) seenIds.add(evidence.id);

    for (let index = 0; index < players.length; index += 1) {
      const playerState = await waitEvidence(players[index], code, expectedCount);
      assert(playerState.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przy ${expectedCount} dowodach`);
      const hostIds = state.evidence.map(item => item.id).sort();
      const playerIds = playerState.evidence.map(item => item.id).sort();
      assert(JSON.stringify(hostIds) === JSON.stringify(playerIds), `Gracz ${index + 1} ma inny zestaw dowodów przy ${expectedCount} dokumentach`);
    }
    check(`ujawniono ${expectedCount}/4 dowody Paczki A na wszystkich urządzeniach`);
  }

  assert(seenIds.size === 4, `Oczekiwano 4 unikalnych dowodów Paczki A, jest ${seenIds.size}`);
  await host.screenshot({ path: `${artifacts}/01-complete-evidence-a.png`, fullPage: true });

  const interrogationButton = host.getByRole("button", { name: "ROZPOCZNIJ PRZESŁUCHANIA →", exact: true });
  await interrogationButton.waitFor({ state: "visible", timeout: 10000 });
  await interrogationButton.click();

  const deadline = Date.now() + 10000;
  let interrogationState = null;
  while (Date.now() < deadline) {
    const state = await readState(host, code);
    if (state.status === 200 && state.body?.room?.phase === "przesluchania_a") {
      interrogationState = state.body;
      break;
    }
    await host.waitForTimeout(200);
  }

  assert(interrogationState, "Gra nie przeszła do przesłuchań po pełnej Paczce A");
  assert(Array.isArray(interrogationState.evidence) && interrogationState.evidence.length === 4, "Po wejściu do przesłuchań zniknęły dowody Paczki A");
  assert(Array.isArray(interrogationState.interrogations) && interrogationState.interrogations.length > 0, "Prowadzący nie dostał listy przesłuchań");

  for (let index = 0; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    assert(state.body?.room?.phase === "przesluchania_a", `Gracz ${index + 1} nie przeszedł do przesłuchań`);
    assert(state.body.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przy wejściu do przesłuchań`);
    assert(state.body.evidence.length === 4, `Gracz ${index + 1} nie zachował 4 dowodów`);
  }

  await host.screenshot({ path: `${artifacts}/02-interrogations-start.png`, fullPage: true });
  check("pełna Paczka A prowadzi poprawnie do początku przesłuchań", { interrogations: interrogationState.interrogations.length });

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 EVIDENCE A E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
