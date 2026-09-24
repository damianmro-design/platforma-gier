import { NextResponse } from "next/server";
import { readJsonObjectLimited } from "@/lib/request-guards.mjs";
import { getPartyPlayUserFromAccessToken } from "@/lib/partyplay-auth";
import {
  assignPlatformTeams,
  configureAktaNocyRoom,
  createPlatformRoom,
  prepareTestRoom,
} from "@/lib/platform-db";

const TESTER_EMAIL = "damian.mro@wp.pl";

const BOT_COUNTS: Record<string, number> = {
  "co-ludzie-powiedza": 4,
  "zakrecone-haslo": 3,
  "pod-przykrywka": 6,
  "akta-nocy": 5,
  "tylko-my": 2,
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const user = await getPartyPlayUserFromAccessToken(accessToken);

  if (!user || user.email?.toLowerCase() !== TESTER_EMAIL) {
    return NextResponse.json({ error: "Tryb testowy nie jest dostępny na tym koncie." }, { status: 403 });
  }

  const parsed = await readJsonObjectLimited(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.body;
  const gameSlug = String(body.gameSlug ?? "").trim();
  const botCount = BOT_COUNTS[gameSlug];
  const aktaCase = String(body.aktaCase ?? "apartament-214") === "ostatni-kurs"
    ? "ostatni-kurs"
    : "apartament-214";
  const aktaMode = String(body.aktaMode ?? "host") === "auto" ? "auto" : "host";

  if (botCount == null) {
    return NextResponse.json({ error: "Ta gra nie obsługuje jeszcze trybu testowego." }, { status: 400 });
  }

  try {
    const room = await createPlatformRoom(gameSlug);

    if (gameSlug === "akta-nocy") {
      const configured = await configureAktaNocyRoom(
        room.code,
        room.host_token,
        aktaCase,
        aktaMode,
      );
      if (!configured) {
        return NextResponse.json({ error: "Nie udało się skonfigurować sprawy testowej." }, { status: 500 });
      }
    }

    const prepared = await prepareTestRoom(room.code, room.host_token, botCount);

    if (!prepared) {
      return NextResponse.json({ error: "Nie udało się przygotować pokoju testowego." }, { status: 500 });
    }

    if (gameSlug === "co-ludzie-powiedza") {
      const teamsReady = await assignPlatformTeams(room.code, room.host_token);
      if (!teamsReady) {
        return NextResponse.json({ error: "Nie udało się przygotować drużyn testowych." }, { status: 500 });
      }
    }

    const response = NextResponse.json({ ok: true, code: room.code });
    response.cookies.set(`partyplay_host_${room.code}`, room.host_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    response.cookies.set(`zagraj_test_view_${room.code}`, "host", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Nie udało się utworzyć rozgrywki testowej." }, { status: 500 });
  }
}
