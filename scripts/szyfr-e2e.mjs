import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.SZYFR_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/szyfr";
await fs.mkdir(artifacts, { recursive: true });

const expected = {
  "tutorial": "4",
  "m1-v1-s1": "472",
  "m1-v1-s2": "SIEC",
  "m1-v2-s1": "638",
  "m1-v2-s2": "ECHO",
  "m1-v3-s1": "251",
  "m1-v3-s2": "PULS",
  "m2-v1-s1": "NODE-7",
  "m2-v1-s2": "7314",
  "m2-v2-s1": "ARCH-4",
  "m2-v2-s2": "9052",
  "m2-v3-s1": "SEKTOR-C",
  "m2-v3-s2": "4628",
  "m3-v1-s1": ["ALFA","DELTA","SIGMA","OMEGA"],
  "m3-v1-s2": "ORBIT",
  "m3-v2-s1": ["KAPPA","OMEGA","ALFA","DELTA"],
  "m3-v2-s2": "MIRA",
  "m3-v3-s1": ["SIGMA","ALFA","OMEGA","DELTA"],
  "m3-v3-s2": "VECTOR",
  "m4-v1-s1": "3816",
  "m4-v1-s2": "KLUCZ",
  "m4-v2-s1": "5263",
  "m4-v2-s2": "DOSTEP",
  "m4-v3-s1": "7142",
  "m4-v3-s2": "OTWORZ",
};

const finalOrders = {
  "final-v1": [3,1,4,2],
  "final-v2": [2,4,1,3],
  "final-v3": [4,2,3,1],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clean(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

async function apiState(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/szyfr/${roomCode}`, { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  }, code);
}

async function waitForGameState(page, code, predicate, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = await apiState(page, code);
    if (last.status === 200 && predicate(last.body.game)) return last.body.game;
    await page.waitForTimeout(220);
  }
  throw new Error(`Timeout waiting for ${label}. Last: ${JSON.stringify(last)}`);
}

function answerFor(game) {
  const key = game.puzzle.stepKey;
  if (key.startsWith("final-")) {
    const order = finalOrders[key];
    assert(order, `Missing final order for ${key}`);
    return order.map((mission) => game.fragments[mission - 1]).join("");
  }
  const value = expected[key];
  assert(value != null, `Missing expected answer for ${key}`);
  return value;
}

async function submitByUi(page, game) {
  const key = game.puzzle.stepKey;
  const value = answerFor(game);

  await page.locator("[data-step-key=" + JSON.stringify(key) + "]").waitFor({ state: "visible" });
  await page.waitForTimeout(140);

  if (game.puzzle.answerType === "choice") {
    const wanted = clean(value);
    const option = game.puzzle.options.find((item) => clean(item) === wanted);
    assert(option, `Choice not found for ${key}: ${value}`);
    await page.getByRole("button", { name: option, exact: true }).click();
  } else if (game.puzzle.answerType === "order") {
    for (const item of value) {
      await page.getByRole("button", { name: `+ ${item}`, exact: true }).click();
    }
  } else {
    await page.locator("#szyfr-answer").fill(String(value));
  }

  await page.getByRole("button", { name: /Sprawdź wspólną odpowiedź/ }).click();
  return waitForGameState(
    page,
    game.roomCode,
    (next) => next.phase === "finished" || next.puzzle.stepKey !== key,
    `advance from ${key}`,
  );
}

async function postAnswer(page, code, stepKey, answer) {
  return page.evaluate(async ({ roomCode, step, value }) => {
    const response = await fetch(`/api/gra/szyfr/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", stepKey: step, answer: value }),
    });
    return { status: response.status, body: await response.json() };
  }, { roomCode: code, step: stepKey, value: answer });
}

const browser = await chromium.launch({ headless: true });
const errors = [];

function watch(page, label) {
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!text.includes("favicon") && !text.includes("qrserver")) {
        const location = message.location();
        errors.push(`${label} console: ${text} @ ${location.url || "unknown"}:${location.lineNumber || 0}`);
      }
    }
  });
}

try {
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const agentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  let host = await hostContext.newPage();
  const agent = await agentContext.newPage();
  watch(host, "host");
  watch(agent, "agent");

  await host.goto(`${baseURL}/gry/szyfr`, { waitUntil: "networkidle" });
  await host.screenshot({ path: `${artifacts}/01-landing.png`, fullPage: true });
  await host.getByRole("button", { name: /Utwórz operację/ }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4}$/);
  const code = host.url().split("/").pop();
  assert(code && code.length === 4, "Room code not created");

  await host.locator("#playerName").fill("Host");
  await host.getByRole("button", { name: "Dołącz jako gość" }).click();
  await host.getByText("GRASZ JAKO").waitFor();
  const hostRecovery = await host.locator(".recovery-code strong").textContent();
  assert(hostRecovery?.trim().length === 6, "Host recovery code missing");

  await agent.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await agent.locator("#playerName").fill("Agent 2");
  await agent.getByRole("button", { name: "Dołącz jako gość" }).click();
  await agent.getByText("GRASZ JAKO").waitFor();
  const agentRecovery = (await agent.locator(".recovery-code strong").textContent())?.trim();
  assert(agentRecovery?.length === 6, "Agent recovery code missing");

  await host.screenshot({ path: `${artifacts}/02-lobby-desktop.png`, fullPage: true });
  await agent.screenshot({ path: `${artifacts}/03-lobby-mobile.png`, fullPage: true });

  await host.getByRole("button", { name: "Jestem gotowy" }).click();
  await agent.getByRole("button", { name: "Jestem gotowy" }).click();
  await host.getByRole("button", { name: "START GRY" }).waitFor({ state: "visible" });
  await host.getByRole("button", { name: "START GRY" }).click();

  await Promise.all([
    host.waitForURL(new RegExp(`/gra/szyfr/${code}$`)),
    agent.waitForURL(new RegExp(`/gra/szyfr/${code}$`)),
  ]);

  let state = await waitForGameState(host, code, (g) => g.phase === "tutorial", "host tutorial state");
  state.roomCode = code;
  assert(state.puzzle.privateClues.length === 3, "2-player tutorial should give host 3 clues");

  const agentTutorial = await waitForGameState(agent, code, (g) => g.phase === "tutorial", "agent tutorial state");
  assert(agentTutorial.puzzle.privateClues.length === 3, "2-player tutorial should give agent 3 clues");
  assert(
    new Set([...state.puzzle.privateClues, ...agentTutorial.puzzle.privateClues]).size === 6,
    "Tutorial clues are missing or duplicated between 2 players",
  );

  await host.locator("#szyfr-answer").fill("4");
  await host.getByRole("button", { name: /Sprawdź wspólną odpowiedź/ }).click();
  state = await waitForGameState(host, code, (g) => g.phase === "playing", "tutorial completion");
  state.roomCode = code;

  const firstKey = state.puzzle.stepKey;
  await host.getByText(state.puzzle.title, { exact: true }).waitFor({ state: "visible" });
  await host.locator("#szyfr-answer").fill("999999");
  await host.getByRole("button", { name: /Sprawdź wspólną odpowiedź/ }).click();
  state = await waitForGameState(host, code, (g) => g.wrongAttempts === 1, "wrong-answer penalty");
  assert(state.puzzle.stepKey === firstKey, "Wrong answer advanced the game");
  assert(state.wrongAttempts === 1, "Wrong attempt not recorded");

  host.once("dialog", (dialog) => dialog.accept());
  await host.getByRole("button", { name: /Podpowiedź · −30 s/ }).click();
  state = await waitForGameState(host, code, (g) => g.hintsUsed === 1 && g.hintLevel === 1, "hint penalty");
  state.roomCode = code;
  assert(state.hints.length === 1, "Hint was not revealed");

  await host.screenshot({ path: `${artifacts}/04-gameplay-desktop.png`, fullPage: true });
  await agent.screenshot({ path: `${artifacts}/05-gameplay-mobile.png`, fullPage: true });

  state = await submitByUi(host, state);
  state.roomCode = code;
  state = await submitByUi(host, state);
  state.roomCode = code;

  const beforeRefresh = state.puzzle.stepKey;
  await agent.reload({ waitUntil: "domcontentloaded" });
  const afterRefresh = (await apiState(agent, code)).body.game;
  assert(afterRefresh.puzzle.stepKey === beforeRefresh, "Refresh changed the active step");

  const cookies = await agentContext.cookies();
  const playerCookie = cookies.find((cookie) => cookie.name === `partyplay_player_${code}`);
  assert(playerCookie, "Agent player cookie missing before recovery test");
  await agentContext.clearCookies({ name: playerCookie.name });
  await agent.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await agent.getByText("ROZGRYWKA JUŻ TRWA").waitFor();
  await agent.locator("#recoverName").fill("Agent 2");
  await agent.locator("#recoverCode").fill(agentRecovery);
  await agent.getByRole("button", { name: "Odzyskaj swoją postać" }).click();
  await agent.waitForURL(new RegExp(`/gra/szyfr/${code}$`));

  state = (await apiState(host, code)).body.game;
  state.roomCode = code;
  const raceKey = state.puzzle.stepKey;
  const raceAnswer = answerFor(state);
  const raceValue = Array.isArray(raceAnswer) ? raceAnswer.join("") : raceAnswer;
  const [raceA, raceB] = await Promise.all([
    postAnswer(host, code, raceKey, raceValue),
    postAnswer(agent, code, raceKey, raceValue),
  ]);
  const statuses = [raceA.status, raceB.status].sort((a,b) => a-b);
  assert(statuses[0] === 200 && statuses[1] === 200, `Concurrent answer did not sync cleanly: ${statuses.join(",")}`);
  const raceBodies = [raceA.body, raceB.body];
  assert(
    raceBodies.some((body) => body.correct === true) && raceBodies.some((body) => body.stale === true),
    `Concurrent answer did not produce one success and one stale sync: ${JSON.stringify(raceBodies)}`,
  );
  state = await waitForGameState(host, code, (g) => g.puzzle.stepKey !== raceKey, "concurrent answer advance");
  state.roomCode = code;

  await host.close();
  state = await submitByUi(agent, state);
  state.roomCode = code;

  host = await hostContext.newPage();
  watch(host, "host-return");
  await host.goto(`${baseURL}/gra/szyfr/${code}`, { waitUntil: "domcontentloaded" });
  const hostReturn = (await apiState(host, code)).body.game;
  assert(hostReturn.puzzle.stepKey === state.puzzle.stepKey, "Host return did not restore current step");

  while (state.phase !== "finished") {
    state.roomCode = code;
    state = await submitByUi(agent, state);
  }

  await host.waitForTimeout(1200);
  await host.reload({ waitUntil: "domcontentloaded" });
  await host.getByText("TRANSMISJA ODSZYFROWANA").waitFor();
  await agent.getByText("TRANSMISJA ODSZYFROWANA").waitFor();
  await agent.screenshot({ path: `${artifacts}/06-success-mobile.png`, fullPage: true });

  const finished = (await apiState(host, code)).body.game;
  assert(finished.phase === "finished", "Finished state not persisted");
  assert(finished.wrongAttempts === 1, "Wrong attempt stat changed");
  assert(finished.hintsUsed === 1, "Hint stat changed");
  assert(finished.fragments.length === 4, "Final did not use 4 mission fragments");

  const oldSignature = finished.scenarioSignature;
  await host.getByRole("button", { name: "Nowa misja" }).click();
  const rematch = await waitForGameState(host, code, (g) => g.phase === "tutorial", "rematch tutorial");
  assert(rematch.scenarioSignature !== oldSignature, "New mission repeated the exact same scenario signature");

  assert(errors.length === 0, `Browser errors detected:\n${errors.join("\n")}`);

  await fs.writeFile(
    `${artifacts}/report.json`,
    JSON.stringify({
      ok: true,
      code,
      checks: [
        "create room",
        "join 2 phones",
        "ready/start",
        "private clue split",
        "tutorial",
        "wrong answer penalty",
        "hint penalty",
        "desktop + mobile rendering",
        "refresh persistence",
        "recovery after lost cookie",
        "concurrent answer race safety",
        "host disconnect + return",
        "full game to final",
        "success stats",
        "new scenario rematch",
        "no console/page errors",
      ],
    }, null, 2),
  );

  console.log(`SZYFR E2E PASS room=${code}`);
} finally {
  await browser.close();
}
