import { joinRoom } from "./room-actions";

const games = [
  {
    title: "Polowanie na Milionera",
    kicker: "DUŻA GRA WIECZORU",
    description:
      "Tajne role, zadania, blef, eliminacje i milion, który może zmieniać właściciela.",
    players: "6–14",
    time: "60–120 min",
    tags: ["strategia", "reality show", "tajne role"],
    theme: "gold",
    status: "HIT",
    href: "https://polowanienamilionera.pl",
    visual: "MILION",
  },
  {
    title: "Floor Party",
    kicker: "SZYBKA ENERGIA",
    description:
      "Dynamiczna mieszanka obrazków, haseł, skojarzeń, wiedzy i imprezowych kategorii.",
    players: "4–14",
    time: "25–60 min",
    tags: ["dynamiczna", "różnorodna", "teleturniej"],
    theme: "pink",
    status: "GOTOWA",
    href: null,
    visual: "FLOOR\nPARTY",
  },
  {
    title: "CO LUDZIE POWIEDZĄ",
    kicker: "NOWY TELETURNIEJ",
    description:
      "Przewiduj najpopularniejsze odpowiedzi i sprawdź, czy naprawdę znasz swoją ekipę.",
    players: "4–14",
    time: "25–40 min",
    tags: ["ankiety", "drużynowa", "bez eliminacji"],
    theme: "yellow",
    status: "W BUDOWIE",
    href: "/gry/co-ludzie-powiedza",
    visual: "CO LUDZIE\nPOWIEDZĄ?!",
  },
  {
    title: "Pod Przykrywką",
    kicker: "DEDUKCJA I SABOTAŻ",
    description:
      "Jedna osoba działa przeciw grupie. Obserwuj, zbieraj tropy i odkryj, kto gra podwójną grę.",
    players: "6–14",
    time: "45–75 min",
    tags: ["psychologiczna", "sabotaż", "tajna rola"],
    theme: "cyan",
    status: "WKRÓTCE",
    href: null,
    visual: "POD\nPRZYKRYWKĄ",
  },
  {
    title: "Akta Nocy",
    kicker: "INTERAKTYWNE ŚLEDZTWO",
    description:
      "Role, sekrety, dowody i przesłuchania. Odtwórz przebieg zbrodni i wskaż sprawcę.",
    players: "5–12",
    time: "60–120 min",
    tags: ["murder mystery", "fabularna", "dedukcja"],
    theme: "red",
    status: "WKRÓTCE",
    href: null,
    visual: "AKTA\nNOCY",
  },
  {
    title: "Zakręcone Hasło",
    kicker: "LEKKI TELETURNIEJ",
    description:
      "Hasła, litery, koło ryzyka i zwroty akcji. Krótka gra na każdą domówkę.",
    players: "3–12",
    time: "20–35 min",
    tags: ["słowna", "szybka", "teleturniej"],
    theme: "violet",
    status: "WKRÓTCE",
    href: null,
    visual: "ZAKRĘCONE\nHASŁO",
  },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h13m-5-5 5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16 19v-1.7a3.3 3.3 0 0 0-3.3-3.3H7.3A3.3 3.3 0 0 0 4 17.3V19m15-5.2a3 3 0 0 1 2 2.8V19m-11-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.5 2.5 0 1 0 0-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 7.5V12l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grid-overlay" />

      <header className="topbar">
        <div className="container nav-row">
          <a href="#top" className="brand" aria-label="PartyPlay — strona główna">
            <span className="brand-mark">♛</span>
            <span>
              <strong>PartyPlay</strong>
              <small>nazwa robocza</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Główna nawigacja">
            <a href="#gry">Gry</a>
            <a href="#jak-dziala">Jak to działa</a>
            <a href="#wybierz">Znajdź grę</a>
          </nav>

          <a href="#gry" className="nav-cta">
            Zobacz gry
          </a>
        </div>
      </header>

      <section className="hero container" id="top">
        <div className="hero-copy">
          <span className="eyebrow">
            <i />
            Gry na wspólny wieczór
          </span>
          <h1>
            Gry imprezowe, które <em>odpalasz</em> w przeglądarce.
          </h1>
          <p className="hero-lead">
            Jeden ekran, telefony i gotowe. Teleturnieje, blef, dedukcja,
            quizy i gry, które naprawdę angażują całą ekipę.
          </p>

          <div className="hero-actions">
            <a href="#gry" className="primary-button">
              Wybierz grę <ArrowIcon />
            </a>
            <a href="#dolacz" className="secondary-button">
              Mam kod pokoju
            </a>
          </div>

          <div className="steps" id="jak-dziala">
            <article>
              <span>01</span>
              <strong>Wybierz grę</strong>
              <p>Dopasuj ją do ekipy i czasu.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Znajomi dołączają</strong>
              <p>Telefonem, bez instalowania aplikacji.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Gracie od razu</strong>
              <p>Platforma prowadzi Was przez rozgrywkę.</p>
            </article>
          </div>
        </div>

        <aside className="join-card" id="dolacz">
          <div className="join-card-head">
            <div>
              <span className="mini-label">DOŁĄCZ DO EKIPY</span>
              <h2>Masz kod pokoju?</h2>
            </div>
            <span className="spark">✦</span>
          </div>
          <p>
            Wpisz 4-znakowy kod od osoby, która utworzyła pokój. Platforma sama
            rozpozna grę i przeniesie Cię do właściwej poczekalni.
          </p>
          <form action={joinRoom} className="join-form">
            <label htmlFor="roomCode">Kod pokoju</label>
            <input
              id="roomCode"
              name="roomCode"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={4}
              required
              placeholder="4JMG"
              className="join-code-input"
            />
            <button type="submit" className="join-live-button">
              Dołącz do gry <ArrowIcon />
            </button>
          </form>
          <small>
            Jeden kod działa na poziomie całej platformy, niezależnie od tytułu.
          </small>
        </aside>
      </section>

      <section className="finder" id="wybierz">
        <div className="container finder-row">
          <div className="finder-title">
            <span>Nie wiesz?</span>
            <strong>Znajdź klimat</strong>
          </div>
          <button type="button">Jest nas 8 osób <b>⌄</b></button>
          <button type="button">Mamy 30 min <b>⌄</b></button>
          <button type="button">Chcemy się pośmiać <b>⌄</b></button>
          <a href="#gry">
            Pokaż propozycje <ArrowIcon />
          </a>
        </div>
      </section>

      <section className="games-section container" id="gry">
        <div className="section-heading">
          <div>
            <span>Biblioteka</span>
            <h2>W co dzisiaj gramy?</h2>
            <p>
              Każda gra daje inny rodzaj wieczoru. Wybierz szybką rozgrzewkę
              albo pełne show.
            </p>
          </div>
          <div className="filters" aria-label="Filtry demonstracyjne">
            <button className="active" type="button">Wszystkie</button>
            <button type="button">Śmieszne</button>
            <button type="button">Strategiczne</button>
            <button type="button">Drużynowe</button>
          </div>
        </div>

        <div className="game-grid">
          {games.map((game) => (
            <article className={`game-card theme-${game.theme}`} key={game.title}>
              <div className="game-visual">
                <span className="status">{game.status}</span>
                <div className="visual-orbit orbit-one" />
                <div className="visual-orbit orbit-two" />
                <strong>
                  {game.visual.split("\n").map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </strong>
              </div>

              <div className="game-content">
                <span className="game-kicker">{game.kicker}</span>
                <h3>{game.title}</h3>
                <p>{game.description}</p>

                <div className="game-meta">
                  <span><UsersIcon /> {game.players} graczy</span>
                  <span><ClockIcon /> {game.time}</span>
                </div>

                <div className="tags">
                  {game.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>

                {game.href ? (
                  <a className="game-cta" href={game.href}>
                    Zagraj teraz <ArrowIcon />
                  </a>
                ) : (
                  <span className="game-cta muted">Integracja w toku</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto container">
        <div>
          <span>NASZA ZASADA</span>
          <h2>Mniej patrzenia w telefon. Więcej grania ze sobą.</h2>
          <p>
            Telefon ma być kontrolerem, sekretną kartą i miejscem odpowiedzi.
            Najważniejsze rzeczy mają dziać się między ludźmi.
          </p>
        </div>
        <a href="#gry">
          Wybierz grę <ArrowIcon />
        </a>
      </section>

      <footer>
        <div className="container footer-row">
          <span><strong>PartyPlay</strong> · nazwa robocza platformy</span>
          <span>2026 · wersja 0.1</span>
        </div>
      </footer>
    </main>
  );
}
