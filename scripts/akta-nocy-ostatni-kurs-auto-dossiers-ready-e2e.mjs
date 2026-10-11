import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-dossiers-ready";
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
}

async function readState(page, code) {
  return page.evaluate(async roomCode => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
}

async function waitForState(page, code, predicate, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(page, code);
    if (state.status === 200 && predicate(state.body)) return state.body;
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}`);
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

  const names = ["E2E Akta 1", "E2E Akta 2", "E2E Akta 3", "E2E Akta 4", "E2E Akta 5"];
  const players = [creator];

  await joinGuest(creator, code, names[0]);
  for (let index = 1; index < names.length; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`, errors);
    players.push(page);
    await joinGuest(page, code, names[index]);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });

  const startStates = await Promise.all(players.map(page => waitForState(
    page,
    code,
    body => body?.playMode === "auto" && body?.room?.phase === "ok_akta_osobowe" && body?.role === "player",
    "ok_akta_osobowe",
  )));
  const roleIds = startStates.map(body => body.roleCard.id);
  check("auto-start doprowadził 5 graczy do prywatnych akt", roleIds);

  for (let index = 0; index < players.length; index += 1) {
    const page = players[index];
    await page.getByRole("button", { name: "OTWÓRZ MOJE AKTA", exact: true }).click();
    await page.getByRole("button", { name: "PRZECZYTAŁEM AKTA · JESTEM GOTOWY", exact: true }).waitFor({ timeout: 10000 });

    const opened = await waitForState(
      page,
      code,
      body => body?.room?.phase === "ok_akta_osobowe" && body?.player?.dossierOpened === true,
      `akta gracza ${index + 1} otwarte`,
    );
    assert(opened.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po otwarciu akt`);
    assert(opened.ready?.total_players === 5, `Gracz ${index + 1} widzi złą liczbę graczy`);
    assert(opened.ready?.player_ready === false, `Gracz ${index + 1} jest gotowy przed kliknięciem wewnętrznego przycisku`);
  }
  check("wszyscy 5 graczy otworzyli prywatne akta, nikt jeszcze nie jest gotowy wewnątrz fazy");

  const beforeReady = await readState(players[0], code);
  assert(beforeReady.body?.ready?.ready_players === 0, `Przed klikaniem jest ${beforeReady.body?.ready?.ready_players}/5 zamiast 0/5`);
  await players[0].screenshot({ path: `${artifacts}/01-dossier-opened-ready-0-of-5.png`, fullPage: true });

  for (let index = 0; index < 4; index += 1) {
    await players[index].getByRole("button", { name: "PRZECZYTAŁEM AKTA · JESTEM GOTOWY", exact: true }).click();

    const after = await waitForState(
      players[index],
      code,
      body => body?.room?.phase === "ok_akta_osobowe" && body?.ready?.ready_players === index + 1 && body?.ready?.player_ready === true,
      `gotowość ${index + 1}/5`,
    );
    assert(after.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po gotowości`);

    const observer = await readState(players[4], code);
    assert(observer.body?.room?.phase === "ok_akta_osobowe", `Gra przeszła dalej za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.ready?.ready_players === index + 1, `Licznik po graczu ${index + 1} wynosi ${observer.body?.ready?.ready_players}/5`);
  }
  check("przy 1/5, 2/5, 3/5 i 4/5 gra pozostaje w fazie akt osobowych");

  await players[4].getByRole("button", { name: "PRZECZYTAŁEM AKTA · JESTEM GOTOWY", exact: true }).click();

  const finalStates = await Promise.all(players.map((page, index) => waitForState(
    page,
    code,
    body => body?.room?.phase === "ok_ostatni_raz" && body?.roleCard?.id === roleIds[index],
    `gracz ${index + 1} w ok_ostatni_raz`,
    20000,
  )));

  assert(finalStates.every(body => body.playMode === "auto" && body.role === "player"), "Po przejściu ktoś utracił tryb auto lub rolę gracza");
  check("5. gotowość automatycznie przełączyła wszystkich do ok_ostatni_raz");

  for (const page of players) {
    await page.getByText("Twoje pierwsze zeznanie", { exact: true }).waitFor({ timeout: 10000 });
    await page.getByText("01 · OSTATNI RAZ WIDZIANY", { exact: true }).first().waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/02-last-seen-entry.png`, fullPage: true });
  await players[1].screenshot({ path: `${artifacts}/03-second-player-last-seen.png`, fullPage: true });
  check("wszystkie telefony pokazują pierwszy etap zeznań, bez przejścia do Paczki A");

  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO DOSSIERS READY E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
