import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getPartyPlayProfileIdentityFromAccessToken,
} from "@/lib/partyplay-auth";
import {
  AKTA_NOCY_COVERUP_OPTIONS,
  AKTA_NOCY_EVIDENCE_A,
  AKTA_NOCY_MOTIVE_OPTIONS,
  AKTA_NOCY_RECONSTRUCTION_EVENTS,
} from "@/lib/akta-nocy";
import { CLP_WARMUP_QUESTIONS } from "@/lib/co-ludzie-powiedza";
import { ZH_ALPHABET, ZH_VOWELS } from "@/lib/zakrecone-haslo";
import {
  getAktaNocyAccusationPlayer,
  getAktaNocyPlayerAssignment,
  getAktaNocyPublicCast,
  getAktaNocyReconstructionPlayer,
  getClpFinalState,
  getClpPlayerAnswers,
  getClpRound1State,
  getClpRound2State,
  getClpRound3State,
  getClpRound4State,
  getClpRound5State,
  getClpRound6State,
  getClpRound7State,
  getPpState,
  getZhState,
  lookupPlatformRoom,
  nextZhRound,
  openAktaNocyDossier,
  spinZh,
  submitAktaNocyAccusation,
  submitAktaNocyReconstruction,
  submitClpAnswer,
  submitClpFinalPrediction,
  submitClpFinalTiebreak,
  submitClpRound1Guess,
  submitClpRound2Prediction,
  submitClpRound3Ranking,
  submitClpRound4Prediction,
  submitClpRound5Prediction,
  submitClpRound5Vote,
  submitClpRound6Prediction,
  submitClpRound7Prediction,
  submitPpAnswer,
  submitPpVote,
  submitZhLetter,
} from "@/lib/platform-db";

const TEST_OWNER_EMAIL = "damian.mro@wp.pl";

type Bot = {
  id: string;
  token: string;
  name: string;
};

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function botForPlayer(bots: Bot[], playerId?: string | null) {
  return playerId ? bots.find((bot) => bot.id === playerId) ?? null : null;
}

function otherPlayerId(players: Array<{ id: string }>, ownId: string) {
  return players.find((player) => player.id !== ownId)?.id ?? "";
}

async function runClpBots(code: string, phase: string | null, bots: Bot[]) {
  if (phase === "poznajmy_tlum") {
    await Promise.all(
      bots.map(async (bot, botIndex) => {
        const existing = await getClpPlayerAnswers(code, bot.token);
        const answered = new Set(existing.map((item) => item.question_key));

        for (let index = 0; index < CLP_WARMUP_QUESTIONS.length; index += 1) {
          const question = CLP_WARMUP_QUESTIONS[index];
          if (answered.has(question.key)) continue;
          const option = question.options[(botIndex + index) % question.options.length];
          await submitClpAnswer(code, bot.token, question.key, option);
        }
      }),
    );
    return;
  }

  if (phase === "round_1") {
    const state = await getClpRound1State(code);
    const bot = botForPlayer(bots, state?.answerer?.id);
    if (!state || !bot || state.mode === "between") return;

    const guesses = [
      "pizza",
      "telefon",
      "rodzina",
      "pieniądze",
      "wakacje",
      "praca",
      "samochód",
      "dom",
    ];
    const guess =
      guesses[(state.questionIndex + state.strikes + state.board.filter((item) => item.revealed).length) % guesses.length];
    await submitClpRound1Guess(code, bot.token, guess);
    return;
  }

  if (phase === "round_2") {
    const state = await getClpRound2State(code);
    if (!state || state.mode !== "predict") return;

    for (const prediction of [state.predictionA, state.predictionB]) {
      const bot = botForPlayer(bots, prediction?.playerId);
      if (bot && prediction && !prediction.locked) {
        await submitClpRound2Prediction(
          code,
          bot.token,
          state.options[state.questionIndex % state.options.length] ?? state.options[0],
        );
      }
    }
    return;
  }

  if (phase === "round_3") {
    const state = await getClpRound3State(code);
    if (!state || state.mode !== "rank") return;

    for (const ranking of [state.rankingA, state.rankingB]) {
      const bot = botForPlayer(bots, ranking?.playerId);
      if (bot && ranking && !ranking.locked) {
        await submitClpRound3Ranking(code, bot.token, [...state.options]);
      }
    }
    return;
  }

  if (phase === "round_4") {
    const state = await getClpRound4State(code);
    if (!state || state.mode !== "pick") return;

    for (const prediction of [state.predictionA, state.predictionB]) {
      const bot = botForPlayer(bots, prediction?.playerId);
      if (bot && prediction && !prediction.locked && state.options[0]) {
        await submitClpRound4Prediction(code, bot.token, state.options[0]);
      }
    }
    return;
  }

  if (phase === "round_5") {
    const state = await getClpRound5State(code);
    if (!state) return;

    if (state.mode === "vote") {
      await Promise.all(
        bots.map(async (bot) => {
          const viewer = await getClpRound5State(code, bot.token);
          if (viewer?.viewerHasVoted) return;
          const target = otherPlayerId(state.players, bot.id);
          if (target) await submitClpRound5Vote(code, bot.token, target);
        }),
      );
      return;
    }

    if (state.mode === "predict") {
      for (const prediction of [state.predictionA, state.predictionB]) {
        const bot = botForPlayer(bots, prediction?.playerId);
        if (bot && prediction && !prediction.locked) {
          const target = otherPlayerId(state.players, bot.id);
          if (target) await submitClpRound5Prediction(code, bot.token, target);
        }
      }
    }
    return;
  }

  if (phase === "round_6") {
    const state = await getClpRound6State(code);
    if (!state || state.mode !== "predict") return;

    for (const prediction of [state.predictionA, state.predictionB]) {
      const bot = botForPlayer(bots, prediction?.playerId);
      if (bot && prediction && !prediction.locked) {
        await submitClpRound6Prediction(code, bot.token, Math.floor(state.playerCount / 2));
      }
    }
    return;
  }

  if (phase === "round_7") {
    const state = await getClpRound7State(code);
    if (!state || state.mode !== "predict") return;

    for (const prediction of [state.predictionA, state.predictionB]) {
      const bot = botForPlayer(bots, prediction?.playerId);
      if (bot && prediction && !prediction.locked) {
        await submitClpRound7Prediction(code, bot.token, state.optionA);
      }
    }
    return;
  }

  if (phase === "final") {
    const state = await getClpFinalState(code);
    if (!state) return;

    if (state.mode === "predict") {
      for (const prediction of [state.predictionA, state.predictionB]) {
        const bot = botForPlayer(bots, prediction?.playerId);
        if (bot && prediction && !prediction.locked && state.options[0]) {
          await submitClpFinalPrediction(code, bot.token, state.options[0]);
        }
      }
    } else if (state.mode === "tiebreak") {
      for (const prediction of [state.tiebreakA, state.tiebreakB]) {
        const bot = botForPlayer(bots, prediction?.playerId);
        if (bot && prediction && !prediction.locked) {
          await submitClpFinalTiebreak(code, bot.token, 50);
        }
      }
    }
  }
}

async function runPodBots(code: string, bots: Bot[]) {
  await Promise.all(
    bots.map(async (bot, botIndex) => {
      const state = await getPpState(code, bot.token);
      if (!state?.currentPlayer) return;

      if (state.phase === "mission" && !state.currentPlayer.answer) {
        const answer =
          state.mission?.responseMode === "choice"
            ? state.mission.options[botIndex % Math.max(1, state.mission.options.length)] ?? "Tak"
            : `Testowa odpowiedź BOT ${botIndex + 1}`;
        await submitPpAnswer(code, bot.token, answer);
        return;
      }

      if (
        (state.phase === "suspicion" || state.phase === "final_vote") &&
        !state.currentPlayer.voteTargetId
      ) {
        const target = state.players.find((player) => player.id !== bot.id)?.id;
        if (target) {
          await submitPpVote(
            code,
            bot.token,
            target,
            state.phase === "final_vote" ? "final" : "suspicion",
          );
        }
      }
    }),
  );
}

async function runAktaBots(code: string, phase: string | null, hostToken: string, bots: Bot[]) {
  if (phase === "akta_osobowe") {
    await Promise.all(
      bots.map(async (bot) => {
        const assignment = await getAktaNocyPlayerAssignment(code, bot.token);
        if (assignment && !assignment.dossier_opened) {
          await openAktaNocyDossier(code, bot.token);
        }
      }),
    );
    return;
  }

  if (phase !== "rekonstrukcja" && phase !== "akt_oskarzenia") return;

  const cast = await getAktaNocyPublicCast(code, hostToken);

  await Promise.all(
    bots.map(async (bot) => {
      const suspect =
        cast.find((player) => player.player_id !== bot.id)?.player_id ?? "";
      if (!suspect) return;

      if (phase === "rekonstrukcja") {
        const state = await getAktaNocyReconstructionPlayer(code, bot.token);
        if (!state?.submitted) {
          await submitAktaNocyReconstruction(
            code,
            bot.token,
            AKTA_NOCY_RECONSTRUCTION_EVENTS.slice(0, 7).map((event) => event.key),
            suspect,
            AKTA_NOCY_MOTIVE_OPTIONS[0].key,
            AKTA_NOCY_COVERUP_OPTIONS[0].key,
          );
        }
        return;
      }

      const accusation = await getAktaNocyAccusationPlayer(code, bot.token);
      if (!accusation?.submitted) {
        await submitAktaNocyAccusation(
          code,
          bot.token,
          suspect,
          AKTA_NOCY_MOTIVE_OPTIONS[0].key,
          AKTA_NOCY_EVIDENCE_A[0].id,
        );
      }
    }),
  );
}

async function runZhBots(code: string, hostToken: string, bots: Bot[]) {
  const state = await getZhState(code);
  if (!state || state.mode === "game_over") return;

  if (state.mode === "round_over") {
    await nextZhRound(code, hostToken);
    return;
  }

  const bot = botForPlayer(bots, state.activePlayerId);
  if (!bot) return;

  if (state.mode === "await_spin") {
    await spinZh(code, bot.token);
    return;
  }

  if (state.mode === "choose_letter") {
    const letter = ZH_ALPHABET.find(
      (item) => !ZH_VOWELS.has(item) && !state.usedLetters.includes(item),
    );
    if (letter) await submitZhLetter(code, bot.token, letter);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

  const token = bearerToken(request);
  const profile = token
    ? await getPartyPlayProfileIdentityFromAccessToken(token)
    : null;

  if (!profile || profile.email !== TEST_OWNER_EMAIL) {
    return NextResponse.json({ error: "Tryb testowy jest prywatny." }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (cookieStore.get(`zagraj_test_mode_${code}`)?.value !== "1") {
    return NextResponse.json({ ok: false, testMode: false }, { status: 404 });
  }

  const rawBots = cookieStore.get(`zagraj_test_bots_${code}`)?.value ?? "";
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? "";

  let bots: Bot[] = [];
  try {
    bots = JSON.parse(decodeURIComponent(rawBots)) as Bot[];
  } catch {
    return NextResponse.json({ error: "Brak danych botów." }, { status: 400 });
  }

  const room = await lookupPlatformRoom(code);
  if (!room || room.status !== "active") {
    return NextResponse.json({ ok: true, waiting: true });
  }

  try {
    if (room.game_slug === "co-ludzie-powiedza") {
      await runClpBots(code, room.game_phase ?? null, bots);
    } else if (room.game_slug === "pod-przykrywka") {
      await runPodBots(code, bots);
    } else if (room.game_slug === "akta-nocy" && hostToken) {
      await runAktaBots(code, room.game_phase ?? null, hostToken, bots);
    } else if (room.game_slug === "zakrecone-haslo" && hostToken) {
      await runZhBots(code, hostToken, bots);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bot tick failed";
    if (
      message.includes("Wheel is still spinning") ||
      message.includes("Not your turn") ||
      message.includes("already") ||
      message.includes("locked") ||
      message.includes("Waiting")
    ) {
      return NextResponse.json({ ok: true, retry: true });
    }

    console.error("zaGRAj test bot tick error:", error);
    return NextResponse.json({ ok: false, retry: true });
  }
}
