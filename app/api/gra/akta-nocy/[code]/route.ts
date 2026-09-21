import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  advanceAktaNocyPhase,
  getAktaNocyHostInterrogations,
  getAktaNocyHostProgress,
  getAktaNocyPlayerAssignment,
  lookupPlatformRoom,
  openAktaNocyDossier,
  revealAktaNocyEvidenceA,
} from "@/lib/platform-db";
import {
  AKTA_NOCY_EVIDENCE_A,
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
  const count = getAktaNocyEvidenceCountFromPhase(phase);
  return AKTA_NOCY_EVIDENCE_A.slice(0, count);
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
    });
  }

  if (playerToken) {
    const assignment = await getAktaNocyPlayerAssignment(code, playerToken);

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

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const message = raw.includes("Dossiers not ready")
      ? "Najpierw wszyscy gracze muszą otworzyć swoje akta."
      : raw.includes("Invalid phase")
        ? "Nie można teraz wykonać tej akcji."
        : raw.includes("Room not found")
          ? "Nie znaleziono aktywnej rozgrywki."
          : "Nie udało się wykonać tej akcji.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
