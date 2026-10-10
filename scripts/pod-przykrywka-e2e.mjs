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

async function waitForState(page, code, predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await readState(page, code);
    if (last.status === 200 && last.body?.game && predicate(last.body.game, last.body)) return last.body;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timeout waiting for ${label}. Last: ${JSON.stringify(last)}`);
}

async function advanceTo(page, code, expectedPhase, label = expectedPhase) {
  const result = await post(page, code, { action: "advance" });
  assert(result.status === 200, `Advance do ${label} odrzucony: ${JSON.stringify(result.body)}`);
  return waitForState(page, code, game => game.phase === expectedPhase, label);
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
  const line = String(prompt || "")
    .split(/\n+/)
    .map(item => item.trim())
    .find(item => item.startsWith("TAJNE HASŁO:"));
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
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    const ignored =
      text.includes("favicon") ||
      text.includes("qrserver") ||
      text.includes("Failed to load resource: the server responded with a status of 401") ||
      text.includes("Failed to load resource: the server responded with a status of 404");
    if (!ignored) errors.push(`${label} console: ${text}`);
  });
}

try {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage();
  watch(host, "host");

  await host.goto(`${baseURL}/gry/pod-przykrywka`, { waitUntil: "networkidle" });
  const landingHeading = host.locator("h1").first();
  await landingHeading.waitFor({ state: "visible", timeout: 30000 });
  const landingTitle = (await landingHeading.textContent())?.replace(/\s+/g, "").toUpperCase() ?? "";
  assert(landingTitle.includes("PODPRZYKRYWKĄ"), `Nieprawidłowa strona startowa: ${landingTitle}`);
  await host.getByRole("button", { name: "Utwórz pokój →", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/);
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;
  check("host created room", code);

  const playerContexts = await Promise.all(
    Array.from({ length: 6 }, () => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })),
  );
  const players = await Promise.all(playerContexts.map(context => context.newPage()));
  players.forEach((page, index) => watch(page, `player-${index + 1}`));

  const recoveryCodes = [];
  for (let index = 0; index < players.length; index += 1) {
    recoveryCodes.push(await joinGuest(players[index], code, `E2E Agent ${index + 1}`));
  }
  check("six players joined with recovery codes", recoveryCodes.map(value => value.length));

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
  assert(hostBriefing.game.currentPlayer === null, "Prowadzący dostał prywatny currentPlayer");
  assert(hostBriefing.game.result === null, "Briefing ujawnił końcowy wynik");

  const briefingStates = await Promise.all(players.map(page => readState(page, code)));
  const roles = briefingStates.map(item => item.body?.game?.currentPlayer?.role);
  const saboteurIndexes = roles.map((role, index) => ({ role, index })).filter(item => item.role === "saboteur");
  const agentIndexes = roles.map((role, index) => ({ role, index })).filter(item => item.role === "agent");
  assert(saboteurIndexes.length === 1, `Oczekiwano 1 Oszusta, znaleziono ${saboteurIndexes.length}: ${JSON.stringify(roles)}`);
  assert(agentIndexes.length === 5, `Oczekiwano 5 Agentów, znaleziono ${agentIndexes.length}: ${JSON.stringify(roles)}`);

  const saboteurIndex = saboteurIndexes[0].index;
  const agentIndex = agentIndexes[0].index;
  const saboteurId = briefingStates[saboteurIndex].body.player.id;
  const saboteurName = briefingStates[saboteurIndex].body.player.display_name;
  const roleByPlayerId = new Map(
    briefingStates.map(item => [item.body.player.id, item.body.game.currentPlayer.role]),
  );
  check("private roles resolve to exactly one saboteur and five agents", { roles });

  await players[saboteurIndex].getByText("OSZUST", { exact: true }).waitFor({ timeout: 10000 });
  await players[agentIndex].getByText("AGENT", { exact: true }).waitFor({ timeout: 10000 });
  await players[saboteurIndex].screenshot({ path: `${artifacts}/01-saboteur-briefing.png`, fullPage: true });
  await host.screenshot({ path: `${artifacts}/02-host-briefing.png`, fullPage: true });
  check("role briefing UI is private on phones");

  await advanceTo(host, code, "mission", "mission 1");

  async function runMission(missionNumber) {
    const hostMission = await waitForState(
      host,
      code,
      game => game.phase === "mission" && game.missionIndex === missionNumber,
      `mission ${missionNumber} host state`,
    );
    const playerStates = await Promise.all(players.map(page => readState(page, code)));

    for (const state of playerStates) {
      assert(state.status === 200, `Gracz nie odczytał misji ${missionNumber}: ${state.status}`);
      const expectedRole = roleByPlayerId.get(state.body.player.id);
      assert(
        state.body.game.currentPlayer?.role === expectedRole,
        `Rola gracza zmieniła się w misji ${missionNumber}`,
      );
    }

    const agentMission = playerStates[agentIndex].body.game;
    const saboteurMission = playerStates[saboteurIndex].body.game;
    const secret = secretFromPrompt(agentMission.mission?.prompt);
    assert(secret && secret !== "???", `Agent nie otrzymał tajnego hasła w misji ${missionNumber}`);
    assert(
      !JSON.stringify(saboteurMission).includes(secret),
      `P0 PRIVACY LEAK w misji ${missionNumber}: API Oszusta zawiera tajne hasło "${secret}"`,
    );
    assert(
      !JSON.stringify(hostMission.game).includes(secret),
      `P0 PRIVACY LEAK w misji ${missionNumber}: API prowadzącego zawiera tajne hasło "${secret}"`,
    );
    assert(hostMission.game.currentPlayer === null, `Prowadzący dostał prywatną rolę w misji ${missionNumber}`);
    assert(hostMission.game.result === null, `Tożsamość Oszusta ujawniona przed finałem, misja ${missionNumber}`);

    if (missionNumber >= 4) {
      assert(saboteurMission.twist.secretOrder, `Oszust nie dostał tajnego rozkazu po checkpoint, misja ${missionNumber}`);
      assert(
        playerStates[agentIndex].body.game.twist.secretOrder === null,
        `Agent dostał tajny rozkaz Oszusta w misji ${missionNumber}`,
      );
      assert(hostMission.game.twist.secretOrder === null, `Prowadzący zobaczył tajny rozkaz przed finałem`);
    }

    if (missionNumber === 1) {
      await players[saboteurIndex].getByText("???", { exact: true }).waitFor({ timeout: 10000 });
      await players[agentIndex].getByText(secret, { exact: true }).waitFor({ timeout: 10000 });
      await players[saboteurIndex].screenshot({ path: `${artifacts}/03-saboteur-mission.png`, fullPage: true });
      await players[agentIndex].screenshot({ path: `${artifacts}/04-agent-mission.png`, fullPage: true });
    }

    for (let index = 0; index < players.length; index += 1) {
      const answer = `odpowiedź e2e m${missionNumber} g${index + 1}`;
      const result = await post(players[index], code, { action: "answer", answer });
      assert(result.status === 200, `Odpowiedź M${missionNumber} gracza ${index + 1} odrzucona: ${JSON.stringify(result.body)}`);
    }

    const allAnswered = await waitForState(
      host,
      code,
      game => game.phase === "mission" && game.missionIndex === missionNumber && game.submittedCount === 6,
      `all answers mission ${missionNumber}`,
    );
    assert(allAnswered.game.submissions.length === 0, `Treść odpowiedzi wyciekła w trakcie misji ${missionNumber}`);
    assert(allAnswered.game.currentPlayer === null, `Prowadzącemu ujawniono currentPlayer w misji ${missionNumber}`);

    const reveal = await post(host, code, { action: "advance" });
    assert(reveal.status === 200, `Nie udało się zamknąć misji ${missionNumber}: ${JSON.stringify(reveal.body)}`);
    let flow = await waitForState(
      host,
      code,
      game => game.phase !== "mission" && game.missionIndex === missionNumber,
      `answer reveal mission ${missionNumber}`,
    );
    assert(flow.game.submissions.length === 6, `Po zamknięciu misji ${missionNumber} brak kompletu 6 odpowiedzi`);

    while (flow.game.phase !== "suspicion") {
      assert(
        ["evidence", "spotlight"].includes(flow.game.phase),
        `Nieoczekiwana faza przed głosowaniem w misji ${missionNumber}: ${flow.game.phase}`,
      );
      const previousPhase = flow.game.phase;
      const advanced = await post(host, code, { action: "advance" });
      assert(advanced.status === 200, `Advance z ${previousPhase} odrzucony: ${JSON.stringify(advanced.body)}`);
      flow = await waitForState(host, code, game => game.phase !== previousPhase, `advance from ${previousPhase}`);
    }

    assert(flow.game.suspicion.length === 0, `Wynik głosowania widoczny przed oddaniem głosów w misji ${missionNumber}`);
    for (let index = 0; index < players.length; index += 1) {
      const playerState = await readState(players[index], code);
      const targetPlayerId = pickNonSelfTarget(playerState.body.game);
      assert(targetPlayerId, `Brak celu głosowania dla gracza ${index + 1}, misja ${missionNumber}`);
      const vote = await post(players[index], code, { action: "vote", targetPlayerId, voteType: "suspicion" });
      assert(vote.status === 200, `Głos M${missionNumber} gracza ${index + 1} odrzucony: ${JSON.stringify(vote.body)}`);
    }

    const allVoted = await waitForState(
      host,
      code,
      game => game.phase === "suspicion" && game.missionIndex === missionNumber && game.votedCount === 6,
      `all suspicion votes mission ${missionNumber}`,
    );
    assert(allVoted.game.suspicion.length === 0, `Liczby głosów ujawnione przed zamknięciem głosowania M${missionNumber}`);

    const closeVote = await post(host, code, { action: "advance" });
    assert(closeVote.status === 200, `Nie zamknięto głosowania M${missionNumber}: ${JSON.stringify(closeVote.body)}`);
    const suspicionResult = await waitForState(
      host,
      code,
      game => game.phase === "suspicion_result" && game.missionIndex === missionNumber,
      `suspicion result mission ${missionNumber}`,
    );
    assert(suspicionResult.game.suspicion.length === 6, `Niepełny wynik podejrzeń M${missionNumber}`);
    const serialized = JSON.stringify(suspicionResult.game.suspicion);
    assert(!serialized.includes("voter"), `Publiczny wynik M${missionNumber} ujawnia mapowanie wyborcy na cel`);
    assert(suspicionResult.game.result === null, `Oszust ujawniony po misji ${missionNumber}`);

    check(`mission ${missionNumber} privacy, answers and suspicion vote passed`, {
      modifier: hostMission.game.mission?.modifier,
      secretLength: secret.length,
    });
    return suspicionResult;
  }

  let result = await runMission(1);

  const rejoinIndex = saboteurIndex;
  const returningState = await readState(players[rejoinIndex], code);
  const returningId = returningState.body.player.id;
  const returningName = returningState.body.player.display_name;
  const returningRole = returningState.body.game.currentPlayer.role;
  const playerCookie = `partyplay_player_${code}`;
  const returningCookies = await playerContexts[rejoinIndex].cookies();
  assert(returningCookies.some(cookie => cookie.name === playerCookie), "Brak cookie Oszusta przed testem rejoin");
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
  assert(recovered.status === 200 && recovered.body.player?.id === returningId, "Rejoin przywrócił niewłaściwego gracza");
  assert(recovered.body.game.phase === "suspicion_result", "Rejoin zmienił fazę gry");
  assert(recovered.body.game.currentPlayer?.role === returningRole, "Rejoin zmienił tajną rolę gracza");
  assert(recovered.body.game.currentPlayer?.role === "saboteur", "Test rejoin nie przywrócił Oszusta");
  check("active-game rejoin preserves the saboteur identity and current phase");

  await players[rejoinIndex].screenshot({ path: `${artifacts}/05-rejoined-saboteur.png`, fullPage: true });

  await advanceTo(host, code, "mission", "mission 2");
  result = await runMission(2);
  await advanceTo(host, code, "mission", "mission 3");
  result = await runMission(3);

  const checkpoint = await advanceTo(host, code, "checkpoint", "checkpoint after mission 3");
  assert(checkpoint.game.twist.interrogationPlayerId, "Checkpoint nie wybrał osoby do przesłuchania");
  assert(checkpoint.game.result === null, "Checkpoint ujawnił Oszusta");
  check("checkpoint after mission 3 selects an interrogation target without revealing saboteur");

  const interrogation = await advanceTo(host, code, "interrogation", "interrogation");
  assert(interrogation.game.twist.interrogationQuestion, "Brak pytania w przesłuchaniu");
  await advanceTo(host, code, "last_word", "last word");
  await advanceTo(host, code, "mission", "mission 4");
  result = await runMission(4);
  await advanceTo(host, code, "mission", "mission 5");
  result = await runMission(5);

  const finalIntro = await advanceTo(host, code, "final_defense_intro", "final defense intro");
  assert(finalIntro.game.twist.finalDefenderOneId, "Finał nie wybrał pierwszego obrońcy");
  assert(finalIntro.game.twist.finalDefenderTwoId, "Finał nie wybrał drugiego obrońcy");
  assert(
    finalIntro.game.twist.finalDefenderOneId !== finalIntro.game.twist.finalDefenderTwoId,
    "Ta sama osoba została wybrana jako obaj obrońcy",
  );
  assert(finalIntro.game.result === null, "Tożsamość Oszusta ujawniona przed obroną finałową");
  check("final defense selects two distinct suspects without revealing saboteur");

  const defenseOne = await advanceTo(host, code, "final_defense_one", "final defense one");
  assert(defenseOne.game.twist.activeFinalDefenderId === defenseOne.game.twist.finalDefenderOneId, "Aktywny obrońca 1 jest nieprawidłowy");
  const defenseTwo = await advanceTo(host, code, "final_defense_two", "final defense two");
  assert(defenseTwo.game.twist.activeFinalDefenderId === defenseTwo.game.twist.finalDefenderTwoId, "Aktywny obrońca 2 jest nieprawidłowy");
  const finalVote = await advanceTo(host, code, "final_vote", "final vote");
  assert(finalVote.game.result === null, "Finałowe głosowanie ujawniło Oszusta za wcześnie");

  const fallbackAgentId = briefingStates[agentIndex].body.player.id;
  for (let index = 0; index < players.length; index += 1) {
    const state = await readState(players[index], code);
    const me = state.body.player.id;
    const targetPlayerId = me === saboteurId ? fallbackAgentId : saboteurId;
    assert(targetPlayerId !== me, "Test próbował oddać głos finałowy na siebie");
    const vote = await post(players[index], code, { action: "vote", targetPlayerId, voteType: "final" });
    assert(vote.status === 200, `Finałowy głos gracza ${index + 1} odrzucony: ${JSON.stringify(vote.body)}`);
  }

  const allFinalVotes = await waitForState(
    host,
    code,
    game => game.phase === "final_vote" && game.votedCount === 6,
    "all final votes",
  );
  assert(allFinalVotes.game.result === null, "Tożsamość Oszusta ujawniona przed zamknięciem finałowych głosów");
  check("all six private final votes are accepted");

  const locked = await advanceTo(host, code, "final_locked", "final votes locked");
  assert(locked.game.result === null, "Faza final_locked ujawniła Oszusta");
  assert(locked.game.twist.finalTie === false, "Kontrolowane głosowanie finałowe niespodziewanie zakończyło się remisem");
  assert(locked.game.twist.finalAccusedPlayerId === null, "Oskarżony ujawniony przed fazą werdyktu");

  const accused = await advanceTo(host, code, "final_accused", "group verdict");
  assert(accused.game.result === null, "Werdykt grupy ujawnił prawdziwą rolę za wcześnie");
  assert(accused.game.twist.finalAccusedPlayerId === saboteurId, "Werdykt grupy nie wskazał Oszusta mimo 5 głosów");
  check("group verdict reveals accused player but not true role yet");

  const finishPost = await post(host, code, { action: "advance" });
  assert(finishPost.status === 200 && finishPost.body?.phase === "result", `Nie udało się zakończyć gry: ${JSON.stringify(finishPost.body)}`);

  const finalState = await waitForState(host, code, game => game.phase === "result", "finished result state", 20000);
  assert(finalState.room.status === "finished", `Końcowy pokój nie ma statusu finished: ${finalState.room.status}`);
  assert(finalState.game.result, "Brak końcowego wyniku po zakończeniu pokoju");
  assert(finalState.game.result.saboteurId === saboteurId, "Końcowy wynik ujawnił niewłaściwego Oszusta");
  assert(finalState.game.result.saboteurName === saboteurName, "Końcowy wynik ma niewłaściwą nazwę Oszusta");
  assert(finalState.game.result.caught === true, "Przy 5 głosach na Oszusta wynik powinien oznaczać złapanie");
  assert(finalState.game.result.finalTargetPlayerId === saboteurId, "Końcowy cel głosowania różni się od Oszusta");
  assert(finalState.game.currentPlayer === null, "Prowadzący dostał prywatny currentPlayer na ekranie wyniku");
  check("finished room still exposes authorized final result and correct saboteur outcome");

  const finalPlayerStates = await Promise.all(players.map(page => readState(page, code)));
  for (const state of finalPlayerStates) {
    assert(state.status === 200, `Gracz stracił dostęp do wyniku po statusie finished: ${state.status}`);
    assert(state.body.game.phase === "result", "Gracz nie widzi fazy result po zakończeniu");
    assert(state.body.game.result?.saboteurId === saboteurId, "Gracz widzi niespójny końcowy wynik");
    assert(
      state.body.game.currentPlayer?.role === roleByPlayerId.get(state.body.player.id),
      "Końcowy ekran zmienił prywatną rolę gracza",
    );
  }
  check("all six players retain access to the same final result after room is finished");

  await host.getByText(/Oszustem był/i).waitFor({ timeout: 12000 });
  await host.screenshot({ path: `${artifacts}/06-host-result.png`, fullPage: true });
  await players[saboteurIndex].screenshot({ path: `${artifacts}/07-saboteur-result.png`, fullPage: true });
  check("final result UI renders for host and players");

  if (errors.length) throw new Error(`Browser errors detected:\n${errors.join("\n")}`);
} catch (error) {
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
