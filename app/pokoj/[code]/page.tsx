import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";
import LobbyClient from "./lobby-client";
import RoomInvite from "./room-invite";
import { getPlatformGameConfig } from "@/lib/game-config";

const GAME_LABELS: Record<string, string> = {
  "co-ludzie-powiedza": "CO LUDZIE POWIEDZĄ",
  "zakrecone-haslo": "ZAKRĘCONE HASŁO",
  "akta-nocy": "AKTA NOCY",
  "pod-przykrywka": "POD PRZYKRYWKĄ",
};

type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();

  let room;

  try {
    room = await lookupPlatformRoom(code);
  } catch {
    return (
      <main className="room-shell">
        <section className="room-card">
          <span className="room-kicker">POKÓJ NIEDOSTĘPNY</span>
          <h1>Nie udało się połączyć z pokojem.</h1>
          <p className="room-copy">Spróbuj ponownie albo wróć na stronę główną.</p>
          <Link href="/">Wróć do platformy</Link>
        </section>
      </main>
    );
  }

  if (!room) {
    notFound();
  }

  const config = getPlatformGameConfig(room.game_slug);

  return (
    <main className="room-shell room-shell-live">
      <div className="room-live-container">
        <header className="room-live-header">
          <div>
            <span className="room-kicker">POCZEKALNIA</span>
            <p>{GAME_LABELS[room.game_slug] ?? room.game_slug}</p>
          </div>

          <div className="compact-room-code">
            <small>KOD POKOJU</small>
            <strong>{room.code}</strong>
          </div>
        </header>

        <section className="room-live-title">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-300">
              {config?.requiresHost ? "🎙 Wymagany prowadzący" : "⚡ Bez prowadzącego"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500">
              📱 Telefony graczy
            </span>
          </div>
          <h1>Zbierz ekipę i zaczynamy.</h1>
          <p>
            Najszybciej dołączyć przez kod QR lub link. Kod pokoju nadal działa
            jako zapasowa metoda wejścia.
          </p>
        </section>

        <RoomInvite code={room.code} />

        <LobbyClient code={room.code} />

        <footer className="room-live-footer">
          <Link href="/">← Wróć do katalogu</Link>
          <span>Pokój wygasa automatycznie po 12 godzinach</span>
        </footer>
      </div>
    </main>
  );
}
