import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-auto-accusation-one";
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

  const options = reconstructionStates[0].reconstructionOptions ?? [];
  assert(options.length >= 9, `Za mało opcji rekonstrukcji: ${options.length}`);
  const eventOrder = options.slice(0, 9).map(item => item.key);
  const route = ["w1", "w2", "w3", "w4"];

  for (let index = 0; index < pages.length; index += 1) {
    const submitted = await action(pages[index], code, "submitReconstruction", { eventOrder, route });
    assert(submitted.status === 200 && submitted.body?.ok === true, `Rekonstrukcja ${index + 1}/5 nie została zapisana`);
  }

  const resultStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_rekonstrukcja_wynik" && body?.roleCard?.id === roleIds[index],
    `ok_rekonstrukcja_wynik gracza ${index + 1}`,
  )));
  assert(resultStates.every(item => item.reconstruction?.total === 5), "Nie wszyscy widzą wynik 5/5 rekonstrukcji");
  check("5 rekonstrukcji zapisanych, wynik dostępny bez ujawnienia poprawności");

  const accusationStates = await readyAndWait(pages, code, "ok_oskarzenie");
  for (let index = 0; index < accusationStates.length; index += 1) {
    const current = accusationStates[index];
    assert(current.role === "player", `Gracz ${index + 1} stracił rolę przy wejściu do Aktu Oskarżenia`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się przy wejściu do Aktu Oskarżenia`);
    assert(current.evidence?.length === 11, `Gracz ${index + 1} nie ma 11 materiałów w Akcie Oskarżenia`);
    assert(current.reconstruction?.total === 5, `Gracz ${index + 1} stracił wynik rekonstrukcji`);
    assert(!Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Poprawność rekonstrukcji ujawniono graczowi ${index + 1}`);
    assert(current.accusations == null, `Zbiorczy wynik oskarżeń jest widoczny przed pierwszym oskarżeniem u gracza ${index + 1}`);
    assert(current.ownAccusation == null, `Gracz ${index + 1} ma oskarżenie przed wysłaniem`);
  }
  check("Akt Oskarżenia startuje pusty dla wszystkich 5 graczy");

  const first = accusationStates[0];
  const suspect = first.cast.find(item => item.playerId !== first.player?.playerId) ?? first.cast[0];
  const motive = first.motiveOptions?.[0];
  const evidence = first.evidenceOptions?.[0];
  const disappearance = first.disappearanceOptions?.[0];
  assert(suspect?.playerId, "Brak podejrzanego do testowego oskarżenia");
  assert(motive?.key, "Brak motywu do testowego oskarżenia");
  assert(evidence?.id, "Brak dowodu do testowego oskarżenia");
  assert(disappearance?.key, "Brak sposobu zniknięcia do testowego oskarżenia");

  const payload = {
    suspectPlayerId: suspect.playerId,
    motiveKey: motive.key,
    evidenceId: evidence.id,
    disappearanceKey: disappearance.key,
  };

  await pages[0].getByText("08 · AKT OSKARŻENIA", { exact: true }).first().waitFor({ timeout: 15000 });
  await pages[0].getByRole("button").filter({ hasText: suspect.characterName }).first().click();
  await pages[0].getByRole("button").filter({ hasText: motive.label }).first().click();
  await pages[0].getByRole("button").filter({ hasText: disappearance.label }).first().click();
  await pages[0].getByRole("button").filter({ hasText: evidence.title }).first().click();

  const firstSubmit = pages[0].getByRole("button", { name: "ZŁÓŻ AKT OSKARŻENIA", exact: true });
  await firstSubmit.waitFor({ state: "visible", timeout: 10000 });
  assert(await firstSubmit.isEnabled(), "Kompletny Akt Oskarżenia gracza 1 jest nadal nieaktywny");

  const submitResponsePromise = pages[0].waitForResponse(response => {
    const request = response.request();
    return response.url().includes(`/api/gra/akta-nocy-ostatni-kurs/${code}`)
      && request.method() === "POST"
      && (request.postData() ?? "").includes('"action":"submitAccusation"');
  }, { timeout: 15000 });
  await firstSubmit.click();
  const submitResponse = await submitResponsePromise;
  const submitBody = await submitResponse.json().catch(() => null);
  assert(submitResponse.status() === 200 && submitBody?.ok === true, `UI nie zapisał pierwszego oskarżenia: HTTP ${submitResponse.status()} ${JSON.stringify(submitBody)}`);
  check("UI wysłał submitAccusation i API odpowiedziało 200/ok");

  const submittedState = await waitState(
    pages[0],
    code,
    body => body?.room?.phase === "ok_oskarzenie" && Boolean(body?.ownAccusation?.submitted_at),
    "ok_oskarzenie z zapisanym 1/5 po kliknięciu UI",
  );
  assert(submittedState.ownAccusation.suspect_player_id === payload.suspectPlayerId, "Zmienił się zapisany podejrzany gracza 1");
  assert(submittedState.ownAccusation.motive_key === payload.motiveKey, "Zmienił się zapisany motyw gracza 1");
  assert(submittedState.ownAccusation.evidence_id === payload.evidenceId, "Zmienił się zapisany dowód gracza 1");
  assert(submittedState.ownAccusation.disappearance_key === payload.disappearanceKey, "Zmienił się zapisany sposób zniknięcia gracza 1");
  check("API po kliknięciu UI zachowuje dokładny payload pierwszego oskarżenia");

  await pages[0].screenshot({ path: `${artifacts}/00-after-submit-response.png`, fullPage: true });
  await pages[0].getByText("Akt oskarżenia złożony", { exact: false }).waitFor({ timeout: 15000 });
  await pages[0].getByText("Twoja teoria jest zamknięta. Poczekaj, aż pozostali oddadzą swoje odpowiedzi.", { exact: true }).waitFor({ timeout: 15000 });
  check("Gracz 1 widzi blokadę złożonego Aktu Oskarżenia");

  const afterSubmit = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === "ok_oskarzenie" && body?.roleCard?.id === roleIds[index] && (index !== 0 || Boolean(body?.ownAccusation?.submitted_at)),
    `ok_oskarzenie po 1/5 gracza ${index + 1}`,
  )));

  for (let index = 0; index < afterSubmit.length; index += 1) {
    const current = afterSubmit[index];
    assert(current.room.phase === "ok_oskarzenie", `Gra wyszła z ok_oskarzenie po 1/5 u gracza ${index + 1}`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po 1/5`);
    assert(current.evidence?.length === 11, `Materiały gracza ${index + 1} zmieniły się po 1/5`);
    assert(current.reconstruction?.total === 5, `Wynik rekonstrukcji zniknął graczowi ${index + 1} po 1/5`);
    assert(!Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Poprawność rekonstrukcji ujawniono po 1/5 graczowi ${index + 1}`);
    assert(current.accusations == null, `Zbiorczy wynik oskarżeń pojawił się za wcześnie po 1/5 u gracza ${index + 1}`);

    if (index === 0) {
      const own = current.ownAccusation;
      assert(Boolean(own?.submitted_at), "Gracz 1 nie ma zapisanego oskarżenia po wysłaniu");
      assert(own.suspect_player_id === payload.suspectPlayerId, "Zmienił się zapisany podejrzany gracza 1");
      assert(own.motive_key === payload.motiveKey, "Zmienił się zapisany motyw gracza 1");
      assert(own.evidence_id === payload.evidenceId, "Zmienił się zapisany dowód gracza 1");
      assert(own.disappearance_key === payload.disappearanceKey, "Zmienił się zapisany sposób zniknięcia gracza 1");
    } else {
      assert(current.ownAccusation == null, `Gracz ${index + 1} został oznaczony jako wysłany przy 1/5`);
    }
  }
  check("Pierwsze oskarżenie zapisane dokładnie jako 1/5, bez przejścia dalej");

  const secondSubmit = pages[1].getByRole("button", { name: "ZŁÓŻ AKT OSKARŻENIA", exact: true });
  await secondSubmit.waitFor({ state: "visible", timeout: 10000 });
  assert(!(await secondSubmit.isEnabled()), "Gracz 2 może wysłać niekompletne oskarżenie");

  await pages[0].screenshot({ path: `${artifacts}/01-first-accusation-locked.png`, fullPage: true });
  await pages[1].screenshot({ path: `${artifacts}/02-second-player-still-open.png`, fullPage: true });

  const finalStates = await Promise.all(pages.map(page => state(page, code)));
  assert(finalStates.every(item => item.status === 200 && item.body?.room?.phase === "ok_oskarzenie"), "Test wyszedł poza ok_oskarzenie");
  assert(Boolean(finalStates[0].body?.ownAccusation?.submitted_at), "Pierwsze oskarżenie nie przetrwało do końca testu");
  assert(finalStates.slice(1).every(item => item.body?.ownAccusation == null), "Więcej niż 1 gracz ma zapisane oskarżenie");
  assert(finalStates.every(item => item.body?.accusations == null), "Zbiorczy wynik oskarżeń został ujawniony przy 1/5");
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);

  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs ACCUSATION 1/5 E2E PASS room=${code}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
