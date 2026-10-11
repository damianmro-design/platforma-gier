import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-reconstruction-one";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readState(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/akta-nocy/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
}

async function postGame(page, code, action, payload = {}) {
  return page.evaluate(async ({ roomCode, actionName, data }) => {
    const response = await fetch(`/api/gra/akta-nocy/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, ...data }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { roomCode: code, actionName: action, data: payload });
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

async function waitSubmittedCount(host, code, expected, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(host, code);
    const rows = state.body?.reconstruction?.players ?? [];
    const submitted = rows.filter(item => item.submitted).length;
    if (state.status === 200 && state.body?.room?.phase === "rekonstrukcja" && submitted === expected) {
      return state.body;
    }
    await host.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto ${expected}/5 przesłanych rekonstrukcji`);
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
    await joinGuest(page, code, `E2E Teoria ${index + 1}`);
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
    roleIds.push(state.body?.roleCard?.id);
    const opened = await postGame(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }

  let result = await postGame(host, code, "advance");
  assert(result.body?.phase === "pierwsze_zeznania", "Nie udało się wejść do pierwszych zeznań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się otworzyć Paczki A");
  for (let count = 2; count <= 4; count += 1) {
    result = await postGame(host, code, "revealEvidenceA");
    assert(result.status === 200, `Nie udało się przygotować A ${count}/4`);
  }
  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "przesluchania_a", "Nie udało się wejść do przesłuchań");
  result = await postGame(host, code, "advance");
  assert(result.status === 200, "Nie udało się otworzyć Paczki B");
  for (let count = 2; count <= 5; count += 1) {
    result = await postGame(host, code, "revealEvidenceB");
    assert(result.status === 200, `Nie udało się przygotować B ${count}/5`);
  }
  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "rekonstrukcja", `Nie udało się wejść do rekonstrukcji: ${JSON.stringify(result.body)}`);

  const initialHost = await waitSubmittedCount(host, code, 0);
  assert(initialHost.reconstruction?.summary == null, "Podsumowanie pojawiło się przed teoriami");
  check("rekonstrukcja wystartowała przy 0/5 teorii");

  const firstBefore = await waitPhase(players[0], code, "rekonstrukcja");
  assert(firstBefore.reconstruction == null || firstBefore.reconstruction.submitted !== true, "Gracz 1 ma teorię przed wysłaniem");
  assert(firstBefore.reconstructionEvents.length >= 7, "Za mało wydarzeń do rekonstrukcji");
  assert(firstBefore.cast.length >= 1, "Brak podejrzanych");
  assert(firstBefore.motiveOptions.length >= 1, "Brak motywów");
  assert(firstBefore.coverupOptions.length >= 1, "Brak opcji tuszowania");

  const payload = {
    eventOrder: firstBefore.reconstructionEvents.slice(0, 7).map(item => item.key),
    suspectPlayerId: firstBefore.cast[0].playerId,
    motiveKey: firstBefore.motiveOptions[0].key,
    coverupKey: firstBefore.coverupOptions[0].key,
  };
  assert(new Set(payload.eventOrder).size === 7, "Wybrane wydarzenia nie są unikalne");

  const submitted = await postGame(players[0], code, "submitReconstruction", payload);
  assert(submitted.status === 200 && submitted.body?.ok === true, `Nie udało się wysłać pierwszej rekonstrukcji: ${JSON.stringify(submitted.body)}`);

  const hostAfter = await waitSubmittedCount(host, code, 1);
  assert(hostAfter.room.phase === "rekonstrukcja", "Gra przeszła do wyniku po tylko 1/5 teorii");
  assert(hostAfter.reconstruction.summary == null, "Zbiorczy wynik ujawniono po tylko 1/5 teorii");
  const submittedRows = hostAfter.reconstruction.players.filter(item => item.submitted);
  assert(submittedRows.length === 1, `Prowadzący widzi ${submittedRows.length}/5 zamiast 1/5`);
  check("prowadzący widzi dokładnie 1/5 złożonych rekonstrukcji");

  const firstAfter = await readState(players[0], code);
  assert(firstAfter.body?.room?.phase === "rekonstrukcja", "Telefon gracza 1 opuścił fazę rekonstrukcji");
  assert(firstAfter.body?.reconstruction?.submitted === true, "Gracz 1 nie widzi swojej teorii jako wysłanej");
  assert(JSON.stringify(firstAfter.body.reconstruction.event_order) === JSON.stringify(payload.eventOrder), "Zapisana kolejność wydarzeń różni się od wysłanej");
  assert(firstAfter.body.reconstruction.suspect_player_id === payload.suspectPlayerId, "Zmienił się zapisany podejrzany");
  assert(firstAfter.body.reconstruction.motive_key === payload.motiveKey, "Zmienił się zapisany motyw");
  assert(firstAfter.body.reconstruction.coverup_key === payload.coverupKey, "Zmienił się zapisany sposób tuszowania");
  assert(firstAfter.body.roleCard.id === roleIds[0], "Rola gracza 1 zmieniła się po wysłaniu teorii");

  for (let index = 1; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    assert(state.body?.room?.phase === "rekonstrukcja", `Gracz ${index + 1} opuścił rekonstrukcję`);
    assert(state.body?.reconstruction == null || state.body.reconstruction.submitted !== true, `Gracz ${index + 1} został oznaczony jako wysłany`);
    assert(state.body?.roleCard?.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("pozostałych 4 graczy nadal ma niewysłane teorie");

  await players[0].getByText("Czekamy na pozostałych.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByText("Twoja rekonstrukcja pozostaje tajna do momentu, w którym prowadzący pokaże zbiorczy wynik.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-host-one-of-five.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-submitted.png`, fullPage: true });
  check("pierwsza teoria pozostaje prywatna, bez zbiorczego wyniku");

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 RECONSTRUCTION 1/5 E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
