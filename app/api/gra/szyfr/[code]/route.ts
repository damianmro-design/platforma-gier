import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPlatformPlayer, isPlatformRoomHost, lookupPlatformRoom } from "@/lib/platform-db";
import {
  getSzyfrState,
  rematchSzyfr,
  retrySzyfr,
  submitSzyfrAnswer,
  useSzyfrHint,
} from "@/lib/szyfr-db";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("Player not found")) return "Nie znaleziono Twojego gracza. Wróć do lobby i użyj kodu powrotu.";
  if (raw.includes("Step changed")) return "Ten etap został już rozwiązany. Synchronizujemy ekran.";
  if (raw.includes("Game closed")) return "Ta rozgrywka jest już zakończona.";
  if (raw.includes("No more hints")) return "W tym etapie wykorzystaliście już obie podpowiedzi.";
  if (raw.includes("Hint unavailable")) return "Podpowiedzi są dostępne po treningu.";
  if (raw.includes("Fragments missing")) return "Brakuje fragmentów potrzebnych do finału.";
  return "Nie udało się wykonać tej akcji.";
}

async function accessFor(code: string) {
  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  return {
    hostToken: await isPlatformRoomHost(code, hostCookie) ? hostCookie : null,
    playerToken: cookieStore.get(`partyplay_player_${code}`)?.value ?? null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);

  try {
    const room = await lookupPlatformRoom(code);
    if (!room || room.game_slug !== "szyfr") {
      return NextResponse.json({ error: "Nie znaleziono gry." }, { status: 404 });
    }

    const { hostToken, playerToken } = await accessFor(code);
    if (!hostToken && !playerToken) {
      return NextResponse.json({ error: "Brak dostępu do pokoju." }, { status: 401 });
    }

    if (playerToken) {
      const player = await getPlatformPlayer(code, playerToken);
      if (!player) {
        return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 401 });
      }
    }

    const state = await getSzyfrState(code, playerToken, hostToken);
    if (!state) {
      return NextResponse.json({ error: "Gra nie została zainicjalizowana." }, { status: 409 });
    }

    return NextResponse.json(
      {
        room: { code: room.code, status: room.status, phase: room.game_phase },
        game: state,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const { hostToken, playerToken } = await accessFor(code);

  try {
    if (action === "answer") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      const stepKey = String(body.stepKey ?? "");
      const answer = String(body.answer ?? "").slice(0, 100);
      const result = await submitSzyfrAnswer(code, playerToken, stepKey, answer);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "hint") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      const stepKey = String(body.stepKey ?? "");
      const result = await useSzyfrHint(code, playerToken, stepKey);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "retry") {
      if (!hostToken) return NextResponse.json({ error: "Tylko host może ponowić rozgrywkę." }, { status: 403 });
      const ok = await retrySzyfr(code, hostToken);
      if (!ok) return NextResponse.json({ error: "Ponowienie nie jest teraz dostępne." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "rematch") {
      if (!hostToken) return NextResponse.json({ error: "Tylko host może uruchomić nową misję." }, { status: 403 });
      const ok = await rematchSzyfr(code, hostToken);
      if (!ok) return NextResponse.json({ error: "Nowa misja nie jest teraz dostępna." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    if (raw.includes("Step changed")) {
      return NextResponse.json({
        ok: false,
        stale: true,
        message: "Etap został już rozwiązany. Synchronizujemy ekran.",
      });
    }
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}
