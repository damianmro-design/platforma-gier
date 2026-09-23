import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPlatformPlayer, lookupPlatformRoom } from "@/lib/platform-db";
import {
  advanceTmQuestion,
  getTmState,
  submitTmAnswer,
  type TmDbState,
} from "@/lib/tylko-my-db";
import {
  TYLKO_MY_MAX_SCORE,
  TYLKO_MY_QUESTION_COUNT,
  getTylkoMyFinalCopy,
  getTylkoMyQuestionForRoom,
  type TmOption,
  type TmQuestion,
} from "@/lib/tylko-my";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function optionsFor(question: TmQuestion | null, state: TmDbState): TmOption[] {
  if (!question) return [];

  if (question.type === "who") {
    return [
      { value: "A", label: state.player_a_name },
      { value: "B", label: state.player_b_name },
      { value: "both", label: "Oboje tak samo" },
    ];
  }

  return question.options ?? [];
}

function resultFor(question: TmQuestion | null, state: TmDbState) {
  if (!question || !state.revealed || state.answers.length < 2) return null;

  const answerA =
    state.answers.find((answer) => answer.player_id === state.player_a_id)?.answer_value ?? null;
  const answerB =
    state.answers.find((answer) => answer.player_id === state.player_b_id)?.answer_value ?? null;
  const matched = Boolean(answerA && answerB && answerA === answerB);

  return {
    matched,
    points: matched ? question.points : 0,
    answerA,
    answerB,
  };
}

function serializeState(code: string, state: TmDbState) {
  const question = getTylkoMyQuestionForRoom(code, state.question_index);
  const options = optionsFor(question, state);
  const result = resultFor(question, state);
  const subject =
    question?.type === "predict"
      ? question.subject === "A"
        ? {
            id: state.player_a_id,
            name: state.player_a_name,
            avatar: state.player_a_avatar,
          }
        : {
            id: state.player_b_id,
            name: state.player_b_name,
            avatar: state.player_b_avatar,
          }
      : null;

  const final = state.finished
    ? {
        score: state.score,
        maxScore: TYLKO_MY_MAX_SCORE,
        percent: Math.round((state.score / TYLKO_MY_MAX_SCORE) * 100),
        ...getTylkoMyFinalCopy(state.score),
      }
    : null;

  return {
    questionIndex: state.question_index,
    questionCount: TYLKO_MY_QUESTION_COUNT,
    score: state.score,
    projectedScore: state.score + (result?.points ?? 0),
    finished: state.finished,
    playerA: {
      id: state.player_a_id,
      name: state.player_a_name,
      avatar: state.player_a_avatar,
    },
    playerB: {
      id: state.player_b_id,
      name: state.player_b_name,
      avatar: state.player_b_avatar,
    },
    viewerPlayerId: state.viewer_player_id,
    viewerAnswer: state.viewer_answer,
    answerCount: state.answer_count,
    submittedPlayerIds: state.submitted_player_ids,
    revealed: state.revealed,
    question: question
      ? {
          id: question.id,
          round: question.round,
          roundLabel: question.roundLabel,
          eyebrow: question.eyebrow,
          type: question.type,
          prompt: question.prompt,
          points: question.points,
          subject,
          options,
        }
      : null,
    result,
    final,
  };
}

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : "";

  if (raw.includes("Question locked")) return "Odpowiedzi są już odkryte.";
  if (raw.includes("Stale question")) return "To pytanie już się zmieniło. Odświeżamy ekran.";
  if (raw.includes("Waiting for answers")) return "Poczekaj, aż obie osoby odpowiedzą.";
  if (raw.includes("Player not found")) return "Nie znaleziono gracza w tym pokoju.";
  if (raw.includes("Game is finished")) return "Ta rozgrywka już się zakończyła.";
  if (raw.includes("Host access required")) return "Tylko osoba, która utworzyła pokój, może przejść dalej.";
  if (raw.includes("Invalid answer")) return "Ta odpowiedź nie pasuje do bieżącego pytania.";

  return "Nie udało się wykonać tej akcji.";
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "tylko-my") {
    return NextResponse.json({ error: "Nie znaleziono gry." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const rawHostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const rawPlayerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  const testView = cookieStore.get(`zagraj_test_view_${code}`)?.value ?? null;

  const playerToken = testView === "host" ? null : rawPlayerToken;
  const hostToken = testView === "player" ? null : rawHostToken;
  const state = await getTmState(code, playerToken, hostToken);

  if (!state) {
    return NextResponse.json({ error: "Gra nie została zainicjalizowana." }, { status: 500 });
  }

  const game = serializeState(code, state);

  if (playerToken) {
    const player = await getPlatformPlayer(code, playerToken);

    if (!player) {
      return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 401 });
    }

    return NextResponse.json({
      role: "player",
      room: { code: room.code, status: room.status, phase: room.game_phase },
      player,
      canAdvance: Boolean(rawHostToken && testView !== "player"),
      game,
    });
  }

  if (hostToken) {
    return NextResponse.json({
      role: "host",
      room: { code: room.code, status: room.status, phase: room.game_phase },
      canAdvance: true,
      game,
    });
  }

  return NextResponse.json({ error: "Brak dostępu do pokoju." }, { status: 401 });
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const cookieStore = await cookies();
  const rawHostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const rawPlayerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  const testView = cookieStore.get(`zagraj_test_view_${code}`)?.value ?? null;
  const playerToken = testView === "host" ? null : rawPlayerToken;
  const hostToken = testView === "player" ? null : rawHostToken;

  try {
    if (action === "answer") {
      if (!playerToken) {
        return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      }

      const state = await getTmState(code, playerToken, hostToken);
      if (!state || state.finished) {
        return NextResponse.json({ error: "Gra nie jest aktywna." }, { status: 400 });
      }

      const question = getTylkoMyQuestionForRoom(code, state.question_index);
      if (!question) {
        return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 400 });
      }

      const questionIndex = Number(body.questionIndex);
      if (questionIndex !== state.question_index) {
        return NextResponse.json({ error: "To pytanie już się zmieniło." }, { status: 409 });
      }

      const answerValue = String(body.answer ?? "").trim();
      const allowed = new Set(optionsFor(question, state).map((item) => item.value));

      if (!allowed.has(answerValue)) {
        return NextResponse.json({ error: "Wybierz jedną z dostępnych odpowiedzi." }, { status: 400 });
      }

      await submitTmAnswer(code, playerToken, state.question_index, answerValue);
      return NextResponse.json({ ok: true });
    }

    if (action === "next") {
      if (!hostToken) {
        return NextResponse.json(
          { error: "Tylko osoba, która utworzyła pokój, może przejść dalej." },
          { status: 403 },
        );
      }

      const state = await getTmState(code, null, hostToken);
      if (!state || state.finished) {
        return NextResponse.json({ error: "Gra nie jest aktywna." }, { status: 400 });
      }

      const question = getTylkoMyQuestionForRoom(code, state.question_index);
      const result = resultFor(question, state);

      if (!question || !result) {
        return NextResponse.json({ error: "Poczekaj, aż obie osoby odpowiedzą." }, { status: 400 });
      }

      const nextIndex = await advanceTmQuestion(
        code,
        hostToken,
        state.question_index,
        result.points,
        TYLKO_MY_QUESTION_COUNT,
      );

      return NextResponse.json({ ok: true, questionIndex: nextIndex });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}
