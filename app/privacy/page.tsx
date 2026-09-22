import { LEGAL_CONFIG } from "@/lib/legal-config";
import LegalPageShell, { LegalSection } from "../legal-page-shell";

export const metadata = {
  title: "Polityka prywatności | PartyPlay",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Prywatność i dane"
      title="Polityka prywatności"
      intro="Poniżej wyjaśniamy, jakie dane są przetwarzane w PartyPlay, jak wspólne konto łączy różne gry oraz jakie prawa przysługują użytkownikom."
    >
      <LegalSection title="1. Administrator danych">
        <p>
          Administratorem danych osobowych jest{" "}
          <strong className="text-zinc-200">{LEGAL_CONFIG.operatorName}</strong>,
          prowadzący platformę „{LEGAL_CONFIG.serviceName}”. Kontakt w sprawach
          prywatności:{" "}
          <strong className="text-zinc-200">{LEGAL_CONFIG.contactEmail}</strong>.
        </p>
        <p>
          Adres platformy: {LEGAL_CONFIG.serviceUrl}. Data obowiązywania:{" "}
          {LEGAL_CONFIG.effectiveDate}.
        </p>
      </LegalSection>

      <LegalSection title="2. Wspólne konto PartyPlay">
        <p>
          Konto PartyPlay może być używane w wielu grach dostępnych na platformie,
          w tym w „Polowaniu na Milionera”, „Co ludzie powiedzą”, „Zakręconym Haśle”
          oraz kolejnych grach dodawanych do PartyPlay.
        </p>
        <p>
          Użytkownik loguje się jednym kontem, ale poszczególne gry mogą zachowywać
          własne rankingi, osiągnięcia, statystyki i funkcje specyficzne dla danej gry.
          Przykładowo ranking i odznaki „Polowania na Milionera” pozostają częścią tej gry,
          a PartyPlay może równolegle pokazywać ogólne podsumowanie konta.
        </p>
      </LegalSection>

      <LegalSection title="3. Jakie dane przetwarzamy">
        <p>W zależności od sposobu korzystania z platformy mogą być przetwarzane w szczególności:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>adres e-mail oraz dane techniczne konta i logowania;</li>
          <li>nazwa wyświetlana, awatar i identyfikatory techniczne konta oraz gracza;</li>
          <li>dane o dołączeniu do pokoju, gotowości, drużynie i przebiegu rozgrywki;</li>
          <li>wyniki, miejsca, zwycięstwa, historia gier, XP, poziom i odznaki PartyPlay;</li>
          <li>statystyki i osiągnięcia właściwe dla konkretnej gry;</li>
          <li>
            w grach, które tego wymagają, odpowiedzi ankietowe, głosy, wskazówki,
            role, eliminacje, sekrety lub inne dane wykorzystywane przez mechanikę gry;
          </li>
          <li>dane techniczne o sesji, przeglądarce, błędach i bezpieczeństwie połączenia.</li>
        </ul>
        <p>
          Nie należy wpisywać do formularzy danych szczególnych kategorii ani danych
          osób trzecich, jeżeli nie są potrzebne do korzystania z danej funkcji.
        </p>
      </LegalSection>

      <LegalSection title="4. Cele i podstawy przetwarzania">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-zinc-200">prowadzenie konta i rozgrywek</strong>,
            w tym logowanie, personalizacja profilu, pokoje, przebieg gry i wyniki;
          </li>
          <li>
            <strong className="text-zinc-200">historia, statystyki, XP, poziomy, rankingi i odznaki</strong>,
            jako funkcje konta i poszczególnych gier;
          </li>
          <li>
            <strong className="text-zinc-200">bezpieczeństwo i zapobieganie nadużyciom</strong>,
            w tym weryfikacja sesji i ochrona przed podszywaniem się pod innych graczy;
          </li>
          <li>
            <strong className="text-zinc-200">obsługa kontaktu i reklamacji</strong>;
          </li>
          <li>
            <strong className="text-zinc-200">wiadomości transakcyjne</strong>,
            takie jak potwierdzenie konta, reset hasła i komunikaty bezpieczeństwa.
          </li>
        </ul>
        <p>
          Dane są przetwarzane odpowiednio w celu wykonania usługi, o którą prosi
          użytkownik, oraz w prawnie uzasadnionym interesie administratora związanym
          z bezpieczeństwem, utrzymaniem platformy i obsługą użytkowników.
        </p>
      </LegalSection>

      <LegalSection title="5. Goście i zalogowani użytkownicy">
        <p>
          Do części rozgrywek można dołączyć jako gość bez zakładania konta.
          W takim przypadku platforma nadal może przetwarzać dane niezbędne do
          konkretnej sesji gry, np. nazwę wyświetlaną, awatar, drużynę, odpowiedzi
          i identyfikatory sesji.
        </p>
        <p>
          Długoterminowa historia, XP, poziomy, wspólne odznaki i statystyki między
          grami są przypisywane wyłącznie do stałego, zalogowanego konta PartyPlay.
        </p>
      </LegalSection>

      <LegalSection title="6. Widoczność dla innych graczy">
        <p>
          W zależności od funkcji gry inni uczestnicy mogą widzieć nazwę wyświetlaną,
          awatar, drużynę, wynik, miejsce, wybrane osiągnięcia i inne dane potrzebne
          do prowadzenia rozgrywki.
        </p>
        <p>
          Adres e-mail, hasło i tokeny sesji nie są publikowane innym graczom.
          Szczegółowy zakres widocznych danych może różnić się między grami.
        </p>
      </LegalSection>

      <LegalSection title="7. Polowanie na Milionera i dane specyficzne dla gry">
        <p>
          „Polowanie na Milionera” może przechowywać dodatkowe dane potrzebne do
          własnej mechaniki, m.in. ankietę gracza, Punkty Łowcy, głosy, finały,
          rankingi i odznaki tej gry.
        </p>
        <p>
          Połączenie konta z PartyPlay nie usuwa ani nie zastępuje tych funkcji.
          PartyPlay może odczytywać wybrane podsumowania, aby pokazać łączną historię
          użytkownika, natomiast szczegółowe dane gry pozostają obsługiwane przez
          system „Polowania na Milionera”.
        </p>
      </LegalSection>

      <LegalSection title="8. Odbiorcy i dostawcy infrastruktury">
        <p>
          Dane mogą być przetwarzane przez dostawców niezbędnych do działania
          platformy, w szczególności dostawcę bazy danych i uwierzytelniania
          (Supabase), dostawcę hostingu aplikacji (Vercel), dostawcę poczty
          transakcyjnej skonfigurowanego dla systemu logowania oraz, jeśli użytkownik
          wybierze tę metodę, Google w zakresie logowania OAuth.
        </p>
        <p>
          Jeżeli korzystanie z tych usług wiąże się z transferem danych poza
          Europejski Obszar Gospodarczy, stosowane są mechanizmy przewidziane przez
          obowiązujące przepisy oraz konfigurację danego dostawcy.
        </p>
      </LegalSection>

      <LegalSection title="9. Jak długo przechowujemy dane">
        <p>
          Dane stałego konta i profilu są przechowywane co do zasady do czasu
          usunięcia konta albo skutecznego żądania usunięcia, z zastrzeżeniem danych,
          które muszą być zachowane dłużej ze względu na bezpieczeństwo, rozliczalność
          lub dochodzenie i obronę roszczeń.
        </p>
        <p>
          Dane rozgrywek mogą być przechowywane tak długo, jak są potrzebne do
          historii, statystyk, rankingów, XP, poziomów, odznak i prawidłowego działania
          platformy oraz poszczególnych gier.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies i pamięć przeglądarki">
        <p>
          PartyPlay korzysta z mechanizmów technicznych potrzebnych do logowania,
          utrzymania sesji, odzyskania gracza, bezpieczeństwa i działania rozgrywki.
          Obecna wersja nie wykorzystuje cookies reklamowych ani marketingowych.
        </p>
      </LegalSection>

      <LegalSection title="11. Prawa użytkownika">
        <p>
          Na zasadach przewidzianych w RODO użytkownik może żądać dostępu do danych,
          ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia danych
          oraz wnieść sprzeciw wobec przetwarzania opartego na prawnie uzasadnionym
          interesie. W sprawach dotyczących danych należy pisać na:{" "}
          {LEGAL_CONFIG.contactEmail}.
        </p>
        <p>
          Użytkownik ma również prawo złożyć skargę do Prezesa Urzędu Ochrony Danych
          Osobowych, jeżeli uważa, że przetwarzanie narusza przepisy o ochronie danych.
        </p>
      </LegalSection>

      <LegalSection title="12. Automatyczne obliczenia w grach">
        <p>
          PartyPlay i poszczególne gry automatycznie obliczają wyniki, miejsca,
          postęp, XP, poziomy, rankingi i osiągnięcia zgodnie z mechaniką gry.
          Są to funkcje rozrywkowe i nie mają wywoływać skutków prawnych ani
          porównywalnie istotnych skutków dla użytkownika.
        </p>
      </LegalSection>

      <LegalSection title="13. Zmiany polityki">
        <p>
          Polityka może być aktualizowana wraz z rozwojem PartyPlay, np. po dodaniu
          nowych gier, płatności, analityki lub dostawców. Aktualna wersja będzie
          dostępna pod adresem /privacy wraz z datą obowiązywania.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
