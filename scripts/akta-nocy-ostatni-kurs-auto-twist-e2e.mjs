import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-twist";
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
    if (!url.includes("qrserver.com") && !url.includes("favicon")) {
      errors.push(`${label} HTTP ${response.status()}: ${url}`);
    }
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

async function readyAll(players, code, nextPhase) {
  for (const page of players) {
    const result = await action(page, code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Gotowość do ${nextPhase} nie powiodła się`);
  }
  return Promise.all(players.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === nextPhase,
    `${nextPhase} gracza ${index + 1}`,
  )));
}

const phasePath = [
  "ok_ostatni_raz",
  "ok_a_1",
  "ok_a_2",
  "ok_a_3",
  "ok_a_4",
  "ok_a_5",
  "ok_mapa",
  "ok_przesluchania",
  "ok_b_1",
  "ok_b_2",
  "ok_b_3",
  "ok_b_4",
  "ok_b_5",
];

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
  await join(creator, code, "E2E Trop 1");

  for (let i = 2; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${i}`, errors);
    await join(page, code, `E2E Trop ${i}`);
  }

  await Promise.all(pages.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await Promise.all(pages.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 25000 })));

  const startStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_akta_osobowe" && body?.role === "player",
    `ok_akta_osobowe gracza ${index + 1}`,
  )));
  const roleIds = startStates.map(item => item.roleCard.id);

  for (const page of pages) {
    const opened = await action(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }

  for (const phase of phasePath) {
    await readyAll(pages, code, phase);
  }

  const b5States = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_b_5" && body?.evidence?.length === 10 && body?.roleCard?.id === roleIds[index],
    `ok_b_5 gracza ${index + 1}`,
  )));

  for (let index = 0; index < b5States.length; index += 1) {
    assert(b5States[index].evidence[9]?.id === "corridor-audio", `Gracz ${index + 1} nie ma B-05 jako ostatniego materiału`);
    assert(b5States[index].ready?.ready_players === 0, `B-05 nie startuje od 0/5 u gracza ${index + 1}`);
  }
  check("B-05 jest kompletne i startuje od 0/5");

  for (let index = 0; index < 4; index += 1) {
    const result = await action(pages[index], code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Nie udało się zapisać ${index + 1}/5`);
    await waitState(
      pages[index],
      code,
      body => body?.room?.phase === "ok_b_5" && body?.ready?.ready_players === index + 1 && body?.evidence?.length === 10,
      `ok_b_5 ${index + 1}/5`,
    );
    const observer = await state(pages[4], code);
    assert(observer.body?.room?.phase === "ok_b_5", `Nowy trop pojawił się za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.evidence?.length === 10, `Materiały zmieniły się za wcześnie przy ${index + 1}/5`);
  }
  check("1/5–4/5 pozostaje na B-05 bez nowego tropu");

  const fifth = await action(pages[4], code, "ready");
  assert(fifth.status === 200 && fifth.body?.ok === true, "5. gotowość na B-05 nie została zapisana");

  const twistStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_nowy_trop" && body?.evidence?.length === 11 && body?.evidence?.[10]?.id === "platform-return" && body?.roleCard?.id === roleIds[index],
    `ok_nowy_trop gracza ${index + 1}`,
  )));

  for (let index = 0; index < twistStates.length; index += 1) {
    const current = twistStates[index];
    assert(current.evidence[10].title === "Drugi kąt kamery peronowej", `Gracz ${index + 1} ma inny nowy trop`);
    assert(current.ready?.ready_players === 0, `Nowy trop nie wyzerował gotowości u gracza ${index + 1}`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check("5/5 ujawnia T-01 wszystkim graczom");

  for (const page of pages) {
    await page.getByText("06 · NOWY TROP", { exact: true }).waitFor({ timeout: 10000 });
    await page.getByText("Drugi kąt kamery peronowej", { exact: true }).first().waitFor({ timeout: 10000 });
  }

  await creator.screenshot({ path: `${artifacts}/01-new-clue.png`, fullPage: true });
  await pages[1].screenshot({ path: `${artifacts}/02-new-clue-second-phone.png`, fullPage: true });

  const finalState = await state(creator, code);
  assert(finalState.body?.room?.phase === "ok_nowy_trop", "Test wyszedł poza Nowy trop");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs TWIST E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
