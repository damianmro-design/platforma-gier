import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAktaNocyRoomConfig, lookupPlatformRoom } from "@/lib/platform-db";
import GameClient from "./game-client";
import OstatniKursClient from "./ostatni-kurs-client";

type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function AktaNocyRoomPage({ params }: RoomPageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const [room, config] = await Promise.all([
    lookupPlatformRoom(code),
    getAktaNocyRoomConfig(code),
  ]);

  if (!room || room.game_slug !== "akta-nocy") {
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

  if (config?.case_key === "ostatni-kurs") {
    return <OstatniKursClient code={code} />;
  }

  return <GameClient code={code} />;
}
