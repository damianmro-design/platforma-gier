"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  configureAktaNocyRoom,
  createPlatformRoom,
  lookupPlatformRoom,
  type PlatformRoom,
} from "@/lib/platform-db";

const ALLOWED_GAMES = new Set(["co-ludzie-powiedza", "zakrecone-haslo", "pod-przykrywka", "akta-nocy", "tylko-my", "va-banque", "szyfr"]);

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

    if (gameSlug === "akta-nocy") {
      const rawCase = String(formData.get("aktaCase") ?? "apartament-214").trim();
      const rawMode = String(formData.get("aktaMode") ?? "host").trim();
      const caseKey = rawCase === "ostatni-kurs" ? "ostatni-kurs" : "apartament-214";
      const playMode = rawMode === "auto" ? "auto" : "host";

      const configured = await configureAktaNocyRoom(
        room.code,
        room.host_token,
        caseKey,
        playMode,
      );

      if (!configured) {
        throw new Error("Nie udało się skonfigurować sprawy Akta Nocy.");
      }
    }
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
  const rawReturnPath = String(formData.get("returnPath") ?? "").trim();
  const returnPath = ["/gry/tylko-my", "/gry/va-banque", "/gry/szyfr"].includes(rawReturnPath)
    ? rawReturnPath
    : "/";

  const errorTarget = (error: string, extra = "") =>
    `${returnPath}?roomError=${error}${extra}#dolacz`;

  if (code.length !== 4) {
    redirect(errorTarget("invalid-code"));
  }

  let room: PlatformRoom | null;

  try {
    room = await lookupPlatformRoom(code);
  } catch {
    redirect(errorTarget("lookup-failed"));
  }

  if (!room) {
    redirect(errorTarget("not-found", `&code=${encodeURIComponent(code)}`));
  }

  redirect(`/pokoj/${room.code}`);
}
