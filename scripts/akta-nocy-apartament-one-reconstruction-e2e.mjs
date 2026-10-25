import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-one-reconstruction";
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

async function waitForSubmitted(page, code, expected, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    if (state.status === 200 && state.body?.reconstruction?.submitted === expected) return state.body;
    await page.waitForTimeout(200);
  }
  throw new Error(`Nie osiągnięto reconstruction.submitted=${expected}`);
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
  for (let count = 2; count <= 5; count += 1) {
    result = await postGame(host, code, "revealEvidenceB");
    assert(result.status === 200, `Nie udało się przygotować dowodu B ${count}/5`);
  }
  result = await postGame(host, code, "advance");
  assert(result.status === 200 && result.body?.phase === "rekonstrukcja", `Nie udało się przygotować rekonstrukcji: ${JSON.stringify(result.body)}`);

  const firstBefore = await waitForSubmitted(players[0], code, false);
  assert(firstBefore.room.phase === "rekonstrukcja", "Pierwszy gracz nie jest w rekonstrukcji");
  assert(firstBefore.reconstructionEvents.length === 9, "Brak 9 wydarzeń dla pierwszego gracza");
  assert(firstBefore.cast.length === 5, "Brak 5 podejrzanych dla pierwszego gracza");
  check("rekonstrukcja gotowa, 0/5 teorii przed działaniem gracza");

  await players[0].reload({ waitUntil: "domcontentloaded" });

  const selectedEventTitles = firstBefore.reconstructionEvents.slice(0, 7).map(item => item.title);
  for (const title of selectedEventTitles) {
    const button = players[0].getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
    await button.waitFor({ state: "visible", timeout: 10000 });
    await button.click();
  }

  await players[0].getByText("7/7", { exact: true }).waitFor({ state: "visible", timeout: 10000 });

  const suspect = firstBefore.cast[0];
  const suspectButton = players[0].getByRole("button", { name: new RegExp(suspect.characterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
  await suspectButton.click();

  const motive = firstBefore.motiveOptions[0];
  await players[0].getByRole("button", { name: motive.label, exact: true }).click();

  const coverup = firstBefore.coverupOptions[0];
  await players[0].getByRole("button", { name: coverup.label, exact: true }).click();

  const submit = players[0].getByRole("button", { name: "ZATWIERDŹ REKONSTRUKCJĘ", exact: true });
  await submit.waitFor({ state: "visible", timeout: 10000 });
  assert(await submit.isEnabled(), "Przycisk zatwierdzenia nie odblokował się po kompletnym wyborze");
  await players[0].screenshot({ path: `${artifacts}/01-ready-to-submit.png`, fullPage: true });
  await submit.click();

  const firstAfter = await waitForSubmitted(players[0], code, true);
  assert(firstAfter.room.phase === "rekonstrukcja", "Gra przeszła dalej po tylko 1/5 teorii");
  assert(firstAfter.reconstruction?.event_order?.length === 7, "Nie zapisano 7 wydarzeń pierwszego gracza");
  assert(firstAfter.reconstruction?.suspect_player_id === suspect.playerId, "Nie zapisano wybranego podejrzanego");
  assert(firstAfter.reconstruction?.motive_key === motive.key, "Nie zapisano wybranego motywu");
  assert(firstAfter.reconstruction?.coverup_key === coverup.key, "Nie zapisano wybranego upozorowania");

  await players[0].getByText("TEORIA ZAPISANA", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByText("Czekamy na pozostałych.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });

  const hostState = await readState(host, code);
  assert(hostState.status === 200 && hostState.body?.room?.phase === "rekonstrukcja", "Prowadzący nie pozostał w rekonstrukcji przy 1/5");
  const submittedPlayers = hostState.body.reconstruction?.players?.filter(item => item.submitted) ?? [];
  assert(submittedPlayers.length === 1, `Prowadzący powinien widzieć 1/5 teorii, widzi ${submittedPlayers.length}/5`);
  assert(hostState.body.reconstruction?.summary == null, "Podsumowanie grupy pojawiło się przy 1/5 teorii");

  for (let index = 1; index < players.length; index += 1) {
    const state = await waitForSubmitted(players[index], code, false);
    assert(state.room.phase === "rekonstrukcja", `Gracz ${index + 1} opuścił rekonstrukcję`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }

  await host.screenshot({ path: `${artifacts}/02-host-one-of-five.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/03-theory-saved.png`, fullPage: true });
  check("1/5 rekonstrukcji zapisane, pozostałe 4 nadal otwarte, brak automatycznego przejścia");

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 ONE RECONSTRUCTION E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
