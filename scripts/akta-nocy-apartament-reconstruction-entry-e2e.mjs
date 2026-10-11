import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-reconstruction-entry";
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

async function waitPhase(page, code, phase, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    if (state.status === 200 && state.body?.room?.phase === phase) return state.body;
    await page.waitForTimeout(250);
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
    await joinGuest(page, code, `E2E Rekonstrukcja ${index + 1}`);
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
  assert(result.body?.phase === "pierwsze_zeznania", "Nie udało się wejść do pierwszych zeznań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się otworzyć Paczki A");
  for (let count = 2; count <= 4; count += 1) {
    result = await postGame(host, code, "revealEvidenceA");
    assert(result.status === 200, `Nie udało się ujawnić dowodu A ${count}/4`);
  }
  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "przesluchania_a", "Nie udało się wejść do przesłuchań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się otworzyć Paczki B");
  for (let count = 2; count <= 5; count += 1) {
    result = await postGame(host, code, "revealEvidenceB");
    assert(result.status === 200, `Nie udało się ujawnić dowodu B ${count}/5`);
  }

  const before = await readState(host, code);
  assert(before.status === 200, "Prowadzący nie pobrał stanu przed rekonstrukcją");
  assert(before.body?.evidence?.length === 9, `Przed rekonstrukcją oczekiwano 9 dowodów, jest ${before.body?.evidence?.length}`);
  assert(String(before.body?.room?.phase || "").startsWith("dowody_b_"), "Gra weszła do rekonstrukcji bez działania prowadzącego");
  check("przygotowanie zakończone na kompletnej Paczce B");

  await host.reload({ waitUntil: "domcontentloaded" });
  const reconstructionButton = host.getByRole("button", { name: "ROZPOCZNIJ REKONSTRUKCJĘ →", exact: true });
  await reconstructionButton.waitFor({ state: "visible", timeout: 10000 });
  await reconstructionButton.click();

  const hostState = await waitPhase(host, code, "rekonstrukcja");
  assert(hostState.role === "host", "Prowadzący stracił rolę po wejściu do rekonstrukcji");
  assert(hostState.evidence?.length === 9, "Prowadzący stracił dowody po wejściu do rekonstrukcji");
  assert(Array.isArray(hostState.reconstruction?.players), "Brak listy graczy rekonstrukcji");
  assert(hostState.reconstruction.players.length === 5, `Oczekiwano 5 graczy rekonstrukcji, jest ${hostState.reconstruction.players.length}`);
  assert(hostState.reconstruction.players.every(item => item.submitted === false), "Ktoś jest oznaczony jako gotowy przed złożeniem rekonstrukcji");
  assert(hostState.reconstruction.summary === null, "Podsumowanie rekonstrukcji jest widoczne przed odpowiedziami");
  check("prowadzący wszedł do rekonstrukcji z 5 nieprzesłanymi teoriami");

  await host.getByText("ETAP 05 · REKONSTRUKCJA NOCY", { exact: true }).waitFor({ state: "visible", timeout: 10000 });

  for (let index = 0; index < players.length; index += 1) {
    const state = await waitPhase(players[index], code, "rekonstrukcja");
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przy wejściu do rekonstrukcji`);
    assert(state.evidence.length === 9, `Gracz ${index + 1} nie zachował 9 dowodów`);
    assert(state.reconstruction?.submitted === false, `Gracz ${index + 1} jest oznaczony jako przesłany przed działaniem`);
    assert(Array.isArray(state.reconstructionEvents) && state.reconstructionEvents.length > 0, `Gracz ${index + 1} nie dostał zdarzeń rekonstrukcji`);
    assert(Array.isArray(state.motiveOptions) && state.motiveOptions.length > 0, `Gracz ${index + 1} nie dostał motywów`);
    assert(Array.isArray(state.coverupOptions) && state.coverupOptions.length > 0, `Gracz ${index + 1} nie dostał opcji tuszowania`);
  }

  await players[0].getByText("Odtwórz 18 najważniejszych minut.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-host-reconstruction-entry.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-reconstruction-entry.png`, fullPage: true });
  check("rekonstrukcja jest widoczna po obu stronach, ale żadna teoria nie została jeszcze przesłana");

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 RECONSTRUCTION ENTRY E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
