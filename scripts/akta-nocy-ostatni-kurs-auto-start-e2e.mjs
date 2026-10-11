import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-start";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function watch(page, label, errors) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon") || text.includes("qrserver")) return;
    if (text.startsWith("Failed to load resource:")) return;
    errors.push(`${label} console: ${text}`);
  });
  page.on("response", response => {
    if (response.status() < 500) return;
    const url = response.url();
    if (url.includes("qrserver.com") || url.includes("favicon")) return;
    errors.push(`${label} HTTP ${response.status()}: ${url}`);
  });
}

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
  const recoveryCode = (await page.locator(".recovery-code strong").textContent())?.trim();
  assert(recoveryCode?.length === 6, `Brak kodu powrotu dla ${name}`);
  return recoveryCode;
}

async function readState(page, code) {
  return page.evaluate(async roomCode => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
}

async function waitForGame(page, code) {
  await page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 25000 });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    if (state.status === 200 && state.body?.room?.status === "active") return state;
    await page.waitForTimeout(300);
  }
  throw new Error("Ostatni Kurs nie osiągnął aktywnego stanu");
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
const check = (label, details = null) => report.checks.push({ label, details, at: new Date().toISOString() });

try {
  const creatorContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const creator = await creatorContext.newPage();
  watch(creator, "creator-player", errors);

  await creator.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await creator.getByRole("button", { name: "BEZ PROWADZĄCEGO", exact: true }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = creator.url().split("/").pop();
  assert(code, "Brak kodu pokoju Ostatniego Kursu");
  report.roomCode = code;

  await creator.getByText("Automatyczne śledztwo · bez prowadzącego", { exact: true }).waitFor({ timeout: 15000 });
  await creator.getByText("◉ START AUTOMATYCZNY", { exact: true }).waitFor({ timeout: 15000 });
  check("utworzono Ostatni Kurs w trybie bez prowadzącego", code);

  const names = ["E2E Maszynista", "E2E Wagon 2", "E2E Wagon 3", "E2E Wagon 4", "E2E Wagon 5"];
  const players = [creator];

  await joinGuest(creator, code, names[0]);
  check("twórca pokoju dołączył jako zwykły gracz");

  for (let index = 1; index < names.length; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`, errors);
    players.push(page);
    await joinGuest(page, code, names[index]);
  }
  check("łącznie 5 graczy dołączyło na 5 telefonach");

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await creator.screenshot({ path: `${artifacts}/01-auto-lobby-5-ready.png`, fullPage: true });
  check("wszyscy 5 gracze oznaczeni jako gotowi");

  const statesAfterStart = await Promise.all(players.map(page => waitForGame(page, code)));
  check("gra wystartowała automatycznie bez kliknięcia START GRY");

  const roleIds = [];
  let culpritCount = 0;
  for (let index = 0; index < statesAfterStart.length; index += 1) {
    const { status, body } = statesAfterStart[index];
    assert(status === 200, `Gracz ${index + 1} ma HTTP ${status}`);
    assert(body?.playMode === "auto", `Gracz ${index + 1} nie ma playMode=auto`);
    assert(body?.role === "player", `Gracz ${index + 1} dostał rolę API ${body?.role} zamiast player`);
    assert(body?.room?.status === "active", `Gracz ${index + 1}: pokój nie jest active`);
    assert(body?.room?.phase === "ok_akta_osobowe", `Nieprawidłowa faza startowa Ostatniego Kursu: ${body?.room?.phase}`);
    assert(body?.player?.displayName === names[index], `Gracz ${index + 1} dostał złą tożsamość`);
    assert(body?.roleCard?.id, `Gracz ${index + 1} nie dostał prywatnej roli`);
    assert(body?.roleCard?.privateSecret, `Gracz ${index + 1} nie dostał prywatnego sekretu`);
    assert(Array.isArray(body?.roleCard?.privateKnowledge) && body.roleCard.privateKnowledge.length > 0, `Gracz ${index + 1} nie dostał prywatnej wiedzy`);
    assert(Array.isArray(body?.roleCard?.timeline) && body.roleCard.timeline.length > 0, `Gracz ${index + 1} nie dostał osi czasu`);
    assert(body?.player?.dossierOpened === false, `Akta gracza ${index + 1} są otwarte przed wejściem do akt`);
    assert(Array.isArray(body?.cast) && body.cast.length === 5, `Gracz ${index + 1} nie widzi pełnej publicznej obsady`);
    roleIds.push(body.roleCard.id);
    if (body.roleCard.isCulprit === true) culpritCount += 1;
  }

  assert(new Set(roleIds).size === 5, `Role nie są unikalne: ${roleIds.join(", ")}`);
  assert(culpritCount === 1, `Oczekiwano dokładnie 1 osoby odpowiedzialnej, znaleziono ${culpritCount}`);
  check("5 prywatnych i unikalnych ról, dokładnie 1 osoba odpowiedzialna", roleIds);

  for (let index = 0; index < players.length; index += 1) {
    await players[index].getByText("Twoje akta są zapieczętowane.", { exact: true }).waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/02-creator-is-player.png`, fullPage: true });
  await players[1].screenshot({ path: `${artifacts}/03-player-start.png`, fullPage: true });
  check("każdy telefon pokazuje ekran prywatnych akt, bez panelu prowadzącego");

  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO START E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
