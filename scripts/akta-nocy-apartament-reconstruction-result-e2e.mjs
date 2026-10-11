import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-reconstruction-result";
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

function reconstructionPayload(state, index) {
  assert(Array.isArray(state.reconstructionEvents) && state.reconstructionEvents.length >= 7, `Gracz ${index + 1} ma za mało wydarzeń`);
  assert(Array.isArray(state.cast) && state.cast.length >= 1, `Gracz ${index + 1} nie ma obsady`);
  assert(Array.isArray(state.motiveOptions) && state.motiveOptions.length >= 1, `Gracz ${index + 1} nie ma motywów`);
  assert(Array.isArray(state.coverupOptions) && state.coverupOptions.length >= 1, `Gracz ${index + 1} nie ma opcji tuszowania`);

  const payload = {
    eventOrder: state.reconstructionEvents.slice(0, 7).map(item => item.key),
    suspectPlayerId: state.cast[index % state.cast.length].playerId,
    motiveKey: state.motiveOptions[index % state.motiveOptions.length].key,
    coverupKey: state.coverupOptions[index % state.coverupOptions.length].key,
  };

  assert(new Set(payload.eventOrder).size === 7, `Gracz ${index + 1} ma powtórzone wydarzenia`);
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
    await joinGuest(page, code, `E2E Wynik ${index + 1}`);
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

  for (let index = 0; index < players.length; index += 1) {
    const before = await waitPhase(players[index], code, "rekonstrukcja");
    assert(before.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przed wysłaniem teorii`);
    assert(before.evidence.length === 9, `Gracz ${index + 1} nie ma 9 dowodów`);
    assert(before.reconstruction == null || before.reconstruction.submitted !== true, `Gracz ${index + 1} ma teorię przed wysłaniem`);

    const payload = reconstructionPayload(before, index);
    const submitted = await postGame(players[index], code, "submitReconstruction", payload);
    assert(submitted.status === 200 && submitted.body?.ok === true, `Nie udało się wysłać rekonstrukcji gracza ${index + 1}: ${JSON.stringify(submitted.body)}`);

    const expected = index + 1;
    const hostState = await waitSubmittedCount(host, code, expected);
    assert(hostState.reconstruction.summary == null, `Podsumowanie pojawiło się przy ${expected}/5`);
    assert(hostState.room.phase === "rekonstrukcja", `Gra opuściła rekonstrukcję przy ${expected}/5 bez działania prowadzącego`);
    check(`prowadzący widzi ${expected}/5 złożonych rekonstrukcji`);
  }

  const readyHost = await waitSubmittedCount(host, code, 5);
  assert(readyHost.reconstruction.players.every(item => item.submitted === true), "Przy 5/5 ktoś nadal jest oznaczony jako niewysłany");
  assert(readyHost.reconstruction.summary == null, "Wynik pojawił się automatycznie przed kliknięciem prowadzącego");
  check("5/5 teorii gotowe, wspólny wynik nadal ukryty");

  await host.reload({ waitUntil: "domcontentloaded" });
  await host.getByText("WSZYSCY GOTOWI", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  const showResult = host.getByRole("button", { name: "POKAŻ WSPÓLNĄ TEORIĘ →", exact: true });
  await showResult.waitFor({ state: "visible", timeout: 10000 });
  assert(await showResult.isEnabled(), "Przycisk wspólnej teorii jest nieaktywny przy 5/5");
  await showResult.click();

  const resultHost = await waitPhase(host, code, "rekonstrukcja_wynik");
  assert(resultHost.role === "host", "Prowadzący stracił rolę na ekranie wyniku");
  assert(resultHost.evidence.length === 9, "Na wyniku rekonstrukcji zniknęły dowody");
  assert(resultHost.reconstruction?.summary, "Brak zbiorczego wyniku rekonstrukcji");
  assert(resultHost.reconstruction.summary.total === 5, `Wynik ma złą liczbę graczy: ${resultHost.reconstruction.summary.total}`);
  assert(resultHost.reconstruction.summary.submitted === 5, `Wynik ma złą liczbę zgłoszeń: ${resultHost.reconstruction.summary.submitted}`);
  assert(Array.isArray(resultHost.reconstruction.summary.suspectRanking) && resultHost.reconstruction.summary.suspectRanking.length > 0, "Brak rankingu podejrzanych");
  assert(Array.isArray(resultHost.reconstruction.summary.motiveRanking) && resultHost.reconstruction.summary.motiveRanking.length > 0, "Brak rankingu motywów");
  assert(Array.isArray(resultHost.reconstruction.summary.coverupRanking) && resultHost.reconstruction.summary.coverupRanking.length > 0, "Brak rankingu upozorowania");
  assert(Array.isArray(resultHost.reconstruction.summary.consensusTimeline) && resultHost.reconstruction.summary.consensusTimeline.length === 7, `Wspólna oś czasu ma ${resultHost.reconstruction.summary.consensusTimeline?.length} zamiast 7 wydarzeń`);
  check("prowadzący pokazał wspólną teorię dopiero po 5/5", {
    topSuspect: resultHost.reconstruction.summary.suspectRanking[0]?.characterName ?? null,
    topMotive: resultHost.reconstruction.summary.motiveRanking[0]?.label ?? null,
    topCoverup: resultHost.reconstruction.summary.coverupRanking[0]?.label ?? null,
  });

  await host.getByText("WYNIK REKONSTRUKCJI", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.getByText("Najczęściej wskazywany podejrzany", { exact: true }).waitFor({ state: "visible", timeout: 10000 });

  for (let index = 0; index < players.length; index += 1) {
    const state = await waitPhase(players[index], code, "rekonstrukcja_wynik");
    assert(state.role === "player", `Gracz ${index + 1} stracił rolę po pokazaniu wyniku`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po pokazaniu wyniku`);
    assert(state.evidence.length === 9, `Gracz ${index + 1} stracił dowody po pokazaniu wyniku`);
    assert(state.reconstruction?.submitted === true, `Gracz ${index + 1} nie zachował własnej teorii na ekranie wyniku`);
  }

  await players[0].getByText("Wspólna teoria jest już na ekranie.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-host-reconstruction-result.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-reconstruction-result.png`, fullPage: true });
  check("wynik rekonstrukcji jest widoczny po obu stronach, bez przechodzenia do aktu oskarżenia");

  const finalState = await readState(host, code);
  assert(finalState.body?.room?.phase === "rekonstrukcja_wynik", "Test wyszedł poza wynik rekonstrukcji");
  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 RECONSTRUCTION RESULT E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
