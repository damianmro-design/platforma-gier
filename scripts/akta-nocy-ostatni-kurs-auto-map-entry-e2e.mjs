import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-map-entry";
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

async function post(page, code, action) {
  return page.evaluate(async ({ roomCode, actionName }) => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { roomCode: code, actionName: action });
}

async function waitForState(page, code, predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const state = await readState(page, code);
      if (state.status === 200 && predicate(state.body)) return state.body;
    } catch {}
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}`);
}

async function readyAll(players, code) {
  for (const page of players) {
    const response = await post(page, code, "ready");
    assert(response.status === 200 && response.body?.ok === true, `Nie udało się ustawić gotowości: ${JSON.stringify(response.body)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = { baseURL, roomCode: null, checks: [], errors, startedAt: new Date().toISOString(), finishedAt: null };
const check = (label, details = null) => report.checks.push({ label, details, at: new Date().toISOString() });

try {
  const creatorContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const creator = await creatorContext.newPage();
  watch(creator, "creator", errors);

  await creator.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await creator.getByRole("button", { name: "BEZ PROWADZĄCEGO", exact: true }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = creator.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;

  const names = ["E2E Mapa 1", "E2E Mapa 2", "E2E Mapa 3", "E2E Mapa 4", "E2E Mapa 5"];
  const players = [creator];
  await joinGuest(creator, code, names[0]);
  for (let index = 1; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`, errors);
    players.push(page);
    await joinGuest(page, code, names[index]);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await Promise.all(players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 25000 })));

  const initial = await Promise.all(players.map(page => waitForState(page, code, body => body?.room?.phase === "ok_akta_osobowe" && body?.role === "player", "ok_akta_osobowe")));
  const roleIds = initial.map(state => state.roleCard.id);

  for (const page of players) {
    const opened = await post(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }

  await readyAll(players, code);
  await Promise.all(players.map(page => waitForState(page, code, body => body?.room?.phase === "ok_ostatni_raz", "ok_ostatni_raz")));
  await readyAll(players, code);
  for (let expected = 1; expected <= 5; expected += 1) {
    await Promise.all(players.map(page => waitForState(page, code, body => body?.evidence?.length === expected, `A-0${expected}`)));
    if (expected < 5) await readyAll(players, code);
  }

  const a05States = await Promise.all(players.map((page, index) => waitForState(
    page, code,
    body => body?.room?.phase === "ok_a_5" && body?.evidence?.length === 5 && body?.roleCard?.id === roleIds[index],
    `A-05 gracza ${index + 1}`,
  )));
  assert(a05States.every(state => state.ready?.ready_players === 0), "A-05 nie wystartował z 0/5 gotowych");
  check("A-05 gotowy jako punkt startowy mapy");

  for (let index = 0; index < 4; index += 1) {
    await players[index].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();
    await waitForState(players[index], code, body => body?.room?.phase === "ok_a_5" && body?.ready?.ready_players === index + 1, `gotowość A-05 ${index + 1}/5`);
    const observer = await readState(players[4], code);
    assert(observer.body?.room?.phase === "ok_a_5", `Mapa otworzyła się za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.evidence?.length === 5, "Zestaw Paczki A zmienił się przed 5/5");
  }
  check("przy 1/5–4/5 grupa pozostaje w ok_a_5");

  await players[4].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();

  const mapStates = await Promise.all(players.map((page, index) => waitForState(
    page, code,
    body => body?.room?.phase === "ok_mapa" && body?.evidence?.length === 5 && body?.roleCard?.id === roleIds[index],
    `ok_mapa gracza ${index + 1}`,
  )));

  for (let index = 0; index < mapStates.length; index += 1) {
    const state = mapStates[index];
    assert(state.ready?.ready_players === 0, `Gotowość mapy nie wyzerowała się u gracza ${index + 1}`);
    assert(Array.isArray(state.map?.rules) && state.map.rules.length > 0, `Brak zasad mapy u gracza ${index + 1}`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("5/5 przełączyło całą grupę do ok_mapa");

  for (const page of players) {
    await page.getByText("03 · PIERWSZA REKONSTRUKCJA", { exact: true }).waitFor({ timeout: 10000 });
    await page.getByText("Sprawdźcie trasy na mapie pociągu.", { exact: true }).waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/01-map-entry.png`, fullPage: true });
  await players[1].screenshot({ path: `${artifacts}/02-map-entry-second-phone.png`, fullPage: true });

  const finalState = await readState(creator, code);
  assert(finalState.body?.room?.phase === "ok_mapa", "Test wyszedł poza pierwszą rekonstrukcję");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO MAP ENTRY E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
