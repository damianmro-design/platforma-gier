import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/akta-nocy";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function apiGet(page, endpoint) {
  return page.evaluate(async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  }, endpoint);
}

async function apiPost(page, endpoint, payload) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let result = null;
    try { result = await response.json(); } catch { result = null; }
    return { status: response.status, body: result };
  }, { path: endpoint, body: payload });
}

async function waitForState(page, endpoint, predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await apiGet(page, endpoint);
    if (last.status === 200 && last.body && predicate(last.body)) return last.body;
    await page.waitForTimeout(200);
  }
  throw new Error(`Timeout: ${label}. Last=${JSON.stringify(last)}`);
}

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
  const recoveryCode = (await page.locator(".recovery-code strong").textContent())?.trim();
  assert(recoveryCode?.length === 6, `Brak kodu powrotu dla ${name}`);
  return recoveryCode;
}

async function requestAndApproveRejoin({ hostPage, oldContext, oldPageIndex, players, contexts, code, name, expectedEndpoint, expectedPlayerId, expectedPhase, watch }) {
  await oldContext.close();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  watch(page, `rejoin-${name}`);
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await page.locator("#recoverName").selectOption({ label: name });
  await page.getByRole("button", { name: "Poproś o powrót" }).click();
  await page.getByText("Prośba wysłana do twórcy pokoju").waitFor({ timeout: 10000 });

  const panel = hostPage.getByLabel("Prośby graczy o powrót do gry");
  await panel.waitFor({ state: "visible", timeout: 12000 });
  const requestCard = panel.locator("article").filter({ hasText: name }).first();
  await requestCard.getByRole("button", { name: "WPUŚĆ Z POWROTEM" }).click();
  await page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 15000 });
  const state = await waitForState(page, expectedEndpoint, body => {
    const id = body.player?.id ?? body.player?.playerId;
    return id === expectedPlayerId && body.room?.phase === expectedPhase;
  }, `rejoin ${name}`);

  players[oldPageIndex] = page;
  contexts[oldPageIndex] = context;
  return { page, context, state };
}

const launchOptions = process.env.CHROME_BIN
  ? { headless: true, executablePath: process.env.CHROME_BIN }
  : { headless: true };
const browser = await chromium.launch(launchOptions);
const errors = [];
const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  checks: [],
  errors,
};

function check(label, details = null) {
  report.checks.push({ label, details, at: new Date().toISOString() });
}

function watch(page, label) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("response", response => {
    if (
      (response.url().includes("/api/gra/akta-nocy/") || response.url().includes("/api/gra/akta-nocy-ostatni-kurs/")) &&
      response.status() >= 500
    ) {
      errors.push(`${label} AKTA API ${response.status()}: ${response.url()}`);
    }
  });
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    const ignored = text.includes("favicon") || text.includes("qrserver") ||
      text.includes("Failed to load resource: the server responded with a status of 401") ||
      text.includes("Failed to load resource: the server responded with a status of 404");
    if (!ignored) errors.push(`${label} console: ${text}`);
  });
}

async function createCaseRoom(page, buttonName) {
  await page.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  await page.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/);
  const code = page.url().split("/").pop();
  assert(code, `Brak kodu pokoju dla ${buttonName}`);
  return code;
}

async function runApartament214() {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage();
  watch(host, "apartament-host");
  const code = await createCaseRoom(host, "UTWÓRZ POKÓJ");
  const endpoint = `/api/gra/akta-nocy/${code}`;
  check("Apartament 214: utworzono pokój z prowadzącym", code);

  const contexts = [];
  const players = [];
  const names = Array.from({ length: 5 }, (_, i) => `E2E Hotel ${i + 1}`);
  for (let i = 0; i < 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `apartament-player-${i + 1}`);
    contexts.push(context);
    players.push(page);
    await joinGuest(page, code, names[i]);
  }
  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  const start = host.getByRole("button", { name: "START GRY", exact: true });
  await start.waitFor({ state: "visible", timeout: 15000 });
  const deadline = Date.now() + 15000;
  while (!(await start.isEnabled().catch(() => false)) && Date.now() < deadline) await host.waitForTimeout(200);
  assert(await start.isEnabled(), "Apartament 214: START GRY nie został aktywowany");
  await start.click();
  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 15000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 15000 })),
  ]);

  const initial = await Promise.all(players.map(page => apiGet(page, endpoint)));
  assert(initial.every(x => x.status === 200 && x.body?.role === "player"), "Apartament 214: brak sesji któregoś gracza");
  const roles = initial.map(x => x.body.roleCard);
  assert(roles.filter(role => role?.isCulprit).length === 1, "Apartament 214: nie ma dokładnie 1 sprawcy");
  const culpritIndex = roles.findIndex(role => role?.isCulprit);
  const culpritId = initial[culpritIndex].body.player.id;
  const culpritName = initial[culpritIndex].body.player.displayName;

  const hostInitial = await apiGet(host, endpoint);
  assert(hostInitial.status === 200 && hostInitial.body?.role === "host", "Apartament 214: prowadzący nie ma roli host");
  assert(hostInitial.body.roleCard == null, "P0: prowadzący dostał prywatną kartę roli");
  assert(!JSON.stringify(hostInitial.body).includes("culpritBriefing"), "P0: prowadzący dostał briefing sprawcy");
  check("Apartament 214: dokładnie 1 sprawca, prowadzący nie dostaje prywatnej roli", { culpritName });

  for (const page of players) {
    const opened = await apiPost(page, endpoint, { action: "openDossier" });
    assert(opened.status === 200 && opened.body?.ok, `Apartament 214: nie otwarto akt ${JSON.stringify(opened.body)}`);
  }
  const dossierReady = await waitForState(host, endpoint, body => body.progress?.length === 5 && body.progress.every(p => p.dossier_opened), "akta otwarte przez wszystkich");
  assert(dossierReady.progress.every(p => p.dossier_opened), "Apartament 214: nie wszyscy otworzyli akta");
  check("Apartament 214: 5 prywatnych akt otwartych");

  let step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "pierwsze_zeznania", `Apartament: ${JSON.stringify(step.body)}`);
  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "dowody_a_1", "Apartament: nie rozpoczęto dowodów A");
  for (const phase of ["dowody_a_2", "dowody_a_3", "dowody_a_4"]) {
    step = await apiPost(host, endpoint, { action: "revealEvidenceA" });
    assert(step.status === 200 && step.body?.phase === phase, `Apartament: oczekiwano ${phase}`);
  }
  const aState = await waitForState(host, endpoint, b => b.room?.phase === "dowody_a_4" && b.evidence?.length >= 4, "pełna paczka A");
  check("Apartament 214: paczka dowodowa A odsłonięta", { evidence: aState.evidence.length });

  const returningId = initial[0].body.player.id;
  const returningName = initial[0].body.player.displayName;
  const returningRole = initial[0].body.roleCard.id;
  const rejoin = await requestAndApproveRejoin({
    hostPage: host,
    oldContext: contexts[0],
    oldPageIndex: 0,
    players,
    contexts,
    code,
    name: returningName,
    expectedEndpoint: endpoint,
    expectedPlayerId: returningId,
    expectedPhase: "dowody_a_4",
    watch,
  });
  assert(rejoin.state.roleCard?.id === returningRole, "Apartament 214: rejoin zmienił rolę gracza");
  check("Apartament 214: aktywny rejoin zachował tę samą tajną rolę i fazę", { player: returningName, role: returningRole });

  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "przesluchania_a", "Apartament: brak przesłuchań");
  const interrogation = await waitForState(host, endpoint, b => b.room?.phase === "przesluchania_a" && b.interrogations?.length > 0, "przesłuchania");
  assert(interrogation.interrogations.length === 5, `Apartament: oczekiwano 5 przesłuchań, jest ${interrogation.interrogations.length}`);

  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "dowody_b_1", "Apartament: brak dowodów B");
  for (const phase of ["dowody_b_2", "dowody_b_3", "dowody_b_4", "dowody_b_5"]) {
    step = await apiPost(host, endpoint, { action: "revealEvidenceB" });
    assert(step.status === 200 && step.body?.phase === phase, `Apartament: oczekiwano ${phase}`);
  }
  check("Apartament 214: przesłuchania i paczka dowodowa B ukończone");

  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "rekonstrukcja", "Apartament: brak rekonstrukcji");
  const reconstructionState = await apiGet(players[0], endpoint);
  const events = reconstructionState.body.reconstructionEvents.map(x => x.key).slice(0, 7);
  assert(events.length === 7 && new Set(events).size === 7, "Apartament: brak 7 wydarzeń rekonstrukcji");
  const suspectId = reconstructionState.body.cast[0].playerId;
  const motiveKey = reconstructionState.body.motiveOptions[0].key;
  const coverupKey = reconstructionState.body.coverupOptions[0].key;
  for (const page of players) {
    const result = await apiPost(page, endpoint, {
      action: "submitReconstruction",
      eventOrder: events,
      suspectPlayerId: suspectId,
      motiveKey,
      coverupKey,
    });
    assert(result.status === 200 && result.body?.ok, `Apartament rekonstrukcja: ${JSON.stringify(result.body)}`);
  }
  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "rekonstrukcja_wynik", "Apartament: brak wyniku rekonstrukcji");
  const reconResult = await waitForState(host, endpoint, b => b.reconstruction?.summary?.submitted === 5, "wynik rekonstrukcji");
  assert(reconResult.reconstruction.summary.total === 5, "Apartament: niepełny wynik rekonstrukcji");
  check("Apartament 214: wszystkie 5 rekonstrukcji zapisane i podsumowane");

  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "akt_oskarzenia", "Apartament: brak aktu oskarżenia");
  const accusationState = await apiGet(players[0], endpoint);
  const evidenceId = accusationState.body.evidence[0].id;
  for (const page of players) {
    const result = await apiPost(page, endpoint, {
      action: "submitAccusation",
      suspectPlayerId: suspectId,
      motiveKey,
      evidenceId,
    });
    assert(result.status === 200 && result.body?.ok, `Apartament oskarżenie: ${JSON.stringify(result.body)}`);
  }
  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "ujawnienie_1", "Apartament: brak ujawnienia 1");

  for (const phase of ["ujawnienie_1", "ujawnienie_2"]) {
    const hidden = await waitForState(host, endpoint, b => b.room?.phase === phase, phase);
    assert(hidden.reveal?.culprit == null, `P0: sprawca ujawniony za wcześnie w ${phase}`);
    if (phase === "ujawnienie_1") {
      step = await apiPost(host, endpoint, { action: "advance" });
      assert(step.body?.phase === "ujawnienie_2", "Apartament: brak ujawnienia 2");
    }
  }
  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "ujawnienie_3", "Apartament: brak ujawnienia 3");
  const reveal3 = await waitForState(host, endpoint, b => b.room?.phase === "ujawnienie_3", "ujawnienie 3");
  assert(reveal3.reveal?.culprit?.playerId === culpritId, "Apartament: ujawniono niewłaściwego sprawcę");
  step = await apiPost(host, endpoint, { action: "advance" });
  assert(step.status === 200 && step.body?.phase === "ujawnienie_4", "Apartament: brak ujawnienia 4");
  check("Apartament 214: sprawca pozostaje tajny do kroku 3 i zostaje poprawnie ujawniony", { culpritName });

  await host.screenshot({ path: `${artifacts}/01-apartament-host-reveal.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-apartament-player-mobile.png`, fullPage: true });
  const close = await apiPost(host, endpoint, { action: "closeGame" });
  assert(close.status === 200 && close.body?.ok, "Apartament: nie zamknięto gry");
  const closed = await waitForState(host, endpoint, b => b.role === "closed" && b.room?.phase === "zamknieta", "zamknięcie Apartamentu");
  assert(closed.room.status === "finished", "Apartament: pokój nie ma statusu finished");
  check("Apartament 214: pełna gra zakończona statusem finished");

  for (const context of contexts) await context.close().catch(() => {});
  await hostContext.close();
}

async function runOstatniKursAuto() {
  const creatorContext = await browser.newContext({ viewport: { width: 430, height: 900 }, isMobile: true });
  const creator = await creatorContext.newPage();
  watch(creator, "kurs-creator-player");
  const code = await createCaseRoom(creator, "BEZ PROWADZĄCEGO");
  const endpoint = `/api/gra/akta-nocy-ostatni-kurs/${code}`;
  const creatorRecovery = await joinGuest(creator, code, "E2E Kurs 1");
  assert(creatorRecovery.length === 6, "Ostatni Kurs: twórca nie dostał kodu powrotu");

  const contexts = [creatorContext];
  const players = [creator];
  const names = ["E2E Kurs 1"];
  for (let i = 2; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `kurs-player-${i}`);
    contexts.push(context);
    players.push(page);
    names.push(`E2E Kurs ${i}`);
    await joinGuest(page, code, `E2E Kurs ${i}`);
  }

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await Promise.all(players.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 })));
  const states = await Promise.all(players.map(page => apiGet(page, endpoint)));
  assert(states.every(x => x.status === 200 && x.body?.role === "player" && x.body?.playMode === "auto"), "Ostatni Kurs auto: nie wszyscy są graczami");
  const roles = states.map(x => x.body.roleCard);
  assert(roles.filter(x => x?.isCulprit).length === 1, "Ostatni Kurs auto: nie ma dokładnie 1 sprawcy");
  const initialPhase = states[0].body.room.phase;
  assert(initialPhase === "ok_akta_osobowe", `Ostatni Kurs auto: zła faza startowa ${initialPhase}`);
  check("Ostatni Kurs auto: 5 graczy, bez osobnego prowadzącego, dokładnie 1 sprawca", { code });

  const idToPage = new Map();
  for (let i = 0; i < states.length; i += 1) idToPage.set(states[i].body.player.playerId, players[i]);
  for (const page of players) {
    const opened = await apiPost(page, endpoint, { action: "openDossier" });
    assert(opened.status === 200 && opened.body?.ok, `Ostatni Kurs: openDossier ${JSON.stringify(opened.body)}`);
  }

  async function allReady(expectedPhase) {
    const before = await waitForState(players[0], endpoint, b => b.room?.phase === expectedPhase, `faza ${expectedPhase}`);
    for (const page of players) {
      const result = await apiPost(page, endpoint, { action: "ready" });
      assert(result.status === 200 && result.body?.ok, `Ostatni Kurs ready ${expectedPhase}: ${JSON.stringify(result.body)}`);
    }
    return waitForState(players[0], endpoint, b => b.room?.phase !== expectedPhase, `wyjście z ${expectedPhase}`);
  }

  let current = await allReady("ok_akta_osobowe");
  assert(current.room.phase === "ok_ostatni_raz", "Ostatni Kurs: nie przeszedł z akt do ostatniego razu");

  const passivePhases = [
    "ok_ostatni_raz", "ok_a_1", "ok_a_2", "ok_a_3", "ok_a_4", "ok_a_5",
    "ok_mapa", "ok_przesluchania", "ok_b_1", "ok_b_2", "ok_b_3", "ok_b_4", "ok_b_5", "ok_nowy_trop",
  ];

  for (const phase of passivePhases) {
    current = await waitForState(players[0], endpoint, b => b.room?.phase === phase, `Ostatni Kurs ${phase}`);
    if (phase === "ok_mapa") {
      const returningId = states[4].body.player.playerId;
      const returningName = states[4].body.player.displayName;
      const returningRole = states[4].body.roleCard.id;
      const rejoin = await requestAndApproveRejoin({
        hostPage: creator,
        oldContext: contexts[4],
        oldPageIndex: 4,
        players,
        contexts,
        code,
        name: returningName,
        expectedEndpoint: endpoint,
        expectedPlayerId: returningId,
        expectedPhase: "ok_mapa",
        watch,
      });
      assert(rejoin.state.playMode === "auto" && rejoin.state.roleCard?.id === returningRole, "Ostatni Kurs: rejoin zmienił rolę lub tryb");
      idToPage.set(returningId, rejoin.page);
      check("Ostatni Kurs auto: rejoin zachował rolę i fazę bez prowadzącego", { player: returningName, role: returningRole });
    }
    current = await allReady(phase);
  }
  assert(current.room.phase === "ok_rekonstrukcja", `Ostatni Kurs: oczekiwano rekonstrukcji, jest ${current.room.phase}`);
  check("Ostatni Kurs auto: wszystkie fazy dowodów, mapy i przesłuchań przeszły dopiero po gotowości 5/5");

  const reconstruction = await apiGet(players[0], endpoint);
  const eventOrder = reconstruction.body.reconstructionOptions.map(x => x.key).slice(0, 9);
  assert(eventOrder.length === 9 && new Set(eventOrder).size === 9, "Ostatni Kurs: brak 9 unikalnych zdarzeń");
  const route = ["w1", "w2", "w3", "platform"];
  for (const page of players) {
    const result = await apiPost(page, endpoint, { action: "submitReconstruction", eventOrder, route });
    assert(result.status === 200 && result.body?.ok, `Ostatni Kurs rekonstrukcja: ${JSON.stringify(result.body)}`);
  }
  current = await waitForState(players[0], endpoint, b => b.room?.phase === "ok_rekonstrukcja_wynik", "wynik rekonstrukcji auto");
  assert(current.reconstruction?.total === 5, `Ostatni Kurs: niepełna rekonstrukcja ${JSON.stringify(current.reconstruction)}`);
  check("Ostatni Kurs auto: 5 rekonstrukcji automatycznie uruchomiło wynik");

  current = await allReady("ok_rekonstrukcja_wynik");
  assert(current.room.phase === "ok_oskarzenie", "Ostatni Kurs: brak aktu oskarżenia");
  const accusation = await apiGet(players[0], endpoint);
  const suspectPlayerId = accusation.body.cast[0].playerId;
  const motiveKey = accusation.body.motiveOptions[0].key;
  const evidenceId = accusation.body.evidenceOptions[0].id;
  const disappearanceKey = accusation.body.disappearanceOptions[0].key;
  for (const page of players) {
    const result = await apiPost(page, endpoint, {
      action: "submitAccusation",
      suspectPlayerId,
      motiveKey,
      evidenceId,
      disappearanceKey,
    });
    assert(result.status === 200 && result.body?.ok, `Ostatni Kurs oskarżenie: ${JSON.stringify(result.body)}`);
  }
  current = await waitForState(players[0], endpoint, b => b.room?.phase === "ok_oskarzenie_wynik", "wynik oskarżenia auto");
  const resultBeforeReveal = JSON.stringify(current.accusations ?? {});
  assert(!resultBeforeReveal.includes("suspectCorrect") && !resultBeforeReveal.includes("fullyCorrect"), "P0: Ostatni Kurs ujawnia trafność przed finałem");
  check("Ostatni Kurs auto: 5 oskarżeń zamknęło głosowanie bez przedwczesnego ujawnienia trafności");

  current = await allReady("ok_oskarzenie_wynik");
  assert(current.room.phase === "ok_ujawnienie_1", "Ostatni Kurs: brak ujawnienia 1");
  for (const phase of ["ok_ujawnienie_1", "ok_ujawnienie_2", "ok_ujawnienie_3", "ok_ujawnienie_4"]) {
    const state = await waitForState(players[0], endpoint, b => b.room?.phase === phase, phase);
    const serialized = JSON.stringify(state.accusations ?? {});
    assert(!serialized.includes("suspectCorrect") && !serialized.includes("fullyCorrect"), `P0: trafność ujawniona za wcześnie w ${phase}`);
    current = await allReady(phase);
  }
  assert(current.room.phase === "ok_ujawnienie_5", `Ostatni Kurs: brak ujawnienia 5, jest ${current.room.phase}`);
  const reveal5 = await apiGet(players[0], endpoint);
  assert(reveal5.body.accusations?.results?.length === 5, "Ostatni Kurs: brak końcowych wyników oskarżeń");
  assert("fullyCorrect" in reveal5.body.accusations, "Ostatni Kurs: końcowe ujawnienie nie zawiera podsumowania trafności");
  check("Ostatni Kurs auto: rozwiązanie i trafność pojawiają się dopiero w ostatnim ujawnieniu");

  await creator.screenshot({ path: `${artifacts}/03-ostatni-kurs-auto-final.png`, fullPage: true });
  await players[4].screenshot({ path: `${artifacts}/04-ostatni-kurs-auto-player.png`, fullPage: true });
  const close = await apiPost(creator, endpoint, { action: "closeGame" });
  assert(close.status === 200 && close.body?.ok, `Ostatni Kurs: closeGame ${JSON.stringify(close.body)}`);
  const closed = await waitForState(creator, endpoint, b => b.role === "closed" && b.room?.phase === "ok_zamknieta", "zamknięcie Ostatniego Kursu");
  assert(closed.playMode === "auto" && closed.room.status === "finished", "Ostatni Kurs: zły stan zamknięty");
  check("Ostatni Kurs auto: pełna gra bez prowadzącego zakończona statusem finished");

  for (const context of contexts) await context.close().catch(() => {});
}

try {
  await runApartament214();
  await runOstatniKursAuto();
  assert(errors.filter(item => item.includes("AKTA API 5")).length === 0, `Wykryto odpowiedzi 5xx: ${JSON.stringify(errors)}`);
  check("Akta Nocy: brak odpowiedzi API 5xx w obu pełnych scenariuszach");
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  assert(errors.length === 0, `Błędy przeglądarki/API: ${JSON.stringify(errors)}`);
} catch (error) {
  errors.push(error instanceof Error ? error.stack || error.message : String(error));
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
