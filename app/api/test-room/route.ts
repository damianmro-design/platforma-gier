import { NextResponse } from "next/server";
import { getPartyPlayUserFromAccessToken } from "@/lib/partyplay-auth";
import {
  createPlatformRoom,
  prepareTestRoom,
} from "@/lib/platform-db";

const TESTER_EMAIL = "damian.mro@wp.pl";

const BOT_COUNTS: Record<string, number> = {
  "co-ludzie-powiedza": 3,
  "zakrecone-haslo": 2,
  "pod-przykrywka": 5,
  "akta-nocy": 4,
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const user = await getPartyPlayUserFromAccessToken(accessToken);

  if (!user || user.email?.toLowerCase() !== TESTER_EMAIL) {
    return NextResponse.json({ error: "Tryb testowy nie jest dostępny na tym koncie." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const gameSlug = String(body.gameSlug ?? "").trim();
  const botCount = BOT_COUNTS[gameSlug];

  if (botCount == null) {
    return NextResponse.json({ error: "Ta gra nie obsługuje jeszcze trybu testowego." }, { status: 400 });
  }

  try {
    const room = await createPlatformRoom(gameSlug);
    const prepared = await prepareTestRoom(room.code, room.host_token, botCount);

    if (!prepared) {
      return NextResponse.json({ error: "Nie udało się przygotować pokoju testowego." }, { status: 500 });
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
