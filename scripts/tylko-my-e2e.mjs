import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.TYLKO_MY_BASE_URL || "http://127.0.0.1:3000";
const artifacts = "artifacts/tylko-my";
await fs.mkdir(artifacts, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function apiState(page, code) {
  return page.evaluate(async (roomCode) => {
    const response = await fetch(`/api/gra/tylko-my/${roomCode}`, { cache: "no-store" });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { status: response.status, body };
  }, code);
}

async function post(page, code, body) {
  return page.evaluate(
    async ({ roomCode, payload }) => {
      const response = await fetch(`/api/gra/tylko-my/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      return { status: response.status, body: result };
    },
    { roomCode: code, payload: body },
  );
}

async function waitForGameState(page, code, predicate, label, timeout = 12000) {
  const deadline = Date.now() + timeout;
  let last = null;

  while (Date.now() < deadline) {
    last = await apiState(page, code);
    if (last.status === 200 && last.body?.game && predicate(last.body.game, last.body)) {
      return last.body.game;
    }
    await page.waitForTimeout(220);
  }

  throw new Error(`Timeout waiting for ${label}. Last: ${JSON.stringify(last)}`);
}

async function dismissRoundIntro(page) {
  const candidates = [
    page.getByRole("button", { name: "Zaczynamy →", exact: true }),
    page.getByRole("button", { name: "Dalej →", exact: true }),
  ];

  for (const candidate of candidates) {
    try {
      if (await candidate.isVisible({ timeout: 500 })) {
        await candidate.click();
        return true;
      }
    } catch {
      // Brak intro jest poprawnym stanem pomiędzy rundami.
    }
  }

  return false;
}

async function answerFirstOptionByUi(page, game) {
  const option = game.question?.options?.[0];
  assert(option, `Brak odpowiedzi w pytaniu ${game.questionIndex}`);

  await dismissRoundIntro(page);
  await page.getByText(game.question.prompt, { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: option.label, exact: true }).click();
  await page.getByRole("button", { name: "Zatwierdź odpowiedź", exact: true }).click();
  await page.getByText("Odpowiedź zatwierdzona", { exact: false }).waitFor({ state: "visible" });
}

const browser = await chromium.launch({ headless: true });
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
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const location = message.location();
    const ignored =
      text.includes("favicon") ||
      text.includes("qrserver") ||
      text.includes("Failed to load resource: the server responded with a status of 401") ||
      text.includes("Failed to load resource: the server responded with a status of 404");

    if (!ignored) {
      errors.push(`${label} console: ${text} @ ${location.url || "unknown"}:${location.lineNumber || 0}`);
    }
  });
}

try {
  const creatorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const partnerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  let creator = await creatorContext.newPage();
  const partner = await partnerContext.newPage();
  watch(creator, "creator");
  watch(partner, "partner");

  await creator.goto(`${baseURL}/gry/tylko-my`, { waitUntil: "networkidle" });
  await creator.getByRole("heading", { name: "TYLKO MY", exact: false }).first().waitFor();
  await creator.screenshot({ path: `${artifacts}/01-landing-mobile.png`, fullPage: true });
  check("landing loads on mobile");

  await creator.getByRole("button", { name: /Utwórz grę/ }).click();
  await creator.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/);
  const code = creator.url().split("/").pop();
  assert(code && code.length >= 4, "Nie utworzono kodu pokoju");
  report.roomCode = code;
  check("room created", code);

  await creator.locator("#playerName").fill("E2E Osoba 1");
  await creator.getByRole("button", { name: "Dołącz jako gość" }).click();
  await creator.getByText("GRASZ JAKO").waitFor();
  const creatorRecovery = (await creator.locator(".recovery-code strong").textContent())?.trim();
  assert(creatorRecovery?.length === 6, "Brak 6-znakowego kodu powrotu osoby 1");

  await partner.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await partner.locator("#playerName").fill("E2E Osoba 2");
  await partner.getByRole("button", { name: "Dołącz jako gość" }).click();
  await partner.getByText("GRASZ JAKO").waitFor();
  const partnerRecovery = (await partner.locator(".recovery-code strong").textContent())?.trim();
  assert(partnerRecovery?.length === 6, "Brak 6-znakowego kodu powrotu osoby 2");
  check("both players joined and received recovery codes");

  await creator.screenshot({ path: `${artifacts}/02-lobby-person-1.png`, fullPage: true });
  await partner.screenshot({ path: `${artifacts}/03-lobby-person-2.png`, fullPage: true });

  await creator.getByRole("button", { name: "Jestem gotowy" }).click();
  await partner.getByRole("button", { name: "Jestem gotowy" }).click();

  await Promise.all([
    creator.waitForURL(new RegExp(`/gra/tylko-my/${code}$`), { timeout: 15000 }),
    partner.waitForURL(new RegExp(`/gra/tylko-my/${code}$`), { timeout: 15000 }),
  ]);
  check("game auto-started with 2 ready players");

  let state = await waitForGameState(
    creator,
    code,
    (game) => game.questionIndex === 0 && !game.finished,
    "first TYLKO MY question",
  );
  assert(state.questionCount === 20, `Oczekiwano 20 pytań, jest ${state.questionCount}`);
  assert(state.question?.options?.length >= 2, "Pierwsze pytanie nie ma poprawnej puli odpowiedzi");

  await dismissRoundIntro(creator);
  await dismissRoundIntro(partner);
  await creator.screenshot({ path: `${artifacts}/04-first-question-person-1.png`, fullPage: true });
  await partner.screenshot({ path: `${artifacts}/05-first-question-person-2.png`, fullPage: true });

  await answerFirstOptionByUi(creator, state);
  const creatorWaiting = await apiState(creator, code);
  assert(creatorWaiting.status === 200, "Nie udało się odczytać stanu po pierwszej odpowiedzi");
  assert(creatorWaiting.body.game.answerCount === 1, "Pierwsza odpowiedź nie została zapisana jako prywatna");
  assert(creatorWaiting.body.game.revealed === false, "Odpowiedź została odsłonięta przed ruchem drugiej osoby");
  check("first answer stays private until partner answers");

  await answerFirstOptionByUi(partner, state);
  state = await waitForGameState(
    partner,
    code,
    (game) => game.questionIndex === 0 && game.revealed === true && game.answerCount === 2,
    "first answer reveal",
  );
  assert(state.result?.matched === true, "Takie same odpowiedzi nie zostały policzone jako zgodność");
  assert(state.projectedScore === state.result.points, "Podgląd punktów po pierwszej zgodności jest niepoprawny");
  check("answers reveal only after both players submit", { points: state.result.points });

  await partner.screenshot({ path: `${artifacts}/06-first-result.png`, fullPage: true });

  await creator.close();
  await partner.getByRole("button", { name: "Dalej teraz →", exact: true }).waitFor({ state: "visible" });
  await partner.getByRole("button", { name: "Dalej teraz →", exact: true }).click();
  state = await waitForGameState(
    partner,
    code,
    (game) => game.questionIndex === 1 && !game.finished,
    "advance without creator phone",
  );
  assert(state.score === state.result?.points || state.score > 0, "Punkty nie zostały zapisane po przejściu dalej");
  check("non-creator player can advance while creator phone is closed");

  creator = await creatorContext.newPage();
  watch(creator, "creator-return");
  await creator.goto(`${baseURL}/gra/tylko-my/${code}`, { waitUntil: "domcontentloaded" });
  const creatorReturn = await waitForGameState(
    creator,
    code,
    (game) => game.questionIndex === 1,
    "creator return to current question",
  );
  assert(creatorReturn.questionIndex === state.questionIndex, "Powrót twórcy nie odtworzył bieżącego pytania");
  check("creator can return without resetting game state");

  await partner.reload({ waitUntil: "domcontentloaded" });
  const afterRefresh = await waitForGameState(
    partner,
    code,
    (game) => game.questionIndex === 1,
    "partner refresh persistence",
  );
  assert(afterRefresh.score === state.score, "Odświeżenie telefonu zmieniło wynik");
  check("refresh preserves score and question");

  const partnerCookies = await partnerContext.cookies();
  const partnerCookie = partnerCookies.find((cookie) => cookie.name === `partyplay_player_${code}`);
  assert(partnerCookie, "Brak cookie gracza przed testem kodu powrotu");

  await partnerContext.clearCookies({ name: partnerCookie.name });
  await partner.goto(`${baseURL}/pokoj/${code}`, { waitUntil: "domcontentloaded" });
  await partner.getByText("ROZGRYWKA JUŻ TRWA").waitFor({ timeout: 10000 });
  await partner.locator("#recoverName").selectOption({ label: "E2E Osoba 2" });
  await partner.getByText("Mam kod powrotu", { exact: true }).click();
  await partner.locator("#recoverCode").fill(partnerRecovery);
  await partner.getByRole("button", { name: "Odzyskaj kodem", exact: true }).click();
  await partner.waitForURL(new RegExp(`/gra/tylko-my/${code}$`), { timeout: 10000 });
  const recovered = await waitForGameState(
    partner,
    code,
    (game) => game.questionIndex === 1,
    "recovery-code restoration",
  );
  assert(recovered.score === state.score, "Kod powrotu nie odtworzył wyniku gracza");
  check("direct recovery code restores player session");

  state = recovered;

  while (!state.finished) {
    const index = state.questionIndex;
    const option = state.question?.options?.[0];
    assert(option, `Brak odpowiedzi dla pytania ${index}`);

    const [creatorAnswer, partnerAnswer] = await Promise.all([
      post(creator, code, { action: "answer", questionIndex: index, answer: option.value }),
      post(partner, code, { action: "answer", questionIndex: index, answer: option.value }),
    ]);

    assert(
      creatorAnswer.status === 200,
      `Odpowiedź osoby 1 nie została przyjęta w pytaniu ${index}: ${JSON.stringify(creatorAnswer.body)}`,
    );
    assert(
      partnerAnswer.status === 200,
      `Odpowiedź osoby 2 nie została przyjęta w pytaniu ${index}: ${JSON.stringify(partnerAnswer.body)}`,
    );

    const revealed = await waitForGameState(
      partner,
      code,
      (game) => game.questionIndex === index && game.revealed === true && game.answerCount === 2,
      `reveal question ${index}`,
    );
    assert(revealed.result?.matched === true, `Pytanie ${index} nie zaliczyło identycznych odpowiedzi`);

    const next = await post(partner, code, { action: "next" });
    assert(next.status === 200, `Druga osoba nie mogła przejść dalej w pytaniu ${index}: ${JSON.stringify(next.body)}`);

    state = await waitForGameState(
      partner,
      code,
      (game) => game.finished || game.questionIndex !== index,
      `advance from question ${index}`,
    );
  }

  assert(state.final, "Brak końcowego wyniku po 20 pytaniach");
  assert(state.final.percent === 100, `Identyczne odpowiedzi powinny dać 100%, uzyskano ${state.final.percent}%`);
  assert(state.final.score === state.final.maxScore, "Maksymalny wspólny wynik nie został naliczony");
  check("all 20 questions complete with expected max score", state.final);

  await partner.reload({ waitUntil: "domcontentloaded" });
  await partner.getByText("KONIEC GRY", { exact: true }).waitFor({ timeout: 10000 });
  await partner.getByText("100%", { exact: true }).waitFor();
  await partner.getByRole("link", { name: "Zagrajcie jeszcze raz", exact: true }).waitFor();
  await partner.getByRole("link", { name: "Wróć do zaGRAj", exact: true }).waitFor();
  await partner.screenshot({ path: `${artifacts}/07-final-mobile.png`, fullPage: true });
  check("final screen exposes replay and home navigation");

  assert(creatorRecovery?.length === 6 && partnerRecovery?.length === 6, "Recovery codes changed unexpectedly");

  if (errors.length) {
    throw new Error(`Browser errors detected:\n${errors.join("\n")}`);
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
