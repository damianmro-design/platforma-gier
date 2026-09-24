import { LEGAL_CONFIG } from "@/lib/legal-config";
import LegalPageShell, { LegalSection } from "../legal-page-shell";

export const metadata = {
  title: "Regulamin | zaGRAj",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Zasady korzystania"
      title="Regulamin zaGRAj"
      intro="Regulamin określa zasady korzystania z platformy gier towarzyskich zaGRAj, wspólnego konta użytkownika oraz poszczególnych gier dostępnych w serwisie."
    >
      <LegalSection title="1. Usługodawca i kontakt">
        <p>
          Usługodawcą jest{" "}
          <strong className="text-zinc-200">{LEGAL_CONFIG.operatorName}</strong>.
          Kontakt:{" "}
          <strong className="text-zinc-200">{LEGAL_CONFIG.contactEmail}</strong>.
          Adres usługodawcy: <strong className="text-zinc-200">{LEGAL_CONFIG.operatorAddress}</strong>,{" "}
          {LEGAL_CONFIG.country}. Platforma działa pod adresem {LEGAL_CONFIG.serviceUrl}.
        </p>
        <p>Regulamin obowiązuje od {LEGAL_CONFIG.effectiveDate}.</p>
      </LegalSection>

      <LegalSection title="2. Na czym polega zaGRAj">
        <p>
          zaGRAj jest platformą internetowych gier towarzyskich. Umożliwia m.in.
          tworzenie pokojów, dołączanie z telefonu, rozgrywkę na wspólnym ekranie,
          korzystanie z konta gracza, historii, statystyk, XP, poziomów i odznak.
        </p>
        <p>
          Poszczególne gry mogą mieć własne zasady, rankingi, systemy punktowe,
          profile, osiągnięcia i wymagania techniczne.
        </p>
      </LegalSection>

      <LegalSection title="2a. Bezpłatna wersja beta">
        <p>
          W obecnej wersji beta korzystanie z udostępnionych gier i funkcji zaGRAj
          jest bezpłatne. Wyniki, XP, poziomy i fabularne nagrody nie są środkami
          płatniczymi ani nagrodami pieniężnymi. Przed uruchomieniem jakiejkolwiek
          sprzedaży opublikujemy osobne warunki dotyczące odpłatnych usług.
        </p>
      </LegalSection>

      <LegalSection title="3. Wspólne konto i profile poszczególnych gier">
        <p>
          Jedno konto zaGRAj może być używane w wielu grach. Obecne konta utworzone
          wcześniej w „Polowaniu na Milionera” mogą działać jako konta zaGRAj bez
          konieczności zakładania nowego konta.
        </p>
        <p>
          Wspólne konto nie zastępuje funkcji charakterystycznych dla konkretnej gry.
          Na przykład użytkownik może nadal korzystać z rankingu, Punktów Łowcy i
          odznak „Polowania na Milionera”, a jednocześnie posiadać ogólny poziom,
          XP i historię zaGRAj.
        </p>
      </LegalSection>

      <LegalSection title="4. Konto, logowanie i bezpieczeństwo">
        <p>
          Konto może zostać utworzone e-mailem i hasłem albo, jeśli dostępne,
          przez zewnętrznego dostawcę logowania. Użytkownik odpowiada za prawidłowość
          danych i ochronę swojego hasła.
        </p>
        <p>
          Nie wolno udostępniać danych logowania innym osobom ani używać cudzego konta
          bez zgody jego właściciela. W przypadku podejrzenia przejęcia konta należy
          zmienić hasło i skontaktować się z usługodawcą.
        </p>
      </LegalSection>

      <LegalSection title="5. Gra jako gość">
        <p>
          Jeżeli dana gra na to pozwala, uczestnik może dołączyć bez stałego konta.
          Gość otrzymuje tymczasową tożsamość potrzebną do konkretnej rozgrywki.
        </p>
        <p>
          Funkcje długoterminowe, takie jak wspólna historia, XP, poziomy i część
          osiągnięć, mogą wymagać zalogowanego konta zaGRAj.
        </p>
      </LegalSection>

      <LegalSection title="6. Zasady poszczególnych gier">
        <p>
          Przed rozpoczęciem rozgrywki uczestnicy powinni zapoznać się z zasadami
          konkretnej gry. Mechaniki mogą obejmować m.in. rywalizację drużynową,
          blef, tajne role, głosowania, eliminacje, dedukcję, zgadywanie haseł,
          ankiety i elementy fabularne.
        </p>
        <p>
          Organizator rozgrywki odpowiada za prawidłowe przekazanie zasad osobom,
          które biorą udział w jego prywatnym wydarzeniu.
        </p>
      </LegalSection>

      <LegalSection title="7. XP, poziomy, odznaki i wyniki">
        <p>
          XP, poziomy, odznaki, rankingi i wyniki są elementami funkcji rozrywkowych
          zaGRAj i mogą być obliczane automatycznie na podstawie zakończonych gier
          i osiągnięć.
        </p>
        <p>
          Usługodawca może zmieniać sposób naliczania XP, progi poziomów, warunki
          odznak lub inne elementy balansu gry, jeżeli jest to potrzebne do rozwoju
          i uczciwego działania platformy. Zmiany nie oznaczają powstania prawa do
          świadczenia pieniężnego.
        </p>
      </LegalSection>

      <LegalSection title="8. Elementy fabularne i brak nagrody pieniężnej">
        <p>
          Nazwy, punkty, wirtualne kwoty, „milion”, XP, poziomy, odznaki, koperty
          i inne elementy finansowe lub nagrodowe są elementami fabuły i mechaniki.
          Samo zwycięstwo w zaGRAj nie tworzy prawa do wypłaty pieniędzy,
          nagrody rzeczowej ani innego świadczenia od usługodawcy.
        </p>
        <p>
          Jeżeli organizator prywatnego wydarzenia niezależnie ustanowi własną nagrodę,
          odpowiada za nią samodzielnie.
        </p>
      </LegalSection>

      <LegalSection title="9. Fair play i zabronione działania">
        <p>
          Niedozwolone jest manipulowanie aplikacją, ingerowanie w bazę danych,
          obchodzenie zabezpieczeń, podszywanie się pod innych graczy, przejmowanie
          ich sesji, wykorzystywanie błędów technicznych do uzyskania nieuczciwej
          przewagi oraz celowe zakłócanie działania platformy.
        </p>
        <p>
          W grach opartych na tajnych informacjach uczestnik powinien przestrzegać
          reguł dotyczących ujawniania ekranu, roli, odpowiedzi i innych danych
          przeznaczonych tylko dla niego.
        </p>
      </LegalSection>

      <LegalSection title="10. Treści wprowadzane przez użytkownika">
        <p>
          Zabronione jest wprowadzanie treści bezprawnych, naruszających prawa innych
          osób, zawierających groźby, nękanie, złośliwy kod lub dane pozyskane bez
          odpowiedniej podstawy.
        </p>
        <p>
          Jeżeli dana gra zawiera ankietę lub pola tekstowe, użytkownik powinien
          wpisywać wyłącznie informacje potrzebne do zabawy i takie, które może
          zgodnie z prawem udostępnić.
        </p>
      </LegalSection>

      <LegalSection title="11. Wymagania techniczne">
        <ul className="list-disc space-y-2 pl-5">
          <li>aktualna przeglądarka internetowa z obsługą JavaScript;</li>
          <li>połączenie z Internetem;</li>
          <li>obsługa cookies i pamięci technicznej potrzebnej do sesji;</li>
          <li>telefon lub inne urządzenie dla uczestnika, jeżeli wymaga tego gra;</li>
          <li>wspólny ekran, jeżeli dana gra została zaprojektowana z myślą o takim trybie;</li>
          <li>włączenie dźwięku, jeżeli użytkownicy chcą korzystać z audio.</li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Dostępność i rozwój platformy">
        <p>
          zaGRAj jest rozwijane i może być czasowo niedostępne z powodu aktualizacji,
          awarii usług zewnętrznych, problemów sieciowych lub innych zdarzeń niezależnych
          od usługodawcy.
        </p>
        <p>
          Funkcje, wygląd, zasady gier i katalog dostępnych tytułów mogą się zmieniać
          wraz z rozwojem platformy.
        </p>
      </LegalSection>

      <LegalSection title="13. Zakończenie korzystania i usunięcie konta">
        <p>
          Użytkownik może zakończyć korzystanie z zaGRAj w każdej chwili przez
          wylogowanie i zaprzestanie korzystania z platformy.
        </p>
        <p>
          W sprawie usunięcia stałego konta i danych użytkownik może skontaktować się
          z usługodawcą na adres {LEGAL_CONFIG.contactEmail}.
        </p>
      </LegalSection>

      <LegalSection title="14. Reklamacje i zgłoszenia">
        <p>
          Reklamacje oraz zgłoszenia dotyczące konta, statystyk lub działania gier
          można wysłać na {LEGAL_CONFIG.contactEmail}. Zgłoszenie powinno zawierać
          opis problemu, przybliżony czas jego wystąpienia oraz, jeśli dotyczy,
          nazwę gry i kod pokoju.
        </p>
        <p>Nie należy przesyłać hasła ani poufnych kluczy dostępowych.</p>
      </LegalSection>

      <LegalSection title="15. Osoby małoletnie">
        <p>
          Osoba małoletnia powinna korzystać z platformy za wiedzą i, gdy jest to
          wymagane prawem, zgodą rodzica lub opiekuna. Organizator prywatnej rozgrywki
          odpowiada za ustalenie zasad udziału uczestników swojego wydarzenia.
        </p>
      </LegalSection>

      <LegalSection title="16. Prawa do platformy i materiałów">
        <p>
          Nazwy, oprawa wizualna, kod, grafiki, filmy, audio, teksty, sposób prezentacji
          oraz inne materiały zaGRAj i poszczególnych gier są chronione na zasadach
          wynikających z właściwych przepisów oraz praw przysługujących usługodawcy
          lub jego licencjodawcom.
        </p>
      </LegalSection>

      <LegalSection title="17. Zmiany regulaminu">
        <p>
          Regulamin może zostać zaktualizowany wraz ze zmianą funkcji zaGRAj,
          katalogu gier lub przepisów. Aktualna wersja jest udostępniana bezpłatnie
          pod adresem /terms w sposób pozwalający na jej odczyt i zapis.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
