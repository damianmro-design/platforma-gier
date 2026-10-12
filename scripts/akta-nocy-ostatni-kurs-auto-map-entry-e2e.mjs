import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-map-entry";
await fs.mkdir(artifacts, { recursive: true });

function assert(value, message) {
  if (!value) throw new Error(message);
}

function watch(page, label, errors) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon") || text.includes("qrserver") || text.startsWith("Failed to load resource:")) return;
    errors.push(`${label} console: ${text}`);
  });
  page.on("response", response => {
    if (response.status() < 500) return;
    const url = response.url();
    if (!url.includes("qrserver.com") && !url.includes("favicon")) errors.push(`${label} HTTP ${response.status()}: ${url}`);
  });
}

async function join(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
}

async function state(page, code) {
  return page.evaluate(async roomCode => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
}

async function action(page, code, name) {
  return page.evaluate(async ({ code, name }) => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: name }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { code, name });
}

async function waitState(page, code, predicate, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const current = await state(page, code);
      if (current.status === 200 && predicate(current.body)) return current.body;
    } catch {}
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}`);
}

async function allReady(players, code) {
  for (const page of players) {
    const result = await action(page, code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Gotowość nie powiodła się: ${JSON.stringify(result.body)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = { baseURL, roomCode: null, checks: [], errors };
const check = (label) => report.checks.push({ label, at: new Date().toISOString() });

try {
  const pages = [];
  const creatorContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const creator = await creatorContext.newPage();
  pages.push(creator);
  watch(creator, "creator", errors);

  await creator.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await creator.getByRole("button", { name: "BEZ PROWADZĄCEGO", exact: true }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = creator.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;
  await join(creator, code, "E2E Mapa 1");

  for (let i = 2; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${i}`, errors);
    await join(page, code, `E2E Mapa ${i}`);
  }

  await Promise.all(pages.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await Promise.all(pages.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 25000 })));

  const startStates = await Promise.all(pages.map(page => waitState(page, code, body => body?.room?.phase === "ok_akta_osobowe" && body?.role === "player", "start")));
  const roleIds = startStates.map(item => item.roleCard.id);

  for (const page of pages) {
    const opened = await action(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }
  await allReady(pages, code);
  await Promise.all(pages.map(page => waitState(page, code, body => body?.room?.phase === "ok_ostatni_raz", "ok_ostatni_raz")));
  await allReady(pages, code);

  for (let evidenceCount = 1; evidenceCount <= 5; evidenceCount += 1) {
    await Promise.all(pages.map(page => waitState(page, code, body => body?.evidence?.length === evidenceCount, `A-${evidenceCount}`)));
    if (evidenceCount < 5) await allReady(pages, code);
  }

  const a05 = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_a_5" && body?.evidence?.length === 5 && body?.roleCard?.id === roleIds[index],
    `A-05 gracza ${index + 1}`,
  )));
  assert(a05.every(item => item.ready?.ready_players === 0), "A-05 nie zaczyna od 0/5");
  check("A-05 startuje od 0/5");

  for (let index = 0; index < 4; index += 1) {
    const result = await action(pages[index], code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Nie udało się ustawić ${index + 1}/5`);
    const current = await waitState(pages[index], code, body => body?.room?.phase === "ok_a_5" && body?.ready?.ready_players === index + 1, `${index + 1}/5`);
    assert(current.evidence.length === 5, "Paczka A zmieniła się przed 5/5");
    const observer = await state(pages[4], code);
    assert(observer.body?.room?.phase === "ok_a_5", `Mapa otworzyła się za wcześnie przy ${index + 1}/5`);
  }
  check("1/5–4/5 pozostaje w ok_a_5");

  const finalReady = await action(pages[4], code, "ready");
  assert(finalReady.status === 200 && finalReady.body?.ok === true, "5. gotowość nie została zapisana");

  const mapStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_mapa" && body?.evidence?.length === 5 && body?.roleCard?.id === roleIds[index],
    `ok_mapa gracza ${index + 1}`,
  )));

  for (let index = 0; index < mapStates.length; index += 1) {
    assert(mapStates[index].ready?.ready_players === 0, `Mapa nie wyzerowała gotowości gracza ${index + 1}`);
    assert(Array.isArray(mapStates[index].map?.rules) && mapStates[index].map.rules.length > 0, `Brak zasad mapy u gracza ${index + 1}`);
    assert(mapStates[index].roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("5/5 przełącza wszystkich do ok_mapa");

  for (const page of pages) {
    await page.getByText("03 · PIERWSZA REKONSTRUKCJA", { exact: true }).first().waitFor({ timeout: 10000 });
    await page.getByText("Sprawdźcie trasy na mapie pociągu.", { exact: true }).waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/01-map-entry.png`, fullPage: true });
  await pages[1].screenshot({ path: `${artifacts}/02-map-entry-second-phone.png`, fullPage: true });

  const finalState = await state(creator, code);
  assert(finalState.body?.room?.phase === "ok_mapa", "Test wyszedł poza pierwszą rekonstrukcję");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO MAP ENTRY E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
