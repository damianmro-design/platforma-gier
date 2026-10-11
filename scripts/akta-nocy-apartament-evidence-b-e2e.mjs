import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-evidence-b";
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

async function waitBCount(page, code, count, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    const b = state.body?.evidence?.filter?.(item => String(item.no || "").startsWith("B-")) ?? [];
    if (state.status === 200 && b.length === count) return state.body;
    await page.waitForTimeout(200);
  }
  throw new Error(`Nie osiągnięto ${count}/5 dowodów Paczki B`);
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
    await joinGuest(page, code, `E2E Paczka B pełna ${index + 1}`);
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
  assert(result.body?.phase === "pierwsze_zeznania", "Nie udało się przygotować pierwszych zeznań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się przygotować pierwszego dowodu A");
  for (let count = 2; count <= 4; count += 1) {
    result = await postGame(host, code, "revealEvidenceA");
    assert(result.status === 200, `Nie udało się przygotować dowodu A ${count}/4`);
  }
  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "przesluchania_a", "Nie udało się przygotować przesłuchań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się przygotować pierwszego dowodu B");

  const firstBState = await waitBCount(host, code, 1);
  assert(firstBState.evidence.filter(item => String(item.no || "").startsWith("A-")).length === 4, "Przy pierwszym dowodzie B brakuje Paczki A");
  check("przygotowanie zakończone na 1/5 dowodów Paczki B");

  await host.reload({ waitUntil: "domcontentloaded" });
  const seenB = new Set(firstBState.evidence.filter(item => String(item.no || "").startsWith("B-")).map(item => item.id));

  for (const expectedB of [2, 3, 4, 5]) {
    const reveal = host.getByRole("button", { name: "UJAWNIJ KOLEJNY DOWÓD →", exact: true });
    await reveal.waitFor({ state: "visible", timeout: 10000 });
    await reveal.click();

    const hostState = await waitBCount(host, code, expectedB);
    const hostA = hostState.evidence.filter(item => String(item.no || "").startsWith("A-"));
    const hostB = hostState.evidence.filter(item => String(item.no || "").startsWith("B-"));
    assert(hostA.length === 4, `Przy ${expectedB}/5 dowodach B zniknęła część Paczki A`);
    assert(hostB.length === expectedB, `Prowadzący nie ma ${expectedB}/5 dowodów B`);
    assert(new Set(hostB.map(item => item.id)).size === expectedB, `Dowody B nie są unikalne przy ${expectedB}/5`);
    hostB.forEach(item => seenB.add(item.id));

    for (let index = 0; index < players.length; index += 1) {
      const playerState = await waitBCount(players[index], code, expectedB);
      assert(playerState.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przy ${expectedB}/5 dowodach B`);
      assert(playerState.evidence.filter(item => String(item.no || "").startsWith("A-")).length === 4, `Gracz ${index + 1} stracił dowody A`);
      const playerB = playerState.evidence.filter(item => String(item.no || "").startsWith("B-")).map(item => item.id).sort();
      const expectedIds = hostB.map(item => item.id).sort();
      assert(JSON.stringify(playerB) === JSON.stringify(expectedIds), `Gracz ${index + 1} ma inny zestaw B przy ${expectedB}/5`);
    }
    check(`ujawniono ${expectedB}/5 dowodów Paczki B na wszystkich urządzeniach`);
  }

  assert(seenB.size === 5, `Oczekiwano 5 unikalnych dowodów B, jest ${seenB.size}`);
  const finalState = await readState(host, code);
  assert(finalState.body?.evidence?.length === 9, `Po pełnej Paczce B powinno być łącznie 9 dowodów, jest ${finalState.body?.evidence?.length}`);
  assert(String(finalState.body?.room?.phase || "").startsWith("dowody_b_"), "Gra przeszła do rekonstrukcji bez kliknięcia prowadzącego");

  const reconstructionButton = host.getByRole("button", { name: "ROZPOCZNIJ REKONSTRUKCJĘ →", exact: true });
  await reconstructionButton.waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-complete-evidence-b-host.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-complete-evidence-b-player.png`, fullPage: true });
  check("Paczka B kompletna, rekonstrukcja gotowa do uruchomienia, ale jeszcze nie rozpoczęta");

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 EVIDENCE B E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
