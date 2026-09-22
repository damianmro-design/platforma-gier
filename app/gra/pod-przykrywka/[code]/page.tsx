import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";
import GameClient from "./game-client";

type GamePageProps = {
  params: Promise<{ code: string }>;
};

export default async function PodPrzykrywkaGamePage({ params }: GamePageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "pod-przykrywka") {
    notFound();
  }

  if (room.status === "lobby") {
    redirect(`/pokoj/${code}`);
  }

  const cookieStore = await cookies();
  const hostToken = cookieStore.get(`partyplay_host_${code}`)?.value;
  const playerToken = cookieStore.get(`partyplay_player_${code}`)?.value;

  if (!hostToken && !playerToken) {
    redirect(`/pokoj/${code}`);
  }

  return <GameClient code={code} />;
}
