import type { Metadata } from "next";
import Link from "next/link";
import { createRoom } from "../../room-actions";

export const metadata: Metadata = {
  title: "CO LUDZIE POWIEDZĄ — PartyPlay",
  description:
    "Drużynowy teleturniej imprezowy oparty na ankietach, przewidywaniu większości i znajomości własnej ekipy.",
};

const rounds = [
  {
    no: "01",
    title: "Co powiedzieli ludzie?",
    copy: "Odgaduj najpopularniejsze odpowiedzi z dużych ankiet i buduj pulę punktów drużyny.",
  },
  {
    no: "02",
    title: "Wasza ekipa powiedziała",
    copy: "Gra wykorzystuje odpowiedzi osób przy stole. Tu liczy się znajomość swoich ludzi.",
  },
  {
    no: "03",
    title: "Top 5",
    copy: "Ułóż odpowiedzi od najpopularniejszej do najmniej popularnej i zgarnij bonus za perfekcyjny ranking.",
  },
  {
    no: "04",
    title: "Jeden z Was",
    copy: "Przewiduj, kogo wskaże większość w pytaniach dotyczących konkretnych uczestników.",
  },
  {
    no: "05",
    title: "Finał",
    copy: "Wszyscy odpowiadają jednocześnie, a ostatnie pytanie może całkowicie odwrócić wynik.",
  },
];

export default function CoLudziePowiedzaPage() {
  return (
    <main className="survey-page">
      <div className="survey-glow survey-glow-one" />
      <div className="survey-glow survey-glow-two" />

      <header className="survey-nav">
        <div className="container survey-nav-row">
          <Link href="/" className="brand" aria-label="Wróć na stronę główną">
            <span className="brand-mark">♛</span>
            <span>
              <strong>PartyPlay</strong>
              <small>nazwa robocza</small>
            </span>
          </Link>
          <Link href="/#gry" className="nav-cta">
            ← Wszystkie gry
          </Link>
        </div>
      </header>

      <section className="survey-hero container">
        <div className="survey-copy">
          <span className="survey-kicker">NOWY TELETURNIEJ DRUŻYNOWY</span>
          <h1>
            CO LUDZIE
            <span>POWIEDZĄ?!</span>
          </h1>
          <p>
            Nie musisz znać odpowiedzi. Musisz przewidzieć ludzi. Zbierajcie
            punkty, odgadujcie większość i sprawdźcie, jak dobrze znacie własną
            ekipę.
          </p>

          <div className="survey-meta">
            <span>👥 4–14 graczy</span>
            <span>⏱ 25–40 min</span>
            <span>🏆 2 drużyny</span>
            <span>✓ bez eliminacji</span>
          </div>

          <div className="survey-actions">
            <form action={createRoom}>
              <input type="hidden" name="gameSlug" value="co-ludzie-powiedza" />
              <button type="submit">Utwórz pokój</button>
            </form>
            <a href="#jak-gramy">Zobacz przebieg gry</a>
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
          <h2>Nie odpowiadasz za siebie. Próbujesz trafić w tłum.</h2>
          <p>
            Czasem zgadujecie odpowiedzi setek osób, a czasem ludzi siedzących
            obok Was. Dzięki temu każda ekipa tworzy własną wersję gry.
          </p>
        </div>
      </section>

      <section className="survey-rounds container" id="jak-gramy">
        <div className="survey-section-head">
          <span>PRZEBIEG</span>
          <h2>Jedna gra, kilka różnych rund</h2>
          <p>
            Każda runda zmienia sposób myślenia, ale wszyscy grają od początku
            do końca.
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
            Drużyny podają odpowiedzi, a tablica odsłania prawdziwy ranking.
            Później gra zrobi to samo z odpowiedziami Waszej własnej ekipy.
          </p>
        </div>
        <div className="example-board">
          <div><b>1</b><span>RĘCZNIK</span><strong>31%</strong></div>
          <div><b>2</b><span>WODA</span><strong>19%</strong></div>
          <div><b>3</b><span>KREM SPF</span><strong>14%</strong></div>
          <div className="hidden-answer"><b>4</b><span>?????</span><strong>?</strong></div>
        </div>
      </section>

      <section className="survey-end container">
        <span>W BUDOWIE</span>
        <h2>To będzie pierwsza nowa gra tworzona już bezpośrednio dla platformy.</h2>
        <p>
          Następny etap to mechanika pokoju, podział na drużyny i pierwsza
          grywalna runda „Co powiedzieli ludzie?”.
        </p>
        <Link href="/">Wróć do katalogu</Link>
      </section>
    </main>
  );
}
