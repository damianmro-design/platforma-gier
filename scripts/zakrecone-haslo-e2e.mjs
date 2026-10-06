import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.ZH_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/zakrecone-haslo";
const consonants = [..."BCĆDFGHJKLŁMNŃPRSŚTWZŹŻ"];
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readState(page, code, display = false) {
  return page.evaluate(async ({ roomCode, asDisplay }) => {
    const response = await fetch(`/api/gra/zakrecone-haslo/${roomCode}${asDisplay ? "?display=1" : ""}`, { cache: "no-store" });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  }, { roomCode: code, asDisplay: display });
}

async function send(page, code, payload) {
  return page.evaluate(async ({ roomCode, body }) => {
    const response = await fetch(`/api/gra/zakrecone-haslo/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let result = null;
    try { result = await response.json(); } catch { result = null; }
    return { status: response.status, body: result };
  }, { roomCode: code, body: payload });
}

async function waitForState(page, code, predicate, label, timeout = 15000, display = false) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await readState(page, code, display);
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
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })));
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  pages.forEach((page, index) => watch(page, `player-${index + 1}`));
  const [creator, player2, player3] = pages;

  await creator.goto(`${baseURL}/gry/zakrecone-haslo`, { waitUntil: "networkidle" });
  await creator.getByRole("heading", { name: /ZAKRĘCONE/ }).waitFor();
  await creator.getByRole("button", { name: "Utwórz pokój →", exact: true }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/);
  const code = creator.url().split("/").pop();
  assert(code, "Brak kodu pokoju");
  report.roomCode = code;
  check("room created", code);

  const recovery1 = await joinGuest(creator, code, "E2E Koło 1");
  const recovery2 = await joinGuest(player2, code, "E2E Koło 2");
  const recovery3 = await joinGuest(player3, code, "E2E Koło 3");
  check("three players joined with recovery codes", { recoveryCodes: [recovery1.length, recovery2.length, recovery3.length] });

  await Promise.all(pages.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await Promise.all(pages.map(page => page.waitForURL(new RegExp(`/gra/zakrecone-haslo/${code}$`), { timeout: 15000 })));
  await Promise.all(pages.map(page => page.getByText("GRASZ JAKO", { exact: true }).waitFor({ timeout: 12000 })));
  check("game auto-started without separate host");

  const initialStates = await Promise.all(pages.map(page => readState(page, code)));
  const playerMapDetails = initialStates.map((state, index) => ({
    index,
    playerId: state.body?.player?.id,
    name: state.body?.player?.display_name,
    role: state.body?.role,
  }));
  const pageByPlayerId = new Map(initialStates.map((state, index) => [state.body?.player?.id, pages[index]]));
  const initial = initialStates[0].body.game;
  assert(initial.puzzleCount === 6, `Oczekiwano 6 haseł, jest ${initial.puzzleCount}`);
  assert(initial.roundNumber === 1, `Gra nie zaczęła się od rundy 1: ${initial.roundNumber}`);
  assert(initial.phrase.includes("□"), "Publiczny stan ujawnił pełne hasło przed końcem rundy");
  check("public game state keeps phrase masked", { category: initial.category, difficulty: initial.difficulty, activePlayerId: initial.activePlayerId, players: playerMapDetails });

  const tvContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tv = await tvContext.newPage();
  watch(tv, "tv");
  await tv.goto(`${baseURL}/ekran/zakrecone-haslo/${code}`, { waitUntil: "domcontentloaded" });
  const tvState = await waitForState(tv, code, (game, body) => body.role === "display" && game.roundNumber === 1, "TV display state", 10000, true);
  assert(tvState.role === "display", "Ekran TV nie działa w roli display");
  assert(tvState.game.phrase === initial.phrase, "Ekran TV pokazuje inny stan hasła niż telefony");
  await tv.screenshot({ path: `${artifacts}/01-tv-round-1.png`, fullPage: true });
  check("separate TV display loads the same masked round");

  let state = initial;
  let regularSpin = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const activePage = pageByPlayerId.get(state.activePlayerId);
    assert(activePage, `Brak strony aktywnego gracza ${state.activePlayerId}; map=${JSON.stringify(playerMapDetails)}`);

    await activePage.reload({ waitUntil: "domcontentloaded" });
    await activePage.getByText("GRASZ JAKO", { exact: true }).waitFor({ timeout: 10000 });
    const activeUiState = await readState(activePage, code);
    const activeUiBody = (await activePage.locator("body").innerText()).slice(0, 3000);
    await activePage.screenshot({ path: `${artifacts}/02-active-player-before-spin-${attempt + 1}.png`, fullPage: true });
    assert(
      activeUiState.body?.player?.id === state.activePlayerId,
      `Telefon aktywnego gracza ma inną sesję. expected=${state.activePlayerId}, actual=${activeUiState.body?.player?.id}, body=${activeUiBody}`,
    );

    const spinButton = activePage.getByText("ZAKRĘĆ KOŁEM", { exact: false });
    assert(await spinButton.count() > 0, `Aktywny gracz nie widzi przycisku koła. mode=${state.mode}; body=${activeUiBody}`);
    await spinButton.first().click();

    const beforeEventAt = state.lastEvent?.at ?? null;
    const afterSpin = await waitForState(
      activePage,
      code,
      game => Boolean(game.lastEvent?.at && game.lastEvent.at !== beforeEventAt && ["spin", "pass", "bankrupt"].includes(game.lastEvent.type)),
      `wheel outcome ${attempt + 1}`,
    );
    state = afterSpin.game;
    if (state.mode === "choose_letter" && state.wheel?.value) {
      regularSpin = state.lastEvent;
      break;
    }
    await activePage.waitForTimeout(7300);
  }
  assert(regularSpin, "Nie udało się uzyskać zwykłego pola punktowego po 10 obrotach");
  check("real wheel spin completed through player UI", { label: regularSpin.label, value: regularSpin.value });

  const activePage = pageByPlayerId.get(state.activePlayerId);
  assert(activePage, "Brak aktywnego gracza po zwykłym obrocie");
  await activePage.waitForTimeout(7300);
  const letter = consonants.find(candidate => !state.usedLetters.includes(candidate));
  assert(letter, "Brak nieużytej spółgłoski do testu");
  const letterResult = await send(activePage, code, { action: "letter", letter });
  assert(letterResult.status === 200, `Wybór litery nie zadziałał: ${JSON.stringify(letterResult.body)}`);
  const afterLetter = await waitForState(activePage, code, game => game.usedLetters.includes(letter), "letter recorded");
  state = afterLetter.game;
  check("consonant action is persisted", { letter, event: state.lastEvent });

  const tvAfterLetter = await waitForState(tv, code, game => game.usedLetters.includes(letter), "TV update after letter", 10000, true);
  assert(tvAfterLetter.game.phrase === state.phrase, "TV nie zsynchronizował odkrytych liter");
  check("TV updates after player letter action");

  const beforeWrongSolvePlayer = state.activePlayerId;
  const wrongSolvePage = pageByPlayerId.get(beforeWrongSolvePlayer);
  assert(wrongSolvePage, "Brak strony aktywnego gracza przed błędnym rozwiązaniem");
  const wrongSolve = await send(wrongSolvePage, code, { action: "solve", guess: "TO NA PEWNO NIE JEST POPRAWNE HASŁO E2E" });
  assert(wrongSolve.status === 200, `Błędne hasło nie zostało obsłużone: ${JSON.stringify(wrongSolve.body)}`);
  const afterWrongSolve = await waitForState(wrongSolvePage, code, game => game.lastEvent?.type === "solve" && game.lastEvent?.correct === false, "wrong solve event");
  assert(afterWrongSolve.game.activePlayerId !== beforeWrongSolvePlayer, "Błędne hasło nie przekazało kolejki następnej osobie");
  state = afterWrongSolve.game;
  check("wrong solve safely passes turn to next player");

  const player2State = await readState(player2, code);
  const player2Id = player2State.body.player.id;
  const player2CookieName = `partyplay_player_${code}`;
  const cookies2 = await contexts[1].cookies();
  assert(cookies2.some(cookie => cookie.name === player2CookieName), "Brak cookie gracza 2 przed testem rejoin");
  await contexts[1].clearCookies({ name: player2CookieName });
  await player2.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await player2.getByText("ROZGRYWKA JUŻ TRWA").waitFor({ timeout: 10000 });
  await player2.locator("#recoverName").selectOption(player2Id);
  await player2.getByRole("button", { name: /Poproś.*powrót/i }).click();
  await player2.getByText(/Prośba wysłana/i).waitFor({ timeout: 10000 });

  await creator.goto(`${baseURL}/gra/zakrecone-haslo/${code}`, { waitUntil: "domcontentloaded" });
  await creator.getByRole("button", { name: "WPUŚĆ Z POWROTEM", exact: true }).waitFor({ timeout: 12000 });
  await creator.getByRole("button", { name: "WPUŚĆ Z POWROTEM", exact: true }).click();
  await player2.waitForURL(new RegExp(`/gra/zakrecone-haslo/${code}$`), { timeout: 15000 });
  const recovered = await readState(player2, code);
  assert(recovered.status === 200 && recovered.body.player?.id === player2Id, "Akceptacja rejoin nie odtworzyła właściwego gracza");
  assert(recovered.body.game.roundNumber === state.roundNumber, "Rejoin zmienił numer rundy");
  assert(recovered.body.game.usedLetters.join("|") === state.usedLetters.join("|"), "Rejoin zmienił stan odkrytych liter");
  check("approved active-game rejoin restores the same player and game state");

  await player2.reload({ waitUntil: "domcontentloaded" });
  const refreshed = await readState(player2, code);
  assert(refreshed.status === 200 && refreshed.body.game.roundNumber === state.roundNumber, "Refresh po rejoin zgubił stan gry");
  check("refresh after rejoin preserves active game state");

  await tv.screenshot({ path: `${artifacts}/03-tv-after-actions.png`, fullPage: true });
  await creator.screenshot({ path: `${artifacts}/04-player-host-mobile.png`, fullPage: true });
  await player2.screenshot({ path: `${artifacts}/05-rejoined-player-mobile.png`, fullPage: true });

  if (errors.length) throw new Error(`Browser errors detected:\n${errors.join("\n")}`);
} catch (error) {
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
