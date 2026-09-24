import { cleanRoomCode } from "@/lib/room-code.mjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  advanceAktaNocyOkPhase,
  closeAktaNocyOkGame,
  getAktaNocyHostProgress,
  getAktaNocyOkAccusationPlayer,
  getAktaNocyOkAccusationResultsForSession,
  getAktaNocyOkReadyProgress,
  getAktaNocyOkReconstructionPlayer,
  getAktaNocyOkReconstructionResults,
  getAktaNocyPlayerAssignment,
  getAktaNocyPublicCast,
  getAktaNocyRoomConfig,
  isPlatformTestRoomHost,
  isPlatformRoomHost,
  lookupPlatformRoom,
  markAktaNocyOkReady,
  openAktaNocyDossier,
  submitAktaNocyOkAccusation,
  submitAktaNocyOkReconstruction,
} from "@/lib/platform-db";
import {
  OSTATNI_KURS_ALL_EVIDENCE,
  OSTATNI_KURS_CARRIAGES,
  OSTATNI_KURS_DISAPPEARANCE_OPTIONS,
  OSTATNI_KURS_EVIDENCE_A,
  OSTATNI_KURS_EVIDENCE_B,
  OSTATNI_KURS_INTERROGATIONS,
  OSTATNI_KURS_MAP_RULES,
  OSTATNI_KURS_MOTIVE_OPTIONS,
  OSTATNI_KURS_RECONSTRUCTION_EVENTS,
  OSTATNI_KURS_TWIST_EVIDENCE,
  getOstatniKursEvidenceForPhase,
  getOstatniKursInterrogation,
} from "@/lib/akta-nocy-ostatni-kurs";
import {
  getOstatniKursRoleByKey,
} from "@/lib/akta-nocy-ostatni-kurs-roles";
import { OSTATNI_KURS_SOLUTION } from "@/lib/akta-nocy-ostatni-kurs-solution";

type RouteContext = { params: Promise<{ code: string }> };

function safeCast(
  rows: Awaited<ReturnType<typeof getAktaNocyPublicCast>>,
) {
  return rows
    .map((row) => {
      const role = getOstatniKursRoleByKey(row.role_key);
      if (!role) return null;
      return {
        playerId: row.player_id,
        displayName: row.display_name,
        avatar: row.avatar,
        characterName: role.name,
        characterLabel: role.shortLabel,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function safeInterrogations(
  rows: Awaited<ReturnType<typeof getAktaNocyPublicCast>>,
) {
  return rows
    .map((row) => {
      const role = getOstatniKursRoleByKey(row.role_key);
      const guide = getOstatniKursInterrogation(row.role_key);
      if (!role || !guide) return null;
      return {
        playerId: row.player_id,
        displayName: row.display_name,
        avatar: row.avatar,
        characterName: role.name,
        characterLabel: role.shortLabel,
        headline: guide.headline,
        prompts: guide.prompts,
        pressurePoint: guide.pressurePoint,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function reconstructionSummary(
  rows: Awaited<ReturnType<typeof getAktaNocyOkReconstructionResults>>,
) {
  const eventStats = new Map<string, { count: number; position: number }>();
  const routeCounts = new Map<string, number>();

  rows.forEach((row) => {
    row.event_order.forEach((key, index) => {
      const current = eventStats.get(key) ?? { count: 0, position: 0 };
      current.count += 1;
      current.position += index + 1;
      eventStats.set(key, current);
    });
    const routeKey = row.route.join(" → ");
    routeCounts.set(routeKey, (routeCounts.get(routeKey) ?? 0) + 1);
  });

  const eventByKey = new Map<string, { title: string }>(
    OSTATNI_KURS_RECONSTRUCTION_EVENTS.map((item) => [item.key, { title: item.title }]),
  );

  return {
    total: rows.length,
    consensusTimeline: [...eventStats.entries()]
      .map(([key, stat]) => ({
        key,
        title: eventByKey.get(key)?.title ?? key,
        count: stat.count,
        avgPosition: stat.count ? stat.position / stat.count : 99,
      }))
      .sort((a, b) => b.count - a.count || a.avgPosition - b.avgPosition)
      .slice(0, 9)
      .sort((a, b) => a.avgPosition - b.avgPosition),
    routes: [...routeCounts.entries()]
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
    fullyCorrect: rows.filter(
      (row) =>
        row.event_order.join("|") ===
          OSTATNI_KURS_SOLUTION.correctEventOrder.join("|") &&
        row.route.join("|") === OSTATNI_KURS_SOLUTION.correctRoute.join("|"),
    ).length,
  };
}

function accusationSummary(
  rows: Awaited<ReturnType<typeof getAktaNocyOkAccusationResultsForSession>>,
  cast: ReturnType<typeof safeCast>,
) {
  const castById = new Map(cast.map((item) => [item.playerId, item]));
  const culprit = cast.find(
    (item) => item.characterName === OSTATNI_KURS_SOLUTION.culpritName,
  );
  const evidenceById = new Map(
    OSTATNI_KURS_ALL_EVIDENCE.map((item) => [item.id, item]),
  );
  const motiveByKey = new Map<string, string>(
    OSTATNI_KURS_MOTIVE_OPTIONS.map((item) => [item.key, item.label]),
  );
  const methodByKey = new Map<string, string>(
    OSTATNI_KURS_DISAPPEARANCE_OPTIONS.map((item) => [item.key, item.label]),
  );

  const results = rows.map((row) => {
    const suspect = castById.get(row.suspect_player_id) ?? null;
    const suspectCorrect = Boolean(
      culprit && row.suspect_player_id === culprit.playerId,
    );
    const motiveCorrect =
      row.motive_key === OSTATNI_KURS_SOLUTION.motiveKey;
    const evidenceCorrect = OSTATNI_KURS_SOLUTION.decisiveEvidenceIds.some(
      (id) => id === row.evidence_id,
    );
    const disappearanceCorrect =
      row.disappearance_key === OSTATNI_KURS_SOLUTION.disappearanceKey;

    return {
      playerId: row.player_id,
      displayName: row.display_name,
      avatar: row.avatar,
      suspect,
      motiveKey: row.motive_key,
      motiveLabel: motiveByKey.get(row.motive_key) ?? row.motive_key,
      evidenceId: row.evidence_id,
      evidenceNo: evidenceById.get(row.evidence_id)?.no ?? "",
      evidenceTitle:
        evidenceById.get(row.evidence_id)?.title ?? row.evidence_id,
      disappearanceKey: row.disappearance_key,
      disappearanceLabel:
        methodByKey.get(row.disappearance_key) ?? row.disappearance_key,
      suspectCorrect,
      motiveCorrect,
      evidenceCorrect,
      disappearanceCorrect,
      fullyCorrect:
        suspectCorrect &&
        motiveCorrect &&
        evidenceCorrect &&
        disappearanceCorrect,
    };
  });

  return {
    total: results.length,
    correctSuspect: results.filter((x) => x.suspectCorrect).length,
    correctMotive: results.filter((x) => x.motiveCorrect).length,
    correctEvidence: results.filter((x) => x.evidenceCorrect).length,
    correctDisappearance: results.filter((x) => x.disappearanceCorrect).length,
    fullyCorrect: results.filter((x) => x.fullyCorrect).length,
    results,
  };
}

function publicAccusationSummary(
  summary: ReturnType<typeof accusationSummary>,
  phase: string | null | undefined,
) {
  if (phase === "ok_ujawnienie_5") return summary;

  // Wcześniej ujawniamy wyłącznie wybory graczy. Trafność, osoba odpowiedzialna
  // i dane rozwiązania pozostają na serwerze do ostatniej części ujawnienia.
  return {
    total: summary.total,
    results: summary.results.map((item) => ({
      playerId: item.playerId,
      displayName: item.displayName,
      avatar: item.avatar,
      suspect: item.suspect,
      motiveLabel: item.motiveLabel,
      evidenceNo: item.evidenceNo,
      evidenceTitle: item.evidenceTitle,
      disappearanceLabel: item.disappearanceLabel,
    })),
  };
}

function revealForPhase(phase: string | null | undefined) {
  if (!phase?.startsWith("ok_ujawnienie_")) return null;
  const step = Number(phase.replace("ok_ujawnienie_", ""));
  if (step === 1) return { step, content: OSTATNI_KURS_SOLUTION.reveal.step1 };
  if (step === 2) return { step, content: OSTATNI_KURS_SOLUTION.reveal.step2 };
  if (step === 3) return { step, content: OSTATNI_KURS_SOLUTION.reveal.step3 };
  if (step === 4) return { step, content: OSTATNI_KURS_SOLUTION.reveal.step4 };
  return { step: 5, content: OSTATNI_KURS_SOLUTION.reveal.step5 };
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanRoomCode(rawCode);
  const [room, config] = await Promise.all([
    lookupPlatformRoom(code),
    getAktaNocyRoomConfig(code),
  ]);

  if (
    !room ||
    room.game_slug !== "akta-nocy" ||
    config?.case_key !== "ostatni-kurs"
  ) {
    return NextResponse.json(
      { error: "Nie znaleziono sprawy Ostatni Kurs." },
      { status: 404 },
    );
  }

  const cookieStore = await cookies();
  const hostCookie =
    cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const rawHostToken = await isPlatformRoomHost(code, hostCookie) ? hostCookie : null;
  const playerToken =
    cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  const testView =
    cookieStore.get(`zagraj_test_view_${code}`)?.value ?? "host";

  if (room.status === "finished" && room.game_phase === "ok_zamknieta") {
    if (!rawHostToken && !playerToken) {
      return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
    }
    return NextResponse.json({
      role: "closed",
      playMode: config.play_mode,
      room: { code, phase: room.game_phase, status: room.status },
    });
  }

  if (room.status !== "active") {
    return NextResponse.json(
      { error: "Rozgrywka jeszcze się nie rozpoczęła." },
      { status: 409 },
    );
  }

  const playerView = testView === "player" && playerToken;
  const hostModeHost =
    config.play_mode === "host" && rawHostToken && !playerView
      ? rawHostToken
      : null;

  if (
    config.play_mode === "auto" &&
    rawHostToken &&
    !playerToken &&
    testView !== "player"
  ) {
    const isTest = await isPlatformTestRoomHost(code, rawHostToken);
    if (isTest) {
      const progress = await getAktaNocyHostProgress(code, rawHostToken);
      return NextResponse.json({
        role: "testHost",
        playMode: config.play_mode,
        room: { code, phase: room.game_phase, status: room.status },
        players: progress.map((row) => ({
          playerId: row.player_id,
          displayName: row.display_name,
          avatar: row.avatar,
        })),
      });
    }
  }

  const evidence = getOstatniKursEvidenceForPhase(room.game_phase);
  const sessionToken = hostModeHost ?? playerToken ?? rawHostToken;

  if (!sessionToken) {
    return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
  }

  const castRows = await getAktaNocyPublicCast(code, sessionToken);
  const cast = safeCast(castRows);
  const interrogation =
    room.game_phase === "ok_przesluchania"
      ? safeInterrogations(castRows)
      : [];

  let reconstruction = null;
  if (
    room.game_phase === "ok_rekonstrukcja_wynik" ||
    room.game_phase === "ok_oskarzenie" ||
    room.game_phase === "ok_oskarzenie_wynik" ||
    room.game_phase?.startsWith("ok_ujawnienie_")
  ) {
    const summary = reconstructionSummary(
      await getAktaNocyOkReconstructionResults(code, sessionToken),
    );
    reconstruction =
      room.game_phase === "ok_ujawnienie_5"
        ? summary
        : {
            total: summary.total,
            consensusTimeline: summary.consensusTimeline,
            routes: summary.routes,
          };
  }

  let accusations = null;
  if (
    room.game_phase === "ok_oskarzenie_wynik" ||
    room.game_phase?.startsWith("ok_ujawnienie_")
  ) {
    accusations = publicAccusationSummary(
      accusationSummary(
        await getAktaNocyOkAccusationResultsForSession(code, sessionToken),
        cast,
      ),
      room.game_phase,
    );
  }

  if (hostModeHost) {
    const progress = await getAktaNocyHostProgress(code, hostModeHost);
    const submittedReconstruction =
      room.game_phase === "ok_rekonstrukcja"
        ? await getAktaNocyOkReconstructionResults(code, hostModeHost)
        : [];
    const submittedAccusations =
      room.game_phase === "ok_oskarzenie"
        ? await getAktaNocyOkAccusationResultsForSession(code, hostModeHost)
        : [];

    return NextResponse.json({
      role: "host",
      playMode: config.play_mode,
      room: { code, phase: room.game_phase, status: room.status },
      progress,
      evidence,
      cast,
      interrogation,
      reconstruction,
      accusations,
      reveal: revealForPhase(room.game_phase),
      map: {
        carriages: OSTATNI_KURS_CARRIAGES,
        rules: OSTATNI_KURS_MAP_RULES,
      },
      reconstructionOptions: OSTATNI_KURS_RECONSTRUCTION_EVENTS,
      motiveOptions: OSTATNI_KURS_MOTIVE_OPTIONS,
      disappearanceOptions: OSTATNI_KURS_DISAPPEARANCE_OPTIONS,
      evidenceOptions: OSTATNI_KURS_ALL_EVIDENCE.map((item) => ({
        id: item.id,
        no: item.no,
        title: item.title,
      })),
      submissionProgress: {
        reconstruction: submittedReconstruction.length,
        accusation: submittedAccusations.length,
        total: progress.length,
      },
    });
  }

  if (!playerToken) {
    return NextResponse.json({
      role: "observer",
      playMode: config.play_mode,
      room: { code, phase: room.game_phase, status: room.status },
      message:
        "Automatyczne śledztwo trwa na telefonach graczy. Dołącz do pokoju jako gracz, aby otrzymać własne akta.",
    });
  }

  const assignment = await getAktaNocyPlayerAssignment(code, playerToken);
  if (!assignment) {
    return NextResponse.json(
      { error: "Nie znaleziono Twojej roli." },
      { status: 404 },
    );
  }

  const roleCard = getOstatniKursRoleByKey(assignment.role_key);
  if (!roleCard) {
    return NextResponse.json(
      { error: "Nie udało się odczytać akt postaci." },
      { status: 500 },
    );
  }

  const ready =
    config.play_mode === "auto"
      ? await getAktaNocyOkReadyProgress(code, playerToken)
      : null;

  const ownReconstruction =
    room.game_phase === "ok_rekonstrukcja"
      ? await getAktaNocyOkReconstructionPlayer(code, playerToken)
      : null;

  const ownAccusation =
    room.game_phase === "ok_oskarzenie"
      ? await getAktaNocyOkAccusationPlayer(code, playerToken)
      : null;

  return NextResponse.json({
    role: "player",
    playMode: config.play_mode,
    room: { code, phase: room.game_phase, status: room.status },
    player: {
      playerId: assignment.player_id,
      displayName: assignment.display_name,
      avatar: assignment.avatar,
      dossierOpened: assignment.dossier_opened,
    },
    roleCard,
    evidence,
    cast,
    interrogation,
    ready,
    reconstruction,
    ownReconstruction,
    accusations,
    ownAccusation,
    reveal: revealForPhase(room.game_phase),
    map: {
      carriages: OSTATNI_KURS_CARRIAGES,
      rules: OSTATNI_KURS_MAP_RULES,
    },
    reconstructionOptions: OSTATNI_KURS_RECONSTRUCTION_EVENTS,
    motiveOptions: OSTATNI_KURS_MOTIVE_OPTIONS,
    disappearanceOptions: OSTATNI_KURS_DISAPPEARANCE_OPTIONS,
    evidenceOptions: OSTATNI_KURS_ALL_EVIDENCE.map((item) => ({
      id: item.id,
      no: item.no,
      title: item.title,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanRoomCode(rawCode);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const [room, config] = await Promise.all([
    lookupPlatformRoom(code),
    getAktaNocyRoomConfig(code),
  ]);

  if (
    !room ||
    room.game_slug !== "akta-nocy" ||
    config?.case_key !== "ostatni-kurs"
  ) {
    return NextResponse.json({ error: "Nie znaleziono sprawy." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const hostCookie =
    cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const rawHostToken = await isPlatformRoomHost(code, hostCookie) ? hostCookie : null;
  const playerToken =
    cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  const testView =
    cookieStore.get(`zagraj_test_view_${code}`)?.value ?? "host";

  try {
    if (action === "openDossier") {
      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }
      return NextResponse.json({
        ok: await openAktaNocyDossier(code, playerToken),
      });
    }

    if (action === "ready") {
      if (config.play_mode !== "auto" || !playerToken) {
        return NextResponse.json(
          { error: "Ta akcja jest dostępna tylko graczom w trybie automatycznym." },
          { status: 403 },
        );
      }
      return NextResponse.json({
        ok: true,
        phase: await markAktaNocyOkReady(code, playerToken),
      });
    }

    if (action === "advance") {
      if (config.play_mode !== "host" || !rawHostToken || testView === "player") {
        return NextResponse.json(
          { error: "Tylko prowadzący może przejść dalej." },
          { status: 403 },
        );
      }
      return NextResponse.json({
        ok: true,
        phase: await advanceAktaNocyOkPhase(code, rawHostToken),
      });
    }

    if (action === "submitReconstruction") {
      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }
      const eventOrder = Array.isArray(body.eventOrder)
        ? body.eventOrder.map(String)
        : [];
      const route = Array.isArray(body.route) ? body.route.map(String) : [];
      return NextResponse.json({
        ok: await submitAktaNocyOkReconstruction(
          code,
          playerToken,
          eventOrder,
          route,
        ),
      });
    }

    if (action === "submitAccusation") {
      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }
      return NextResponse.json({
        ok: await submitAktaNocyOkAccusation(
          code,
          playerToken,
          String(body.suspectPlayerId ?? ""),
          String(body.motiveKey ?? ""),
          String(body.evidenceId ?? ""),
          String(body.disappearanceKey ?? ""),
        ),
      });
    }

    if (action === "closeGame") {
      const token =
        config.play_mode === "host" ? rawHostToken : playerToken ?? rawHostToken;
      if (!token) {
        return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
      }
      return NextResponse.json({
        ok: await closeAktaNocyOkGame(code, token),
      });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Nie udało się wykonać akcji.";
    const message = raw.includes("Dossiers not ready")
      ? "Wszyscy gracze muszą najpierw otworzyć swoje akta."
      : raw.includes("Reconstructions not ready")
        ? "Wszyscy gracze muszą wysłać rekonstrukcję."
        : raw.includes("Accusations not ready")
          ? "Wszyscy gracze muszą złożyć akt oskarżenia."
          : raw.includes("Open dossier first")
            ? "Najpierw otwórz i przeczytaj swoje akta."
            : "Nie udało się wykonać tej akcji.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
