import { cleanRoomCode } from "@/lib/room-code.mjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isPlatformRoomHost, lookupPlatformRoom } from "@/lib/platform-db";
import {
  claimVaBanqueTakeover,
  getVaBanqueState,
  rematchVaBanque,
  submitVaBanqueAnswer,
  submitVaBanqueBid,
  submitVaBanqueFinalAnswer,
  submitVaBanqueFinalBid,
  submitVaBanqueTieBid,
} from "@/lib/va-banque-db";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : "";

  if (raw.includes("Bidding closed")) return "Licytacja już się zakończyła.";
  if (raw.includes("Tie bidding closed")) return "Dogrywka licytacji już się zakończyła.";
  if (raw.includes("Bid already locked")) return "Twoja stawka została już zatwierdzona.";
  if (raw.includes("Invalid bid")) return "Ta stawka nie mieści się w dozwolonym zakresie.";
  if (raw.includes("Invalid tie bid")) return "W dogrywce musisz podbić poprzednią najwyższą stawkę albo spasować.";
  if (raw.includes("Not in tie")) return "Nie bierzesz udziału w tej dogrywce.";
  if (raw.includes("Not your question")) return "To pytanie należy teraz do innego gracza.";
  if (raw.includes("Answer already locked")) return "Odpowiedź została już zatwierdzona.";
  if (raw.includes("Invalid answer")) return "Wybierz jedną z 4 odpowiedzi.";
  if (raw.includes("Final bidding closed")) return "Stawki finałowe są już zamknięte.";
  if (raw.includes("Final answer closed")) return "Czas na odpowiedź finałową już minął.";
  if (raw.includes("Player not found")) return "Nie znaleziono Twojego gracza. Użyj kodu powrotu.";
  return "Nie udało się wykonać tej akcji.";
}

async function accessFor(code: string) {
  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const hostToken = await isPlatformRoomHost(code, hostCookie) ? hostCookie : null;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  return { hostToken, playerToken };
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanRoomCode(rawCode);

  try {
    const room = await lookupPlatformRoom(code);
    if (!room || room.game_slug !== "va-banque") {
      return NextResponse.json({ error: "Nie znaleziono gry." }, { status: 404 });
    }

    const { hostToken, playerToken } = await accessFor(code);
    if (!hostToken && !playerToken) {
      return NextResponse.json({ error: "Brak dostępu do pokoju." }, { status: 401 });
    }

    const state = await getVaBanqueState(code, playerToken, hostToken);
    if (!state) {
      return NextResponse.json({ error: "Gra nie została zainicjalizowana." }, { status: 409 });
    }

    return NextResponse.json(
      {
        room: { code: room.code, status: room.status, phase: room.game_phase },
        game: state,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanRoomCode(rawCode);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const { hostToken, playerToken } = await accessFor(code);

  try {
    if (action === "bid") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      await submitVaBanqueBid(code, playerToken, Math.trunc(Number(body.bid ?? 0)));
      return NextResponse.json({ ok: true });
    }

    if (action === "tieBid") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      await submitVaBanqueTieBid(code, playerToken, Math.trunc(Number(body.bid ?? 0)));
      return NextResponse.json({ ok: true });
    }

    if (action === "answer") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      await submitVaBanqueAnswer(code, playerToken, Math.trunc(Number(body.answerIndex)));
      return NextResponse.json({ ok: true });
    }

    if (action === "takeover") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      const result = await claimVaBanqueTakeover(code, playerToken);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "finalBid") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      await submitVaBanqueFinalBid(code, playerToken, Math.trunc(Number(body.bid ?? 0)));
      return NextResponse.json({ ok: true });
    }

    if (action === "finalAnswer") {
      if (!playerToken) return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
      await submitVaBanqueFinalAnswer(code, playerToken, Math.trunc(Number(body.answerIndex)));
      return NextResponse.json({ ok: true });
    }

    if (action === "rematch") {
      if (!hostToken) {
        return NextResponse.json({ error: "Tylko osoba, która utworzyła pokój, może uruchomić rewanż." }, { status: 403 });
      }
      const ok = await rematchVaBanque(code, hostToken);
      if (!ok) return NextResponse.json({ error: "Rewanż nie jest jeszcze dostępny." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}
