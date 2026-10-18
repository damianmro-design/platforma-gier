import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-close";
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
  const lobby = await page.evaluate(async roomCode => {
    const response = await fetch(`/api/pokoj/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
  const recoveryCode = lobby.body?.recoveryCode;
  assert(lobby.status === 200 && /^[A-Z0-9]{6}$/.test(recoveryCode ?? ""), `Brak poprawnego kodu powrotu dla ${name}`);
  return recoveryCode;
}

async function state(page, code) {
  return page.evaluate(async roomCode => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, code);
}

async function action(page, code, name, payload = {}) {
  return page.evaluate(async ({ code, name, payload }) => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: name, ...payload }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { code, name, payload });
}

async function waitState(page, code, predicate, label, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    try {
      last = await state(page, code);
      if (last.status === 200 && predicate(last.body)) return last.body;
    } catch {}
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}. Last=${JSON.stringify(last)}`);
}

async function readyAll(pages, code, targetPhase) {
  for (const page of pages) {
    const result = await action(page, code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Gotowość do ${targetPhase} nie powiodła się: ${JSON.stringify(result)}`);
  }
  return Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === targetPhase,
    `${targetPhase} gracza ${index + 1}`,
  )));
}

const phasePath = [
  "ok_ostatni_raz",
  "ok_a_1", "ok_a_2", "ok_a_3", "ok_a_4", "ok_a_5",
  "ok_mapa", "ok_przesluchania",
  "ok_b_1", "ok_b_2", "ok_b_3", "ok_b_4", "ok_b_5",
  "ok_nowy_trop", "ok_rekonstrukcja",
];

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = { baseURL, roomCode: null, checks: [], errors };
const check = label => report.checks.push({ label, at: new Date().toISOString() });

try {
  const pages = [];
  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${index + 1}`, errors);
  }

  const creator = pages[0];
  await creator.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await creator.getByRole("button", { name: "BEZ PROWADZĄCEGO", exact: true }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 45000 });
  const code = creator.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;

  const names = [];
  const recoveryCodes = [];
  for (let index = 0; index < pages.length; index += 1) {
    const name = `E2E Close ${index + 1}`;
    names.push(name);
    recoveryCodes.push(await join(pages[index], code, name));
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
    assert(opened.status === 200 && opened.body?.ok === true, `Nie udało się otworzyć akt: ${JSON.stringify(opened)}`);
  }
  for (const phase of phasePath) await readyAll(pages, code, phase);

  const reconstructionStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja" && body?.roleCard?.id === roleIds[index],
    `rekonstrukcja gracza ${index + 1}`,
  )));
  const eventOrder = (reconstructionStates[0].reconstructionOptions ?? []).slice(0, 9).map(item => item.key);
  assert(eventOrder.length === 9, "Brak 9 opcji rekonstrukcji");
  const route = ["w1", "w2", "w3", "w4"];

  for (let index = 0; index < pages.length; index += 1) {
    const result = await action(pages[index], code, "submitReconstruction", { eventOrder, route });
    assert(result.status === 200 && result.body?.ok === true, `Rekonstrukcja ${index + 1}/5 nie została zapisana: ${JSON.stringify(result)}`);
  }
  await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja_wynik" && body?.reconstruction?.total === 5 && body?.roleCard?.id === roleIds[index],
    `wynik rekonstrukcji gracza ${index + 1}`,
  )));

  const accusationStates = await readyAll(pages, code, "ok_oskarzenie");
  for (let index = 0; index < pages.length; index += 1) {
    const current = accusationStates[index];
    const suspect = current.cast.find(item => item.playerId !== current.player?.playerId);
    const motive = current.motiveOptions[index % current.motiveOptions.length];
    const evidence = current.evidenceOptions[index % current.evidenceOptions.length];
    const disappearance = current.disappearanceOptions[index % current.disappearanceOptions.length];
    assert(suspect?.playerId && motive?.key && evidence?.id && disappearance?.key, `Niekompletne opcje oskarżenia gracza ${index + 1}`);
    const result = await action(pages[index], code, "submitAccusation", {
      suspectPlayerId: suspect.playerId,
      motiveKey: motive.key,
      evidenceId: evidence.id,
      disappearanceKey: disappearance.key,
    });
    assert(result.status === 200 && result.body?.ok === true, `Oskarżenie ${index + 1}/5 nie zostało zapisane: ${JSON.stringify(result)}`);
  }

  await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_oskarzenie_wynik" && body?.accusations?.total === 5 && body?.roleCard?.id === roleIds[index],
    `wynik oskarżeń gracza ${index + 1}`,
  )));

  await readyAll(pages, code, "ok_ujawnienie_1");
  await readyAll(pages, code, "ok_ujawnienie_2");
  await readyAll(pages, code, "ok_ujawnienie_3");
  await readyAll(pages, code, "ok_ujawnienie_4");
  const revealFiveStates = await readyAll(pages, code, "ok_ujawnienie_5");

  for (let index = 0; index < revealFiveStates.length; index += 1) {
    const current = revealFiveStates[index];
    assert(current.role === "player", `Gracz ${index + 1}: zły typ sesji przed zamknięciem`);
    assert(current.room?.phase === "ok_ujawnienie_5" && current.room?.status === "active", `Gracz ${index + 1}: zły stan przed zamknięciem`);
    assert(current.reveal?.step === 5, `Gracz ${index + 1}: brak finalnego ujawnienia`);
    assert(current.roleCard?.id === roleIds[index], `Gracz ${index + 1}: zmieniła się rola przed zamknięciem`);
    assert(current.evidence?.length === 11, `Gracz ${index + 1}: brakuje materiałów przed zamknięciem`);
  }
  await Promise.all(pages.map(page => page.getByRole("button", { name: "ZAMKNIJ SPRAWĘ →", exact: true }).waitFor({ state: "visible", timeout: 15000 })));
  check("Część 5 jest aktywna na wszystkich 5 telefonach, przycisk zamknięcia widoczny");

  await pages[0].getByRole("button", { name: "ZAMKNIJ SPRAWĘ →", exact: true }).click();

  const closedStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.role === "closed" && body?.room?.phase === "ok_zamknieta" && body?.room?.status === "finished",
    `zamknięta sprawa gracza ${index + 1}`,
    45000,
  )));
  assert(closedStates.every(item => item.playMode === "auto"), "Po zamknięciu zmienił się tryb gry");
  check("Jedno zamknięcie przełącza wszystkie istniejące sesje na finished / ok_zamknieta");

  await Promise.all(pages.map(page => page.getByText("N417 dotarł do końca trasy.", { exact: true }).waitFor({ timeout: 20000 })));
  await Promise.all(pages.map(page => page.getByText("Ostatni Kurs został formalnie zakończony. Wszystkie odpowiedzi są zamknięte.", { exact: true }).waitFor({ timeout: 20000 })));
  await Promise.all(pages.map(page => page.getByRole("link", { name: "WRÓĆ DO zaGRAJ", exact: true }).waitFor({ state: "visible", timeout: 20000 })));
  assert(await pages[0].getByRole("button", { name: "ZAMKNIJ SPRAWĘ →", exact: true }).count() === 0, "Przycisk zamknięcia pozostał po finished");
  check("Wszystkie telefony pokazują finalny ekran zamkniętej sprawy");

  await pages[0].screenshot({ path: `${artifacts}/01-closed-player-one.png`, fullPage: true });
  await pages[4].screenshot({ path: `${artifacts}/02-closed-player-five.png`, fullPage: true });

  await Promise.all(pages.map(page => page.reload({ waitUntil: "domcontentloaded", timeout: 60000 })));
  await Promise.all(pages.map(page => page.getByText("N417 dotarł do końca trasy.", { exact: true }).waitFor({ timeout: 20000 })));
  const refreshedStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.role === "closed" && body?.room?.phase === "ok_zamknieta" && body?.room?.status === "finished",
    `zamknięta sprawa po refreshu gracza ${index + 1}`,
  )));
  assert(refreshedStates.every(item => item.playMode === "auto"), "Po refreshu zmienił się tryb gry");
  await pages[0].screenshot({ path: `${artifacts}/03-closed-after-refresh.png`, fullPage: true });
  check("Po pełnym refreshu wszystkie 5 istniejących sesji pozostaje w closed / finished / ok_zamknieta");

  await pages[0].goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await pages[0].waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 });
  await pages[0].getByText("N417 dotarł do końca trasy.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  check("Istniejąca sesja otwierająca adres pokoju po finished wraca automatycznie na finalny ekran sprawy");

  const rejoinContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const rejoin = await rejoinContext.newPage();
  watch(rejoin, "closed-rejoin", errors);
  await rejoin.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await rejoin.getByText("SPRAWA ZAKOŃCZONA", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await rejoin.getByText("Akta są już zamknięte.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await rejoin.locator("#finishedRecoverName").fill(names[0]);
  await rejoin.locator("#finishedRecoverCode").fill(recoveryCodes[0]);
  await rejoin.getByRole("button", { name: "WRÓĆ DO ZAMKNIĘTYCH AKT", exact: true }).click();
  await rejoin.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 });
  await rejoin.getByText("N417 dotarł do końca trasy.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });

  const rejoinedState = await state(rejoin, code);
  assert(rejoinedState.status === 200, `Powrót do zamkniętego Ostatniego Kursu zwrócił HTTP ${rejoinedState.status}`);
  assert(rejoinedState.body?.role === "closed", `Po ponownym wejściu gracz dostał rolę ${rejoinedState.body?.role} zamiast closed`);
  assert(rejoinedState.body?.playMode === "auto", `Po ponownym wejściu tryb to ${rejoinedState.body?.playMode} zamiast auto`);
  assert(rejoinedState.body?.room?.status === "finished", `Po ponownym wejściu status to ${rejoinedState.body?.room?.status} zamiast finished`);
  assert(rejoinedState.body?.room?.phase === "ok_zamknieta", `Po ponownym wejściu faza to ${rejoinedState.body?.room?.phase} zamiast ok_zamknieta`);
  await rejoin.screenshot({ path: `${artifacts}/04-closed-fresh-session-rejoin.png`, fullPage: true });
  check("Nowa sesja bez cookies odzyskuje zamkniętą sprawę przez rzeczywisty formularz UI i trafia wyłącznie do closed / finished / ok_zamknieta");

  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs CLOSED REJOIN UI E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
