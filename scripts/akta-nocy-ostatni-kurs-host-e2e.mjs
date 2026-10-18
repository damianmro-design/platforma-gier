import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.AKTA_BASE_URL || "http://127.0.0.1:3000";
const expectFinalUx = process.env.AKTA_EXPECT_FINAL_UX === "1";
const artifacts = "artifacts/akta-nocy-ostatni-kurs-host";
await fs.mkdir(artifacts, { recursive: true });

function assert(value, message) {
  if (!value) throw new Error(message);
}

function watch(page, label, errors) {
  page.on("pageerror", error => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (
      text.includes("favicon") ||
      text.includes("qrserver") ||
      text.startsWith("Failed to load resource:")
    ) return;
    errors.push(`${label} console: ${text}`);
  });
  page.on("response", response => {
    if (response.status() < 500) return;
    const url = response.url();
    if (
      url.includes("/api/gra/akta-nocy") ||
      url.includes("/api/pokoj/")
    ) {
      errors.push(`${label} HTTP ${response.status()}: ${url}`);
    }
  });
}

async function state(page, code) {
  return page.evaluate(async roomCode => {
    const response = await fetch(`/api/gra/akta-nocy-ostatni-kurs/${roomCode}`, {
      cache: "no-store",
    });
    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }, code);
}

async function roomState(page, code) {
  return page.evaluate(async roomCode => {
    const response = await fetch(`/api/pokoj/${roomCode}`, { cache: "no-store" });
    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }, code);
}

async function action(page, code, name, payload = {}) {
  return page.evaluate(async ({ roomCode, actionName, body }) => {
    const response = await fetch(
      `/api/gra/akta-nocy-ostatni-kurs/${roomCode}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, ...body }),
      },
    );
    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }, { roomCode: code, actionName: name, body: payload });
}

async function waitState(page, code, predicate, label, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    try {
      last = await state(page, code);
      if (last.status === 200 && predicate(last.body)) return last.body;
    } catch {}
    await page.waitForTimeout(250);
  }
  throw new Error(`Nie osiągnięto stanu: ${label}. Last=${JSON.stringify(last)}`);
}

async function joinGuest(page, code, name) {
  await page.goto(`${baseURL}/pokoj/${code}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.locator("#playerName").fill(name);
  await page.getByRole("button", { name: "Dołącz jako gość" }).click();
  await page.getByText("GRASZ JAKO").waitFor({ timeout: 15000 });
  const lobby = await roomState(page, code);
  assert(
    lobby.status === 200 && lobby.body?.currentPlayerId,
    `Nie udało się dołączyć ${name}: ${JSON.stringify(lobby)}`,
  );
}

async function advance(host, code, expectedPhase) {
  const result = await action(host, code, "advance");
  assert(
    result.status === 200 &&
      result.body?.ok === true &&
      result.body?.phase === expectedPhase,
    `Advance do ${expectedPhase} nie powiódł się: ${JSON.stringify(result)}`,
  );
  return waitState(
    host,
    code,
    body => body?.role === "host" && body?.room?.phase === expectedPhase,
    `host ${expectedPhase}`,
  );
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const report = {
  baseURL,
  expectFinalUx,
  roomCode: null,
  checks: [],
  errors,
};
const check = (label, details = null) =>
  report.checks.push({ label, details, at: new Date().toISOString() });

try {
  const hostContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const host = await hostContext.newPage();
  watch(host, "host", errors);

  await host.goto(`${baseURL}/gry/akta-nocy`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  if (expectFinalUx) {
    await host
      .getByText("5–12 graczy + prowadzący", { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    await host
      .getByText(
        "Z prowadzącym: 1 prowadzący + 5–12 graczy. Bez prowadzącego: twórca pokoju jest jednym z 5–12 graczy.",
        { exact: true },
      )
      .waitFor({ state: "visible", timeout: 15000 });
    check("Strona AKTA NOCY jasno rozróżnia liczbę graczy i prowadzącego");
  }

  await host.getByRole("button", { name: "Z PROWADZĄCYM", exact: true }).click();
  await host.waitForURL(/\/pokoj\/[A-Z0-9]{4,6}$/, { timeout: 45000 });
  const code = host.url().split("/").pop();
  assert(code, "Brak kodu pokoju Ostatniego Kursu host");
  report.roomCode = code;

  if (expectFinalUx) {
    await host
      .getByText("PROWADZISZ TĘ SPRAWĘ", { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    await host
      .getByRole("heading", { name: "Nie dołączasz jako gracz", exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    await host
      .getByText("Prowadzący nie zajmuje miejsca gracza", { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    assert(
      (await host.locator("#playerName").count()) === 0,
      "Prowadzący nadal widzi formularz dołączenia jako gracz",
    );
    assert(
      (await host.getByRole("button", { name: "Dołącz jako gość" }).count()) === 0,
      "Prowadzący nadal może dołączyć jako gracz z własnego lobby",
    );
    check("Lobby host mode nie proponuje prowadzącemu zajęcia miejsca gracza");
  }

  const contexts = [];
  const players = [];
  const names = Array.from({ length: 5 }, (_, index) => `E2E Host Kurs ${index + 1}`);

  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const page = await context.newPage();
    watch(page, `player-${index + 1}`, errors);
    contexts.push(context);
    players.push(page);
    await joinGuest(page, code, names[index]);
  }

  await Promise.all(
    players.map(page =>
      page.getByRole("button", { name: "Jestem gotowy" }).click(),
    ),
  );
  await host.getByText("5/5 gotowych").waitFor({ timeout: 15000 });

  const start = host.getByRole("button", { name: "START GRY", exact: true });
  await start.waitFor({ state: "visible", timeout: 15000 });
  const startDeadline = Date.now() + 15000;
  while (
    !(await start.isEnabled().catch(() => false)) &&
    Date.now() < startDeadline
  ) {
    await host.waitForTimeout(200);
  }
  assert(await start.isEnabled(), "START GRY nie został aktywowany przy 5/5");
  await start.click();

  await Promise.all([
    host.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), { timeout: 20000 }),
    ...players.map(page =>
      page.waitForURL(new RegExp(`/gra/akta-nocy/${code}$`), {
        timeout: 20000,
      }),
    ),
  ]);

  const hostInitial = await waitState(
    host,
    code,
    body =>
      body?.role === "host" &&
      body?.playMode === "host" &&
      body?.room?.phase === "ok_akta_osobowe",
    "host start",
  );
  assert(hostInitial.roleCard == null, "Prowadzący dostał prywatną kartę roli");
  const hostSerialized = JSON.stringify(hostInitial);
  assert(
    !hostSerialized.includes("culpritBriefing"),
    "Prowadzący dostał briefing osoby odpowiedzialnej",
  );
  assert(
    !hostSerialized.includes("\"isCulprit\":true"),
    "Prowadzący dostał informację, kto jest sprawcą",
  );

  const initialPlayers = await Promise.all(
    players.map((page, index) =>
      waitState(
        page,
        code,
        body =>
          body?.role === "player" &&
          body?.playMode === "host" &&
          body?.room?.phase === "ok_akta_osobowe",
        `player ${index + 1} start`,
      ),
    ),
  );
  const roleIds = initialPlayers.map(item => item.roleCard?.id);
  assert(new Set(roleIds).size === 5, "Role 5 graczy nie są unikalne");
  assert(
    initialPlayers.filter(item => item.roleCard?.isCulprit).length === 1,
    "Ostatni Kurs host nie ma dokładnie 1 osoby odpowiedzialnej",
  );
  check("Host + 5 graczy startują z poprawnym podziałem ról i bez przecieku rozwiązania");

  for (const page of players) {
    const result = await action(page, code, "openDossier");
    assert(
      result.status === 200 && result.body?.ok === true,
      `Nie udało się otworzyć akt: ${JSON.stringify(result)}`,
    );
  }
  await waitState(
    host,
    code,
    body =>
      body?.progress?.length === 5 &&
      body.progress.every(item => item.dossier_opened),
    "5/5 otwartych akt",
  );

  const passivePhases = [
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

  for (const phase of passivePhases) {
    await advance(host, code, phase);
    const states = await Promise.all(
      players.map((page, index) =>
        waitState(
          page,
          code,
          body =>
            body?.room?.phase === phase &&
            body?.roleCard?.id === roleIds[index],
          `${phase} gracza ${index + 1}`,
        ),
      ),
    );
    assert(
      states.every(item => item.playMode === "host"),
      `Tryb gry zmienił się w ${phase}`,
    );
  }
  check("Prowadzący steruje wszystkimi etapami dowodów, mapy i przesłuchań");

  const reconstructionStates = await Promise.all(
    players.map((page, index) =>
      waitState(
        page,
        code,
        body =>
          body?.room?.phase === "ok_rekonstrukcja" &&
          body?.roleCard?.id === roleIds[index],
        `rekonstrukcja gracza ${index + 1}`,
      ),
    ),
  );
  const eventOrder = (reconstructionStates[0].reconstructionOptions ?? [])
    .slice(0, 9)
    .map(item => item.key);
  assert(
    eventOrder.length === 9 && new Set(eventOrder).size === 9,
    "Brak 9 unikalnych opcji rekonstrukcji",
  );
  const route = ["w1", "w2", "w3", "w4"];

  for (let index = 0; index < players.length; index += 1) {
    const result = await action(players[index], code, "submitReconstruction", {
      eventOrder,
      route,
    });
    assert(
      result.status === 200 && result.body?.ok === true,
      `Rekonstrukcja ${index + 1}/5 nie została zapisana: ${JSON.stringify(result)}`,
    );
  }

  const reconstructionReady = await waitState(
    host,
    code,
    body =>
      body?.room?.phase === "ok_rekonstrukcja" &&
      body?.submissionProgress?.reconstruction === 5 &&
      body?.submissionProgress?.total === 5,
    "host widzi 5/5 rekonstrukcji",
  );
  assert(
    reconstructionReady.reconstruction == null,
    "Wynik rekonstrukcji został pokazany przed akcją prowadzącego",
  );
  await advance(host, code, "ok_rekonstrukcja_wynik");

  const reconstructionResult = await waitState(
    host,
    code,
    body =>
      body?.room?.phase === "ok_rekonstrukcja_wynik" &&
      body?.reconstruction?.total === 5,
    "wynik rekonstrukcji",
  );
  assert(
    !JSON.stringify(reconstructionResult.reconstruction).includes("fullyCorrect"),
    "Poprawność rekonstrukcji ujawniona przed finałem",
  );
  check("5 rekonstrukcji nie przełącza fazy bez prowadzącego, wynik pokazuje dopiero host");

  await advance(host, code, "ok_oskarzenie");
  const accusationStates = await Promise.all(
    players.map((page, index) =>
      waitState(
        page,
        code,
        body =>
          body?.room?.phase === "ok_oskarzenie" &&
          body?.roleCard?.id === roleIds[index],
        `oskarżenie gracza ${index + 1}`,
      ),
    ),
  );

  for (let index = 0; index < players.length; index += 1) {
    const current = accusationStates[index];
    const suspect =
      current.cast.find(
        item => item.playerId !== current.player?.playerId,
      ) ?? current.cast[0];
    const motive = current.motiveOptions[0];
    const evidence = current.evidenceOptions[0];
    const disappearance = current.disappearanceOptions[0];
    assert(
      suspect?.playerId &&
        motive?.key &&
        evidence?.id &&
        disappearance?.key,
      `Niekompletne opcje oskarżenia gracza ${index + 1}`,
    );
    const result = await action(players[index], code, "submitAccusation", {
      suspectPlayerId: suspect.playerId,
      motiveKey: motive.key,
      evidenceId: evidence.id,
      disappearanceKey: disappearance.key,
    });
    assert(
      result.status === 200 && result.body?.ok === true,
      `Oskarżenie ${index + 1}/5 nie zostało zapisane: ${JSON.stringify(result)}`,
    );
  }

  const accusationsReady = await waitState(
    host,
    code,
    body =>
      body?.room?.phase === "ok_oskarzenie" &&
      body?.submissionProgress?.accusation === 5 &&
      body?.submissionProgress?.total === 5,
    "host widzi 5/5 oskarżeń",
  );
  assert(
    accusationsReady.accusations == null,
    "Wynik oskarżeń został pokazany przed akcją prowadzącego",
  );

  await advance(host, code, "ok_oskarzenie_wynik");
  const accusationResult = await waitState(
    host,
    code,
    body =>
      body?.room?.phase === "ok_oskarzenie_wynik" &&
      body?.accusations?.total === 5,
    "wynik oskarżeń",
  );
  const publicAccusations = JSON.stringify(accusationResult.accusations);
  assert(
    !publicAccusations.includes("suspectCorrect") &&
      !publicAccusations.includes("fullyCorrect"),
    "Trafność oskarżeń ujawniona przed finałem",
  );
  check("5 prywatnych oskarżeń pozostaje pod kontrolą prowadzącego, trafność jest ukryta");

  const revealPhases = [
    "ok_ujawnienie_1",
    "ok_ujawnienie_2",
    "ok_ujawnienie_3",
    "ok_ujawnienie_4",
    "ok_ujawnienie_5",
  ];

  for (const phase of revealPhases) {
    const current = await advance(host, code, phase);
    if (phase !== "ok_ujawnienie_5") {
      const serialized = JSON.stringify(current.accusations ?? {});
      assert(
        !serialized.includes("suspectCorrect") &&
          !serialized.includes("fullyCorrect"),
        `Trafność ujawniona za wcześnie w ${phase}`,
      );
    } else {
      assert(
        current.reveal?.step === 5 &&
          current.accusations?.results?.length === 5 &&
          "fullyCorrect" in current.accusations,
        "Finalne ujawnienie nie zawiera kompletnego wyniku",
      );
    }
  }
  check("Prowadzący przechodzi 5 części ujawnienia, trafność pojawia się dopiero w części 5");

  await host.screenshot({
    path: `${artifacts}/01-host-final-reveal.png`,
    fullPage: true,
  });
  await players[0].screenshot({
    path: `${artifacts}/02-player-final-reveal.png`,
    fullPage: true,
  });

  const close = await action(host, code, "closeGame");
  assert(
    close.status === 200 && close.body?.ok === true,
    `Nie udało się zamknąć sprawy: ${JSON.stringify(close)}`,
  );

  const closedHost = await waitState(
    host,
    code,
    body =>
      body?.role === "closed" &&
      body?.playMode === "host" &&
      body?.room?.phase === "ok_zamknieta" &&
      body?.room?.status === "finished",
    "zamknięty host",
    45000,
  );
  assert(closedHost.role === "closed", "Host nie przeszedł do closed");

  const closedPlayers = await Promise.all(
    players.map((page, index) =>
      waitState(
        page,
        code,
        body =>
          body?.role === "closed" &&
          body?.playMode === "host" &&
          body?.room?.phase === "ok_zamknieta" &&
          body?.room?.status === "finished",
        `zamknięty gracz ${index + 1}`,
        45000,
      ),
    ),
  );
  assert(closedPlayers.length === 5, "Nie wszystkie sesje graczy zostały zamknięte");
  await host.getByText("N417 dotarł do końca trasy.", { exact: true }).waitFor({
    state: "visible",
    timeout: 20000,
  });
  check("Ostatni Kurs z prowadzącym kończy się closed / finished / ok_zamknieta");

  await host.screenshot({
    path: `${artifacts}/03-host-closed.png`,
    fullPage: true,
  });

  assert(errors.length === 0, `Błędy przeglądarki/API:\n${errors.join("\n")}`);
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  console.log(`AKTA NOCY Ostatni Kurs HOST E2E PASS room=${code}`);

  for (const context of contexts) await context.close().catch(() => {});
  await hostContext.close();
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  await fs.writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
