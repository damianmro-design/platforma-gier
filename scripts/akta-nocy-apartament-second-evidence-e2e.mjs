import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-second-evidence";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function state(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/akta-nocy/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
}

async function post(page, code, action) {
  return page.evaluate(async ({ roomCode, actionName }) => {
    const response = await fetch(`/api/gra/akta-nocy/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { roomCode: code, actionName: action });
}

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
}

async function waitForEvidenceCount(page, code, count, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const current = await state(page, code);
    if (
      current.status === 200 &&
      String(current.body?.room?.phase || "").startsWith("dowody_a_") &&
      Array.isArray(current.body?.evidence) &&
      current.body.evidence.length === count
    ) return current.body;
    await page.waitForTimeout(200);
  }
  return null;
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
    await joinGuest(page, code, `E2E Dowód2 ${index + 1}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await host.getByRole("button", { name: "START GRY", exact: true }).click();
  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);

  const initialRoles = [];
  for (const page of players) {
    const current = await state(page, code);
    assert(current.body?.room?.phase === "akta_osobowe", `Nieoczekiwana faza startowa: ${current.body?.room?.phase}`);
    initialRoles.push(current.body.roleCard.id);
    const opened = await post(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt gracza");
  }

  const toStatements = await post(host, code, "advance");
  assert(toStatements.status === 200 && toStatements.body?.phase === "pierwsze_zeznania", "Nie udało się wejść do pierwszych zeznań");

  await host.reload({ waitUntil: "domcontentloaded" });
  await host.getByRole("button", { name: "OTWÓRZ PACZKĘ DOWODOWĄ A →", exact: true }).click();

  const firstState = await waitForEvidenceCount(host, code, 1);
  assert(firstState, "Pierwszy dowód Paczki A nie pojawił się");
  const firstEvidence = firstState.evidence[0];
  check("pierwszy dowód widoczny przed ujawnieniem drugiego", { id: firstEvidence.id, title: firstEvidence.title });

  const secondButton = host.getByRole("button", { name: "UJAWNIJ KOLEJNY DOWÓD →", exact: true });
  await secondButton.waitFor({ state: "visible", timeout: 10000 });
  await secondButton.click();

  const secondState = await waitForEvidenceCount(host, code, 2);
  assert(secondState, "Kliknięcie kolejnego dowodu nie ujawniło dokładnie 2 dowodów");
  const [firstAfter, secondEvidence] = secondState.evidence;
  assert(firstAfter.id === firstEvidence.id, "Pierwszy dowód zniknął lub zmienił się po ujawnieniu drugiego");
  assert(secondEvidence?.id && secondEvidence.id !== firstEvidence.id, "Drugi dowód nie jest nowym, odrębnym dowodem");
  assert(secondEvidence?.no && secondEvidence?.title, "Drugi dowód ma niepełne dane");

  for (let index = 0; index < players.length; index += 1) {
    const current = await state(players[index], code);
    assert(current.status === 200, `Gracz ${index + 1} nie pobrał stanu po drugim dowodzie`);
    assert(current.body?.roleCard?.id === initialRoles[index], `Rola gracza ${index + 1} zmieniła się po drugim dowodzie`);
    assert(Array.isArray(current.body?.evidence) && current.body.evidence.length === 2, `Gracz ${index + 1} nie widzi dokładnie 2 dowodów`);
    assert(current.body.evidence[0].id === firstEvidence.id, `Gracz ${index + 1} utracił pierwszy dowód`);
    assert(current.body.evidence[1].id === secondEvidence.id, `Gracz ${index + 1} widzi inny drugi dowód niż prowadzący`);
  }

  await host.getByText(secondEvidence.title, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByText(secondEvidence.title, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await host.screenshot({ path: `${artifacts}/01-second-evidence-host.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-second-evidence-player.png`, fullPage: true });
  check("drugi dowód widoczny u prowadzącego i wszystkich 5 graczy", {
    first: { id: firstEvidence.id, no: firstEvidence.no, title: firstEvidence.title },
    second: { id: secondEvidence.id, no: secondEvidence.no, title: secondEvidence.title },
    phase: secondState.room.phase,
  });

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 SECOND EVIDENCE E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
