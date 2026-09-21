import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPartyPlayUserFromAccessToken } from "@/lib/partyplay-auth";
import {
  assignPlatformTeams,
  getPlatformPlayer,
  getPlatformRecoveryCode,
  joinPlatformRoom,
  joinPlatformRoomAccount,
  recoverPlatformPlayer,
  listPlatformLobby,
  lookupPlatformRoom,
  setPlatformPlayerReady,
  startPlatformRoom,
} from "@/lib/platform-db";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function cookieNames(code: string) {
  return {
    host: `partyplay_host_${code}`,
    player: `partyplay_player_${code}`,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);

  const room = await lookupPlatformRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Pokój nie istnieje." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const names = cookieNames(code);
  const hostToken = cookieStore.get(names.host)?.value ?? null;
  const playerToken = cookieStore.get(names.player)?.value ?? null;

  const [players, currentPlayer, recoveryCode] = await Promise.all([
    listPlatformLobby(code),
    playerToken ? getPlatformPlayer(code, playerToken) : Promise.resolve(null),
    playerToken ? getPlatformRecoveryCode(code, playerToken) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    room: {
      code: room.code,
      gameSlug: room.game_slug,
      status: room.status,
    },
    players,
    currentPlayerId: currentPlayer?.id ?? null,
    recoveryCode,
    isHost: Boolean(hostToken),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const cookieStore = await cookies();
  const names = cookieNames(code);

  try {
    if (action === "join") {
      const existingToken = cookieStore.get(names.player)?.value;

      if (existingToken) {
        const existingPlayer = await getPlatformPlayer(code, existingToken);
        if (existingPlayer) {
          return NextResponse.json({ ok: true, player: existingPlayer });
        }
      }

      const name = String(body.name ?? "").trim().slice(0, 20);
      const avatar = String(body.avatar ?? "");
      const partyPlayAccessToken = String(body.partyPlayAccessToken ?? "").trim();
      const partyPlayUser = partyPlayAccessToken
        ? await getPartyPlayUserFromAccessToken(partyPlayAccessToken)
        : null;

      const player = partyPlayUser
        ? await joinPlatformRoomAccount(code, name, avatar, partyPlayUser.id)
        : await joinPlatformRoom(code, name, avatar);

      const response = NextResponse.json({ ok: true, player });
      response.cookies.set(names.player, player.player_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return response;
    }

    if (action === "recover") {
      const name = String(body.name ?? "").trim().slice(0, 20);
      const recoveryCode = String(body.recoveryCode ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);

      if (!name || recoveryCode.length !== 6) {
        return NextResponse.json(
          { error: "Wpisz imię i 6-znakowy kod powrotu." },
          { status: 400 },
        );
      }

      const player = await recoverPlatformPlayer(code, name, recoveryCode);
      if (!player) {
        return NextResponse.json(
          { error: "Nie znaleziono gracza z takim imieniem i kodem powrotu." },
          { status: 404 },
        );
      }

      const response = NextResponse.json({ ok: true, player });
      response.cookies.set(names.player, player.player_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return response;
    }

    if (action === "ready") {
      const playerToken = cookieStore.get(names.player)?.value;
      if (!playerToken) {
        return NextResponse.json({ error: "Najpierw dołącz do pokoju." }, { status: 401 });
      }

      const ok = await setPlatformPlayerReady(code, playerToken, Boolean(body.ready));
      return NextResponse.json({ ok });
    }

    if (action === "shuffle") {
      const hostToken = cookieStore.get(names.host)?.value;
      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może losować drużyny." }, { status: 403 });
      }

      const ok = await assignPlatformTeams(code, hostToken);
      if (!ok) {
        return NextResponse.json({ error: "Nie udało się podzielić drużyn." }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "start") {
      const hostToken = cookieStore.get(names.host)?.value;
      if (!hostToken) {
        return NextResponse.json({ error: "Tylko host może rozpocząć grę." }, { status: 403 });
      }

      const room = await lookupPlatformRoom(code);
      const ok = await startPlatformRoom(code, hostToken);
      if (!ok) {
        const message =
          room?.game_slug === "zakrecone-haslo"
            ? "Do startu potrzeba 3–12 graczy i wszyscy muszą być gotowi."
            : room?.game_slug === "akta-nocy"
              ? "Do startu Akt Nocy potrzeba 5–12 graczy i wszyscy muszą być gotowi."
              : "Do startu potrzeba min. 4 graczy, wszyscy muszą być gotowi i mieć drużynę.";

        return NextResponse.json({ error: message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Nieznany błąd.";
    const message = rawMessage.includes("PartyPlay account already joined")
      ? "To konto PartyPlay jest już używane przez gracza w tym pokoju."
      : rawMessage.includes("Name already taken")
        ? "Ta nazwa jest już zajęta w tym pokoju."
      : rawMessage.includes("Room is full")
        ? "Pokój jest pełny."
        : rawMessage.includes("Invalid name")
          ? "Wpisz imię od 1 do 20 znaków."
          : "Nie udało się wykonać tej akcji.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
