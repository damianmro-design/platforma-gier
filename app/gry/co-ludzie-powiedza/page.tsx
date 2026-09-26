import GamePageCmsSections from "@/components/game-page-cms-sections";
import GamePageCmsIntro from "@/components/game-page-cms-intro";
import { getPublishedGamePageMetadata } from "@/lib/zagraj-public-page-seo";
import { getPublishedPageRules } from "@/lib/zagraj-public-page-rules";
import type { Metadata } from "next";
import Link from "next/link";
import { createRoom } from "../../room-actions";
import TestGameButton from "@/components/test-game-button";

export async function generateMetadata(): Promise<Metadata> {
  return getPublishedGamePageMetadata("co-ludzie-powiedza");
}


export const dynamic = "force-dynamic";

export default async function CoLudziePowiedzaPage() {
  const rounds = await getPublishedPageRules("co-ludzie-powiedza");
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
            <GamePageCmsIntro slug="co-ludzie-powiedza" />
          </p>

          <div className="survey-meta">
            <span>👥 4–14 graczy</span>
            <span>⭐ najlepiej 6–10</span>
            <span>⏱ 45–75 min</span>
            <span>🏆 2 drużyny</span>
            <span>✓ bez eliminacji</span>
            <span>🎤 wymagany prowadzący</span>
          </div>

          <div className="survey-actions">
            <form action={createRoom}>
              <input type="hidden" name="gameSlug" value="co-ludzie-powiedza" />
              <button type="submit">Utwórz pokój</button>
            </form>
            <a href="#jak-gramy">Zobacz zasady</a>
          </div>
          <TestGameButton gameSlug="co-ludzie-powiedza" className="mt-4" />
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
          {rounds.map(([no, title, copy]) => (
            <article key={no}>
              <span>{no}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
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

      <GamePageCmsSections slug="co-ludzie-powiedza" />
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
