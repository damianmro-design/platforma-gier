import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const currentPhase = process.env.OK_CURRENT_PHASE;
const nextPhase = process.env.OK_NEXT_PHASE;
const nextEvidenceId = process.env.OK_NEXT_EVIDENCE_ID;
const nextEvidenceTitle = process.env.OK_NEXT_EVIDENCE_TITLE;
const nextUiText = process.env.OK_NEXT_UI_TEXT || nextEvidenceTitle;
const expectedCurrentCount = Number(process.env.OK_CURRENT_EVIDENCE_COUNT || 0);
const expectedNextCount = Number(process.env.OK_NEXT_EVIDENCE_COUNT || 0);
const submitFirstReconstruction = process.env.OK_SUBMIT_FIRST_RECONSTRUCTION === "1";
const submitAllReconstructions = process.env.OK_SUBMIT_ALL_RECONSTRUCTIONS === "1";
const artifactSlug = process.env.OK_ARTIFACT_SLUG || "evidence-step";
const artifacts = `artifacts/${artifactSlug}`;
await fs.mkdir(artifacts, { recursive: true });

function assert(value, message) { if (!value) throw new Error(message); }
for (const [key, value] of Object.entries({ currentPhase, nextPhase, nextEvidenceId, nextEvidenceTitle })) {
  assert(value, `Brak konfiguracji ${key}`);
}
assert(!(submitFirstReconstruction && submitAllReconstructions), "Wybierz tylko jeden tryb testu rekonstrukcji");

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
    if (!url.includes("qrserver.com") && !url.includes("favicon")) errors.push(`${label} HTTP ${response.status()}: ${url}`);
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
  return Promise.all(players.map(page => waitState(page, code, body => body?.room?.phase === phase, phase)));
}

const phasePath = [
  "ok_ostatni_raz", "ok_a_1", "ok_a_2", "ok_a_3", "ok_a_4", "ok_a_5",
  "ok_mapa", "ok_przesluchania", "ok_b_1", "ok_b_2", "ok_b_3", "ok_b_4", "ok_b_5",
  "ok_nowy_trop", "ok_rekonstrukcja",
];
const currentIndex = phasePath.indexOf(currentPhase);
assert(currentIndex >= 0, `Nieobsługiwana faza wejściowa ${currentPhase}`);
assert(phasePath[currentIndex + 1] === nextPhase, `Fazy nie są kolejne: ${currentPhase} → ${nextPhase}`);

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = { baseURL, currentPhase, nextPhase, roomCode: null, checks: [], errors };
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
  await join(creator, code, "E2E Evidence 1");

  for (let i = 2; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    pages.push(page);
    watch(page, `player-${i}`, errors);
    await join(page, code, `E2E Evidence ${i}`);
  }

  await Promise.all(pages.map(page => page.getByRole("button", { name: "Jestem gotowy" }).click()));
  await creator.getByText("5/5 gotowych").waitFor({ timeout: 15000 });
  await Promise.all(pages.map(page => page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 25000 })));

  const startStates = await Promise.all(pages.map(page => waitState(page, code, body => body?.room?.phase === "ok_akta_osobowe" && body?.role === "player", "ok_akta_osobowe")));
  const roleIds = startStates.map(item => item.roleCard.id);
  for (const page of pages) {
    const opened = await action(page, code, "openDossier");
    assert(opened.status === 200 && opened.body?.ok === true, "Nie udało się otworzyć akt");
  }

  let currentStates = null;
  for (let index = 0; index <= currentIndex; index += 1) {
    currentStates = await readyAndWait(pages, code, phasePath[index]);
  }

  for (let index = 0; index < currentStates.length; index += 1) {
    const current = currentStates[index];
    assert(current.ready?.ready_players === 0, `${currentPhase} nie zaczyna od 0/5 u gracza ${index + 1}`);
    assert(current.evidence?.length === expectedCurrentCount, `Gracz ${index + 1} ma ${current.evidence?.length} materiałów zamiast ${expectedCurrentCount}`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check(`${currentPhase} startuje od 0/5`);

  for (let index = 0; index < 4; index += 1) {
    const result = await action(pages[index], code, "ready");
    assert(result.status === 200 && result.body?.ok === true, `Nie udało się zapisać ${index + 1}/5`);
    await waitState(pages[index], code, body => body?.room?.phase === currentPhase && body?.ready?.ready_players === index + 1, `${currentPhase} ${index + 1}/5`);
    const observer = await state(pages[4], code);
    assert(observer.body?.room?.phase === currentPhase, `${nextPhase} pojawiło się za wcześnie przy ${index + 1}/5`);
    assert(observer.body?.evidence?.length === expectedCurrentCount, `Materiały zmieniły się przy ${index + 1}/5`);
  }
  check(`1/5–4/5 pozostaje w ${currentPhase}`);

  const finalReady = await action(pages[4], code, "ready");
  assert(finalReady.status === 200 && finalReady.body?.ok === true, "5. gotowość nie została zapisana");

  const nextStates = await Promise.all(pages.map((page, index) => waitState(
    page,
    code,
    body => body?.room?.phase === nextPhase && body?.evidence?.length === expectedNextCount && body?.evidence?.[expectedNextCount - 1]?.id === nextEvidenceId && body?.roleCard?.id === roleIds[index],
    `${nextPhase} gracza ${index + 1}`,
  )));

  for (let index = 0; index < nextStates.length; index += 1) {
    const current = nextStates[index];
    assert(current.evidence[expectedNextCount - 1].title === nextEvidenceTitle, `Gracz ${index + 1} ma inny nowy materiał`);
    assert(current.ready?.ready_players === 0, `${nextPhase} nie wyzerowało gotowości u gracza ${index + 1}`);
    assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się`);
  }
  check(`5/5 przechodzi z ${currentPhase} do ${nextPhase}`);

  for (const page of pages) {
    await page.getByText(nextUiText, { exact: true }).first().waitFor({ timeout: 10000 });
  }
  await creator.screenshot({ path: `${artifacts}/01-next-phase.png`, fullPage: true });
  await pages[1].screenshot({ path: `${artifacts}/02-next-phase-second-phone.png`, fullPage: true });

  if (submitFirstReconstruction || submitAllReconstructions) {
    assert(nextPhase === "ok_rekonstrukcja", "Rekonstrukcje można testować tylko w ok_rekonstrukcja");
    const options = nextStates[0].reconstructionOptions ?? [];
    assert(options.length >= 9, `Za mało opcji rekonstrukcji: ${options.length}`);
    const eventOrder = options.slice(0, 9).map(item => item.key);
    const route = ["w1", "w2", "w3", "w4"];

    for (let index = 0; index < nextStates.length; index += 1) {
      assert(nextStates[index].ownReconstruction == null, `Gracz ${index + 1} ma rekonstrukcję przed wysłaniem`);
    }

    const countToSubmit = submitAllReconstructions ? pages.length : 1;
    let resultStates = null;

    for (let index = 0; index < countToSubmit; index += 1) {
      const submitted = await action(pages[index], code, "submitReconstruction", { eventOrder, route });
      assert(submitted.status === 200 && submitted.body?.ok === true, `Rekonstrukcja ${index + 1}/5 nie została zapisana`);

      if (submitAllReconstructions && index === pages.length - 1) {
        resultStates = await Promise.all(pages.map((page, playerIndex) => waitState(
          page,
          code,
          body => body?.room?.phase === "ok_rekonstrukcja_wynik" && body?.roleCard?.id === roleIds[playerIndex],
          `ok_rekonstrukcja_wynik gracza ${playerIndex + 1}`,
        )));
        break;
      }

      const afterSubmit = await Promise.all(pages.map((page, playerIndex) => waitState(
        page,
        code,
        body => body?.room?.phase === "ok_rekonstrukcja" && body?.roleCard?.id === roleIds[playerIndex],
        `ok_rekonstrukcja po ${index + 1}/5 gracza ${playerIndex + 1}`,
      )));

      for (let playerIndex = 0; playerIndex < afterSubmit.length; playerIndex += 1) {
        const own = afterSubmit[playerIndex].ownReconstruction;
        if (playerIndex <= index) {
          assert(Boolean(own?.submitted_at), `Gracz ${playerIndex + 1} nie ma zapisanej rekonstrukcji przy ${index + 1}/5`);
          assert(own.event_order?.join("|") === eventOrder.join("|"), `Kolejność wydarzeń gracza ${playerIndex + 1} zmieniła się po zapisie`);
          assert(own.route?.join("|") === route.join("|"), `Trasa gracza ${playerIndex + 1} zmieniła się po zapisie`);
        } else {
          assert(own == null, `Gracz ${playerIndex + 1} został oznaczony jako wysłany przy ${index + 1}/5`);
        }
        assert(afterSubmit[playerIndex].evidence?.length === expectedNextCount, `Materiały zmieniły się przy ${index + 1}/5 u gracza ${playerIndex + 1}`);
        assert(afterSubmit[playerIndex].roleCard.id === roleIds[playerIndex], `Rola gracza ${playerIndex + 1} zmieniła się przy ${index + 1}/5`);
      }
      check(`Rekonstrukcja ${index + 1}/5 zapisana, faza pozostaje ok_rekonstrukcja`);
    }

    if (submitFirstReconstruction) {
      await Promise.all([
        pages[0].reload({ waitUntil: "domcontentloaded", timeout: 60000 }),
        pages[1].reload({ waitUntil: "domcontentloaded", timeout: 60000 }),
      ]);
      await pages[0].getByText("Rekonstrukcja wysłana").waitFor({ timeout: 10000 });
      await pages[1].getByRole("button", { name: "WYŚLIJ REKONSTRUKCJĘ", exact: true }).waitFor({ state: "visible", timeout: 10000 });
      await pages[0].screenshot({ path: `${artifacts}/03-first-reconstruction-submitted.png`, fullPage: true });
      await pages[1].screenshot({ path: `${artifacts}/04-second-player-still-open.png`, fullPage: true });
    }

    if (submitAllReconstructions) {
      assert(Array.isArray(resultStates) && resultStates.length === 5, "Brak stanu wyniku rekonstrukcji dla 5 graczy");
      for (let index = 0; index < resultStates.length; index += 1) {
        const current = resultStates[index];
        assert(current.room.phase === "ok_rekonstrukcja_wynik", `Gracz ${index + 1} nie trafił do wyniku rekonstrukcji`);
        assert(current.role === "player", `Gracz ${index + 1} stracił rolę gracza po 5/5`);
        assert(current.evidence?.length === expectedNextCount, `Gracz ${index + 1} stracił materiały po 5/5`);
        assert(current.roleCard.id === roleIds[index], `Rola gracza ${index + 1} zmieniła się po 5/5`);
        assert(current.reconstruction?.total === 5, `Gracz ${index + 1} widzi ${current.reconstruction?.total} rekonstrukcji zamiast 5`);
        assert(Array.isArray(current.reconstruction?.consensusTimeline) && current.reconstruction.consensusTimeline.length === 9, `Gracz ${index + 1} nie widzi 9 punktów wspólnej osi`);
        assert(current.reconstruction.consensusTimeline.every(item => item.count === 5), `Wspólna oś gracza ${index + 1} nie zawiera 5/5 głosów dla każdego punktu`);
        assert(Array.isArray(current.reconstruction?.routes) && current.reconstruction.routes.length >= 1, `Gracz ${index + 1} nie widzi wspólnej trasy`);
        assert(current.reconstruction.routes[0].route === route.join(" → "), `Gracz ${index + 1} widzi inną najczęstszą trasę`);
        assert(current.reconstruction.routes[0].count === 5, `Najczęstsza trasa gracza ${index + 1} nie ma 5 głosów`);
        assert(!Object.prototype.hasOwnProperty.call(current.reconstruction, "fullyCorrect"), `Poprawność rekonstrukcji została ujawniona za wcześnie graczowi ${index + 1}`);
        assert(current.ready?.ready_players === 0, `Wynik rekonstrukcji nie zaczyna od 0/5 gotowych u gracza ${index + 1}`);
      }

      for (const page of pages) {
        await page.getByText("07 · WYNIK REKONSTRUKCJI", { exact: true }).first().waitFor({ timeout: 10000 });
        await page.getByText("Tak grupa odtworzyła wydarzenia.", { exact: true }).waitFor({ timeout: 10000 });
      }
      await pages[0].screenshot({ path: `${artifacts}/03-reconstruction-result.png`, fullPage: true });
      await pages[4].screenshot({ path: `${artifacts}/04-reconstruction-result-fifth-phone.png`, fullPage: true });
      check("5/5 przechodzi dokładnie do ok_rekonstrukcja_wynik bez ujawniania rozwiązania");
    }
  }

  const expectedFinalPhase = submitAllReconstructions ? "ok_rekonstrukcja_wynik" : nextPhase;
  const finalState = await state(creator, code);
  assert(finalState.body?.room?.phase === expectedFinalPhase, `Test wyszedł poza ${expectedFinalPhase}`);
  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  const suffix = submitAllReconstructions ? " reconstruction=5/5-result" : submitFirstReconstruction ? " reconstruction=1/5" : "";
  console.log(`AKTA NOCY Ostatni Kurs phase step PASS ${currentPhase} -> ${nextPhase} room=${code}${suffix}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
