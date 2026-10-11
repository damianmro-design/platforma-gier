import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-reveal-entry";
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

async function waitCount(host, code, section, expected, phase, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(host, code);
    const rows = state.body?.[section]?.players ?? [];
    const submitted = rows.filter(item => item.submitted).length;
    if (state.status === 200 && state.body?.room?.phase === phase && submitted === expected) {
      return state.body;
    }
    await host.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto ${expected}/5 w sekcji ${section}`);
}

function reconstructionPayload(state, index) {
  const eventOrder = state.reconstructionEvents.slice(0, 7).map(item => item.key);
  assert(eventOrder.length === 7 && new Set(eventOrder).size === 7, `Gracz ${index + 1} nie ma 7 unikalnych wydarzeń`);
  return {
    eventOrder,
    suspectPlayerId: state.cast[index % state.cast.length].playerId,
    motiveKey: state.motiveOptions[index % state.motiveOptions.length].key,
    coverupKey: state.coverupOptions[index % state.coverupOptions.length].key,
  };
}

function accusationPayload(state, index) {
  assert(state.cast.length > 0, `Gracz ${index + 1} nie ma podejrzanych`);
  assert(state.motiveOptions.length > 0, `Gracz ${index + 1} nie ma motywów`);
  assert(state.evidence.length === 9, `Gracz ${index + 1} nie ma 9 dowodów`);
  return {
    suspectPlayerId: state.cast[index % state.cast.length].playerId,
    motiveKey: state.motiveOptions[index % state.motiveOptions.length].key,
    evidenceId: state.evidence[index % state.evidence.length].id,
  };
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
    await joinGuest(page, code, `E2E Ujawnienie ${index + 1}`);
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

  await waitCount(host, code, "reconstruction", 0, "rekonstrukcja");
  for (let index = 0; index < players.length; index += 1) {
    const state = await waitPhase(players[index], code, "rekonstrukcja");
    const submitted = await postGame(players[index], code, "submitReconstruction", reconstructionPayload(state, index));
    assert(submitted.status === 200 && submitted.body?.ok === true, `Nie udało się wysłać rekonstrukcji gracza ${index + 1}`);
    await waitCount(host, code, "reconstruction", index + 1, "rekonstrukcja");
  }

  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "rekonstrukcja_wynik", "Nie udało się pokazać wspólnej teorii");
  result = await postGame(host, code, "advance");
  assert(result.body?.phase === "akt_oskarzenia", "Nie udało się wejść do aktu oskarżenia");

  await waitCount(host, code, "accusation", 0, "akt_oskarzenia");
  for (let index = 0; index < players.length; index += 1) {
    const state = await waitPhase(players[index], code, "akt_oskarzenia");
    const submitted = await postGame(players[index], code, "submitAccusation", accusationPayload(state, index));
    assert(submitted.status === 200 && submitted.body?.ok === true, `Nie udało się wysłać oskarżenia gracza ${index + 1}`);
    const hostState = await waitCount(host, code, "accusation", index + 1, "akt_oskarzenia");
    assert(hostState.accusation.summary == null, `Podsumowanie oskarżeń pojawiło się przy ${index + 1}/5`);
    check(`prowadzący widzi ${index + 1}/5 złożonych oskarżeń`);
  }

  const readyHost = await waitCount(host, code, "accusation", 5, "akt_oskarzenia");
  assert(readyHost.accusation.players.every(item => item.submitted === true), "Przy 5/5 ktoś nadal jest oznaczony jako niewysłany");
  assert(readyHost.accusation.summary == null, "Wynik oskarżeń został ujawniony przed finałem");
  assert(readyHost.reveal == null, "Ujawnienie pojawiło się automatycznie przed działaniem prowadzącego");
  check("5/5 oskarżeń gotowe, ujawnienie nadal ukryte");

  await host.reload({ waitUntil: "domcontentloaded" });
  const revealButton = host.getByRole("button", { name: "ROZPOCZNIJ UJAWNIENIE →", exact: true });
  await revealButton.waitFor({ state: "visible", timeout: 10000 });
  assert(await revealButton.isEnabled(), "Przycisk ujawnienia jest nieaktywny przy 5/5");
  await revealButton.click();

  const hostReveal = await waitPhase(host, code, "ujawnienie_1");
  assert(hostReveal.role === "host", "Prowadzący stracił rolę przy pierwszym ujawnieniu");
  assert(hostReveal.evidence.length === 9, "Prowadzący stracił dowody przy pierwszym ujawnieniu");
  assert(hostReveal.reveal?.step === 1, `Oczekiwano kroku ujawnienia 1, jest ${hostReveal.reveal?.step}`);
  assert(hostReveal.reveal?.culprit == null, "Sprawca został ujawniony już w części 1");
  assert(hostReveal.reveal?.content?.eyebrow === "UJAWNIENIE · CZĘŚĆ 1", `Nieprawidłowy nagłówek pierwszego ujawnienia: ${hostReveal.reveal?.content?.eyebrow}`);
  assert(hostReveal.reveal?.content?.title === "Najbardziej podejrzane ślady nie były planem sprawcy.", "Nieprawidłowy tytuł pierwszego ujawnienia");
  assert(hostReveal.accusation?.players?.every(item => item.submitted === true), "Po wejściu do ujawnienia zniknął komplet 5 oskarżeń");
  assert(hostReveal.accusation?.summary == null, "Zbiorcze wyniki oskarżeń są widoczne za wcześnie, już w części 1");
  check("prowadzący uruchomił tylko pierwszą część ujawnienia, bez wskazania sprawcy");

  await host.getByText("UJAWNIENIE · CZĘŚĆ 1", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.getByText("Najbardziej podejrzane ślady nie były planem sprawcy.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });

  for (let index = 0; index < players.length; index += 1) {
    const state = await waitPhase(players[index], code, "ujawnienie_1");
    assert(state.role === "player", `Gracz ${index + 1} stracił rolę przy ujawnieniu`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przy ujawnieniu`);
    assert(state.evidence.length === 9, `Gracz ${index + 1} stracił dowody przy ujawnieniu`);
    assert(state.accusation?.submitted === true, `Gracz ${index + 1} stracił zapisane oskarżenie`);
    assert(state.accusationVerdict == null, `Gracz ${index + 1} dostał werdykt swojego oskarżenia za wcześnie`);
    assert(state.reveal?.step === 1, `Gracz ${index + 1} nie widzi pierwszej części ujawnienia`);
    assert(state.reveal?.culprit == null, `Gracz ${index + 1} dostał sprawcę za wcześnie`);
    assert(state.reveal?.content?.title === "Najbardziej podejrzane ślady nie były planem sprawcy.", `Gracz ${index + 1} widzi inną planszę ujawnienia`);
  }

  await players[0].getByText("UJAWNIENIE · CZĘŚĆ 1", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByText("Najbardziej podejrzane ślady nie były planem sprawcy.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-host-reveal-part-1.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-reveal-part-1.png`, fullPage: true });
  check("część 1 ujawnienia jest zsynchronizowana na prowadzącym i 5 telefonach");

  const finalState = await readState(host, code);
  assert(finalState.body?.room?.phase === "ujawnienie_1", "Test wyszedł poza pierwszą część ujawnienia");
  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 REVEAL ENTRY E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
