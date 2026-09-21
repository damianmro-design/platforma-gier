import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  advanceAktaNocyPhase,
  getAktaNocyHostInterrogations,
  getAktaNocyHostProgress,
  getAktaNocyPlayerAssignment,
  getAktaNocyPublicCast,
  getAktaNocyReconstructionHost,
  getAktaNocyReconstructionPlayer,
  lookupPlatformRoom,
  openAktaNocyDossier,
  revealAktaNocyEvidenceA,
  revealAktaNocyEvidenceB,
  submitAktaNocyReconstruction,
} from "@/lib/platform-db";
import {
  AKTA_NOCY_EVIDENCE_A,
  AKTA_NOCY_COVERUP_OPTIONS,
  AKTA_NOCY_EVIDENCE_B,
  AKTA_NOCY_MOTIVE_OPTIONS,
  AKTA_NOCY_RECONSTRUCTION_EVENTS,
  getAktaNocyEvidenceBCountFromPhase,
  getAktaNocyEvidenceCountFromPhase,
  getAktaNocyInterrogationByRole,
  getAktaNocyRoleByKey,
} from "@/lib/akta-nocy";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function publicEvidenceForPhase(phase: string | null | undefined) {
  if (phase === "rekonstrukcja" || phase === "rekonstrukcja_wynik") {
    return [...AKTA_NOCY_EVIDENCE_A, ...AKTA_NOCY_EVIDENCE_B];
  }

  if (phase?.startsWith("dowody_b_")) {
    const countB = getAktaNocyEvidenceBCountFromPhase(phase);
    return [
      ...AKTA_NOCY_EVIDENCE_A,
      ...AKTA_NOCY_EVIDENCE_B.slice(0, countB),
    ];
  }

  const countA = getAktaNocyEvidenceCountFromPhase(phase);
  return AKTA_NOCY_EVIDENCE_A.slice(0, countA);
}


function publicCastForRows(
  rows: Awaited<ReturnType<typeof getAktaNocyPublicCast>>,
) {
  return rows
    .map((row) => {
      const role = getAktaNocyRoleByKey(row.role_key);
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

function buildReconstructionSummary(
  rows: Awaited<ReturnType<typeof getAktaNocyReconstructionHost>>,
  cast: ReturnType<typeof publicCastForRows>,
) {
  const submittedRows = rows.filter((row) => row.submitted);
  const suspectCounts = new Map<string, number>();
  const motiveCounts = new Map<string, number>();
  const coverupCounts = new Map<string, number>();
  const eventStats = new Map<string, { count: number; positionSum: number }>();

  for (const row of submittedRows) {
    if (row.suspect_player_id) {
      suspectCounts.set(
        row.suspect_player_id,
        (suspectCounts.get(row.suspect_player_id) ?? 0) + 1,
      );
    }

    if (row.motive_key) {
      motiveCounts.set(
        row.motive_key,
        (motiveCounts.get(row.motive_key) ?? 0) + 1,
      );
    }

    if (row.coverup_key) {
      coverupCounts.set(
        row.coverup_key,
        (coverupCounts.get(row.coverup_key) ?? 0) + 1,
      );
    }

    row.event_order?.forEach((key, index) => {
      const current = eventStats.get(key) ?? { count: 0, positionSum: 0 };
      current.count += 1;
      current.positionSum += index + 1;
      eventStats.set(key, current);
    });
  }

  const castById = new Map(cast.map((item) => [item.playerId, item]));
  const eventByKey = new Map(
    AKTA_NOCY_RECONSTRUCTION_EVENTS.map((item) => [item.key, item]),
  );

  const suspectRanking = [...suspectCounts.entries()]
    .map(([playerId, count]) => ({
      ...(castById.get(playerId) ?? {
        playerId,
        displayName: "Nieznana osoba",
        avatar: "",
        characterName: "Nieznana postać",
        characterLabel: "",
      }),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));

  const motiveRanking = AKTA_NOCY_MOTIVE_OPTIONS
    .map((option) => ({
      key: option.key,
      label: option.label,
      count: motiveCounts.get(option.key) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const coverupRanking = AKTA_NOCY_COVERUP_OPTIONS
    .map((option) => ({
      key: option.key,
      label: option.label,
      count: coverupCounts.get(option.key) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const consensusTimeline = [...eventStats.entries()]
    .map(([key, stat]) => ({
      key,
      title: eventByKey.get(key)?.title ?? key,
      count: stat.count,
      avgPosition: stat.count ? stat.positionSum / stat.count : 99,
    }))
    .sort((a, b) => b.count - a.count || a.avgPosition - b.avgPosition)
    .slice(0, 7)
    .sort((a, b) => a.avgPosition - b.avgPosition);

  return {
    total: rows.length,
    submitted: submittedRows.length,
    suspectRanking,
    motiveRanking,
    coverupRanking,
    consensusTimeline,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "akta-nocy") {
    return NextResponse.json({ error: "Nie znaleziono sprawy." }, { status: 404 });
  }

  if (room.status !== "active") {
    return NextResponse.json(
      { error: "Rozgrywka jeszcze się nie rozpoczęła." },
      { status: 409 },
    );
  }

  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  const evidence = publicEvidenceForPhase(room.game_phase);

  if (hostToken) {
    const progress = await getAktaNocyHostProgress(code, hostToken);
    const castRows = await getAktaNocyPublicCast(code, hostToken);
    const cast = publicCastForRows(castRows);

    let reconstructionRows: Awaited<
      ReturnType<typeof getAktaNocyReconstructionHost>
    > = [];

    if (
      room.game_phase === "rekonstrukcja" ||
      room.game_phase === "rekonstrukcja_wynik"
    ) {
      reconstructionRows = await getAktaNocyReconstructionHost(code, hostToken);
    }

    let interrogations: Array<{
      playerId: string;
      displayName: string;
      avatar: string;
      headline: string;
      prompts: string[];
      pressurePoint: string;
    }> = [];

    if (room.game_phase === "przesluchania_a") {
      const rows = await getAktaNocyHostInterrogations(code, hostToken);
      interrogations = rows
        .map((row) => {
          const guide = getAktaNocyInterrogationByRole(row.role_key);
          if (!guide) return null;

          return {
            playerId: row.player_id,
            displayName: row.display_name,
            avatar: row.avatar,
            headline: guide.headline,
            prompts: guide.prompts,
            pressurePoint: guide.pressurePoint,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }

    return NextResponse.json({
      role: "host",
      room: {
        code: room.code,
        status: room.status,
        phase: room.game_phase,
      },
      progress,
      evidence,
      interrogations,
      cast,
      reconstruction:
        room.game_phase === "rekonstrukcja" ||
        room.game_phase === "rekonstrukcja_wynik"
          ? {
              players: reconstructionRows.map((row) => ({
                playerId: row.player_id,
                displayName: row.display_name,
                avatar: row.avatar,
                submitted: row.submitted,
              })),
              summary:
                room.game_phase === "rekonstrukcja_wynik"
                  ? buildReconstructionSummary(reconstructionRows, cast)
                  : null,
            }
          : null,
      reconstructionEvents: AKTA_NOCY_RECONSTRUCTION_EVENTS,
      motiveOptions: AKTA_NOCY_MOTIVE_OPTIONS,
      coverupOptions: AKTA_NOCY_COVERUP_OPTIONS,
    });
  }

  if (playerToken) {
    const assignment = await getAktaNocyPlayerAssignment(code, playerToken);
    const castRows = await getAktaNocyPublicCast(code, playerToken);
    const cast = publicCastForRows(castRows);
    const reconstruction =
      room.game_phase === "rekonstrukcja" ||
      room.game_phase === "rekonstrukcja_wynik"
        ? await getAktaNocyReconstructionPlayer(code, playerToken)
        : null;

    if (!assignment) {
      return NextResponse.json(
        { error: "Nie znaleziono przydzielonej postaci." },
        { status: 404 },
      );
    }

    const roleCard = getAktaNocyRoleByKey(assignment.role_key);

    if (!roleCard) {
      return NextResponse.json(
        { error: "Nie udało się odczytać akt postaci." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      role: "player",
      room: {
        code: room.code,
        status: room.status,
        phase: room.game_phase,
      },
      player: {
        id: assignment.player_id,
        displayName: assignment.display_name,
        avatar: assignment.avatar,
      },
      roleCard: {
        ...roleCard,
        dossierOpened: assignment.dossier_opened,
      },
      evidence,
      cast,
      reconstruction,
      reconstructionEvents: AKTA_NOCY_RECONSTRUCTION_EVENTS,
      motiveOptions: AKTA_NOCY_MOTIVE_OPTIONS,
      coverupOptions: AKTA_NOCY_COVERUP_OPTIONS,
    });
  }

  return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const cookieStore = await cookies();

  try {
    if (action === "openDossier") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const ok = await openAktaNocyDossier(code, playerToken);

      if (!ok) {
        return NextResponse.json(
          { error: "Nie udało się otworzyć akt." },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "advance") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json(
          { error: "Tylko prowadzący może przejść dalej." },
          { status: 403 },
        );
      }

      const phase = await advanceAktaNocyPhase(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    if (action === "revealEvidenceA") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json(
          { error: "Tylko prowadzący może ujawniać dowody." },
          { status: 403 },
        );
      }

      const phase = await revealAktaNocyEvidenceA(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    if (action === "submitReconstruction") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const eventOrder = Array.isArray(body.eventOrder)
        ? body.eventOrder.map((item: unknown) => String(item))
        : [];

      const ok = await submitAktaNocyReconstruction(
        code,
        playerToken,
        eventOrder,
        String(body.suspectPlayerId ?? ""),
        String(body.motiveKey ?? ""),
        String(body.coverupKey ?? ""),
      );

      return NextResponse.json({ ok });
    }

    if (action === "revealEvidenceB") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json(
          { error: "Tylko prowadzący może ujawniać dowody." },
          { status: 403 },
        );
      }

      const phase = await revealAktaNocyEvidenceB(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const message = raw.includes("Dossiers not ready")
      ? "Najpierw wszyscy gracze muszą otworzyć swoje akta."
      : raw.includes("Reconstructions not ready")
        ? "Najpierw wszyscy gracze muszą przesłać rekonstrukcję."
        : raw.includes("Invalid reconstruction")
          ? "Wybierz dokładnie 7 różnych wydarzeń i ustaw je w kolejności."
          : raw.includes("Invalid suspect")
            ? "Wybierz jednego z uczestników jako podejrzanego."
            : raw.includes("Invalid motive")
              ? "Wybierz motyw."
              : raw.includes("Invalid coverup")
                ? "Wybierz element upozorowania."
                : raw.includes("Invalid phase")
                  ? "Nie można teraz wykonać tej akcji."
        : raw.includes("Room not found")
          ? "Nie znaleziono aktywnej rozgrywki."
          : "Nie udało się wykonać tej akcji.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
