import { NextResponse } from "next/server";
import {
  getPartyPlayProfileIdentityFromAccessToken,
} from "@/lib/partyplay-auth";
import { getPlatformGameConfig, type PlatformGameSlug } from "@/lib/game-config";
import {
  assignPlatformTeams,
  createPlatformRoom,
  joinPlatformRoom,
  joinPlatformRoomAccount,
  setPlatformPlayerReady,
  startPlatformRoom,
} from "@/lib/platform-db";

const TEST_OWNER_EMAIL = "damian.mro@wp.pl";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  const profile = token
    ? await getPartyPlayProfileIdentityFromAccessToken(token)
    : null;

  if (!profile || profile.email !== TEST_OWNER_EMAIL) {
    return NextResponse.json({ error: "Tryb testowy jest prywatny." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const gameSlug = String(body.gameSlug ?? "") as PlatformGameSlug;
  const config = getPlatformGameConfig(gameSlug);

  if (!config) {
    return NextResponse.json({ error: "Nieznana gra." }, { status: 400 });
  }

  try {
    const room = await createPlatformRoom(gameSlug);
    const botCount = config.minPlayers - (gameSlug === "zakrecone-haslo" ? 1 : 0);
    const bots: Array<{ id: string; token: string; name: string }> = [];

    let ownerPlayerToken: string | null = null;

    if (gameSlug === "zakrecone-haslo") {
      const owner = await joinPlatformRoomAccount(
        room.code,
        profile.displayName,
        profile.avatar,
        profile.userId,
      );
      ownerPlayerToken = owner.player_token;
      await setPlatformPlayerReady(room.code, owner.player_token, true);
    }

    for (let index = 0; index < botCount; index += 1) {
      const bot = await joinPlatformRoom(
        room.code,
        `BOT ${index + 1}`,
        `avatar-0${(index % 6) + 1}`,
      );
      await setPlatformPlayerReady(room.code, bot.player_token, true);
      bots.push({
        id: bot.id,
        token: bot.player_token,
        name: bot.display_name,
      });
    }

    if (gameSlug === "co-ludzie-powiedza") {
      const assigned = await assignPlatformTeams(room.code, room.host_token);
      if (!assigned) throw new Error("Could not assign test teams");
    }

    const started = await startPlatformRoom(room.code, room.host_token);
    if (!started) throw new Error("Could not start test room");

    const response = NextResponse.json({
      ok: true,
      code: room.code,
      url: `/gra/${gameSlug}/${room.code}`,
    });

    const commonCookie = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    };

    response.cookies.set(
      `partyplay_host_${room.code}`,
      room.host_token,
      commonCookie,
    );

    if (ownerPlayerToken) {
      response.cookies.set(
        `partyplay_player_${room.code}`,
        ownerPlayerToken,
        commonCookie,
      );
    }

    response.cookies.set(
      `zagraj_test_mode_${room.code}`,
      "1",
      commonCookie,
    );
    response.cookies.set(
      `zagraj_test_bots_${room.code}`,
      encodeURIComponent(JSON.stringify(bots)),
      commonCookie,
    );

    return response;
  } catch (error) {
    console.error("Create zaGRAj test room error:", error);
    return NextResponse.json(
      { error: "Nie udało się przygotować gry testowej." },
      { status: 500 },
    );
  }
}
