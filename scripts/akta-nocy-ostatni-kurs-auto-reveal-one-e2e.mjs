import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-reveal-one";
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

async function waitState(page, code, predicate, label, timeout = 20000) {
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
    assert(result.status === 200 && result.body?.ok === true, `Gotowość do ${targetPhase} nie powiodła się`);
  }
  return Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === targetPhase,
    `${targetPhase} gracza ${index + 1}`,
  )));
}

function assertNoCorrectness(summary, label) {
  const forbiddenSummary = ["correctSuspect", "correctMotive", "correctEvidence", "correctDisappearance", "fullyCorrect"];
  const forbiddenRows = ["suspectCorrect", "motiveCorrect", "evidenceCorrect", "disappearanceCorrect", "fullyCorrect"];
  assert(summary?.total === 5, `${label}: brak podsumowania 5/5`);
  assert(summary?.results?.length === 5, `${label}: brak 5 publicznych głosów`);
  for (const key of forbiddenSummary) {
    assert(!Object.prototype.hasOwnProperty.call(summary, key), `${label}: ujawniono ${key}`);
  }
  for (const row of summary.results) {
    for (const key of forbiddenRows) {
      assert(!Object.prototype.hasOwnProperty.call(row, key), `${label}: publiczny głos ujawnia ${key}`);
    }
  }
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
  const contexts = [];

  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    contexts.push(context);
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${index + 1}`, errors);
  }

  const creator = pages[0];
  await creator.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });
  await creator.getByRole("button", { name: "BEZ PROWADZĄCEGO", exact: true }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 30000 });
  const code = creator.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;

  for (let index = 0; index < pages.length; index += 1) {
    await join(pages[index], code, `E2E Reveal ${index + 1}`);
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

  for (const phase of phasePath) await readyAll(pages, code, phase);

  const reconstructionStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja" && body?.roleCard?.id === roleIds[index],
    `rekonstrukcja gracza ${index + 1}`,
  )));
  const options = reconstructionStates[0].reconstructionOptions ?? [];
  assert(options.length >= 9, `Za mało opcji rekonstrukcji: ${options.length}`);
  const eventOrder = options.slice(0, 9).map(item => item.key);
  const route = ["w1", "w2", "w3", "w4"];

  for (let index = 0; index < pages.length; index += 1) {
    const submitted = await action(pages[index], code, "submitReconstruction", { eventOrder, route });
    assert(submitted.status === 200 && submitted.body?.ok === true, `Rekonstrukcja ${index + 1}/5 nie została zapisana`);
  }

  await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja_wynik" && body?.reconstruction?.total === 5 && body?.roleCard?.id === roleIds[index],
    `wynik rekonstrukcji gracza ${index + 1}`,
  )));

  const accusationStates = await readyAll(pages, code, "ok_oskarzenie");
  const expected = [];

  for (let index = 0; index < pages.length; index += 1) {
    const current = accusationStates[index];
    const suspect = current.cast.find(item => item.playerId !== current.player?.playerId);
    const motive = current.motiveOptions[index % current.motiveOptions.length];
    const evidence = current.evidenceOptions[index % current.evidenceOptions.length];
    const disappearance = current.disappearanceOptions[index % current.disappearanceOptions.length];
    assert(suspect?.playerId && motive?.key && evidence?.id && disappearance?.key, `Niekompletne opcje oskarżenia gracza ${index + 1}`);

    expected.push({
      playerId: current.player.playerId,
      suspectPlayerId: suspect.playerId,
      motiveLabel: motive.label,
      evidenceNo: evidence.no,
      evidenceTitle: evidence.title,
      disappearanceLabel: disappearance.label,
    });

    const submitted = await action(pages[index], code, "submitAccusation", {
      suspectPlayerId: suspect.playerId,
      motiveKey: motive.key,
      evidenceId: evidence.id,
      disappearanceKey: disappearance.key,
    });
    assert(submitted.status === 200 && submitted.body?.ok === true, `Oskarżenie ${index + 1}/5 nie zostało zapisane`);
  }

  const resultStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_oskarzenie_wynik" && body?.accusations?.total === 5 && body?.roleCard?.id === roleIds[index],
    `ok_oskarzenie_wynik gracza ${index + 1}`,
    30000,
  )));

  for (let index = 0; index < resultStates.length; index += 1) {
    const current = resultStates[index];
    assertNoCorrectness(current.accusations, `wynik gracza ${index + 1}`);
    assert(current.reveal == null, `Ujawnienie wystartowało przed gotowością gracza ${index + 1}`);
    assert(current.ready?.ready_players === 0 && current.ready?.player_ready === false, `Wynik nie startuje od 0/5 u gracza ${index + 1}`);
    assert(current.reconstruction?.total === 5, `Zniknął wynik rekonstrukcji u gracza ${index + 1}`);
    assert(!Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Ujawniono poprawność rekonstrukcji u gracza ${index + 1}`);
    assert(current.ownAccusation?.submitted_at, `Gracz ${index + 1} stracił własne oskarżenie`);

    for (const choice of expected) {
      const publicChoice = current.accusations.results.find(item => item.playerId === choice.playerId);
      assert(publicChoice?.suspect?.playerId === choice.suspectPlayerId, `Zmienił się podejrzany gracza ${choice.playerId}`);
      assert(publicChoice.motiveLabel === choice.motiveLabel, `Zmienił się motyw gracza ${choice.playerId}`);
      assert(publicChoice.evidenceNo === choice.evidenceNo && publicChoice.evidenceTitle === choice.evidenceTitle, `Zmienił się dowód gracza ${choice.playerId}`);
      assert(publicChoice.disappearanceLabel === choice.disappearanceLabel, `Zmienił się sposób zniknięcia gracza ${choice.playerId}`);
    }
  }
  check("Wynik oskarżeń startuje od 0/5 bez ujawnienia prawdy");

  await Promise.all(pages.map(page => page.getByText("08 · GŁOSY GRUPY", { exact: true }).first().waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("Teorie są zamknięte.", { exact: true }).waitFor({ timeout: 15000 })));

  for (let index = 0; index < 4; index += 1) {
    const ready = await action(pages[index], code, "ready");
    assert(ready.status === 200 && ready.body?.ok === true, `Gotowość ${index + 1}/5 przed ujawnieniem nie została zapisana`);

    const states = await Promise.all(pages.map((page, playerIndex) => waitState(
      page,
      code,
      body => body?.room?.phase === "ok_oskarzenie_wynik" && body?.roleCard?.id === roleIds[playerIndex] && body?.ready?.ready_players === index + 1,
      `wynik po gotowości ${index + 1}/5 u gracza ${playerIndex + 1}`,
    )));

    const ownReadyCount = states.filter(item => item.ready?.player_ready === true).length;
    assert(ownReadyCount === index + 1, `Po ${index + 1}/5 oznaczonych jako gotowi jest ${ownReadyCount}/5`);
    assert(states.every(item => item.reveal == null), `Ujawnienie wystartowało za wcześnie przy ${index + 1}/5`);
    for (const current of states) assertNoCorrectness(current.accusations, `${index + 1}/5 gotowych`);
    check(`${index + 1}/5 gotowych, faza nadal ok_oskarzenie_wynik`);
  }

  const fifth = await action(pages[4], code, "ready");
  assert(fifth.status === 200 && fifth.body?.ok === true, "Gotowość 5/5 przed ujawnieniem nie została zapisana");

  const revealStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_ujawnienie_1" && body?.reveal?.step === 1 && body?.roleCard?.id === roleIds[index],
    `ok_ujawnienie_1 gracza ${index + 1}`,
    30000,
  )));
  check("5/5 automatycznie przełącza wszystkich do ok_ujawnienie_1");

  for (let index = 0; index < revealStates.length; index += 1) {
    const current = revealStates[index];
    assert(current.reveal?.content?.eyebrow === "UJAWNIENIE · CZĘŚĆ 1", `Gracz ${index + 1} nie widzi części 1`);
    assert(current.reveal?.content?.title === "Najmocniejsze alibi było tylko alibi telefonu.", `Gracz ${index + 1} ma zły tytuł części 1`);
    assert(String(current.reveal?.content?.body ?? "").includes("Paragon z 00:49"), `Gracz ${index + 1} nie ma treści części 1`);
    assert(Array.isArray(current.reveal?.content?.bullets) && current.reveal.content.bullets.length === 3, `Gracz ${index + 1} nie ma 3 punktów części 1`);
    assert(!Object.prototype.hasOwnProperty.call(current.reveal.content, "subtitle"), `Gracz ${index + 1} widzi za wcześnie subtitle sprawcy`);
    assert(!Object.prototype.hasOwnProperty.call(current.reveal.content, "whyItFits"), `Gracz ${index + 1} widzi za wcześnie pełne uzasadnienie sprawcy`);
    assert(!Object.prototype.hasOwnProperty.call(current.reveal.content, "timeline"), `Gracz ${index + 1} widzi za wcześnie pełną chronologię`);
    assert(current.evidence?.length === 11, `Gracz ${index + 1} stracił materiały w ujawnieniu 1`);
    assert(current.reconstruction?.total === 5 && !Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Gracz ${index + 1} widzi za wcześnie poprawność rekonstrukcji`);
    assertNoCorrectness(current.accusations, `ujawnienie 1 gracza ${index + 1}`);
    assert(current.ready?.ready_players === 0 && current.ready?.player_ready === false, `Gotowość nie wyzerowała się po wejściu do ujawnienia 1 u gracza ${index + 1}`);
    assert(current.ownAccusation?.submitted_at, `Gracz ${index + 1} stracił oskarżenie po wejściu do ujawnienia 1`);
  }

  await Promise.all(pages.map(page => page.getByText("09 · UJAWNIENIE 1/5", { exact: true }).first().waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("UJAWNIENIE · CZĘŚĆ 1", { exact: true }).waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("Najmocniejsze alibi było tylko alibi telefonu.", { exact: true }).waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByRole("button", { name: "GOTOWY NA KOLEJNĄ CZĘŚĆ", exact: true }).waitFor({ state: "visible", timeout: 15000 })));
  assert(await pages[0].getByText("Adrian nie wysiadł w Brzezinach.", { exact: true }).count() === 0, "Część 2 jest widoczna przed przejściem dalej");

  await pages[0].screenshot({ path: `${artifacts}/01-reveal-one-player-one.png`, fullPage: true });
  await pages[4].screenshot({ path: `${artifacts}/02-reveal-one-player-five.png`, fullPage: true });
  await pages[0].waitForTimeout(1000);

  const stable = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_ujawnienie_1" && body?.reveal?.step === 1 && body?.ready?.ready_players === 0 && body?.roleCard?.id === roleIds[index],
    `stabilne ujawnienie 1 gracza ${index + 1}`,
  )));
  assert(stable.every(item => item.ready?.player_ready === false), "Gotowość zmieniła się bez akcji w ujawnieniu 1");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);

  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs REVEAL 1 E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
