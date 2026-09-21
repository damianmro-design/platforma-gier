import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  advanceClpPhase,
  getClpHostProgress,
  getClpPlayerAnswers,
  getClpRound1State,
  getClpRound2State,
  getClpRound3State,
  getClpRound4State,
  getClpRound5State,
  getClpRound6State,
  getPlatformPlayer,
  lookupPlatformRoom,
  nextClpRound1Question,
  nextClpRound2Question,
  nextClpRound3Question,
  nextClpRound4Question,
  nextClpRound5Question,
  nextClpRound6Question,
  submitClpAnswer,
  submitClpRound1Guess,
  submitClpRound2Prediction,
  submitClpRound3Ranking,
  submitClpRound4Prediction,
  submitClpRound5Prediction,
  submitClpRound5Vote,
  submitClpRound6Prediction,
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

  if (room.game_phase === "round_6") {
    const round6 = await getClpRound6State(code);

    if (!round6) {
      return NextResponse.json({ error: "Nie udało się odczytać rundy." }, { status: 500 });
    }

    if (hostToken) {
      return NextResponse.json({
        role: "host",
        room: { code: room.code, status: room.status, phase: room.game_phase },
        round6,
      });
    }

    if (playerToken) {
      const player = await getPlatformPlayer(code, playerToken);

      if (!player) {
        return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 401 });
      }

      return NextResponse.json({
        role: "player",
        room: { code: room.code, status: room.status, phase: room.game_phase },
        player,
        round6,
      });
    }
  }

  if (room.game_phase === "round_5") {
    const round5 = await getClpRound5State(code, playerToken);

    if (!round5) {
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
        round5,
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
        round5,
      });
    }
  }

  if (room.game_phase === "round_4") {
    const round4 = await getClpRound4State(code);

    if (!round4) {
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
        round4,
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
        round4,
      });
    }
  }

  if (room.game_phase === "round_3") {
    const round3 = await getClpRound3State(code);

    if (!round3) {
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
        round3,
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
        round3,
      });
    }
  }

  if (room.game_phase === "round_2") {
    const round2 = await getClpRound2State(code);

    if (!round2) {
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
        round2,
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
        round2,
      });
    }
  }

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

    if (action === "round2Prediction") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const event = await submitClpRound2Prediction(
        code,
        playerToken,
        String(body.answer ?? ""),
      );

      return NextResponse.json({ ok: true, event });
    }

    if (action === "round2Next") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await nextClpRound2Question(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    if (action === "round3Ranking") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const ranking = Array.isArray(body.ranking)
        ? body.ranking.map((item: unknown) => String(item))
        : [];

      const event = await submitClpRound3Ranking(code, playerToken, ranking);
      return NextResponse.json({ ok: true, event });
    }

    if (action === "round3Next") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await nextClpRound3Question(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    if (action === "round4Prediction") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const event = await submitClpRound4Prediction(
        code,
        playerToken,
        String(body.answer ?? ""),
      );

      return NextResponse.json({ ok: true, event });
    }

    if (action === "round4Next") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await nextClpRound4Question(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    if (action === "round5Vote") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const event = await submitClpRound5Vote(
        code,
        playerToken,
        String(body.targetPlayerId ?? ""),
      );

      return NextResponse.json({ ok: true, event });
    }

    if (action === "round5Prediction") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const event = await submitClpRound5Prediction(
        code,
        playerToken,
        String(body.targetPlayerId ?? ""),
      );

      return NextResponse.json({ ok: true, event });
    }

    if (action === "round5Next") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await nextClpRound5Question(code, hostToken);
      return NextResponse.json({ ok: Boolean(phase), phase });
    }

    if (action === "round6Prediction") {
      const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

      if (!playerToken) {
        return NextResponse.json({ error: "Brak sesji gracza." }, { status: 401 });
      }

      const predictedCount = Number(body.count);
      const event = await submitClpRound6Prediction(
        code,
        playerToken,
        predictedCount,
      );

      return NextResponse.json({ ok: true, event });
    }

    if (action === "round6Next") {
      const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;

      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może przejść dalej." }, { status: 403 });
      }

      const phase = await nextClpRound6Question(code, hostToken);
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
          : raw.includes("Prediction already locked")
            ? "Wasza drużyna już zablokowała odpowiedź."
            : raw.includes("Question closed")
              ? "Typowanie jest już zakończone."
              : raw.includes("Invalid prediction")
                ? "Wybierz jedną z dostępnych odpowiedzi."
                : raw.includes("Cannot vote self")
                  ? "Nie możesz zagłosować na siebie."
                  : raw.includes("Vote already locked")
                    ? "Twój głos jest już zapisany."
                    : raw.includes("Voting closed")
                      ? "Głosowanie jest już zakończone."
                      : raw.includes("Predictions closed")
                        ? "Przewidywanie jest już zakończone."
                        : raw.includes("Ranking already locked")
                          ? "Wasza drużyna już zatwierdziła ranking."
                  : raw.includes("Invalid ranking")
                    ? "Ułóż wszystkie 5 odpowiedzi bez powtórzeń."
                    : raw.includes("Invalid count")
                      ? "Wybierz liczbę od 0 do liczby graczy."
                      : raw.includes("Invalid guess")
                        ? "Wpisz krótką odpowiedź."
                        : "Nie udało się wykonać akcji.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
