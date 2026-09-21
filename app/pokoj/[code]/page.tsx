import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";

const GAME_LABELS: Record<string, string> = {
  "co-ludzie-powiedza": "CO LUDZIE POWIEDZĄ",
};

type RoomPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ host?: string | string[] }>;
};

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { code: rawCode } = await params;
  const query = await searchParams;
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
          <p>Spróbuj ponownie za chwilę albo wróć na stronę główną.</p>
          <Link href="/">Wróć do platformy</Link>
        </section>
      </main>
    );
  }

  if (!room) {
    notFound();
  }

  const isHost = Array.isArray(query.host)
    ? query.host[0] === "1"
    : query.host === "1";

  return (
    <main className="room-shell">
      <section className="room-card">
        <span className="room-kicker">
          {isHost ? "POKÓJ UTWORZONY" : "DOŁĄCZONO DO POKOJU"}
        </span>

        <div className="room-code" aria-label={`Kod pokoju ${room.code}`}>
          {room.code.split("").map((character, index) => (
            <span key={`${character}-${index}`}>{character}</span>
          ))}
        </div>

        <p className="room-game-label">Gracie w</p>
        <h1>{GAME_LABELS[room.game_slug] ?? room.game_slug}</h1>

        <div className="room-status">
          <i />
          Poczekalnia
        </div>

        <p className="room-copy">
          {isHost
            ? "Udostępnij kod pozostałym osobom. W kolejnym etapie dodamy listę graczy, avatary, drużyny i przycisk rozpoczęcia gry."
            : "Jesteś w pokoju. W kolejnym etapie pojawi się tutaj wybór imienia i avatara oraz lista pozostałych uczestników."}
        </p>

        <div className="room-next">
          <strong>Następny moduł</strong>
          <span>gracze → avatary → drużyny → start</span>
        </div>

        <Link href="/">Wróć do platformy</Link>
      </section>
    </main>
  );
}
