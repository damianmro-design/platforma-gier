import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-interrogations";
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

async function waitPhase(page, code, phase, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    if (state.status === 200 && state.body?.room?.phase === phase) return state.body;
    await page.waitForTimeout(200);
  }
  throw new Error(`Nie osiągnięto fazy ${phase}`);
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
  const roleIds = [];
  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`);
    players.push(page);
    await joinGuest(page, code, `E2E Przesłuchanie ${index + 1}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await host.getByRole("button", { name: "START GRY", exact: true }).click();
  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);

  for (const page of players) {
    const state = await readState(page, code);
    assert(state.status === 200 && state.body?.role === "player", "Brak stanu gracza podczas przygotowania");
    roleIds.push(state.body.roleCard.id);
    const opened = await postGame(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt podczas przygotowania");
  }

  let result = await postGame(host, code, "advance");
  assert(result.status === 200 && result.body?.phase === "pierwsze_zeznania", "Nie udało się wejść do pierwszych zeznań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się otworzyć Paczki A");

  for (let expectedCount = 2; expectedCount <= 4; expectedCount += 1) {
    result = await postGame(host, code, "revealEvidenceA");
    assert(result.status === 200, `Nie udało się ujawnić dowodu ${expectedCount}/4`);
    const state = await readState(host, code);
    assert(state.body?.evidence?.length === expectedCount, `Po przygotowaniu oczekiwano ${expectedCount} dowodów, jest ${state.body?.evidence?.length}`);
  }

  result = await postGame(host, code, "advance");
  assert(result.status === 200 && result.body?.phase === "przesluchania_a", `Nie udało się wejść do przesłuchań: ${JSON.stringify(result.body)}`);
  check("przygotowanie zakończone dokładnie na początku przesłuchań");

  await host.reload({ waitUntil: "domcontentloaded" });
  const hostState = await waitPhase(host, code, "przesluchania_a");
  assert(hostState.role === "host", "Prowadzący stracił rolę hosta w przesłuchaniach");
  assert(Array.isArray(hostState.evidence) && hostState.evidence.length === 4, "Prowadzący nie zachował 4 dowodów Paczki A");
  assert(Array.isArray(hostState.interrogations) && hostState.interrogations.length > 0, "Brak przygotowanych przesłuchań dla prowadzącego");

  const interrogationIds = hostState.interrogations.map(item => item.playerId);
  assert(new Set(interrogationIds).size === interrogationIds.length, "Lista przesłuchań zawiera tę samą osobę wielokrotnie");
  for (const item of hostState.interrogations) {
    assert(item.playerId && item.displayName, "Przesłuchanie nie wskazuje konkretnej osoby");
    assert(item.headline, `Brak nagłówka przesłuchania dla ${item.displayName}`);
    assert(Array.isArray(item.prompts) && item.prompts.length > 0, `Brak pytań dla ${item.displayName}`);
    assert(item.pressurePoint, `Brak punktu nacisku dla ${item.displayName}`);
  }

  const serializedHost = JSON.stringify(hostState);
  for (const forbiddenKey of ["privateSecret", "privateKnowledge", "culpritBriefing", "isCulprit"]) {
    assert(!serializedHost.includes(`\"${forbiddenKey}\"`), `Prowadzący otrzymał prywatne pole roli podczas przesłuchań: ${forbiddenKey}`);
  }
  check("prowadzący dostał konkretne pytania bez ujawnienia prywatnych ról", { interrogations: hostState.interrogations.length });

  await host.getByText("ETAP 03 · PRZESŁUCHANIA", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.getByRole("button", { name: "OTWÓRZ PACZKĘ DOWODOWĄ B →", exact: true }).waitFor({ state: "visible", timeout: 10000 });

  for (let index = 0; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    assert(state.status === 200 && state.body?.room?.phase === "przesluchania_a", `Gracz ${index + 1} nie jest w przesłuchaniach`);
    assert(state.body.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się podczas przesłuchań`);
    assert(state.body.evidence.length === 4, `Gracz ${index + 1} nie zachował 4 dowodów Paczki A`);
  }

  await players[0].getByText("Prowadzący będzie teraz zadawał bardziej precyzyjne pytania.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByRole("button", { name: "OTWÓRZ MOJE AKTA", exact: true }).waitFor({ state: "visible", timeout: 10000 });

  await host.screenshot({ path: `${artifacts}/01-host-interrogations.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-interrogations.png`, fullPage: true });
  check("przesłuchania są czytelne po obu stronach, Paczka B pozostaje nieotwarta");

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 INTERROGATIONS E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
