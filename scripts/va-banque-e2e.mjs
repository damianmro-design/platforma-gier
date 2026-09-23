import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseUrl = process.env.VA_BANQUE_BASE_URL;
if (!baseUrl) throw new Error("VA_BANQUE_BASE_URL is required");

await fs.mkdir("artifacts/va-banque", { recursive: true });

const browser = await chromium.launch();
const errors = [];
const phaseHistory = [];
const screenshots = new Set();

function watch(page, label) {
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${label} console: ${msg.text()}`);
  });
}

async function noHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (result.scrollWidth > result.innerWidth + 2) {
    throw new Error(`${label}: horizontal overflow ${result.scrollWidth}px > ${result.innerWidth}px`);
  }
}

async function state(page, code) {
  const response = await page.evaluate(async (roomCode) => {
    const r = await fetch(`/api/gra/va-banque/${roomCode}`, { cache: "no-store" });
    return { status: r.status, body: await r.json() };
  }, code);
  if (response.status !== 200) throw new Error(`State HTTP ${response.status}: ${JSON.stringify(response.body)}`);
  return response.body.game;
}

async function waitForPhase(page, code, wanted, timeout = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const s = await state(page, code);
    if (wanted.includes(s.phase)) return s;
    await page.waitForTimeout(300);
  }
  throw new Error(`Timeout waiting for phase: ${wanted.join(", ")}`);
}

async function clickBidAmount(page) {
  const buttons = page.locator("button:not([disabled])");
  const texts = await buttons.allTextContents();
  const idx = texts.findIndex((text) => /^(MAX\s+)?\d[\d\s\u00a0]*$/.test(text.trim()));
  if (idx < 0) return false;
  await buttons.nth(idx).click();
  const submit = page.getByRole("button", { name: /Zatwierdź .* pkt/ });
  await submit.click();
  return true;
}

async function answerFirst(page) {
  const buttons = page.locator("button:not([disabled])");
  const texts = await buttons.allTextContents();
  const idx = texts.findIndex((text) => /^A\s/.test(text.trim()));
  if (idx < 0) throw new Error("No enabled answer A button");
  await buttons.nth(idx).click();
  await page.getByRole("button", { name: "Zatwierdź odpowiedź" }).click();
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(desktop, "desktop");
await desktop.goto(`${baseUrl}/gry/va-banque`, { waitUntil: "networkidle", timeout: 60000 });
await desktop.getByRole("heading", { name: "VA BANQUE" }).waitFor();
await noHorizontalOverflow(desktop, "desktop landing");
await desktop.screenshot({ path: "artifacts/va-banque/desktop-landing.png", fullPage: true });

const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const host = await hostContext.newPage();
const guest = await guestContext.newPage();
watch(host, "host");
watch(guest, "guest");

await host.goto(`${baseUrl}/gry/va-banque`, { waitUntil: "networkidle", timeout: 60000 });
await host.getByRole("button", { name: /Utwórz grę/ }).click();
await host.waitForURL(/\/pokoj\/[A-Z0-9]{4}/, { timeout: 30000 });
const code = host.url().match(/\/pokoj\/([A-Z0-9]{4})/)?.[1];
if (!code) throw new Error("Room code missing from URL");

await host.getByLabel("Twoje imię").fill("Tester A");
await host.getByRole("button", { name: "Dołącz jako gość" }).click();
await host.getByText("GRASZ JAKO").waitFor();
await noHorizontalOverflow(host, "host lobby");

await guest.goto(`${baseUrl}/pokoj/${code}`, { waitUntil: "networkidle", timeout: 60000 });
await guest.getByLabel("Twoje imię").fill("Tester B");
await guest.getByRole("button", { name: "Dołącz jako gość" }).click();
await guest.getByText("GRASZ JAKO").waitFor();

await host.getByRole("button", { name: "Jestem gotowy" }).click();
await guest.getByRole("button", { name: "Jestem gotowy" }).click();
await host.getByText("2/2 gotowych").waitFor({ timeout: 15000 });
await host.screenshot({ path: "artifacts/va-banque/mobile-lobby.png", fullPage: true });

const startButton = host.getByRole("button", { name: "START GRY" });
await startButton.waitFor({ state: "visible" });
await startButton.click();

await Promise.all([
  host.waitForURL(new RegExp(`/gra/va-banque/${code}`), { timeout: 30000 }),
  guest.waitForURL(new RegExp(`/gra/va-banque/${code}`), { timeout: 30000 }),
]);

await noHorizontalOverflow(host, "host game");
await noHorizontalOverflow(guest, "guest game");

let sawTie = false;
let sawTakeover = false;
let sawAllPass = false;
let reloaded = false;
let finalSeen = false;
let finished = false;
let safety = 0;

while (!finished && safety++ < 700) {
  const [a, b] = await Promise.all([state(host, code), state(guest, code)]);
  if (a.phase !== b.phase) {
    await host.waitForTimeout(250);
    continue;
  }
  const phase = a.phase;
  const key = `${phase}:${a.roundIndex}`;
  if (phaseHistory.at(-1) !== key) phaseHistory.push(key);

  if (!screenshots.has(phase) && ["intro","bidding","question","takeover_open","final_bidding","final_reveal","finished"].includes(phase)) {
    await host.screenshot({ path: `artifacts/va-banque/${phase}.png`, fullPage: true });
    screenshots.add(phase);
  }

  const pageFor = (playerId) => a.viewer?.id === playerId ? host : b.viewer?.id === playerId ? guest : null;

  if (phase === "bidding") {
    if (a.roundIndex === 1 && !sawTie) {
      if (!a.viewer.bidLocked) await clickBidAmount(host);
      if (!b.viewer.bidLocked) await clickBidAmount(guest);
      sawTie = true;
    } else if (a.roundIndex === 2 && !sawAllPass) {
      if (!a.viewer.bidLocked) await host.getByRole("button", { name: "PAS" }).click();
      if (!b.viewer.bidLocked) await guest.getByRole("button", { name: "PAS" }).click();
      sawAllPass = true;
    } else {
      const bidder = a.players.slice().sort((x,y) => y.points - x.points)[0];
      for (const [page, s] of [[host,a],[guest,b]]) {
        if (s.viewer.bidLocked) continue;
        if (s.viewer.id === bidder.id) {
          const didBid = await clickBidAmount(page);
          if (!didBid) await page.getByRole("button", { name: "PAS" }).click();
        } else {
          await page.getByRole("button", { name: "PAS" }).click();
        }
      }
    }
    await host.waitForTimeout(250);
    continue;
  }

  if (phase === "tie_bid") {
    for (const [page, s] of [[host,a],[guest,b]]) {
      if (s.tiePlayerIds.includes(s.viewer.id) && !s.viewer.tieLocked) {
        await page.getByRole("button", { name: "PAS" }).click();
      }
    }
    await host.waitForTimeout(250);
    continue;
  }

  if (phase === "question") {
    const answerer = pageFor(a.winningPlayerId);
    if (!answerer) throw new Error("Main answerer page not found");
    const answerState = a.viewer?.id === a.winningPlayerId ? a : b;
    if (!answerState.viewer.answerLocked) await answerFirst(answerer);
    await host.waitForTimeout(250);
    continue;
  }

  if (phase === "takeover_open") {
    const candidateState = a.viewer.id !== a.winningPlayerId ? a : b;
    const candidatePage = candidateState === a ? host : guest;
    if (candidateState.viewer.points > 0) {
      const button = candidatePage.getByRole("button", { name: "PRZEJMUJĘ" });
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        sawTakeover = true;
      }
    }
    await host.waitForTimeout(300);
    continue;
  }

  if (phase === "takeover_question") {
    const answerer = pageFor(a.takeoverPlayerId);
    if (!answerer) throw new Error("Takeover answerer page not found");
    const answerState = a.viewer?.id === a.takeoverPlayerId ? a : b;
    if (!answerState.viewer.answerLocked) await answerFirst(answerer);
    await host.waitForTimeout(250);
    continue;
  }

  if (phase === "final_bidding") {
    finalSeen = true;
    if (!a.viewer.finalBidLocked) {
      await host.getByRole("button", { name: "0 · bez ryzyka" }).click();
      await host.getByRole("button", { name: "Zatwierdź 0 pkt" }).click();
    }
    if (!b.viewer.finalBidLocked) {
      const allIn = guest.getByRole("button", { name: /VA BANQUE|ZATWIERDŹ 0 PKT/ });
      await allIn.click();
    }
    await host.waitForTimeout(250);
    continue;
  }

  if (phase === "final_question") {
    for (const [page, s] of [[host,a],[guest,b]]) {
      if (!s.viewer.finalAnswerLocked) await answerFirst(page);
    }
    await host.waitForTimeout(250);
    continue;
  }

  if (!reloaded && a.roundIndex >= 3 && !phase.startsWith("final")) {
    await guest.reload({ waitUntil: "domcontentloaded" });
    await waitForPhase(guest, code, [phase, "category","bidding","bid_reveal","question","main_result","takeover_open","takeover_question","takeover_result","round_result"], 15000);
    reloaded = true;
  }

  if (phase === "finished") {
    finished = true;
    break;
  }

  await host.waitForTimeout(350);
}

if (!finished) throw new Error("Game did not reach finished state");
if (!sawTie) throw new Error("Tie flow was not observed");
if (!sawAllPass) throw new Error("All-pass flow was not observed");
if (!sawTakeover) throw new Error("Takeover flow was not observed");
if (!finalSeen) throw new Error("Final bidding was not observed");

await host.getByText("KOŃCOWY RANKING").waitFor();
await noHorizontalOverflow(host, "finished mobile");
await host.screenshot({ path: "artifacts/va-banque/finished.png", fullPage: true });

const rematch = host.getByRole("button", { name: "Zagraj rewanż" });
await rematch.click();
await waitForPhase(host, code, ["intro"], 15000);

await fs.writeFile("artifacts/va-banque/report.json", JSON.stringify({
  baseUrl,
  roomCode: code,
  phases: phaseHistory,
  sawTie,
  sawAllPass,
  sawTakeover,
  finalSeen,
  reloaded,
  consoleErrors: errors,
}, null, 2));

if (errors.length) throw new Error("Browser console errors:\n" + errors.join("\n"));

await browser.close();
console.log("VA BANQUE E2E PASS", { code, sawTie, sawAllPass, sawTakeover, finalSeen, reloaded });
