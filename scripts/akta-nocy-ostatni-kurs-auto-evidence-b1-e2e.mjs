import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-evidence-b1";
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
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const current = await state(page, code);
      if (current.status === 200 && predicate(current.body)) return current.body;
    } catch {}
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}`);
}

async function readyAll(players, code) {
  for (const page of players) {
    const result = await action(page, code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Gotowość nie powiodła się: ${JSON.stringify(result.body)}`);
  }
}

async function readyAndWait(players, code, phase) {
  await readyAll(players, code);
  return Promise.all(players.map(page => waitState(page, code, body => body?.room?.phase === phase, phase)));
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = { baseURL, roomCode: null, checks: [], errors };
const check = label => report.checks.push({ label, at: new Date().toISOString() });

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
  await join(creator, code, "E2E B1 1");

  for (let i = 2; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${i}`, errors);
    await join(page, code, `E2E B1 ${i}`);
  }

  await Promise.all(pages.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await Promise.all(pages.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 25000 })));

  const startStates = await Promise.all(pages.map(page => waitState(page, code, body => body?.room?.phase === "ok_akta_osobowe" && body?.role === "player", "ok_akta_osobowe")));
  const roleIds = startStates.map(item => item.roleCard.id);

  for (const page of pages) {
    const opened = await action(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }

  await readyAndWait(pages, code, "ok_ostatni_raz");
  await readyAndWait(pages, code, "ok_a_1");
  await readyAndWait(pages, code, "ok_a_2");
  await readyAndWait(pages, code, "ok_a_3");
  await readyAndWait(pages, code, "ok_a_4");
  await readyAndWait(pages, code, "ok_a_5");
  await readyAndWait(pages, code, "ok_mapa");
  const interrogationStates = await readyAndWait(pages, code, "ok_przesluchania");

  for (let index = 0; index < interrogationStates.length; index += 1) {
    const current = interrogationStates[index];
    assert(current.ready?.ready_players === 0, `Przesłuchania nie zaczynają od 0/5 u gracza ${index + 1}`);
    assert(current.evidence?.length === 5, `Gracz ${index + 1} nie ma kompletnej Paczki A`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("przesłuchania startują od 0/5 z Paczką A");

  for (let index = 0; index < 4; index += 1) {
    const result = await action(pages[index], code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Nie udało się zapisać ${index + 1}/5 po przesłuchaniach`);
    await waitState(pages[index], code, body => body?.room?.phase === "ok_przesluchania" && body?.ready?.ready_players === index + 1, `przesłuchania ${index + 1}/5`);
    const observer = await state(pages[4], code);
    assert(observer.body?.room?.phase === "ok_przesluchania", `B-01 pojawił się za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.evidence?.length === 5, `Paczka A zmieniła się przy ${index + 1}/5`);
  }
  check("1/5–4/5 pozostaje w przesłuchaniach");

  const finalReady = await action(pages[4], code, "ready");
  assert(finalReady.status === 200 && finalReady.body?.ok === true, "5. gotowość przesłuchań nie została zapisana");

  const b01States = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_b_1" && body?.evidence?.length === 6 && body?.evidence?.[5]?.id === "receipt-metadata" && body?.roleCard?.id === roleIds[index],
    `B-01 gracza ${index + 1}`,
  )));

  const expectedIds = ["train-map", "manifest", "platform-coat", "master-key", "restaurant-receipt", "receipt-metadata"];
  for (let index = 0; index < b01States.length; index += 1) {
    const current = b01States[index];
    assert(JSON.stringify(current.evidence.map(item => item.id)) === JSON.stringify(expectedIds), `Gracz ${index + 1} ma zły zestaw dowodów`);
    assert(current.evidence[5].title === "Metadane transakcji POS-3", `Gracz ${index + 1} ma inny B-01`);
    assert(current.ready?.ready_players === 0, `B-01 nie wyzerował gotowości u gracza ${index + 1}`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("5/5 ujawnia dokładnie B-01 wszystkim graczom");

  for (const page of pages) {
    await page.getByText("Metadane transakcji POS-3", { exact: true }).first().waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/01-b01.png`, fullPage: true });
  await pages[1].screenshot({ path: `${artifacts}/02-b01-second-phone.png`, fullPage: true });

  const finalState = await state(creator, code);
  assert(finalState.body?.room?.phase === "ok_b_1", "Test wyszedł poza B-01");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs AUTO B-01 E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
