import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-evidence-a3";
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

async function postGame(page, code, action) {
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

async function readyAllByApi(players, code) {
  for (const page of players) {
    const response = await postGame(page, code, "ready");
    assert(response.status === 200 && response.body?.ok === true, `Nie udało się zapisać gotowości: ${JSON.stringify(response.body)}`);
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

  const names = ["E2E A3 1", "E2E A3 2", "E2E A3 3", "E2E A3 4", "E2E A3 5"];
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

  const startStates = await Promise.all(players.map(page => waitForState(
    page, code,
    body => body?.playMode === "auto" && body?.role === "player" && body?.room?.phase === "ok_akta_osobowe",
    "ok_akta_osobowe",
  )));
  const roleIds = startStates.map(state => state.roleCard.id);

  for (const page of players) {
    const opened = await postGame(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }
  await readyAllByApi(players, code);
  await Promise.all(players.map(page => waitForState(page, code, body => body?.room?.phase === "ok_ostatni_raz", "ok_ostatni_raz")));
  await readyAllByApi(players, code);
  await Promise.all(players.map(page => waitForState(page, code, body => body?.room?.phase?.startsWith("ok_a_") && body?.evidence?.length === 1, "A-01")));
  await readyAllByApi(players, code);

  const a02States = await Promise.all(players.map((page, index) => waitForState(
    page, code,
    body => body?.room?.phase?.startsWith("ok_a_") && body?.evidence?.length === 2 && body?.roleCard?.id === roleIds[index],
    `gracz ${index + 1} przy A-02`,
  )));
  assert(a02States.every(state => state.evidence[0].id === "train-map" && state.evidence[1].id === "manifest"), "Nie udało się przygotować A-01 i A-02");
  assert(a02States.every(state => state.ready?.ready_players === 0), "A-02 nie wystartował z gotowością 0/5");
  check("A-02 gotowy jako punkt startowy, bez A-03");

  for (let index = 0; index < 4; index += 1) {
    await players[index].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();
    await waitForState(
      players[index], code,
      body => body?.evidence?.length === 2 && body?.ready?.ready_players === index + 1 && body?.ready?.player_ready === true,
      `gotowość A-02 ${index + 1}/5`,
    );
    const observer = await readState(players[4], code);
    assert(observer.body?.evidence?.length === 2, `A-03 pojawił się za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.evidence?.[1]?.id === "manifest", "A-02 zmienił się przed 5/5");
  }
  check("przy 1/5–4/5 pozostają dokładnie A-01 i A-02");

  await players[4].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();

  const a03States = await Promise.all(players.map((page, index) => waitForState(
    page, code,
    body => body?.room?.phase?.startsWith("ok_a_") && body?.evidence?.length === 3 && body?.roleCard?.id === roleIds[index],
    `gracz ${index + 1} przy A-03`,
  )));

  for (let index = 0; index < a03States.length; index += 1) {
    const state = a03States[index];
    assert(state.evidence[0].id === "train-map", `Gracz ${index + 1} utracił A-01`);
    assert(state.evidence[1].id === "manifest", `Gracz ${index + 1} utracił A-02`);
    assert(state.evidence[2].id === "platform-coat", `Gracz ${index + 1} ma inne A-03`);
    assert(state.evidence[2].title === "Postać w płaszczu na peronie", `Gracz ${index + 1} ma inny tytuł A-03`);
    assert(state.ready?.ready_players === 0, `Gotowość po A-03 nie wyzerowała się u gracza ${index + 1}`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("5/5 otworzyło dokładnie A-03, zachowując A-01 i A-02");

  for (const page of players) {
    await page.getByText("Postać w płaszczu na peronie", { exact: true }).first().waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/01-a03.png`, fullPage: true });
  await players[1].screenshot({ path: `${artifacts}/02-a03-second-phone.png`, fullPage: true });

  const finalState = await readState(creator, code);
  assert(finalState.body?.evidence?.length === 3, "Test wyszedł poza A-03");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO A-03 E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
