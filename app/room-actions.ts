"use server";

import { redirect } from "next/navigation";
import { createPlatformRoom, lookupPlatformRoom } from "@/lib/platform-db";

const ALLOWED_GAMES = new Set(["co-ludzie-powiedza"]);

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

  try {
    const room = await createPlatformRoom(gameSlug);
    redirect(`/pokoj/${room.code}?host=1`);
  } catch {
    redirect(`/gry/${gameSlug}?roomError=create-failed`);
  }
}

export async function joinRoom(formData: FormData) {
  const code = normalizeCode(formData.get("roomCode"));

  if (code.length !== 4) {
    redirect("/?roomError=invalid-code#dolacz");
  }

  try {
    const room = await lookupPlatformRoom(code);

    if (!room) {
      redirect(`/?roomError=not-found&code=${encodeURIComponent(code)}#dolacz`);
    }

    redirect(`/pokoj/${room.code}`);
  } catch {
    redirect("/?roomError=lookup-failed#dolacz");
  }
}
