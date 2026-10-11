import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-dossiers";
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

  const contexts = [];
  const players = [];
  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`);
    contexts.push(context);
    players.push(page);
    await joinGuest(page, code, `E2E Akta ${index + 1}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  const startButton = host.getByRole("button", { name: "START GRY", exact: true });
  await startButton.waitFor({ state: "visible", timeout: 15000 });
  assert(await startButton.isEnabled(), "START GRY jest nieaktywny");
  await startButton.click();

  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);

  const hostInitial = await readState(host, code);
  assert(hostInitial.status === 200 && hostInitial.body?.role === "host", "Brak stanu prowadzącego");
  assert(hostInitial.body.room.phase === "akta_osobowe", `Nieoczekiwana faza początkowa: ${hostInitial.body.room.phase}`);
  assert(hostInitial.body.progress.length === 5, "Prowadzący nie widzi 5 graczy");
  assert(hostInitial.body.progress.every(item => item.dossier_opened === false), "Akta są otwarte przed działaniem graczy");
  assert(Array.isArray(hostInitial.body.evidence) && hostInitial.body.evidence.length === 0, "Dowody są ujawnione za wcześnie");

  const initialRoleIds = [];
  for (const page of players) {
    const state = await readState(page, code);
    assert(state.status === 200 && state.body?.role === "player", "Brak stanu gracza po starcie");
    initialRoleIds.push(state.body.roleCard.id);
    assert(state.body.roleCard.dossierOpened === false, "Akta gracza są oznaczone jako otwarte przed kliknięciem");
    assert(Array.isArray(state.body.evidence) && state.body.evidence.length === 0, "Gracz widzi dowody przed ich ujawnieniem");
  }
  check("faza akta_osobowe, wszystkie akta początkowo zamknięte");

  for (let index = 0; index < players.length; index += 1) {
    const page = players[index];
    const openButton = page.getByRole("button", { name: "OTWÓRZ AKTA", exact: true });
    await openButton.waitFor({ state: "visible", timeout: 10000 });
    await openButton.click();
    await page.getByRole("button", { name: "UKRYJ AKTA", exact: true }).waitFor({ state: "visible", timeout: 10000 });

    const state = await readState(page, code);
    assert(state.body?.roleCard?.dossierOpened === true, `Otwarcie akt nie zapisało się dla gracza ${index + 1}`);
    assert(state.body.roleCard.id === initialRoleIds[index], `Rola gracza ${index + 1} zmieniła się po otwarciu akt`);
    await page.getByRole("button", { name: "UKRYJ AKTA", exact: true }).click();
  }

  const hostOpened = await readState(host, code);
  assert(hostOpened.body?.progress?.length === 5, "Brak postępu prowadzącego po otwarciu akt");
  assert(hostOpened.body.progress.every(item => item.dossier_opened === true), "Prowadzący nie widzi wszystkich akt jako otwartych");
  check("wszyscy 5 gracze otworzyli własne akta, role pozostały bez zmian");

  await host.getByText("5/5", { exact: false }).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const statementsButton = host.getByRole("button", { name: "ROZPOCZNIJ ZEZNANIA →", exact: true });
  await statementsButton.waitFor({ state: "visible", timeout: 10000 });
  assert(await statementsButton.isEnabled(), "Przycisk pierwszych zeznań nie odblokował się po otwarciu wszystkich akt");
  await host.screenshot({ path: `${artifacts}/01-all-dossiers-open.png`, fullPage: true });
  await statementsButton.click();

  const deadline = Date.now() + 15000;
  let hostStatements = null;
  while (Date.now() < deadline) {
    const state = await readState(host, code);
    if (state.status === 200 && state.body?.room?.phase === "pierwsze_zeznania") {
      hostStatements = state.body;
      break;
    }
    await host.waitForTimeout(250);
  }
  assert(hostStatements, "Gra nie przeszła do fazy pierwsze_zeznania");
  assert(Array.isArray(hostStatements.evidence) && hostStatements.evidence.length === 0, "Dowody zostały ujawnione już przy pierwszych zeznaniach");

  await host.getByText("ETAP 01 · PIERWSZE ZEZNANIA", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  for (let index = 0; index < players.length; index += 1) {
    const page = players[index];
    await page.getByText("Opowiedz swoją wersję nocy.", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    const state = await readState(page, code);
    assert(state.body?.room?.phase === "pierwsze_zeznania", `Gracz ${index + 1} nie przeszedł do pierwszych zeznań`);
    assert(state.body.roleCard.id === initialRoleIds[index], `Rola gracza ${index + 1} zmieniła się przy przejściu fazy`);
    assert(state.body.roleCard.dossierOpened === true, `Status otwartych akt zniknął u gracza ${index + 1}`);
    assert(Array.isArray(state.body.evidence) && state.body.evidence.length === 0, `Gracz ${index + 1} widzi dowody przed paczką A`);
  }

  await host.screenshot({ path: `${artifacts}/02-first-statements-host.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/03-first-statements-player.png`, fullPage: true });
  check("przejście do pierwszych zeznań działa, role i prywatność pozostają zachowane");

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 DOSSIERS E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
