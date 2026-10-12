import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-last-seen";
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

async function waitForState(page, code, predicate, label, timeout = 18000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const state = await readState(page, code);
      if (state.status === 200 && predicate(state.body)) return state.body;
    } catch {
      // Krótka nawigacja pomiędzy lobby i grą może przerwać pojedynczy fetch.
    }
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

  const names = ["E2E Zeznanie 1", "E2E Zeznanie 2", "E2E Zeznanie 3", "E2E Zeznanie 4", "E2E Zeznanie 5"];
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
    body => body?.playMode === "auto" && body?.role === "player" && body?.room?.phase === "ok_akta_osobowe",
    "ok_akta_osobowe",
  )));
  const roleIds = startStates.map(body => body.roleCard.id);

  for (let index = 0; index < players.length; index += 1) {
    const page = players[index];
    await page.getByRole("button", { name: "OTWÓRZ MOJE AKTA", exact: true }).click();
    await page.getByRole("button", { name: "PRZECZYTAŁEM AKTA · JESTEM GOTOWY", exact: true }).waitFor({ timeout: 10000 });
  }

  for (let index = 0; index < players.length; index += 1) {
    await players[index].getByRole("button", { name: "PRZECZYTAŁEM AKTA · JESTEM GOTOWY", exact: true }).click();
  }

  const lastSeenStates = await Promise.all(players.map((page, index) => waitForState(
    page,
    code,
    body => body?.room?.phase === "ok_ostatni_raz" && body?.roleCard?.id === roleIds[index],
    `gracz ${index + 1} w ok_ostatni_raz`,
    20000,
  )));
  assert(lastSeenStates.every(body => body.ready?.ready_players === 0), "Nowa faza nie wyzerowała licznika gotowości");
  check("wszyscy weszli do ok_ostatni_raz z licznikiem 0/5");

  for (let index = 0; index < 4; index += 1) {
    await players[index].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();
    const readyState = await waitForState(
      players[index],
      code,
      body => body?.room?.phase === "ok_ostatni_raz" && body?.ready?.ready_players === index + 1 && body?.ready?.player_ready === true,
      `gotowość zeznań ${index + 1}/5`,
    );
    assert(readyState.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po zeznaniu`);

    const observer = await readState(players[4], code);
    assert(observer.body?.room?.phase === "ok_ostatni_raz", `Gra przeszła dalej za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.ready?.ready_players === index + 1, `Licznik gotowości wynosi ${observer.body?.ready?.ready_players}/5 zamiast ${index + 1}/5`);
    assert(Array.isArray(observer.body?.evidence) && observer.body.evidence.length === 0, `Dowód pojawił się przed 5/5 przy ${index + 1}/5`);
  }
  check("przy 1/5–4/5 gra pozostaje w pierwszych zeznaniach, bez dowodów");

  await players[4].getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).click();

  const firstEvidenceStates = await Promise.all(players.map((page, index) => waitForState(
    page,
    code,
    body => body?.role === "player" && body?.room?.phase?.startsWith("ok_a_") && Array.isArray(body?.evidence) && body.evidence.length === 1,
    `gracz ${index + 1} przy pierwszym dowodzie Paczki A`,
    20000,
  )));

  const evidenceId = firstEvidenceStates[0].evidence[0]?.id;
  const evidenceTitle = firstEvidenceStates[0].evidence[0]?.title;
  assert(evidenceId, "Pierwszy materiał Paczki A nie ma identyfikatora");
  assert(evidenceTitle, "Pierwszy materiał Paczki A nie ma tytułu");

  for (let index = 0; index < firstEvidenceStates.length; index += 1) {
    const state = firstEvidenceStates[index];
    assert(state.playMode === "auto", `Gracz ${index + 1} utracił tryb auto`);
    assert(state.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po otwarciu Paczki A`);
    assert(state.evidence.length === 1, `Gracz ${index + 1} widzi ${state.evidence.length} dowodów zamiast 1`);
    assert(state.evidence[0].id === evidenceId, `Gracz ${index + 1} widzi inny pierwszy dowód`);
    assert(state.evidence[0].title === evidenceTitle, `Gracz ${index + 1} widzi inny tytuł pierwszego dowodu`);
    assert(state.ready?.ready_players === 0, `Licznik nowej fazy nie został wyzerowany u gracza ${index + 1}`);
  }
  check("5. gotowość automatycznie otworzyła dokładnie pierwszy materiał Paczki A", { evidenceId, evidenceTitle });

  for (const page of players) {
    await page.getByText(evidenceTitle, { exact: true }).first().waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "GOTOWY · MOŻEMY IŚĆ DALEJ", exact: true }).waitFor({ timeout: 10000 });
  }

  await creator.screenshot({ path: `${artifacts}/01-first-evidence-a.png`, fullPage: true });
  await players[1].screenshot({ path: `${artifacts}/02-second-player-first-evidence-a.png`, fullPage: true });

  const finalState = await readState(creator, code);
  assert(finalState.body?.room?.phase?.startsWith("ok_a_"), "Test wyszedł poza pierwszy materiał Paczki A");
  assert(finalState.body?.evidence?.length === 1, "Test ujawnił więcej niż 1 materiał Paczki A");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);

  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO LAST SEEN E2E PASS room=${code}`);
} catch (error) {
  report.finishedAt = new Date().toISOString();
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
