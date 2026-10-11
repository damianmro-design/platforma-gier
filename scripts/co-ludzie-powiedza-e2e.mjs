import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.CLP_BASE_URL || process.env.PP_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/co-ludzie-powiedza";
await fs.mkdir(artifacts, { recursive: true });

const warmup = [
  ["wakacje", "Morze"],
  ["dziesiec_tysiecy", "Wakacje"],
  ["fast_food", "Pizza"],
  ["poranek", "Telefon"],
  ["najgorszy_dzien", "Poniedziałek"],
  ["wieczor", "Domówka"],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readState(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/co-ludzie-powiedza/${roomCode}`, { cache: "no-store" });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  }, code);
}

async function post(page, code, payload) {
  return page.evaluate(async ({ roomCode, body }) => {
    const response = await fetch(`/api/gra/co-ludzie-powiedza/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let result = null;
    try { result = await response.json(); } catch { result = null; }
    return { status: response.status, body: result };
  }, { roomCode: code, body: payload });
}

async function waitFor(page, code, predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await readState(page, code);
    if (last.status === 200 && last.body && predicate(last.body)) return last.body;
    await page.waitForTimeout(200);
  }
  throw new Error(`Timeout: ${label}. Last=${JSON.stringify(last)}`);
}

async function waitPhase(page, code, phase, timeout = 20000) {
  return waitFor(page, code, body => body.room?.phase === phase, `phase ${phase}`, timeout);
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

const launchOptions = process.env.CHROME_BIN
  ? { headless: true, executablePath: process.env.CHROME_BIN }
  : { headless: true };
const browser = await chromium.launch(launchOptions);
const errors = [];
const report = {
  baseURL,
  roomCode: null,
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
    if (response.url().includes("/api/gra/co-ludzie-powiedza/") && response.status() >= 500) {
      errors.push(`${label} CLP API ${response.status()}: ${response.url()}`);
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

try {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage();
  watch(host, "host");

  await host.goto(`${baseURL}/gry/co-ludzie-powiedza`, { waitUntil: "networkidle" });
  const title = ((await host.locator("h1").first().textContent()) || "").replace(/\s+/g, "").toUpperCase();
  assert(title.includes("COLUDZIEPOWIEDZĄ"), `Nieprawidłowa strona startowa: ${title}`);
  await host.getByRole("button", { name: "Utwórz pokój", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/);
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;
  check("prowadzący utworzył pokój", code);

  const playerContexts = [];
  const players = [];
  const names = Array.from({ length: 6 }, (_, i) => `E2E Ankieta ${i + 1}`);
  const recoveryCodes = [];
  for (let i = 0; i < 6; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    watch(page, `player-${i + 1}`);
    playerContexts.push(context);
    players.push(page);
    recoveryCodes.push(await joinGuest(page, code, names[i]));
  }
  check("6 graczy dołączyło i otrzymało kody powrotu", recoveryCodes.map(code => code.length));

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByRole("button", { name: /Podziel na drużyny|Losuj ponownie/ }).click();
  await host.getByText("Drużyna A").waitFor({ timeout: 15000 });
  await host.getByText("Drużyna B").waitFor({ timeout: 15000 });
  await host.getByRole("button", { name: "START GRY", exact: true }).waitFor({ state: "visible", timeout: 15000 });
  assert(await host.getByRole("button", { name: "START GRY", exact: true }).isEnabled(), "START GRY pozostał nieaktywny");
  await host.getByRole("button", { name: "START GRY", exact: true }).click();

  await Promise.all([
    host.waitForURL(new RegExp(`/gra/co-ludzie-powiedza/${code}$`), { timeout: 15000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/co-ludzie-powiedza/${code}$`), { timeout: 15000 })),
  ]);

  const initialPlayerStates = await Promise.all(players.map(page => readState(page, code)));
  assert(initialPlayerStates.every(item => item.status === 200 && item.body?.role === "player"), "Nie wszyscy gracze mają aktywną sesję");
  const teamCounts = initialPlayerStates.reduce((acc, item) => {
    const team = item.body.player.team;
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {});
  assert(teamCounts.A === 3 && teamCounts.B === 3, `Nieprawidłowy podział drużyn: ${JSON.stringify(teamCounts)}`);
  check("start gry, 2 drużyny po 3 osoby", teamCounts);

  const pageById = new Map();
  const metaById = new Map();
  for (let i = 0; i < initialPlayerStates.length; i += 1) {
    const player = initialPlayerStates[i].body.player;
    pageById.set(player.id, players[i]);
    metaById.set(player.id, { name: player.display_name, team: player.team, index: i });
  }

  const hostWarmup = await readState(host, code);
  assert(hostWarmup.status === 200 && hostWarmup.body?.role === "host", "Prowadzący nie otrzymał widoku prowadzącego");
  assert(Array.isArray(hostWarmup.body.progress), "Brak postępu rozgrzewki u prowadzącego");
  check("prowadzący ma wspólny ekran, gracze osobne telefony");

  for (const page of players) {
    for (const [questionKey, answer] of warmup) {
      const result = await post(page, code, { action: "answer", questionKey, answer });
      assert(result.status === 200, `Rozgrzewka odrzucona: ${JSON.stringify(result.body)}`);
    }
  }
  const warmupDone = await waitFor(host, code, body =>
    Array.isArray(body.progress) && body.progress.length === 6 && body.progress.every(p => p.answer_count === 6),
  "wszyscy kończą rozgrzewkę");
  assert(warmupDone.progress.every(p => p.answer_count === 6), "Niepełna rozgrzewka");
  check("wszyscy gracze zapisali 6 prywatnych odpowiedzi rozgrzewki");

  const advance = await post(host, code, { action: "advance" });
  assert(advance.status === 200 && advance.body?.phase === "round_1", `Nie wystartowała runda 1: ${JSON.stringify(advance.body)}`);
  await waitPhase(host, code, "round_1");

  let round1Questions = 0;
  while (true) {
    const state = await waitPhase(host, code, "round_1");
    const q = state.round1;
    round1Questions = Math.max(round1Questions, q.questionIndex + 1);
    let guard = 0;
    while (q.questionIndex === (await readState(host, code)).body.round1.questionIndex) {
      const current = (await readState(host, code)).body;
      if (current.room.phase !== "round_1" || current.round1.mode === "between") break;
      const answererId = current.round1.answerer?.id;
      assert(answererId && pageById.has(answererId), `Brak aktywnego odpowiadającego w rundzie 1: ${JSON.stringify(current.round1)}`);
      const result = await post(pageById.get(answererId), code, {
        action: "round1Guess",
        guess: `e2e_pudlo_${current.round1.questionIndex}_${guard}_${Date.now()}`,
      });
      assert(result.status === 200, `Runda 1 odrzuciła odpowiedź: ${JSON.stringify(result.body)}`);
      guard += 1;
      assert(guard <= 4, "Runda 1 nie doszła do końca pytania po kontrolowanych pudłach");
      await host.waitForTimeout(100);
    }
    const between = await readState(host, code);
    assert(between.status === 200 && between.body.round1?.mode === "between", `Runda 1 nie weszła w between: ${JSON.stringify(between.body)}`);
    const next = await post(host, code, { action: "round1Next" });
    assert(next.status === 200, `round1Next odrzucony: ${JSON.stringify(next.body)}`);
    if (next.body?.phase === "round_2") break;
    await waitFor(host, code, body => body.room?.phase === "round_1" && body.round1?.questionIndex > q.questionIndex, "kolejne pytanie rundy 1");
  }
  await waitPhase(host, code, "round_2");
  check("runda 1 przeszła pełną rotację pytań, tur, 2 pudła i kradzież", { questions: round1Questions });

  async function runPairedRound({ phase, key, action, payload, nextAction, expectedStartMode, expectedEndMode }) {
    let questions = 0;
    while (true) {
      const body = await waitPhase(host, code, phase);
      const round = body[key];
      questions = Math.max(questions, round.questionIndex + 1);
      assert(round.mode === expectedStartMode, `${phase}: oczekiwano ${expectedStartMode}, jest ${round.mode}`);
      const predictorA = round.predictorA?.id;
      const predictorB = round.predictorB?.id;
      assert(pageById.has(predictorA) && pageById.has(predictorB), `${phase}: brak aktualnych reprezentantów`);
      const resultA = await post(pageById.get(predictorA), code, { action, ...payload(round, "A") });
      assert(resultA.status === 200, `${phase} A: ${JSON.stringify(resultA.body)}`);
      const resultB = await post(pageById.get(predictorB), code, { action, ...payload(round, "B") });
      assert(resultB.status === 200, `${phase} B: ${JSON.stringify(resultB.body)}`);
      const reveal = await waitFor(host, code, b => b.room?.phase === phase && b[key]?.mode === expectedEndMode, `${phase} reveal`);
      assert(Number.isFinite(reveal[key].scoreA) && Number.isFinite(reveal[key].scoreB), `${phase}: brak wyniku`);
      const next = await post(host, code, { action: nextAction });
      assert(next.status === 200, `${nextAction}: ${JSON.stringify(next.body)}`);
      if (next.body?.phase !== phase) return { questions, nextPhase: next.body?.phase };
      await waitFor(host, code, b => b.room?.phase === phase && b[key]?.questionIndex > round.questionIndex, `${phase} następne pytanie`);
    }
  }

  const r2 = await runPairedRound({
    phase: "round_2", key: "round2", action: "round2Prediction", nextAction: "round2Next",
    expectedStartMode: "predict", expectedEndMode: "reveal",
    payload: round => ({ answer: round.options[0] }),
  });
  assert(r2.nextPhase === "round_3", `Po rundzie 2: ${r2.nextPhase}`);
  check("runda 2 ukończona z prywatnymi typami obu drużyn", r2);

  const r3 = await runPairedRound({
    phase: "round_3", key: "round3", action: "round3Ranking", nextAction: "round3Next",
    expectedStartMode: "rank", expectedEndMode: "reveal",
    payload: round => ({ ranking: [...round.options] }),
  });
  assert(r3.nextPhase === "round_4", `Po rundzie 3: ${r3.nextPhase}`);
  check("runda 3 ukończona, pełne rankingi po 5 odpowiedzi", r3);

  const returningId = initialPlayerStates[0].body.player.id;
  const returningTeam = initialPlayerStates[0].body.player.team;
  const returningName = initialPlayerStates[0].body.player.display_name;
  await playerContexts[0].close();
  const rejoinContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const rejoinPage = await rejoinContext.newPage();
  watch(rejoinPage, "rejoined-player");
  await rejoinPage.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await rejoinPage.locator("#recoverName").selectOption({ label: returningName });
  await rejoinPage.getByRole("button", { name: "Poproś o powrót" }).click();
  await rejoinPage.getByText("Prośba wysłana do twórcy pokoju").waitFor({ timeout: 10000 });
  await host.getByRole("button", { name: "WPUŚĆ Z POWROTEM" }).waitFor({ state: "visible", timeout: 12000 });
  await host.getByText(returningName, { exact: true }).waitFor({ timeout: 12000 });
  await host.getByRole("button", { name: "WPUŚĆ Z POWROTEM" }).click();
  await rejoinPage.waitForURL(new RegExp(`/gra/co-ludzie-powiedza/${code}$`), { timeout: 15000 });
  const returned = await waitFor(rejoinPage, code, body => body.player?.id === returningId, "powrót gracza");
  assert(returned.player.team === returningTeam, "Rejoin zmienił drużynę gracza");
  assert(returned.room.phase === "round_4", `Rejoin zmienił fazę: ${returned.room.phase}`);
  players[0] = rejoinPage;
  playerContexts[0] = rejoinContext;
  pageById.set(returningId, rejoinPage);
  check("aktywny rejoin zachował gracza, drużynę i fazę", { name: returningName, team: returningTeam, phase: returned.room.phase });

  const r4 = await runPairedRound({
    phase: "round_4", key: "round4", action: "round4Prediction", nextAction: "round4Next",
    expectedStartMode: "pick", expectedEndMode: "reveal",
    payload: round => ({ answer: round.options[0] }),
  });
  assert(r4.nextPhase === "round_5", `Po rundzie 4: ${r4.nextPhase}`);
  check("runda 4 ukończona po rejoinie", r4);

  let r5questions = 0;
  while (true) {
    const body = await waitPhase(host, code, "round_5");
    const round = body.round5;
    r5questions = Math.max(r5questions, round.questionIndex + 1);
    assert(round.mode === "vote", `Runda 5 nie jest w vote: ${round.mode}`);
    for (let i = 0; i < players.length; i += 1) {
      const state = await readState(players[i], code);
      const me = state.body.player.id;
      const target = round.players.find(p => p.id !== me)?.id;
      assert(target, `Brak celu głosowania dla gracza ${i + 1}`);
      const vote = await post(players[i], code, { action: "round5Vote", targetPlayerId: target });
      assert(vote.status === 200, `Głos rundy 5 odrzucony: ${JSON.stringify(vote.body)}`);
    }
    const predict = await waitFor(host, code, b => b.round5?.mode === "predict", "round5 predict");
    const target = predict.round5.players[0].id;
    const pa = predict.round5.predictorA.id;
    const pb = predict.round5.predictorB.id;
    const a = await post(pageById.get(pa), code, { action: "round5Prediction", targetPlayerId: target });
    const b = await post(pageById.get(pb), code, { action: "round5Prediction", targetPlayerId: target });
    assert(a.status === 200 && b.status === 200, `Typowanie rundy 5 odrzucone: ${JSON.stringify([a.body, b.body])}`);
    await waitFor(host, code, s => s.round5?.mode === "reveal", "round5 reveal");
    const next = await post(host, code, { action: "round5Next" });
    assert(next.status === 200, `round5Next: ${JSON.stringify(next.body)}`);
    if (next.body?.phase === "round_6") break;
    await waitFor(host, code, s => s.room?.phase === "round_5" && s.round5?.questionIndex > round.questionIndex, "round5 next question");
  }
  check("runda 5 ukończona, każdy głosował i obie drużyny typowały osobę", { questions: r5questions });

  const r6 = await runPairedRound({
    phase: "round_6", key: "round6", action: "round6Prediction", nextAction: "round6Next",
    expectedStartMode: "predict", expectedEndMode: "reveal",
    payload: () => ({ count: 0 }),
  });
  assert(r6.nextPhase === "round_7", `Po rundzie 6: ${r6.nextPhase}`);
  check("runda 6 ukończona z typami liczbowymi", r6);

  const r7 = await runPairedRound({
    phase: "round_7", key: "round7", action: "round7Prediction", nextAction: "round7Next",
    expectedStartMode: "predict", expectedEndMode: "reveal",
    payload: round => ({ answer: round.optionA }),
  });
  assert(r7.nextPhase === "final", `Po rundzie 7: ${r7.nextPhase}`);
  check("runda 7 ukończona, finał uruchomiony", r7);

  let finalQuestions = 0;
  while (true) {
    const body = await waitPhase(host, code, "final");
    const final = body.final;
    if (final.mode === "tiebreak") {
      const pa = final.predictorA?.id;
      const pb = final.predictorB?.id;
      assert(pageById.has(pa) && pageById.has(pb), "Brak reprezentantów dogrywki");
      const a = await post(pageById.get(pa), code, { action: "finalTiebreak", count: 0 });
      const b = await post(pageById.get(pb), code, { action: "finalTiebreak", count: 100 });
      assert(a.status === 200 && b.status === 200, `Dogrywka odrzucona: ${JSON.stringify([a.body, b.body])}`);
      break;
    }
    assert(final.mode === "predict", `Nieoczekiwany tryb finału: ${final.mode}`);
    finalQuestions = Math.max(finalQuestions, final.questionIndex + 1);
    const pa = final.predictorA?.id;
    const pb = final.predictorB?.id;
    assert(pageById.has(pa) && pageById.has(pb), "Brak reprezentantów finału");
    const answer = final.options[0];
    const a = await post(pageById.get(pa), code, { action: "finalPrediction", answer });
    const b = await post(pageById.get(pb), code, { action: "finalPrediction", answer });
    assert(a.status === 200 && b.status === 200, `Typ finałowy odrzucony: ${JSON.stringify([a.body, b.body])}`);
    await waitFor(host, code, s => s.final?.mode === "reveal", "final reveal");
    const next = await post(host, code, { action: "finalNext" });
    assert(next.status === 200, `finalNext odrzucony: ${JSON.stringify(next.body)}`);
    if (next.body?.phase === "finished") break;
    await host.waitForTimeout(100);
  }

  const finished = await waitPhase(host, code, "finished", 25000);
  assert(finished.final?.mode === "finished", `Brak ukończonego finału: ${JSON.stringify(finished.final)}`);
  assert(["A", "B"].includes(finished.final.winner), `Brak zwycięskiej drużyny: ${finished.final.winner}`);
  assert(Number.isFinite(finished.final.scoreA) && Number.isFinite(finished.final.scoreB), "Brak końcowych wyników");
  check("finał i ewentualna dogrywka kończą grę zwycięzcą", {
    questions: finalQuestions,
    winner: finished.final.winner,
    scoreA: finished.final.scoreA,
    scoreB: finished.final.scoreB,
  });

  await host.screenshot({ path: `${artifacts}/01-host-final.png`, fullPage: true });
  await players[0].screenshot({ path: `${artifacts}/02-player-final-mobile.png`, fullPage: true });
  await host.reload({ waitUntil: "domcontentloaded" });
  const afterRefresh = await waitPhase(host, code, "finished");
  assert(afterRefresh.final?.winner === finished.final.winner, "Refresh zmienił wynik finału");
  check("wynik pozostaje dostępny po odświeżeniu prowadzącego");

  assert(errors.filter(item => item.includes("CLP API 5")).length === 0, `Wykryto przejściowe 5xx API: ${JSON.stringify(errors)}`);
  check("brak odpowiedzi 5xx podczas wszystkich przejść między fazami");

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
