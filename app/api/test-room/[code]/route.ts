import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getTestPlayerToken,
  isPlatformTestRoomHost,
  listPlatformLobby,
} from "@/lib/platform-db";

type RouteContext = { params: Promise<{ code: string }> };

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? "";

  if (!hostToken || !(await isPlatformTestRoomHost(code, hostToken))) {
    return NextResponse.json(
      { ok: false, enabled: false, players: [], view: "host" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const players = await listPlatformLobby(code);
  const view = cookieStore.get(`zagraj_test_view_${code}`)?.value ?? "host";

  return NextResponse.json({
    ok: true,
    view,
    players: players.map((player) => ({
      id: player.id,
      displayName: player.display_name,
      avatar: player.avatar,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = cleanCode(rawCode);
  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value ?? "";

  if (!hostToken || !(await isPlatformTestRoomHost(code, hostToken))) {
    return NextResponse.json({ error: "To nie jest Twój pokój testowy." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const view = String(body.view ?? "");

  const response = NextResponse.json({ ok: true });

  if (view === "host") {
    response.cookies.set(`zagraj_test_view_${code}`, "host", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  }

  const playerId = String(body.playerId ?? "").trim();
  if (!playerId) {
    return NextResponse.json({ error: "Wybierz gracza." }, { status: 400 });
  }

  const playerToken = await getTestPlayerToken(code, hostToken, playerId);
  if (!playerToken) {
    return NextResponse.json({ error: "Nie znaleziono gracza testowego." }, { status: 404 });
  }

  response.cookies.set(`partyplay_player_${code}`, playerToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  response.cookies.set(`zagraj_test_view_${code}`, "player", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
