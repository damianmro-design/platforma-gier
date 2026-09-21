"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createPlatformRoom, lookupPlatformRoom, type PlatformRoom } from "@/lib/platform-db";

const ALLOWED_GAMES = new Set(["co-ludzie-powiedza", "zakrecone-haslo", "akta-nocy"]);

function normalizeCode(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

export async function createRoom(formData: FormData) {
  const gameSlug = String(formData.get("gameSlug") ?? "").trim();

  if (!ALLOWED_GAMES.has(gameSlug)) {
    redirect("/?roomError=unsupported-game");
  }

  let room;

  try {
    room = await createPlatformRoom(gameSlug);
  } catch {
    redirect(`/gry/${gameSlug}?roomError=create-failed`);
  }

  const cookieStore = await cookies();
  cookieStore.set(`partyplay_host_${room.code}`, room.host_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect(`/pokoj/${room.code}`);
}

export async function joinRoom(formData: FormData) {
  const code = normalizeCode(formData.get("roomCode"));

  if (code.length !== 4) {
    redirect("/?roomError=invalid-code#dolacz");
  }

  let room: PlatformRoom | null;

  try {
    room = await lookupPlatformRoom(code);
  } catch {
    redirect("/?roomError=lookup-failed#dolacz");
  }

  if (!room) {
    redirect(`/?roomError=not-found&code=${encodeURIComponent(code)}#dolacz`);
  }

  redirect(`/pokoj/${room.code}`);
}
