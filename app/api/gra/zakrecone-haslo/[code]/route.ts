import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getPlatformPlayer,
  getZhState,
  lookupPlatformRoom,
  nextZhRound,
  spinZh,
  submitZhLetter,
  submitZhSolve,
  submitZhVowel,
} from "@/lib/platform-db";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : "";

  if (raw.includes("Not your turn")) return "Teraz gra inna osoba.";
  if (raw.includes("Letter already used")) return "Ta litera była już użyta.";
  if (raw.includes("Choose a consonant")) return "Wybierz spółgłoskę.";
  if (raw.includes("Choose a vowel")) return "Wybierz samogłoskę.";
  if (raw.includes("Not enough points")) return "Potrzebujesz 200 pkt z tej rundy, aby kupić samogłoskę.";
  if (raw.includes("Cannot solve now")) return "Teraz nie możesz podać hasła.";
  if (raw.includes("Letter cannot be selected now")) return "Najpierw zakręć kołem.";
  if (raw.includes("Vowel cannot be bought now")) return "Samogłoskę kupujesz przed zakręceniem kołem.";
  if (raw.includes("Round is not over")) return "Ta runda jeszcze trwa.";

  return "Nie udało się wykonać tej akcji.";
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "zakrecone-haslo") {
    return NextResponse.json({ error: "Nie znaleziono gry." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? null;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value ?? null;
  const game = await getZhState(code);

  if (!game) {
    return NextResponse.json({ error: "Gra nie została zainicjalizowana." }, { status: 500 });
  }

  if (hostToken) {
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
    if (action === "next") {
      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host steruje przejściem dalej." }, { status: 403 });
      }

      const phase = await nextZhRound(code, hostToken);
      return NextResponse.json({ ok: true, phase });
    }

    if (!playerToken) {
      return NextResponse.json({ error: "Ta akcja wymaga gracza." }, { status: 403 });
    }

    if (action === "spin") {
      const event = await spinZh(code, playerToken);
      return NextResponse.json({ ok: true, event });
    }

    if (action === "letter") {
      const letter = String(body.letter ?? "").trim().toUpperCase();
      const event = await submitZhLetter(code, playerToken, letter);
      return NextResponse.json({ ok: true, event });
    }

    if (action === "vowel") {
      const letter = String(body.letter ?? "").trim().toUpperCase();
      const event = await submitZhVowel(code, playerToken, letter);
      return NextResponse.json({ ok: true, event });
    }

    if (action === "solve") {
      const guess = String(body.guess ?? "").trim().slice(0, 120);
      if (!guess) {
        return NextResponse.json({ error: "Wpisz całe hasło." }, { status: 400 });
      }
      const event = await submitZhSolve(code, playerToken, guess);
      return NextResponse.json({ ok: true, event });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: messageFor(error) }, { status: 400 });
  }
}
