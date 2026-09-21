import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  advancePpPhase,
  getPlatformPlayer,
  getPpState,
  lookupPlatformRoom,
  submitPpAnswer,
  submitPpVote,
} from "@/lib/platform-db";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("Waiting for answers")) return "Czekamy jeszcze na odpowiedzi wszystkich graczy.";
  if (raw.includes("Waiting for votes")) return "Czekamy jeszcze na głosy wszystkich graczy.";
  if (raw.includes("Cannot vote self")) return "Nie możesz zagłosować na siebie.";
  if (raw.includes("Invalid answer")) return "Odpowiedź musi mieć od 1 do 120 znaków.";
  if (raw.includes("Not answer phase")) return "Teraz nie można już zmienić odpowiedzi.";
  if (raw.includes("Not vote phase")) return "Teraz nie trwa głosowanie.";
  return "Nie udało się wykonać tej akcji.";
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "pod-przykrywka") {
    return NextResponse.json({ error: "Nie znaleziono gry." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;

  if (hostToken) {
    const game = await getPpState(code);
    if (!game) {
      return NextResponse.json({ error: "Gra nie została zainicjalizowana." }, { status: 500 });
    }
    return NextResponse.json({
      role: "host",
      room: { code: room.code, status: room.status, phase: room.game_phase },
      game,
    });
  }

  if (playerToken) {
    const player = await getPlatformPlayer(code, playerToken);
    if (!player) {
      return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 401 });
    }

    const game = await getPpState(code, playerToken);
    if (!game) {
      return NextResponse.json({ error: "Gra nie została zainicjalizowana." }, { status: 500 });
    }

    return NextResponse.json({
      role: "player",
      room: { code: room.code, status: room.status, phase: room.game_phase },
      player,
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
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;

  try {
    if (action === "advance") {
      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może sterować przebiegiem gry." }, { status: 403 });
      }
      const phase = await advancePpPhase(code, hostToken);
      return NextResponse.json({ ok: true, phase });
    }

    if (!playerToken) {
      return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
    }

    if (action === "answer") {
      const answer = String(body.answer ?? "").trim().slice(0, 120);
      await submitPpAnswer(code, playerToken, answer);
      return NextResponse.json({ ok: true });
    }

    if (action === "vote") {
      const targetPlayerId = String(body.targetPlayerId ?? "").trim();
      const voteType = String(body.voteType ?? "").trim();
      if (!targetPlayerId || !["suspicion", "final"].includes(voteType)) {
        return NextResponse.json({ error: "Nieprawidłowy głos." }, { status: 400 });
      }
      await submitPpVote(code, playerToken, targetPlayerId, voteType as "suspicion" | "final");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}
