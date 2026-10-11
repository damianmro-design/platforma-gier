import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-first-evidence";
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
  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`);
    players.push(page);
    await joinGuest(page, code, `E2E Dowód ${index + 1}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  const startButton = host.getByRole("button", { name: "START GRY", exact: true });
  await startButton.waitFor({ state: "visible", timeout: 15000 });
  await startButton.click();
  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);

  const initialRoles = [];
  for (const page of players) {
    const state = await readState(page, code);
    assert(state.body?.room?.phase === "akta_osobowe", `Nieoczekiwana faza startowa: ${state.body?.room?.phase}`);
    initialRoles.push(state.body.roleCard.id);
    const opened = await postGame(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się przygotować otwartych akt");
  }

  const toStatements = await postGame(host, code, "advance");
  assert(toStatements.status === 200 && toStatements.body?.phase === "pierwsze_zeznania", `Nie udało się wejść do pierwszych zeznań: ${JSON.stringify(toStatements.body)}`);
  check("przygotowanie zakończone na fazie pierwsze_zeznania");

  await host.reload({ waitUntil: "domcontentloaded" });
  await host.getByText("ETAP 01 · PIERWSZE ZEZNANIA", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  const beforePackage = await readState(host, code);
  assert(beforePackage.body?.room?.phase === "pierwsze_zeznania", "Prowadzący nie jest w pierwszych zeznaniach");
  assert(Array.isArray(beforePackage.body?.evidence) && beforePackage.body.evidence.length === 0, "Dowody są widoczne przed otwarciem paczki A");

  const packageButton = host.getByRole("button", { name: "OTWÓRZ PACZKĘ DOWODOWĄ A →", exact: true });
  await packageButton.waitFor({ state: "visible", timeout: 10000 });
  await packageButton.click();

  let packageState = null;
  const packageDeadline = Date.now() + 10000;
  while (Date.now() < packageDeadline) {
    const state = await readState(host, code);
    if (state.status === 200 && String(state.body?.room?.phase || "").startsWith("dowody_a_")) {
      packageState = state.body;
      break;
    }
    await host.waitForTimeout(200);
  }
  assert(packageState, "Gra nie weszła do Paczki Dowodowej A");
  assert(packageState.evidence.length === 0, `Po samym otwarciu paczki powinno być 0 dowodów, jest ${packageState.evidence.length}`);
  check("Paczka Dowodowa A otwarta bez przedwczesnego ujawnienia dokumentu", packageState.room.phase);

  await host.getByRole("button", { name: "UJAWNIJ KOLEJNY DOWÓD →", exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.getByRole("button", { name: "UJAWNIJ KOLEJNY DOWÓD →", exact: true }).click();

  let firstEvidenceHost = null;
  const evidenceDeadline = Date.now() + 10000;
  while (Date.now() < evidenceDeadline) {
    const state = await readState(host, code);
    if (state.status === 200 && Array.isArray(state.body?.evidence) && state.body.evidence.length === 1) {
      firstEvidenceHost = state.body;
      break;
    }
    await host.waitForTimeout(200);
  }
  assert(firstEvidenceHost, "Pierwszy dowód nie pojawił się u prowadzącego");
  const evidence = firstEvidenceHost.evidence[0];
  assert(evidence?.id && evidence?.no && evidence?.title, "Pierwszy dowód ma niepełne dane");
  assert(String(firstEvidenceHost.room.phase).startsWith("dowody_a_"), "Po pierwszym dowodzie gra opuściła Paczkę A");

  for (let index = 0; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    assert(state.status === 200, `Gracz ${index + 1} nie pobrał stanu po ujawnieniu dowodu`);
    assert(state.body?.roleCard?.id === initialRoles[index], `Rola gracza ${index + 1} zmieniła się po ujawnieniu dowodu`);
    assert(Array.isArray(state.body?.evidence) && state.body.evidence.length === 1, `Gracz ${index + 1} nie widzi dokładnie 1 dowodu`);
    assert(state.body.evidence[0].id === evidence.id, `Gracz ${index + 1} widzi inny dowód niż prowadzący`);
  }

  await players[0].getByText(evidence.title, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-first-evidence-host.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-first-evidence-player.png`, fullPage: true });
  check("pierwszy dowód ujawniony równocześnie prowadzącemu i wszystkim 5 graczom", { id: evidence.id, no: evidence.no, title: evidence.title });

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 FIRST EVIDENCE E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
