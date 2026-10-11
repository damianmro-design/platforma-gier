import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-accusation-one";
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

async function waitReconstructionCount(host, code, expected, timeout = 12000) {
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

async function waitAccusationCount(host, code, expected, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(host, code);
    const rows = state.body?.accusation?.players ?? [];
    const submitted = rows.filter(item => item.submitted).length;
    if (state.status === 200 && state.body?.room?.phase === "akt_oskarzenia" && submitted === expected) {
      return state.body;
    }
    await host.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto ${expected}/5 złożonych oskarżeń`);
}

function reconstructionPayload(state, index) {
  const payload = {
    eventOrder: state.reconstructionEvents.slice(0, 7).map(item => item.key),
    suspectPlayerId: state.cast[index % state.cast.length].playerId,
    motiveKey: state.motiveOptions[index % state.motiveOptions.length].key,
    coverupKey: state.coverupOptions[index % state.coverupOptions.length].key,
  };
  assert(payload.eventOrder.length === 7 && new Set(payload.eventOrder).size === 7, `Gracz ${index + 1} nie ma 7 unikalnych wydarzeń`);
  return payload;
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
    await joinGuest(page, code, `E2E Akt 1z5 ${index + 1}`);
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
  assert(result.body?.phase === "rekonstrukcja", "Nie udało się wejść do rekonstrukcji");

  await waitReconstructionCount(host, code, 0);
  for (let index = 0; index < players.length; index += 1) {
    const state = await waitPhase(players[index], code, "rekonstrukcja");
    const submitted = await postGame(players[index], code, "submitReconstruction", reconstructionPayload(state, index));
    assert(submitted.status === 200 && submitted.body?.ok === true, `Nie udało się wysłać rekonstrukcji gracza ${index + 1}`);
    await waitReconstructionCount(host, code, index + 1);
  }

  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "rekonstrukcja_wynik", "Nie udało się pokazać wspólnej teorii");
  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "akt_oskarzenia", "Nie udało się wejść do aktu oskarżenia");

  const initialHost = await waitAccusationCount(host, code, 0);
  assert(initialHost.accusation?.summary == null, "Podsumowanie oskarżeń pojawiło się przed decyzjami");
  check("akt oskarżenia wystartował przy 0/5");

  const firstBefore = await waitPhase(players[0], code, "akt_oskarzenia");
  assert(firstBefore.accusation == null || firstBefore.accusation.submitted !== true, "Gracz 1 ma oskarżenie przed wysłaniem");
  assert(firstBefore.cast.length >= 1, "Brak podejrzanych dla gracza 1");
  assert(firstBefore.motiveOptions.length >= 1, "Brak motywów dla gracza 1");
  assert(firstBefore.evidence.length === 9, "Gracz 1 nie ma 9 dowodów");

  const payload = {
    suspectPlayerId: firstBefore.cast[0].playerId,
    motiveKey: firstBefore.motiveOptions[0].key,
    evidenceId: firstBefore.evidence[0].id,
  };

  const submitted = await postGame(players[0], code, "submitAccusation", payload);
  assert(submitted.status === 200 && submitted.body?.ok === true, `Nie udało się wysłać pierwszego oskarżenia: ${JSON.stringify(submitted.body)}`);

  const hostAfter = await waitAccusationCount(host, code, 1);
  assert(hostAfter.room.phase === "akt_oskarzenia", "Gra opuściła akt oskarżenia po tylko 1/5 decyzji");
  assert(hostAfter.accusation.summary == null, "Podsumowanie oskarżeń ujawniono po tylko 1/5 decyzji");
  assert(hostAfter.accusation.players.filter(item => item.submitted).length === 1, "Prowadzący nie widzi dokładnie 1/5 oskarżeń");
  check("prowadzący widzi dokładnie 1/5 złożonych oskarżeń");

  const firstAfter = await readState(players[0], code);
  assert(firstAfter.body?.room?.phase === "akt_oskarzenia", "Telefon gracza 1 opuścił akt oskarżenia");
  assert(firstAfter.body?.accusation?.submitted === true, "Gracz 1 nie widzi oskarżenia jako zatwierdzonego");
  assert(firstAfter.body.accusation.suspect_player_id === payload.suspectPlayerId, "Zmienił się zapisany podejrzany");
  assert(firstAfter.body.accusation.motive_key === payload.motiveKey, "Zmienił się zapisany motyw");
  assert(firstAfter.body.accusation.evidence_id === payload.evidenceId, "Zmienił się zapisany dowód");
  assert(firstAfter.body.roleCard.id === roleIds[0], "Rola gracza 1 zmieniła się po oskarżeniu");

  const secondAttempt = await postGame(players[0], code, "submitAccusation", {
    suspectPlayerId: firstBefore.cast.at(-1).playerId,
    motiveKey: firstBefore.motiveOptions.at(-1).key,
    evidenceId: firstBefore.evidence.at(-1).id,
  });
  assert(secondAttempt.status === 400, `Ponowna edycja oskarżenia nie została zablokowana: ${secondAttempt.status}`);
  assert(String(secondAttempt.body?.error || "").includes("zablokowany"), `Nieprawidłowy komunikat blokady oskarżenia: ${JSON.stringify(secondAttempt.body)}`);
  check("pierwsze oskarżenie jest nieodwracalnie zablokowane po zatwierdzeniu");

  for (let index = 1; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    assert(state.body?.room?.phase === "akt_oskarzenia", `Gracz ${index + 1} opuścił akt oskarżenia`);
    assert(state.body?.accusation == null || state.body.accusation.submitted !== true, `Gracz ${index + 1} został oznaczony jako oskarżający`);
    assert(state.body?.roleCard?.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("pozostałych 4 graczy nadal ma niewysłane oskarżenia");

  await players[0].getByText("OSKARŻENIE ZABLOKOWANE", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByText("Decyzja została zapisana.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-host-one-of-five.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-locked.png`, fullPage: true });
  check("pierwsze oskarżenie pozostaje prywatne, bez przechodzenia do ujawnienia");

  const finalState = await readState(host, code);
  assert(finalState.body?.room?.phase === "akt_oskarzenia", "Test wyszedł poza 1/5 oskarżeń");
  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 ACCUSATION 1/5 E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
