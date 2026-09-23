import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";
import LobbyClient from "./lobby-client";

const GAME_LABELS: Record<string, string> = {
  "co-ludzie-powiedza": "CO LUDZIE POWIEDZĄ",
  "zakrecone-haslo": "ZAKRĘCONE HASŁO",
  "pod-przykrywka": "POD PRZYKRYWKĄ",
  "akta-nocy": "AKTA NOCY",
  "tylko-my": "TYLKO MY",
  "va-banque": "VA BANQUE",
  "szyfr": "SZYFR",
};

const GAME_LOBBY: Record<string, { theme: string; title: string; copy: string }> = {
  "co-ludzie-powiedza": {
    theme: "room-theme-survey",
    title: "Zbierz ekipę i zaczynamy.",
    copy: "Gdy wszyscy będą gotowi, dzielicie się na drużyny i rusza teleturniej.",
  },
  "zakrecone-haslo": {
    theme: "room-theme-wheel",
    title: "Koło czeka na graczy.",
    copy: "Dołączcie tym samym kodem. Gdy wszyscy będą gotowi, gra ruszy automatycznie.",
  },
  "pod-przykrywka": {
    theme: "room-theme-undercover",
    title: "Zbierzcie ekipę. Nie ufajcie nikomu.",
    copy: "Po starcie każdy dostanie prywatne informacje. Nie pokazujcie swoich ekranów innym.",
  },
  "akta-nocy": {
    theme: "room-theme-akta",
    title: "Zbierz świadków. Otwieramy akta.",
    copy: "Po starcie każdy otrzyma tajną postać i własne informacje. Prowadzący rozpocznie sprawę, gdy wszyscy będą gotowi.",
  },
  "tylko-my": {
    theme: "room-theme-duo",
    title: "Tylko Wy. I żadnego podglądania.",
    copy: "Każde z Was gra na swoim telefonie. Nie potrzebujecie telewizora ani wspólnego ekranu. Odpowiedzi są prywatne do momentu, aż oboje je zatwierdzicie.",
  },
  "va-banque": {
    theme: "room-theme-va-banque",
    title: "Stół gotowy. Zbieramy graczy.",
    copy: "Każdy gra na swoim telefonie. Stawki pozostają prywatne aż do końca licytacji, a host rozpoczyna grę, gdy wszyscy są gotowi.",
  },
  "szyfr": {
    theme: "room-theme-szyfr",
    title: "Zespół operacyjny prawie gotowy.",
    copy: "Każdy potrzebuje własnego telefonu. Nie pokazujcie sobie ekranów. Możecie mówić o wszystkim, co widzicie.",
  },
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

  const lobby = GAME_LOBBY[room.game_slug] ?? {
    theme: "",
    title: "Zbierz ekipę i zaczynamy.",
    copy: "Każdy wpisuje ten sam kod na stronie głównej platformy. Uczestnicy pojawiają się tutaj automatycznie.",
  };

  return (
    <main className={`room-shell room-shell-live ${lobby.theme}`}>
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
          {room.game_slug === "akta-nocy" && (
            <span className="akta-lobby-case">SPRAWA 001 · APARTAMENT 214 · POUFNE</span>
          )}
          <h1>{lobby.title}</h1>
          <p>{lobby.copy}</p>
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
