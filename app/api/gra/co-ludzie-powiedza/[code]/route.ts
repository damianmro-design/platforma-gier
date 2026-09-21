import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  advanceClpPhase,
  getClpHostProgress,
  getClpPlayerAnswers,
  getClpRound1State,
  getPlatformPlayer,
  lookupPlatformRoom,
  nextClpRound1Question,
  submitClpAnswer,
  submitClpRound1Guess,
} from "@/lib/platform-db";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "co-ludzie-powiedza") {
    return NextResponse.json({ error: "Nie znaleziono gry." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;

  if (room.game_phase === "round_1") {
    const round1 = await getClpRound1State(code);

    if (!round1) {
      return NextResponse.json({ error: "Nie udało się odczytać rundy." }, { status: 500 });
    }

    if (hostToken) {
      return NextResponse.json({
        role: "host",
        room: {
          code: room.code,
          status: room.status,
          phase: room.game_phase,
        },
        round1,
      });
    }

    if (playerToken) {
      const player = await getPlatformPlayer(code, playerToken);

      if (!player) {
        return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 401 });
      }

      return NextResponse.json({
        role: "player",
        room: {
          code: room.code,
          status: room.status,
          phase: room.game_phase,
        },
        player,
        round1,
      });
    }
  }

  if (hostToken) {
    const progress = await getClpHostProgress(code, hostToken);

    return NextResponse.json({
      role: "host",
      room: {
        code: room.code,
        status: room.status,
        phase: room.game_phase,
      },
      progress,
    });
  }

  if (playerToken) {
    const [player, answers] = await Promise.all([
      getPlatformPlayer(code, playerToken),
      getClpPlayerAnswers(code, playerToken),
    ]);

    if (!player) {
      return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 401 });
    }

    return NextResponse.json({
      role: "player",
      room: {
        code: room.code,
        status: room.status,
        phase: room.game_phase,
      },
      player,
      answers,
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
    if (action === "answer") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const ok = await submitClpAnswer(
        code,
        playerToken,
        String(body.questionKey ?? ""),
        String(body.answer ?? ""),
      );

      if (!ok) {
        return NextResponse.json({ error: "Nie udało się zapisać odpowiedzi." }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "advance") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await advanceClpPhase(code, hostToken);
      return NextResponse.json({ ok: phase === "round_1", phase });
    }

    if (action === "round1Guess") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const event = await submitClpRound1Guess(
        code,
        playerToken,
        String(body.guess ?? ""),
      );

      return NextResponse.json({ ok: true, event });
    }

    if (action === "round1Next") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await nextClpRound1Question(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";

    const message = raw.includes("Not your turn")
      ? "Teraz odpowiada inna osoba."
      : raw.includes("Not your team turn")
        ? "Teraz odpowiada druga drużyna."
        : raw.includes("Question is not accepting answers")
          ? "To pytanie jest już zakończone."
          : raw.includes("Invalid guess")
            ? "Wpisz krótką odpowiedź."
            : "Nie udało się wykonać akcji.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
