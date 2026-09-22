import type { Metadata } from "next";
import Link from "next/link";
import { createRoom } from "../../room-actions";

export const metadata: Metadata = {
  title: "CO LUDZIE POWIEDZĄ — zaGRAj",
  description:
    "Drużynowy teleturniej imprezowy oparty na ankietach, przewidywaniu większości i znajomości własnej ekipy.",
};

const rounds = [
  {
    no: "00",
    title: "Poznajmy tłum",
    copy: "Każdy odpowiada prywatnie na 6 krótkich pytań. Te odpowiedzi wrócą później w rundach o Waszej własnej ekipie.",
  },
  {
    no: "01",
    title: "Co powiedzieli ludzie?",
    copy: "Drużyna próbuje odkrywać odpowiedzi z tablicy. Po 2 błędach rywale dostają próbę przejęcia części puli.",
  },
  {
    no: "02",
    title: "Wasza ekipa powiedziała",
    copy: "Przewidujecie odpowiedzi osób z tego pokoju. Do 60 pkt zależy od udziału wskazanej odpowiedzi, a 40 pkt to bonus za trafienie nr 1.",
  },
  {
    no: "03",
    title: "Top 5",
    copy: "Ułóżcie 5 odpowiedzi od najpopularniejszej do najmniej popularnej. 15 pkt za każdą idealną pozycję i 25 pkt bonusu za 5/5.",
  },
  {
    no: "04",
    title: "Mniejszość",
    copy: "Wskażcie odpowiedź, którą wybrało najmniej ludzi. Najmniej popularna daje 60 pkt, 2. najmniej popularna 20 pkt.",
  },
  {
    no: "05",
    title: "Jeden z Was",
    copy: "Najpierw cała ekipa głosuje tajnie na osoby z pokoju, później drużyny przewidują wynik. 80 pkt za 1. miejsce, 30 pkt za 2.",
  },
  {
    no: "06",
    title: "Ile osób?",
    copy: "Obstawcie, ile osób z ekipy wybrało konkretną odpowiedź wcześniej. Idealne trafienie daje 70 pkt, pomyłka o 1 daje 30 pkt.",
  },
  {
    no: "07",
    title: "Pojedynek",
    copy: "5 szybkich starć. Z 2 odpowiedzi wybieracie tę popularniejszą. Każdy poprawny typ to 50 pkt.",
  },
  {
    no: "08",
    title: "Finał",
    copy: "Wynik wcześniejszych rund daje liderowi 50 pkt przewagi. Potem 5 pytań finałowych, a ostatnie liczy się ×3. Remis uruchamia dogrywkę.",
  },
];

export default function CoLudziePowiedzaPage() {
  return (
    <main className="survey-page">
      <div className="survey-glow survey-glow-one" />
      <div className="survey-glow survey-glow-two" />

      <header className="survey-nav">
        <div className="container survey-nav-row">
          <Link href="/" className="brand" aria-label="Wróć na stronę główną zaGRAj">
            <img
              src="/zagraj-logo.webp"
              alt="zaGRAj"
              style={{ height: "40px", width: "auto" }}
            />
          </Link>
          <Link href="/#gry" className="nav-cta">
            ← Wszystkie gry
          </Link>
        </div>
      </header>

      <section className="survey-hero container">
        <div className="survey-copy">
          <span className="survey-kicker">GRYWALNA BETA · TELETURNIEJ DRUŻYNOWY</span>
          <h1>
            CO LUDZIE
            <span>POWIEDZĄ?!</span>
          </h1>
          <p>
            Nie musisz znać odpowiedzi. Musisz przewidzieć ludzi. Raz próbujecie
            odgadnąć wyniki puli ankietowej, a raz odpowiedzi osób siedzących
            obok Was.
          </p>

          <div className="survey-meta">
            <span>👥 4–14 graczy</span>
            <span>⭐ najlepiej 6–10</span>
            <span>⏱ 45–75 min</span>
            <span>🏆 2 drużyny</span>
            <span>✓ bez eliminacji</span>
          </div>

          <div className="survey-actions">
            <form action={createRoom}>
              <input type="hidden" name="gameSlug" value="co-ludzie-powiedza" />
              <button type="submit">Utwórz pokój</button>
            </form>
            <a href="#jak-gramy">Zobacz zasady</a>
          </div>
        </div>

        <div className="survey-stage" aria-hidden="true">
          <div className="survey-bubble bubble-a">42%</div>
          <div className="survey-bubble bubble-b">TOP 5</div>
          <div className="survey-bubble bubble-c">?!</div>
          <div className="survey-board">
            <span>ANKIETA</span>
            <strong>Co ludzie<br />powiedzą?</strong>
            <div className="survey-answer-row"><b>1</b><i /></div>
            <div className="survey-answer-row"><b>2</b><i /></div>
            <div className="survey-answer-row"><b>3</b><i /></div>
          </div>
        </div>
      </section>

      <section className="survey-principle">
        <div className="container">
          <span>GŁÓWNA ZASADA</span>
          <h2>Nie szukasz „poprawnej wiedzy”. Próbujesz przewidzieć ludzi.</h2>
          <p>
            Część rund korzysta z przygotowanej puli ankietowej wersji beta,
            a część z odpowiedzi zebranych na początku od Waszej własnej grupy.
            Przed każdą rundą ekran przypomina jej cel i punktację.
          </p>
        </div>
      </section>

      <section className="survey-rounds container" id="jak-gramy">
        <div className="survey-section-head">
          <span>PEŁNY PRZEBIEG</span>
          <h2>Każda runda zmienia sposób myślenia</h2>
          <p>
            Gracie w tych samych drużynach do końca. Reprezentanci rotują, więc
            przy kolejnych pytaniach decyzję zatwierdzają różne osoby.
          </p>
        </div>

        <div className="round-grid">
          {rounds.map((round) => (
            <article key={round.no}>
              <span>{round.no}</span>
              <h3>{round.title}</h3>
              <p>{round.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="survey-example container">
        <div>
          <span>PRZYKŁAD</span>
          <h2>„Co ludzie najczęściej zabierają na plażę?”</h2>
          <p>
            Odpowiedzi są odsłaniane wraz z punktami. W rundach tajnych wybór
            jednej drużyny pozostaje ukryty aż do zatwierdzenia przez rywali.
          </p>
        </div>
        <div className="example-board">
          <div><b>1</b><span>RĘCZNIK</span><strong>31%</strong></div>
          <div><b>2</b><span>WODA</span><strong>19%</strong></div>
          <div><b>3</b><span>KREM SPF</span><strong>16%</strong></div>
          <div className="hidden-answer"><b>4</b><span>?????</span><strong>?</strong></div>
        </div>
      </section>

      <section className="survey-end container">
        <span>WERSJA BETA</span>
        <h2>Mechanika całej rozgrywki jest już gotowa od pokoju do zwycięzcy.</h2>
        <p>
          Obecna pula ankietowa służy do testów gry. Przed publiczną premierą
          zostanie zastąpiona większą bazą wyników zebranych od respondentów.
        </p>
        <Link href="/">Wróć do katalogu</Link>
      </section>
    </main>
  );
}
