import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-apartament-fourth-evidence";
await fs.mkdir(artifacts, { recursive: true });

const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function state(page, code) {
  return page.evaluate(async roomCode => {
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
    if (current.status === 200 && String(current.body?.room?.phase || "").startsWith("dowody_a_") && current.body?.evidence?.length === count) return current.body;
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
  const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  watch(host, "host");
  await host.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await host.getByRole("button", { name: "UTWÓRZ POKÓJ", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;

  const players = [];
  for (let index = 0; index < 5; index += 1) {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
    watch(page, `player-${index + 1}`);
    players.push(page);
    await joinGuest(page, code, `E2E Dowód4 ${index + 1}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await host.getByRole("button", { name: "START GRY", exact: true }).click();
  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })),
  ]);

  const roles = [];
  for (const page of players) {
    const current = await state(page, code);
    roles.push(current.body?.roleCard?.id);
    const opened = await post(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt gracza");
  }

  assert((await post(host, code, "advance")).body?.phase === "pierwsze_zeznania", "Nie udało się wejść do pierwszych zeznań");
  assert(String((await post(host, code, "advance")).body?.phase || "").startsWith("dowody_a_"), "Nie udało się otworzyć Paczki A");
  assert(await waitForEvidenceCount(host, code, 1), "A-01 nie pojawił się");
  assert((await post(host, code, "revealEvidenceA")).body?.ok === true, "Nie udało się ujawnić A-02");
  assert(await waitForEvidenceCount(host, code, 2), "A-02 nie pojawił się");
  assert((await post(host, code, "revealEvidenceA")).body?.ok === true, "Nie udało się ujawnić A-03");
  const thirdState = await waitForEvidenceCount(host, code, 3);
  assert(thirdState, "A-03 nie pojawił się");
  const firstThreeIds = thirdState.evidence.map(item => item.id);

  await host.reload({ waitUntil: "domcontentloaded" });
  const fourthButton = host.getByRole("button", { name: "UJAWNIJ KOLEJNY DOWÓD →", exact: true });
  await fourthButton.waitFor({ state: "visible", timeout: 10000 });
  await fourthButton.click();

  const fourthState = await waitForEvidenceCount(host, code, 4);
  assert(fourthState, "Kliknięcie nie ujawniło dokładnie 4 dowodów");
  const fourthEvidence = fourthState.evidence[3];
  assert(fourthEvidence?.id === "missing-drive", `Nieoczekiwany 4. dowód: ${fourthEvidence?.id}`);
  assert(fourthEvidence?.no === "A-04", `Nieoczekiwany numer 4. dowodu: ${fourthEvidence?.no}`);
  assert(fourthEvidence?.title === "Puste etui po pendrivie", `Nieoczekiwany tytuł 4. dowodu: ${fourthEvidence?.title}`);
  assert(fourthState.evidence.slice(0, 3).every((item, index) => item.id === firstThreeIds[index]), "Pierwsze 3 dowody zmieniły się po ujawnieniu A-04");

  for (let index = 0; index < players.length; index += 1) {
    const current = await state(players[index], code);
    assert(current.body?.roleCard?.id === roles[index], `Rola gracza ${index + 1} zmieniła się`);
    assert(current.body?.evidence?.length === 4, `Gracz ${index + 1} nie widzi dokładnie 4 dowodów`);
    assert(current.body.evidence[3].id === "missing-drive", `Gracz ${index + 1} widzi inny A-04`);
  }

  await host.getByText("Puste etui po pendrivie", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await players[0].getByText("Puste etui po pendrivie", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  const interrogationButton = host.getByRole("button", { name: "ROZPOCZNIJ PRZESŁUCHANIA →", exact: true });
  await interrogationButton.waitFor({ state: "visible", timeout: 10000 });
  const stillEvidence = await state(host, code);
  assert(String(stillEvidence.body?.room?.phase || "").startsWith("dowody_a_"), "Gra przeszła do przesłuchań bez kliknięcia prowadzącego");

  await host.screenshot({ path: `${artifacts}/01-fourth-evidence-host.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-fourth-evidence-player.png`, fullPage: true });
  check("A-04 widoczny u prowadzącego i 5 graczy, przesłuchania czekają na osobny przycisk", { id: fourthEvidence.id, no: fourthEvidence.no, title: fourthEvidence.title, phase: fourthState.room.phase });

  assert(errors.length === 0, `Błędy przeglądarki:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Apartament 214 FOURTH EVIDENCE E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
