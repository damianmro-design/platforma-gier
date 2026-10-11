import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-start";
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

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
  const recoveryCode = (await page.locator(".recovery-code strong").textContent())?.trim();
  assert(recoveryCode?.length === 6, `Brak kodu powrotu dla ${name}`);
  return recoveryCode;
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = {
  baseURL,
  roomCode: null,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  checks: [],
  errors,
};

function check(label, details = null) {
  report.checks.push({ label, details, at: new Date().toISOString() });
}

function watch(page, label) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon") || text.includes("qrserver")) return;
    errors.push(`${label} console: ${text}`);
  });
  page.on("response", response => {
    if (response.url().includes("/api/gra/akta-nocy/") && response.status() >= 500) {
      errors.push(`${label} Akta API ${response.status()}: ${response.url()}`);
    }
  });
}

try {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage();
  watch(host, "host");

  await host.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  const heading = ((await host.locator("h1").first().textContent()) || "").replace(/\s+/g, " ").trim().toUpperCase();
  assert(heading.includes("AKTA") && heading.includes("NOCY"), `Nieprawidłowa strona startowa: ${heading}`);
  await host.getByRole("button", { name: "UTWÓRZ POKÓJ", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju Apartamentu 214");
  report.roomCode = code;
  check("prowadzący utworzył Apartament 214", code);

  const playerContexts = [];
  const players = [];
  const recoveryCodes = [];
  const names = Array.from({ length: 5 }, (_, index) => `E2E Akta ${index + 1}`);

  for (let index = 0; index < names.length; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`);
    playerContexts.push(context);
    players.push(page);
    recoveryCodes.push(await joinGuest(page, code, names[index]));
  }

  assert(recoveryCodes.every(item => item.length === 6), "Nie wszyscy gracze mają kod powrotu");
  check("5 graczy dołączyło i otrzymało kody powrotu");

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await host.screenshot({ path: `${artifacts}/01-lobby-host.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-lobby-player.png`, fullPage: true });
  check("wszyscy 5 gracze oznaczeni jako gotowi");

  const startButton = host.getByRole("button", { name: "START GRY", exact: true });
  await startButton.waitFor({ state: "visible", timeout: 15000 });
  assert(await startButton.isEnabled(), "START GRY jest nieaktywny mimo 5 gotowych graczy");
  await startButton.click();

  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);
  check("Apartament 214 wystartował dla prowadzącego i 5 telefonów");

  const hostState = await readState(host, code);
  assert(hostState.status === 200, `Prowadzący nie może pobrać stanu gry: HTTP ${hostState.status}`);
  assert(hostState.body?.role === "host", `Prowadzący ma złą rolę API: ${hostState.body?.role}`);
  assert(hostState.body?.room?.status === "active", `Pokój nie jest active: ${hostState.body?.room?.status}`);
  assert(typeof hostState.body?.room?.phase === "string" && hostState.body.room.phase.length > 0, "Brak fazy początkowej po starcie");
  assert(Array.isArray(hostState.body?.cast) && hostState.body.cast.length === 5, `Prowadzący nie widzi 5 publicznych postaci: ${hostState.body?.cast?.length}`);
  assert(hostState.body?.roleCard == null, "Prowadzący nie powinien otrzymywać prywatnej karty roli");

  const serializedHost = JSON.stringify(hostState.body);
  for (const forbiddenKey of ["privateSecret", "privateKnowledge", "culpritBriefing", "openingStatement", "objective"]) {
    assert(!serializedHost.includes(`\"${forbiddenKey}\"`), `Prowadzący otrzymał prywatne pole ${forbiddenKey}`);
  }
  check("prowadzący widzi tylko publiczną obsadę, bez prywatnych kart", { phase: hostState.body.room.phase });

  const playerStates = [];
  for (let index = 0; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    assert(state.status === 200, `Gracz ${index + 1} nie może pobrać stanu: HTTP ${state.status}`);
    assert(state.body?.role === "player", `Gracz ${index + 1} ma złą rolę API: ${state.body?.role}`);
    assert(state.body?.player?.displayName === names[index], `Gracz ${index + 1} dostał złą tożsamość`);
    const role = state.body?.roleCard;
    assert(role?.id, `Gracz ${index + 1} nie dostał roli`);
    assert(role?.name && role?.shortLabel, `Gracz ${index + 1} ma niepełną publiczną kartę roli`);
    assert(role?.privateSecret, `Gracz ${index + 1} nie dostał prywatnego sekretu`);
    assert(role?.objective, `Gracz ${index + 1} nie dostał prywatnego celu`);
    assert(role?.openingStatement, `Gracz ${index + 1} nie dostał pierwszego zeznania`);
    assert(Array.isArray(role?.privateKnowledge) && role.privateKnowledge.length > 0, `Gracz ${index + 1} nie dostał prywatnej wiedzy`);
    assert(Array.isArray(role?.timeline) && role.timeline.length > 0, `Gracz ${index + 1} nie dostał osi czasu`);
    assert(role?.dossierOpened === false, `Akta gracza ${index + 1} są oznaczone jako otwarte przed pierwszym otwarciem`);
    assert(Array.isArray(state.body?.cast) && state.body.cast.length === 5, `Gracz ${index + 1} nie widzi pełnej publicznej obsady`);
    playerStates.push(state.body);
  }

  const roleIds = playerStates.map(state => state.roleCard.id);
  assert(new Set(roleIds).size === 5, `Role nie są unikalne: ${roleIds.join(", ")}`);
  const culpritCount = playerStates.filter(state => state.roleCard.isCulprit === true).length;
  assert(culpritCount === 1, `Oczekiwano dokładnie 1 sprawcy, znaleziono ${culpritCount}`);
  const castNames = hostState.body.cast.map(item => item.characterName).sort();
  const assignedNames = playerStates.map(state => state.roleCard.name).sort();
  assert(JSON.stringify(castNames) === JSON.stringify(assignedNames), "Publiczna obsada prowadzącego nie odpowiada przydzielonym rolom");
  check("5 unikalnych ról przydzielonych poprawnie, dokładnie 1 sprawca", roleIds);

  await host.screenshot({ path: `${artifacts}/03-game-host-start.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/04-game-player-start.png`, fullPage: true });

  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 START E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
