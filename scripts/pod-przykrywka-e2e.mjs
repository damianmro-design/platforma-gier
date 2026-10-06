import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.PP_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/pod-przykrywka";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readState(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/pod-przykrywka/${roomCode}`, { cache: "no-store" });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  }, code);
}

async function post(page, code, payload) {
  return page.evaluate(async ({ roomCode, body }) => {
    const response = await fetch(`/api/gra/pod-przykrywka/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let result = null;
    try { result = await response.json(); } catch { result = null; }
    return { status: response.status, body: result };
  }, { roomCode: code, body: payload });
}

async function waitForState(page, code, predicate, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await readState(page, code);
    if (last.status === 200 && last.body?.game && predicate(last.body.game, last.body)) return last.body;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timeout waiting for ${label}. Last: ${JSON.stringify(last)}`);
}

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 10000 });
  const recoveryCode = (await page.locator(".recovery-code strong").textContent())?.trim();
  assert(recoveryCode?.length === 6, `Brak kodu powrotu dla ${name}`);
  return recoveryCode;
}

function secretFromPrompt(prompt) {
  const line = String(prompt || "").split(/\n+/).map(item => item.trim()).find(item => item.startsWith("TAJNE HASŁO:"));
  return line ? line.replace("TAJNE HASŁO:", "").trim() : "";
}

function pickNonSelfTarget(game) {
  const me = game.currentPlayer?.id;
  return game.players.find(player => player.id !== me)?.id || null;
}

const launchOptions = process.env.CHROME_BIN
  ? { headless: true, executablePath: process.env.CHROME_BIN }
  : { headless: true };
const browser = await chromium.launch(launchOptions);
const errors = [];
const report = { baseURL, roomCode: null, startedAt: new Date().toISOString(), finishedAt: null, checks: [], errors };

function check(label, details = null) {
  report.checks.push({ label, details, at: new Date().toISOString() });
}

function watch(page, label) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    const ignored = text.includes("favicon") || text.includes("qrserver") || text.includes("Failed to load resource: the server responded with a status of 401") || text.includes("Failed to load resource: the server responded with a status of 404");
    if (!ignored) errors.push(`${label} console: ${text}`);
  });
}

try {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage();
  watch(host, "host");

  await host.goto(`${baseURL}/gry/pod-przykrywka`, { waitUntil: "networkidle" });
  await host.getByRole("heading", { name: /POD\s*PRZYKRYWKĄ/i }).waitFor();
  await host.getByRole("button", { name: "Utwórz pokój →", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/);
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;
  check("host created room", code);

  const playerContexts = await Promise.all(Array.from({ length: 6 }, () => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })));
  const players = await Promise.all(playerContexts.map(context => context.newPage()));
  players.forEach((page, index) => watch(page, `player-${index + 1}`));

  const recoveryCodes = [];
  for (let index = 0; index < players.length; index += 1) {
    recoveryCodes.push(await joinGuest(players[index], code, `E2E Agent ${index + 1}`));
  }
  check("six players joined with recovery codes", recoveryCodes.map(codeValue => codeValue.length));

  await Promise.all(players.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await host.getByRole("button", { name: "START GRY", exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await host.getByRole("button", { name: "START GRY", exact: true }).click();

  await Promise.all([
    host.waitForURL(new RegExp(`/gra/pod-przykrywka/${code}$`), { timeout: 15000 }),
    ...players.map(page => page.waitForURL(new RegExp(`/gra/pod-przykrywka/${code}$`), { timeout: 15000 })),
  ]);
  check("host manually started a six-player game");

  const hostBriefing = await waitForState(host, code, game => game.phase === "briefing", "briefing host state");
  assert(hostBriefing.role === "host", "Prowadzący nie otrzymał roli host");
  assert(hostBriefing.game.currentPlayer === null, "Prowadzący dostał prywatny currentPlayer i może poznać rolę");
  assert(hostBriefing.game.result === null, "W briefing nie powinien istnieć końcowy wynik z tożsamością Oszusta");
  check("host briefing does not expose a private player role");

  const briefingStates = await Promise.all(players.map(page => readState(page, code)));
  const roles = briefingStates.map(item => item.body?.game?.currentPlayer?.role);
  const saboteurIndexes = roles.map((role, index) => ({ role, index })).filter(item => item.role === "saboteur");
  const agentIndexes = roles.map((role, index) => ({ role, index })).filter(item => item.role === "agent");
  assert(saboteurIndexes.length === 1, `Oczekiwano dokładnie 1 Oszusta, znaleziono ${saboteurIndexes.length}: ${JSON.stringify(roles)}`);
  assert(agentIndexes.length === 5, `Oczekiwano 5 Agentów, znaleziono ${agentIndexes.length}: ${JSON.stringify(roles)}`);
  check("private roles resolve to exactly one saboteur and five agents");

  const saboteurIndex = saboteurIndexes[0].index;
  const agentIndex = agentIndexes[0].index;
  await players[saboteurIndex].getByText("OSZUST", { exact: true }).waitFor({ timeout: 10000 });
  await players[agentIndex].getByText("AGENT", { exact: true }).waitFor({ timeout: 10000 });
  await players[saboteurIndex].screenshot({ path: `${artifacts}/01-saboteur-briefing.png`, fullPage: true });
  await host.screenshot({ path: `${artifacts}/02-host-briefing.png`, fullPage: true });
  check("role briefing UI is private on phones");

  const advanceMission = await post(host, code, { action: "advance" });
  assert(advanceMission.status === 200, `Prowadzący nie uruchomił misji 1: ${JSON.stringify(advanceMission.body)}`);
  await Promise.all(players.map(page => waitForState(page, code, game => game.phase === "mission", "mission 1")));

  const missionStates = await Promise.all(players.map(page => readState(page, code)));
  const agentMission = missionStates[agentIndex].body.game;
  const saboteurMission = missionStates[saboteurIndex].body.game;
  const secret = secretFromPrompt(agentMission.mission?.prompt);
  assert(secret, `Agent nie otrzymał tajnego hasła w misji: ${JSON.stringify(agentMission.mission)}`);
  assert(!JSON.stringify(saboteurMission).includes(secret), `P0 PRIVACY LEAK: API Oszusta zawiera tajne hasło "${secret}"`);
  assert(saboteurMission.currentPlayer?.role === "saboteur", "Utracono rolę Oszusta po wejściu do misji");
  check("saboteur API payload does not contain the agents secret word");

  await players[saboteurIndex].getByText("???", { exact: true }).waitFor({ timeout: 10000 });
  await players[agentIndex].getByText(secret, { exact: true }).waitFor({ timeout: 10000 });
  await players[saboteurIndex].screenshot({ path: `${artifacts}/03-saboteur-mission.png`, fullPage: true });
  await players[agentIndex].screenshot({ path: `${artifacts}/04-agent-mission.png`, fullPage: true });
  check("saboteur UI hides secret while agent UI shows it");

  for (let index = 0; index < players.length; index += 1) {
    const answer = `odpowiedź e2e ${index + 1}`;
    const result = await post(players[index], code, { action: "answer", answer });
    assert(result.status === 200, `Odpowiedź gracza ${index + 1} odrzucona: ${JSON.stringify(result.body)}`);
  }
  const hostAllAnswered = await waitForState(host, code, game => game.phase === "mission" && game.submittedCount === 6, "all mission answers");
  assert(hostAllAnswered.game.submissions.length === 6, "Prowadzący nie widzi wszystkich 6 odpowiedzi po zebraniu");
  assert(hostAllAnswered.game.currentPlayer === null, "Prowadzącemu ujawniono prywatny currentPlayer po odpowiedziach");
  check("all six answers submit and host sees submissions without role identity");

  let flow = hostAllAnswered;
  for (let step = 0; step < 6 && flow.game.phase !== "suspicion"; step += 1) {
    const advanced = await post(host, code, { action: "advance" });
    assert(advanced.status === 200, `Nie udało się przejść dalej z fazy ${flow.game.phase}: ${JSON.stringify(advanced.body)}`);
    flow = await waitForState(host, code, game => game.phase !== flow.game.phase, `advance from ${flow.game.phase}`);
  }
  assert(flow.game.phase === "suspicion", `Nie dotarliśmy do głosowania podejrzeń, faza=${flow.game.phase}`);
  check("host reaches private suspicion vote after evidence flow");

  for (let index = 0; index < players.length; index += 1) {
    const playerState = await readState(players[index], code);
    const targetPlayerId = pickNonSelfTarget(playerState.body.game);
    assert(targetPlayerId, `Brak celu głosowania dla gracza ${index + 1}`);
    const vote = await post(players[index], code, { action: "vote", targetPlayerId, voteType: "suspicion" });
    assert(vote.status === 200, `Głos gracza ${index + 1} odrzucony: ${JSON.stringify(vote.body)}`);
  }
  const allVoted = await waitForState(host, code, game => game.phase === "suspicion" && game.votedCount === 6, "all suspicion votes");
  assert(allVoted.game.suspicion.length === 0 || allVoted.game.suspicion.every(item => typeof item.votes === "number"), "Host otrzymał nieprawidłową strukturę głosów");
  check("six private suspicion votes are accepted");

  const closeVote = await post(host, code, { action: "advance" });
  assert(closeVote.status === 200, `Prowadzący nie zamknął głosowania: ${JSON.stringify(closeVote.body)}`);
  const suspicionResult = await waitForState(host, code, game => game.phase === "suspicion_result", "suspicion result");
  assert(suspicionResult.game.suspicion.length > 0, "Brak publicznego wyniku podejrzeń po głosowaniu");
  const serializedPublicResult = JSON.stringify(suspicionResult.game.suspicion);
  for (const playerState of missionStates) {
    const voterId = playerState.body.player?.id;
    assert(!serializedPublicResult.includes(`\"voterPlayerId\":\"${voterId}\"`), "Publiczny wynik ujawnia mapowanie wyborcy na cel");
  }
  check("suspicion result exposes counts, not voter-to-target mapping");

  // Global active-game rejoin panel should let the room creator approve a returning player.
  const rejoinIndex = 1;
  const returningState = await readState(players[rejoinIndex], code);
  const returningId = returningState.body.player.id;
  const returningName = returningState.body.player.display_name;
  const playerCookie = `partyplay_player_${code}`;
  const returningCookies = await playerContexts[rejoinIndex].cookies();
  assert(returningCookies.some(cookie => cookie.name === playerCookie), "Brak cookie przed testem rejoin");
  await playerContexts[rejoinIndex].clearCookies({ name: playerCookie });
  await players[rejoinIndex].goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await players[rejoinIndex].getByText("ROZGRYWKA JUŻ TRWA").waitFor({ timeout: 10000 });
  await players[rejoinIndex].locator("#recoverName").selectOption({ label: returningName });
  await players[rejoinIndex].getByRole("button", { name: /Poproś.*powrót/i }).click();
  await players[rejoinIndex].getByText(/Prośba wysłana/i).waitFor({ timeout: 10000 });

  await host.goto(`${baseURL}/gra/pod-przykrywka/${code}`, { waitUntil: "domcontentloaded" });
  await host.getByRole("button", { name: "WPUŚĆ Z POWROTEM", exact: true }).waitFor({ timeout: 12000 });
  await host.getByRole("button", { name: "WPUŚĆ Z POWROTEM", exact: true }).click();
  await players[rejoinIndex].waitForURL(new RegExp(`/gra/pod-przykrywka/${code}$`), { timeout: 15000 });
  const recovered = await readState(players[rejoinIndex], code);
  assert(recovered.status === 200 && recovered.body.player?.id === returningId, "Globalny rejoin przywrócił niewłaściwego gracza");
  assert(recovered.body.game.phase === suspicionResult.game.phase, "Rejoin zmienił fazę gry");
  check("global active-game rejoin works in Pod Przykrywką");

  await host.screenshot({ path: `${artifacts}/05-host-suspicion-result.png`, fullPage: true });
  await players[rejoinIndex].screenshot({ path: `${artifacts}/06-rejoined-player.png`, fullPage: true });

  if (errors.length) throw new Error(`Browser errors detected:\n${errors.join("\n")}`);
} catch (error) {
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
