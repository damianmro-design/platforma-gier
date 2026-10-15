import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-reveal-four";
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

function assertNoCorrectness(summary, label) {
  const forbiddenSummary = ["correctSuspect", "correctMotive", "correctEvidence", "correctDisappearance", "fullyCorrect"];
  const forbiddenRows = ["suspectCorrect", "motiveCorrect", "evidenceCorrect", "disappearanceCorrect", "fullyCorrect"];
  assert(summary?.total === 5 && summary?.results?.length === 5, `${label}: brak pełnego publicznego podsumowania`);
  for (const key of forbiddenSummary) assert(!Object.prototype.hasOwnProperty.call(summary, key), `${label}: ujawniono ${key}`);
  for (const row of summary.results) {
    for (const key of forbiddenRows) assert(!Object.prototype.hasOwnProperty.call(row, key), `${label}: ujawniono ${key}`);
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

  for (let index = 0; index < pages.length; index += 1) await join(pages[index], code, `E2E Reveal4 ${index + 1}`);
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
  const revealThreeStates = await readyAll(pages, code, "ok_ujawnienie_3");
  const votesSnapshot = JSON.stringify(revealThreeStates[0].accusations?.results ?? []);
  const reconstructionSnapshot = JSON.stringify({
    total: revealThreeStates[0].reconstruction?.total,
    consensusTimeline: revealThreeStates[0].reconstruction?.consensusTimeline,
    routes: revealThreeStates[0].reconstruction?.routes,
  });

  for (let index = 0; index < revealThreeStates.length; index += 1) {
    const current = revealThreeStates[index];
    assert(current.reveal?.step === 3 && current.reveal?.content?.eyebrow === "UJAWNIENIE · CZĘŚĆ 3", `Gracz ${index + 1} nie jest w części 3`);
    assert(current.ready?.ready_players === 0 && current.ready?.player_ready === false, `Część 3 nie startuje od 0/5 u gracza ${index + 1}`);
    assert(!Object.prototype.hasOwnProperty.call(current.reveal.content, "subtitle"), `Gracz ${index + 1} widzi za wcześnie subtitle`);
    assert(!Object.prototype.hasOwnProperty.call(current.reveal.content, "whyItFits"), `Gracz ${index + 1} widzi za wcześnie whyItFits`);
    assert(current.evidence?.length === 11 && current.roleCard?.id === roleIds[index], `Stan sprawy zmienił się przed częścią 4 u gracza ${index + 1}`);
    assert(current.reconstruction?.total === 5 && !Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Gracz ${index + 1} widzi za wcześnie poprawność rekonstrukcji`);
    assertNoCorrectness(current.accusations, `część 3 gracza ${index + 1}`);
  }
  check("Część 3 startuje od 0/5 i ukrywa osobę odpowiedzialną");

  for (let index = 0; index < 4; index += 1) {
    const ready = await action(pages[index], code, "ready");
    assert(ready.status === 200 && ready.body?.ok === true, `Gotowość ${index + 1}/5 w części 3 nie została zapisana: ${JSON.stringify(ready)}`);
    const states = await Promise.all(pages.map((page, playerIndex) => waitState(
      page,
      code,
      body => body?.room?.phase === "ok_ujawnienie_3" && body?.reveal?.step === 3 && body?.ready?.ready_players === index + 1 && body?.roleCard?.id === roleIds[playerIndex],
      `część 3 po gotowości ${index + 1}/5 u gracza ${playerIndex + 1}`,
    )));
    assert(states.filter(item => item.ready?.player_ready === true).length === index + 1, `Niepoprawny licznik gotowości po ${index + 1}/5`);
    for (const current of states) {
      assert(!Object.prototype.hasOwnProperty.call(current.reveal.content, "subtitle"), `Część 4 pojawiła się za wcześnie przy ${index + 1}/5`);
      assertNoCorrectness(current.accusations, `${index + 1}/5 gotowych w części 3`);
      assert(current.reconstruction?.total === 5 && !Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Ujawniono poprawność rekonstrukcji przy ${index + 1}/5`);
    }
    check(`${index + 1}/5 gotowych, faza nadal ok_ujawnienie_3`);
  }

  const fifth = await action(pages[4], code, "ready");
  assert(fifth.status === 200 && fifth.body?.ok === true, `Gotowość 5/5 w części 3 nie została zapisana: ${JSON.stringify(fifth)}`);
  const revealFourStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_ujawnienie_4" && body?.reveal?.step === 4 && body?.roleCard?.id === roleIds[index],
    `ok_ujawnienie_4 gracza ${index + 1}`,
  )));
  check("5/5 automatycznie przełącza wszystkich do ok_ujawnienie_4");

  for (let index = 0; index < revealFourStates.length; index += 1) {
    const current = revealFourStates[index];
    const content = current.reveal?.content;
    assert(content?.eyebrow === "UJAWNIENIE · OSOBA ODPOWIEDZIALNA", `Gracz ${index + 1} ma zły nagłówek części 4`);
    assert(content?.title === "Kamil Drzewiecki", `Gracz ${index + 1} nie widzi Kamila jako osoby odpowiedzialnej`);
    assert(content?.subtitle === "Konsultant / człowiek Vektor Cargo", `Gracz ${index + 1} ma zły subtitle`);
    assert(String(content?.body ?? "").includes("Northbridge Consulting") && String(content?.body ?? "").includes("S-3 w W6"), `Gracz ${index + 1} ma niepełną treść części 4`);
    assert(Array.isArray(content?.whyItFits) && content.whyItFits.length === 5, `Gracz ${index + 1} nie ma 5 punktów whyItFits`);
    assert(content.whyItFits.some(item => String(item).includes("Kamil — 00:40, W5")), `Brak spotkania Kamil 00:40 W5 u gracza ${index + 1}`);
    assert(content.whyItFits.some(item => String(item).includes("00:36")), `Brak obserwacji Niny u gracza ${index + 1}`);
    assert(content.whyItFits.some(item => String(item).includes("Paragon z 00:49")), `Brak obalenia paragonu u gracza ${index + 1}`);
    assert(content.whyItFits.some(item => String(item).includes("Telefon pozostał w W3")), `Brak alibi telefonu u gracza ${index + 1}`);
    assert(content.whyItFits.some(item => String(item).includes("powrót osoby w płaszczu")), `Brak powrotu osoby w płaszczu u gracza ${index + 1}`);
    assert(!Object.prototype.hasOwnProperty.call(content, "timeline") && !Object.prototype.hasOwnProperty.call(content, "redHerrings"), `Gracz ${index + 1} widzi za wcześnie część 5`);
    assert(current.evidence?.length === 11 && current.roleCard?.id === roleIds[index], `Stan sprawy zmienił się w części 4 u gracza ${index + 1}`);
    assertNoCorrectness(current.accusations, `część 4 gracza ${index + 1}`);
    assert(current.reconstruction?.total === 5 && !Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Gracz ${index + 1} widzi za wcześnie poprawność rekonstrukcji`);
    assert(JSON.stringify(current.accusations?.results ?? []) === votesSnapshot, `Zmieniły się publiczne głosy u gracza ${index + 1}`);
    assert(JSON.stringify({ total: current.reconstruction?.total, consensusTimeline: current.reconstruction?.consensusTimeline, routes: current.reconstruction?.routes }) === reconstructionSnapshot, `Zmienił się wynik rekonstrukcji u gracza ${index + 1}`);
    assert(current.ready?.ready_players === 0 && current.ready?.player_ready === false, `Gotowość nie wyzerowała się w części 4 u gracza ${index + 1}`);
  }

  await Promise.all(pages.map(page => page.getByText("09 · UJAWNIENIE 4/5", { exact: true }).first().waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("UJAWNIENIE · OSOBA ODPOWIEDZIALNA", { exact: true }).waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("Kamil Drzewiecki", { exact: true }).waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText(/^Konsultant \/ człowiek Vektor Cargo · grany przez /).waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByRole("button", { name: "GOTOWY NA KOLEJNĄ CZĘŚĆ", exact: true }).waitFor({ state: "visible", timeout: 15000 })));
  assert(await pages[0].getByText("UJAWNIENIE · PEŁNA CHRONOLOGIA", { exact: true }).count() === 0, "Część 5 jest widoczna przed przejściem dalej");

  await pages[0].screenshot({ path: `${artifacts}/01-reveal-four-player-one.png`, fullPage: true });
  await pages[4].screenshot({ path: `${artifacts}/02-reveal-four-player-five.png`, fullPage: true });
  const stable = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_ujawnienie_4" && body?.reveal?.step === 4 && body?.ready?.ready_players === 0 && body?.roleCard?.id === roleIds[index],
    `stabilne ujawnienie 4 gracza ${index + 1}`,
  )));
  assert(stable.every(item => item.ready?.player_ready === false), "Gotowość zmieniła się bez akcji w części 4");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);

  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs REVEAL 4 E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
