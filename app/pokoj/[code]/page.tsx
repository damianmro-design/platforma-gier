import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";
import LobbyClient from "./lobby-client";

const GAME_LABELS: Record<string, string> = {
  "co-ludzie-powiedza": "CO LUDZIE POWIEDZĄ",
  "akta-nocy": "AKTA NOCY",
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
          <h1>Zbierz ekipę i zaczynamy.</h1>
          <p>
            Każdy wpisuje ten sam kod na stronie głównej platformy. Uczestnicy
            pojawiają się tutaj automatycznie.
          </p>
        </section>

        <LobbyClient code={room.code} />

        <footer className="room-live-footer">
          <Link href="/">← Wróć do katalogu</Link>
          <span>Pokój wygasa automatycznie po 12 godzinach</span>
        </footer>
      </div>
    </main>
  );
}
