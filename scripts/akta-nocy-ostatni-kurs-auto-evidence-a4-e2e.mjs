import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-evidence-a4";
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

  const names = ["E2E A4 1", "E2E A4 2", "E2E A4 3", "E2E A4 4", "E2E A4 5"];
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

  const initial = await Promise.all(players.map(page => waitForState(page, code, body => body?.room?.phase === "ok_akta_osobowe" && body?.role === "player", "ok_akta_osobowe")));
  const roleIds = initial.map(state => state.roleCard.id);

  for (const page of players) {
    const opened = await post(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }
  await readyAll(players, code);
  await Promise.all(players.map(page => waitForState(page, code, body => body?.room?.phase === "ok_ostatni_raz", "ok_ostatni_raz")));
  await readyAll(players, code);
  await Promise.all(players.map(page => waitForState(page, code, body => body?.evidence?.length === 1, "A-01")));
  await readyAll(players, code);
  await Promise.all(players.map(page => waitForState(page, code, body => body?.evidence?.length === 2, "A-02")));
  await readyAll(players, code);

  const a03States = await Promise.all(players.map((page, index) => waitForState(
    page, code,
    body => body?.evidence?.length === 3 && body?.evidence?.[2]?.id === "platform-coat" && body?.roleCard?.id === roleIds[index],
    `gracz ${index + 1} przy A-03`,
  )));
  assert(a03States.every(state => state.ready?.ready_players === 0), "A-03 nie wystartował z 0/5 gotowych");
  check("A-03 gotowy jako punkt startowy");

  for (let index = 0; index < 4; index += 1) {
    await players[index].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();
    await waitForState(players[index], code, body => body?.evidence?.length === 3 && body?.ready?.ready_players === index + 1 && body?.ready?.player_ready === true, `gotowość A-03 ${index + 1}/5`);
    const observer = await readState(players[4], code);
    assert(observer.body?.evidence?.length === 3, `A-04 pojawił się za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.evidence?.[2]?.id === "platform-coat", "A-03 zmienił się przed 5/5");
  }
  check("przy 1/5–4/5 pozostają dokładnie A-01–A-03");

  await players[4].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();

  const a04States = await Promise.all(players.map((page, index) => waitForState(
    page, code,
    body => body?.evidence?.length === 4 && body?.evidence?.[3]?.id === "master-key" && body?.roleCard?.id === roleIds[index],
    `gracz ${index + 1} przy A-04`,
  )));

  const expectedIds = ["train-map", "manifest", "platform-coat", "master-key"];
  for (let index = 0; index < a04States.length; index += 1) {
    const state = a04States[index];
    assert(JSON.stringify(state.evidence.map(item => item.id)) === JSON.stringify(expectedIds), `Gracz ${index + 1} ma nieprawidłowy zestaw dowodów`);
    assert(state.evidence[3].title === "Brak klucza serwisowego M-1", `Gracz ${index + 1} ma inny tytuł A-04`);
    assert(state.ready?.ready_players === 0, `Gotowość po A-04 nie wyzerowała się u gracza ${index + 1}`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("5/5 otworzyło dokładnie A-04, zachowując A-01–A-03");

  for (const page of players) {
    await page.getByText("Brak klucza serwisowego M-1", { exact: true }).first().waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/01-a04.png`, fullPage: true });
  await players[1].screenshot({ path: `${artifacts}/02-a04-second-phone.png`, fullPage: true });

  const finalState = await readState(creator, code);
  assert(finalState.body?.evidence?.length === 4, "Test wyszedł poza A-04");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO A-04 E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
