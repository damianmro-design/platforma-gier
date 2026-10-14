import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-accusation-five";
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
  while (Date.now() < deadline) {
    try {
      const current = await state(page, code);
      if (current.status === 200 && predicate(current.body)) return current.body;
    } catch {}
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}`);
}

async function readyAndWait(players, code, phase) {
  for (const page of players) {
    const result = await action(page, code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Gotowość do ${phase} nie powiodła się`);
  }
  return Promise.all(players.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === phase,
    `${phase} gracza ${index + 1}`,
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
  "ok_nowy_trop",
  "ok_rekonstrukcja",
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

  await join(creator, code, "E2E Accusation 1");

  for (let i = 2; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${i}`, errors);
    await join(page, code, `E2E Accusation ${i}`);
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
    await readyAndWait(pages, code, phase);
  }

  const reconstructionStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja" && body?.roleCard?.id === roleIds[index],
    `ok_rekonstrukcja gracza ${index + 1}`,
  )));

  const reconstructionOptions = reconstructionStates[0].reconstructionOptions ?? [];
  assert(reconstructionOptions.length >= 9, `Za mało opcji rekonstrukcji: ${reconstructionOptions.length}`);
  const eventOrder = reconstructionOptions.slice(0, 9).map(item => item.key);
  const route = ["w1", "w2", "w3", "w4"];

  for (let index = 0; index < pages.length; index += 1) {
    const submitted = await action(pages[index], code, "submitReconstruction", { eventOrder, route });
    assert(submitted.status === 200 && submitted.body?.ok === true, `Rekonstrukcja ${index + 1}/5 nie została zapisana`);
  }

  const reconstructionResult = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja_wynik" && body?.roleCard?.id === roleIds[index],
    `ok_rekonstrukcja_wynik gracza ${index + 1}`,
  )));
  assert(reconstructionResult.every(item => item.reconstruction?.total === 5), "Nie wszyscy widzą wynik 5/5 rekonstrukcji");

  const accusationStates = await readyAndWait(pages, code, "ok_oskarzenie");
  assert(accusationStates.every(item => item.ownAccusation == null), "Akt Oskarżenia nie startuje od 0/5");
  assert(accusationStates.every(item => item.accusations == null), "Zbiorczy wynik oskarżeń jest widoczny przed 5/5");
  check("Akt Oskarżenia startuje od 0/5");

  const expected = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const current = accusationStates[index];
    const suspects = current.cast.filter(item => item.playerId !== current.player?.playerId);
    const suspect = suspects[index % suspects.length] ?? current.cast[0];
    const motive = current.motiveOptions[index % current.motiveOptions.length];
    const evidence = current.evidenceOptions[index % current.evidenceOptions.length];
    const disappearance = current.disappearanceOptions[index % current.disappearanceOptions.length];

    assert(suspect?.playerId, `Brak podejrzanego gracza ${index + 1}`);
    assert(motive?.key, `Brak motywu gracza ${index + 1}`);
    assert(evidence?.id, `Brak dowodu gracza ${index + 1}`);
    assert(disappearance?.key, `Brak sposobu zniknięcia gracza ${index + 1}`);

    const payload = {
      suspectPlayerId: suspect.playerId,
      motiveKey: motive.key,
      evidenceId: evidence.id,
      disappearanceKey: disappearance.key,
    };

    expected.push({
      playerId: current.player.playerId,
      payload,
      suspectPlayerId: suspect.playerId,
      motiveLabel: motive.label,
      evidenceNo: evidence.no,
      evidenceTitle: evidence.title,
      disappearanceLabel: disappearance.label,
    });

    await page.getByText("08 · AKT OSKARŻENIA", { exact: true }).first().waitFor({ timeout: 15000 });
    await page.getByRole("button").filter({ hasText: suspect.characterName }).first().click();
    await page.getByRole("button").filter({ hasText: motive.label }).first().click();
    await page.getByRole("button").filter({ hasText: disappearance.label }).first().click();
    await page.getByRole("button").filter({ hasText: evidence.title }).first().click();

    const submit = page.getByRole("button", { name: "ZŁÓŻ AKT OSKARŻENIA", exact: true });
    await submit.waitFor({ state: "visible", timeout: 10000 });
    assert(await submit.isEnabled(), `Kompletny Akt Oskarżenia gracza ${index + 1} jest nieaktywny`);

    const responsePromise = page.waitForResponse(response => {
      const request = response.request();
      return response.url().includes(`/api/gra/akta-nocy-ostatni-kurs/${code}`)
        && request.method() === "POST"
        && (request.postData() ?? "").includes('"action":"submitAccusation"');
    }, { timeout: 15000 });

    await submit.click();
    const response = await responsePromise;
    const body = await response.json().catch(() => null);
    assert(response.status() === 200 && body?.ok === true, `UI nie zapisał oskarżenia ${index + 1}/5: HTTP ${response.status()} ${JSON.stringify(body)}`);

    if (index < 4) {
      const states = await Promise.all(pages.map((playerPage, playerIndex) => waitState(
        playerPage,
        code,
        candidate => candidate?.room?.phase === "ok_oskarzenie" && candidate?.roleCard?.id === roleIds[playerIndex],
        `ok_oskarzenie po ${index + 1}/5 u gracza ${playerIndex + 1}`,
      )));

      const submittedCount = states.filter(item => Boolean(item.ownAccusation?.submitted_at)).length;
      assert(submittedCount === index + 1, `Po ${index + 1}/5 zapisanych jest ${submittedCount}/5 oskarżeń`);
      assert(states.every(item => item.accusations == null), `Zbiorczy wynik pojawił się za wcześnie przy ${index + 1}/5`);
      assert(states.every(item => item.reconstruction?.total === 5), `Wynik rekonstrukcji zniknął przy ${index + 1}/5`);
      assert(states.every(item => !Object.prototype.hasOwnProperty.call(item.reconstruction, "fullyCorrect")), `Ujawniono poprawność rekonstrukcji przy ${index + 1}/5`);
      check(`${index + 1}/5 oskarżeń zapisane, faza nadal ok_oskarzenie`);
    }
  }

  const resultStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_oskarzenie_wynik" && body?.roleCard?.id === roleIds[index] && body?.accusations?.total === 5,
    `ok_oskarzenie_wynik gracza ${index + 1}`,
    30000,
  )));
  check("5/5 automatycznie przełącza wszystkich do ok_oskarzenie_wynik");

  const forbiddenSummaryKeys = ["correctSuspect", "correctMotive", "correctEvidence", "correctDisappearance", "fullyCorrect"];
  const forbiddenResultKeys = ["suspectCorrect", "motiveCorrect", "evidenceCorrect", "disappearanceCorrect", "fullyCorrect"];

  for (let index = 0; index < resultStates.length; index += 1) {
    const current = resultStates[index];
    assert(current.room.phase === "ok_oskarzenie_wynik", `Gracz ${index + 1} nie jest w wyniku oskarżeń`);
    assert(current.role === "player", `Gracz ${index + 1} stracił rolę gracza`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po 5/5`);
    assert(current.evidence?.length === 11, `Gracz ${index + 1} nie ma 11 materiałów po 5/5`);
    assert(current.reconstruction?.total === 5, `Gracz ${index + 1} stracił wynik rekonstrukcji po 5/5`);
    assert(!Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Poprawność rekonstrukcji ujawniono graczowi ${index + 1}`);
    assert(current.accusations?.total === 5, `Gracz ${index + 1} nie widzi 5/5 wyników oskarżeń`);
    assert(current.accusations?.results?.length === 5, `Gracz ${index + 1} nie widzi 5 publicznych wyborów`);
    assert(current.reveal == null, `Ujawnienie wystartowało za wcześnie u gracza ${index + 1}`);
    assert(current.ready === false, `Gotowość nie została wyzerowana u gracza ${index + 1}`);

    for (const key of forbiddenSummaryKeys) {
      assert(!Object.prototype.hasOwnProperty.call(current.accusations, key), `Wynik publiczny ujawnia ${key} graczowi ${index + 1}`);
    }
    for (const row of current.accusations.results) {
      for (const key of forbiddenResultKeys) {
        assert(!Object.prototype.hasOwnProperty.call(row, key), `Publiczny głos ujawnia ${key} graczowi ${index + 1}`);
      }
    }

    for (const choice of expected) {
      const publicChoice = current.accusations.results.find(item => item.playerId === choice.playerId);
      assert(publicChoice, `Brak publicznego głosu gracza ${choice.playerId}`);
      assert(publicChoice.suspect?.playerId === choice.suspectPlayerId, `Zmienił się publiczny podejrzany gracza ${choice.playerId}`);
      assert(publicChoice.motiveLabel === choice.motiveLabel, `Zmienił się publiczny motyw gracza ${choice.playerId}`);
      assert(publicChoice.evidenceNo === choice.evidenceNo, `Zmienił się numer publicznego dowodu gracza ${choice.playerId}`);
      assert(publicChoice.evidenceTitle === choice.evidenceTitle, `Zmienił się publiczny dowód gracza ${choice.playerId}`);
      assert(publicChoice.disappearanceLabel === choice.disappearanceLabel, `Zmienił się publiczny sposób zniknięcia gracza ${choice.playerId}`);
    }
  }
  check("Wynik 5/5 pokazuje wybory grupy bez trafności i rozwiązania");

  await Promise.all(pages.map(page => page.getByText("08 · GŁOSY GRUPY", { exact: true }).first().waitFor({ timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("Teorie są zamknięte.", { exact: true }).waitFor({ timeout: 15000 })));
  await pages[0].screenshot({ path: `${artifacts}/01-result-player-one.png`, fullPage: true });
  await pages[4].screenshot({ path: `${artifacts}/02-result-player-five.png`, fullPage: true });

  await pages[0].waitForTimeout(1000);
  const stableStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_oskarzenie_wynik" && body?.roleCard?.id === roleIds[index],
    `stabilny ok_oskarzenie_wynik gracza ${index + 1}`,
  )));
  assert(stableStates.every(item => item.reveal == null), "Ujawnienie rozpoczęło się bez gotowości graczy");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);

  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs ACCUSATION 5/5 RESULT E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
