import { cleanRoomCode } from "@/lib/room-code.mjs";
import { notFound, redirect } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";
import GameClient from "@/app/gra/zakrecone-haslo/[code]/game-client";

type DisplayPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ZakreconeHasloDisplayPage({ params }: DisplayPageProps) {
  const { code: rawCode } = await params;
  const code = cleanRoomCode(rawCode);
  if (!code) notFound();

  const room = await lookupPlatformRoom(code);
  if (!room || room.game_slug !== "zakrecone-haslo") notFound();

  if (room.status === "lobby") {
    redirect(`/pokoj/${code}`);
  }

  return <GameClient code={code} displayMode />;
}
