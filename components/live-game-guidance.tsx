"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Guidance = {
  key: string;
  now: string;
  who: string;
  where: string;
  next: string;
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function bool(value: unknown) {
  return Boolean(value);
}

function playerName(game: JsonObject, playerId: string) {
  const player = asArray(game.players)
    .map(asObject)
    .find((item) => text(item.id) === playerId);
  return text(player?.displayName ?? player?.display_name ?? player?.name) || "gracz";
}

function vaBanqueGuidance(root: JsonObject): Guidance | null {
  const game = asObject(root.game);
  const phase = text(game.phase);
  const viewer = asObject(game.viewer);
  const viewerId = text(viewer.id);
  const winnerId = text(game.winningPlayerId);
  const takeoverId = text(game.takeoverPlayerId);
  const winnerName = winnerId ? playerName(game, winnerId) : "wybrany gracz";
  const takeoverName = takeoverId ? playerName(game, takeoverId) : "gracz przejmujący";

  if (!phase || phase === "finished") return null;

  if (phase === "intro") {
    return {
      key: phase,
      now: "Przeczytajcie zasady i przygotujcie się do pierwszej kategorii.",
      who: "Wszyscy gracze.",
      where: "Każdy na swoim telefonie.",
      next: "System pokaże kategorię i otworzy licytację.",
    };
  }

  if (phase === "category") {
    return {
      key: phase,
      now: "Sprawdź kategorię. Pytania jeszcze nie widzisz.",
      who: "Wszyscy gracze.",
      where: "Na własnych telefonach.",
      next: "Za chwilę każdy prywatnie wybierze stawkę albo spasuje.",
    };
  }

  if (phase === "bidding") {
    const locked = bool(viewer.bidLocked);
    return {
      key: `${phase}:${locked}`,
      now: locked ? "Twoja stawka jest zapisana. Poczekaj na pozostałych." : "Wybierz stawkę albo PAS i zatwierdź decyzję.",
      who: locked ? "Pozostali gracze kończą licytację." : "Ty, tak samo jak każdy gracz osobno.",
      where: "Tylko na swoim telefonie. Nie pokazuj stawki innym.",
      next: "Po zamknięciu licytacji system odsłoni stawki i wskaże odpowiadającego.",
    };
  }

  if (phase === "bid_reveal" || phase === "tie_reveal") {
    return {
      key: phase,
      now: "Sprawdźcie wynik licytacji.",
      who: `${winnerName} otrzyma prawo do odpowiedzi.`,
      where: "Możecie patrzeć na swoje telefony.",
      next: phase === "tie_reveal" ? "System otworzy pytanie po rozstrzygnięciu remisu." : "Jeśli jest remis, pojawi się dogrywka. W innym przypadku pytanie.",
    };
  }

  if (phase === "tie_bid") {
    const involved = asArray(game.tiePlayerIds).map(String).includes(viewerId);
    const locked = bool(viewer.tieLocked);
    return {
      key: `${phase}:${involved}:${locked}`,
      now: involved
        ? locked
          ? "Twoja decyzja w dogrywce jest zapisana."
          : "Podbij stawkę albo spasuj."
        : "Poczekaj, trwa dogrywka remisujących.",
      who: involved ? "Tylko gracze z remisującą najwyższą stawką." : "Gracze uczestniczący w remisie.",
      where: "Decyzje pozostają prywatne na telefonach.",
      next: "System rozstrzygnie licytację i pokaże pytanie.",
    };
  }

  if (phase === "question") {
    const active = viewerId && viewerId === winnerId;
    return {
      key: `${phase}:${active}`,
      now: active ? "Wybierz odpowiedź i ją zatwierdź." : `Poczekaj, teraz odpowiada ${winnerName}.`,
      who: active ? "Ty odpowiadasz za wylicytowaną stawkę." : `${winnerName}.`,
      where: active ? "Na swoim telefonie." : "Obserwuj swój ekran, nie podpowiadaj.",
      next: "Po odpowiedzi zobaczycie wynik i ewentualne okno przejęcia.",
    };
  }

  if (phase === "main_result") {
    return {
      key: phase,
      now: "Sprawdź wynik głównej odpowiedzi.",
      who: "Wszyscy.",
      where: "Na swoich telefonach.",
      next: "Jeżeli pytanie można przejąć, system otworzy krótkie okno przejęcia.",
    };
  }

  if (phase === "takeover_open") {
    const canClaim = viewerId && viewerId !== winnerId && number(viewer.points) > 100 && !takeoverId;
    return {
      key: `${phase}:${canClaim}`,
      now: canClaim ? "Jeśli chcesz zaryzykować, kliknij PRZEJMUJĘ jak najszybciej." : "Poczekaj, trwa krótkie okno przejęcia.",
      who: canClaim ? "Każdy uprawniony gracz poza poprzednim odpowiadającym." : "Uprawnieni gracze.",
      where: "Na swoich telefonach.",
      next: "Pierwsza zaakceptowana próba przejęcia dostanie pytanie.",
    };
  }

  if (phase === "takeover_question") {
    const active = viewerId && viewerId === takeoverId;
    return {
      key: `${phase}:${active}`,
      now: active ? "Odpowiedz na przejęte pytanie." : `Poczekaj, odpowiada ${takeoverName}.`,
      who: active ? "Ty przejąłeś pytanie." : `${takeoverName}.`,
      where: "Na telefonie odpowiadającego. Pozostali nie podpowiadają.",
      next: "Po odpowiedzi system pokaże wynik przejęcia i zamknie rundę.",
    };
  }

  if (phase === "takeover_result" || phase === "round_result") {
    return {
      key: phase,
      now: "Sprawdź podsumowanie rundy.",
      who: "Wszyscy.",
      where: "Na swoich telefonach.",
      next: "Gra automatycznie przejdzie do kolejnej kategorii albo finału.",
    };
  }

  if (phase === "final_category") {
    return {
      key: phase,
      now: "Poznaj finałową kategorię i zastanów się, ile chcesz zaryzykować.",
      who: "Wszyscy finaliści.",
      where: "Na swoich telefonach.",
      next: "Za chwilę każdy prywatnie wybierze finałową stawkę.",
    };
  }

  if (phase === "final_bidding") {
    const locked = bool(viewer.finalBidLocked);
    return {
      key: `${phase}:${locked}`,
      now: locked ? "Finałowa stawka jest zapisana. Poczekaj na pozostałych." : "Wybierz finałową stawkę, od 0 do całego kapitału.",
      who: "Każdy gracz osobno.",
      where: "Tylko na swoim telefonie. Stawki są tajne.",
      next: "Po zamknięciu stawek wszyscy dostaną finałowe pytanie.",
    };
  }

  if (phase === "final_question") {
    const locked = bool(viewer.finalAnswerLocked);
    return {
      key: `${phase}:${locked}`,
      now: locked ? "Twoja odpowiedź jest zapisana. Czekaj na pozostałych." : "Odpowiedz na finałowe pytanie i zatwierdź.",
      who: "Każdy odpowiada samodzielnie.",
      where: "Na swoim telefonie, bez konsultacji.",
      next: "Gdy wszyscy odpowiedzą, system odsłoni stawki, odpowiedzi i końcowy ranking.",
    };
  }

  if (phase === "final_reveal") {
    return {
      key: phase,
      now: "Zobaczcie finałowe rozstrzygnięcie.",
      who: "Wszyscy.",
      where: "Możecie patrzeć na swoje ekrany.",
      next: "Za chwilę pojawi się końcowy ranking.",
    };
  }

  return null;
}

function szyfrGuidance(root: JsonObject): Guidance | null {
  const game = asObject(root.game);
  const phase = text(game.phase);
  if (!phase || phase === "finished" || phase === "failed") return null;
  const viewer = asObject(game.viewer);
  const hasViewer = Boolean(text(viewer.id));
  const puzzle = asObject(game.puzzle);

  return {
    key: `${phase}:${text(puzzle.stepKey)}`,
    now: phase === "tutorial"
      ? "Połączcie wskazówki treningowe i ustalcie wspólną odpowiedź."
      : "Połączcie prywatne wskazówki i ustalcie wspólną odpowiedź.",
    who: hasViewer
      ? "Wszyscy rozmawiają. Dowolny gracz może wysłać wspólną odpowiedź."
      : "Gracze rozwiązują zagadkę, twórca pokoju obserwuje.",
    where: hasViewer
      ? "Patrz tylko na swój telefon. Nie pokazuj ekranu, opisuj informacje na głos."
      : "Prywatne wskazówki są wyłącznie na telefonach graczy.",
    next: "Po poprawnej odpowiedzi system automatycznie przejdzie do następnego etapu.",
  };
}

function tylkoMyGuidance(root: JsonObject): Guidance | null {
  const game = asObject(root.game);
  if (bool(game.finished)) return null;
  const revealed = bool(game.revealed);
  const viewerAnswer = text(game.viewerAnswer);
  const answerCount = number(game.answerCount);
  const playerA = asObject(game.playerA);
  const playerB = asObject(game.playerB);
  const submitted = asArray(game.submittedPlayerIds).map(String);
  const waitingFor = !submitted.includes(text(playerA.id))
    ? text(playerA.name)
    : !submitted.includes(text(playerB.id))
      ? text(playerB.name)
      : "drugą osobę";

  if (revealed) {
    return {
      key: `revealed:${number(game.questionIndex)}`,
      now: "Porównajcie odpowiedzi i zobaczcie, czy złapaliście ten sam sygnał.",
      who: "Oboje.",
      where: "Możecie już patrzeć na swoje telefony i rozmawiać o wyniku.",
      next: "Po krótkim podsumowaniu gra automatycznie przejdzie do następnego pytania.",
    };
  }

  if (viewerAnswer) {
    return {
      key: `answered:${number(game.questionIndex)}:${answerCount}`,
      now: `Twoja odpowiedź jest ukryta. Czekaj na ${waitingFor}.`,
      who: "Druga osoba kończy swój wybór.",
      where: "Nie pokazuj swojego telefonu i nie zdradzaj odpowiedzi.",
      next: "Gdy będą 2 odpowiedzi, system odsłoni je jednocześnie.",
    };
  }

  return {
    key: `answer:${number(game.questionIndex)}`,
    now: "Wybierz swoją odpowiedź i ją zatwierdź.",
    who: "Ty, niezależnie od drugiej osoby.",
    where: "Na swoim telefonie. Nie pokazuj wyboru drugiej osobie.",
    next: "Po zatwierdzeniu poczekasz na drugą osobę, a odpowiedzi odsłonią się razem.",
  };
}

function zakreconeGuidance(root: JsonObject): Guidance | null {
  const game = asObject(root.game);
  const mode = text(game.mode);
  if (!mode || mode === "game_over") return null;
  const role = text(root.role);
  const player = asObject(root.player);
  const myId = text(player.id);
  const activeId = text(game.activePlayerId);
  const activeName = activeId ? playerName(game, activeId) : "aktywny gracz";
  const myTurn = Boolean(myId && myId === activeId);
  const event = asObject(game.lastEvent);
  const spinning = ["spin", "bankrupt", "pass"].includes(text(event.type)) && Boolean(text(event.at));

  if (mode === "round_over") {
    return {
      key: `round-over:${number(game.roundNumber)}`,
      now: "Runda jest zakończona. Sprawdźcie wynik hasła.",
      who: "Wszyscy.",
      where: "Patrzcie na ekran główny lub swoje telefony.",
      next: "Kolejna runda uruchomi się automatycznie po krótkim podsumowaniu.",
    };
  }

  if (spinning) {
    return {
      key: `spin:${text(event.at)}`,
      now: "Koło się kręci. Poczekajcie na wynik.",
      who: `${activeName} wykonał ruch.`,
      where: "Wszyscy patrzą na koło, najlepiej na ekranie głównym.",
      next: "Po zatrzymaniu koła aktywny gracz dostanie kolejną akcję na telefonie.",
    };
  }

  if (role === "player" && !myTurn) {
    return {
      key: `${mode}:waiting:${activeId}`,
      now: `Obserwuj grę. Teraz ruch ma ${activeName}.`,
      who: `${activeName}.`,
      where: "Patrz na ekran główny. Telefon będzie potrzebny, gdy przyjdzie Twoja kolej.",
      next: "Po zakończeniu ruchu kolejka może przejść do Ciebie.",
    };
  }

  if (mode === "choose_letter") {
    return {
      key: `${mode}:${activeId}`,
      now: myTurn ? "Wybierz spółgłoskę albo spróbuj odgadnąć całe hasło." : `${activeName} wybiera spółgłoskę albo zgaduje hasło.`,
      who: myTurn ? "Ty jesteś aktywnym graczem." : `${activeName}.`,
      where: myTurn ? "Steruj na swoim telefonie, a planszę obserwujcie na ekranie głównym." : "Wspólny ekran pokazuje planszę, aktywny gracz steruje telefonem.",
      next: "Trafiona litera pozwala kontynuować ruch. Pudło przekazuje kolejkę dalej.",
    };
  }

  return {
    key: `${mode}:${activeId}`,
    now: myTurn ? "Zakręć kołem, kup samogłoskę albo zgadnij hasło." : `${activeName} wykonuje swój ruch.`,
    who: myTurn ? "Ty jesteś aktywnym graczem." : `${activeName}.`,
    where: myTurn ? "Steruj na swoim telefonie. Wszyscy mogą patrzeć na ekran główny." : "Wspólny ekran dla wszystkich, sterowanie na telefonie aktywnego gracza.",
    next: "Po wykonanej akcji system pokaże wynik i wskaże, czy ruch trwa dalej.",
  };
}

function podPrzykrywkaGuidance(root: JsonObject): Guidance | null {
  const game = asObject(root.game);
  const phase = text(game.phase);
  const role = text(root.role);
  if (!phase || phase === "result") return null;

  const map: Record<string, Omit<Guidance, "key">> = {
    briefing: {
      now: "Każdy sprawdza swoją tajną rolę. Nie pokazujcie telefonów innym.",
      who: role === "host" ? "Prowadzący pilnuje ciszy, gracze czytają role." : "Ty czytasz swoją rolę i zachowujesz ją w tajemnicy.",
      where: role === "host" ? "Gracze patrzą tylko na własne telefony." : "Tylko Twój telefon.",
      next: "Prowadzący uruchomi pierwszą misję, gdy wszyscy poznają role.",
    },
    mission: {
      now: role === "host" ? "Daj wszystkim czas na odpowiedź na misję." : "Wykonaj polecenie misji i zatwierdź swoją odpowiedź.",
      who: role === "host" ? "Wszyscy gracze odpowiadają samodzielnie." : "Ty, zgodnie ze swoją tajną rolą.",
      where: "Na własnych telefonach. Nie pokazujcie prywatnych informacji.",
      next: "Gdy wszyscy odpowiedzą, prowadzący pokaże odpowiedzi i rozpocznie dyskusję.",
    },
    discussion: {
      now: "Odłóżcie telefony i rozmawiajcie o odpowiedziach oraz podejrzeniach.",
      who: "Cała grupa, prowadzący moderuje rozmowę.",
      where: "Rozmowa na głos. Możecie patrzeć na wspólny ekran.",
      next: "Po dyskusji przejdziecie do tajnego głosowania.",
    },
    suspicion: {
      now: role === "host" ? "Poczekaj, aż wszyscy oddadzą tajny głos." : "Wskaż osobę, którą podejrzewasz, i zatwierdź głos.",
      who: role === "host" ? "Wszyscy gracze głosują." : "Ty głosujesz samodzielnie.",
      where: "Tylko na własnym telefonie. Nie konsultujcie głosów.",
      next: "Po zebraniu głosów prowadzący pokaże wynik etapu.",
    },
    checkpoint: {
      now: "Sprawdźcie, kto trafia na przesłuchanie. To jeszcze nie jest werdykt.",
      who: "Cała grupa.",
      where: "Możecie patrzeć na wspólny ekran.",
      next: "Prowadzący rozpocznie przesłuchanie wskazanej osoby.",
    },
    interrogation: {
      now: "Tylko przesłuchiwana osoba odpowiada. Reszta słucha bez przerywania.",
      who: "Osoba wskazana przez system.",
      where: "Rozmowa na głos, telefony mogą zostać odłożone.",
      next: "Po przesłuchaniu wskazana osoba dostanie krótkie ostatnie słowo.",
    },
    last_word: {
      now: "Słuchajcie ostatniego słowa bez pytań i przerywania.",
      who: "Przesłuchiwana osoba.",
      where: "Rozmowa na głos.",
      next: "Po czasie prowadzący uruchomi kolejną misję.",
    },
    spotlight: {
      now: "Osoba na gorącym krześle odpowiada solo. Pozostali nie przerywają.",
      who: "Osoba wskazana przez system.",
      where: "Rozmowa na głos.",
      next: "Po 30 sekundach przejdziecie do tajnego głosowania.",
    },
    final_defense_intro: {
      now: "Przygotujcie się na 2 krótkie obrony najbardziej podejrzanych osób.",
      who: "Cała grupa słucha, prowadzący pilnuje kolejności.",
      where: "Wspólna rozmowa, bez głosowania jeszcze teraz.",
      next: "Najpierw obrona 1. osoby, potem 2. osoby i finałowe głosowanie.",
    },
    final_defense_one: {
      now: "Pierwsza wskazana osoba ma czas na obronę. Nie przerywajcie.",
      who: "Pierwszy obrońca.",
      where: "Rozmowa na głos.",
      next: "Następnie swoją obronę przedstawi druga osoba.",
    },
    final_defense_two: {
      now: "Druga wskazana osoba ma czas na obronę. Nie przerywajcie.",
      who: "Drugi obrońca.",
      where: "Rozmowa na głos.",
      next: "Po obronie wszyscy oddadzą finałowy tajny głos.",
    },
    final_vote: {
      now: role === "host" ? "Poczekaj na wszystkie finałowe głosy." : "Oddaj finałowy głos na osobę, którą uważasz za Oszusta.",
      who: role === "host" ? "Wszyscy gracze." : "Ty głosujesz samodzielnie.",
      where: "Tylko na własnym telefonie, bez konsultacji.",
      next: "Po zamknięciu głosowania system pokaże werdykt grupy.",
    },
    final_locked: {
      now: "Głosy są zamknięte. Poczekajcie na werdykt.",
      who: "Wszyscy.",
      where: "Możecie odłożyć telefony.",
      next: "Prowadzący odsłoni wynik głosowania.",
    },
    final_accused: {
      now: "Sprawdźcie, kogo grupa oskarżyła. To jeszcze moment przed ujawnieniem prawdy.",
      who: "Wszyscy.",
      where: "Wspólny ekran i rozmowa na głos.",
      next: "Prowadzący uruchomi finałowe ujawnienie roli Oszusta.",
    },
  };

  const guidance = map[phase];
  return guidance ? { key: phase, ...guidance } : null;
}

function aktaNocyGuidance(root: JsonObject): Guidance | null {
  const room = asObject(root.room);
  const phase = text(room.phase);
  const role = text(root.role);
  if (!phase || role === "closed") return null;

  if (phase === "akta_osobowe") {
    return {
      key: phase,
      now: role === "host" ? "Poczekaj, aż każdy otworzy i przeczyta swoje akta." : "Otwórz swoje akta i przeczytaj je w tajemnicy.",
      who: role === "host" ? "Wszyscy gracze czytają prywatne role." : "Ty poznajesz swoją postać, sekret i cel.",
      where: role === "host" ? "Każdy tylko na własnym telefonie." : "Tylko Twój telefon. Nie pokazuj go innym.",
      next: "Gdy wszyscy będą gotowi, prowadzący rozpocznie pierwsze zeznania.",
    };
  }

  if (phase === "pierwsze_zeznania") {
    return {
      key: phase,
      now: "Przedstawiajcie po kolei postać i swoją wersję wydarzeń.",
      who: role === "host" ? "Prowadzący wywołuje kolejne osoby." : "Mówisz, gdy przyjdzie Twoja kolej. Możesz przemilczać sekret.",
      where: "Rozmowa na głos. Akta możesz mieć otwarte na własnym telefonie.",
      next: "Po wszystkich zeznaniach prowadzący otworzy pierwszą paczkę dowodów.",
    };
  }

  if (phase.startsWith("dowody_a_")) {
    return {
      key: phase,
      now: role === "host" ? "Ujawniajcie dowody po jednym i dyskutujcie po każdym." : "Przeczytaj nowy dowód i zestaw go z wcześniejszymi zeznaniami.",
      who: "Cała grupa analizuje dowody.",
      where: "Dowody możecie oglądać na ekranach, dyskusja odbywa się na głos.",
      next: "Po kompletnej Paczce A prowadzący rozpocznie przesłuchania.",
    };
  }

  if (phase === "przesluchania_a") {
    return {
      key: phase,
      now: role === "host" ? "Zadawaj pytania wskazanym osobom zgodnie z panelem." : "Odpowiadaj zgodnie ze swoją postacią, gdy prowadzący zwróci się do Ciebie.",
      who: role === "host" ? "Prowadzący i kolejno przesłuchiwani gracze." : "Osoba aktualnie przesłuchiwana.",
      where: "Rozmowa na głos. Prywatne akta pozostają prywatne.",
      next: "Po przesłuchaniach prowadzący otworzy Paczkę Dowodową B.",
    };
  }

  if (phase.startsWith("dowody_b_")) {
    return {
      key: phase,
      now: "Analizujcie nowe dane techniczne i porównujcie je z alibi.",
      who: "Cała grupa.",
      where: "Dowody na ekranach, rozmowa na głos.",
      next: "Po kompletnej Paczce B rozpocznie się indywidualna rekonstrukcja nocy.",
    };
  }

  if (phase === "rekonstrukcja") {
    return {
      key: phase,
      now: role === "host" ? "Poczekaj na indywidualne rekonstrukcje wszystkich graczy." : "Ułóż własną rekonstrukcję, wskaż podejrzanego, motyw i upozorowanie.",
      who: role === "host" ? "Każdy gracz pracuje samodzielnie." : "Ty pracujesz samodzielnie.",
      where: "Tylko na własnym telefonie. Nie konsultujcie wyborów.",
      next: "Po zebraniu wszystkich odpowiedzi system pokaże wspólną teorię grupy, jeszcze bez rozwiązania.",
    };
  }

  if (phase === "rekonstrukcja_wynik") {
    return {
      key: phase,
      now: "Porównajcie wspólną teorię grupy. To nadal nie jest oficjalne rozwiązanie.",
      who: "Wszyscy.",
      where: "Możecie patrzeć na wspólny ekran i dyskutować.",
      next: "Prowadzący uruchomi indywidualne akty oskarżenia.",
    };
  }

  if (phase === "akt_oskarzenia" || phase === "oskarzenie") {
    return {
      key: phase,
      now: role === "host" ? "Poczekaj na wszystkie indywidualne akty oskarżenia." : "Wskaż sprawcę, motyw i najważniejszy dowód, potem zatwierdź.",
      who: role === "host" ? "Każdy gracz oskarża samodzielnie." : "Ty podejmujesz ostateczną decyzję.",
      where: "Tylko na własnym telefonie. Nie konsultujcie odpowiedzi.",
      next: "Po zamknięciu oskarżeń prowadzący rozpocznie ujawnianie prawdy krok po kroku.",
    };
  }

  if (phase.startsWith("ujawnienie") || phase === "rozwiazanie") {
    return {
      key: phase,
      now: "Śledźcie kolejne fragmenty rozwiązania i porównujcie je ze swoją teorią.",
      who: "Wszyscy.",
      where: "Możecie patrzeć na ekrany. Tajne informacje przestają mieć znaczenie dopiero przy ujawnieniu sprawcy.",
      next: "Kolejny fragment rozwiązania uruchamia prowadzący.",
    };
  }

  return {
    key: phase,
    now: role === "host" ? "Prowadź bieżący etap zgodnie z instrukcją na ekranie." : "Wykonaj bieżące polecenie swojej postaci.",
    who: role === "host" ? "Prowadzący steruje etapem." : "Ty i pozostali gracze zgodnie z instrukcjami.",
    where: "Sprawdzaj, czy dana informacja jest wspólna czy prywatna przed jej pokazaniem.",
    next: "System lub prowadzący wskaże kolejny etap po zakończeniu obecnego.",
  };
}

function coLudzieGuidance(root: JsonObject): Guidance | null {
  const room = asObject(root.room);
  const phase = text(room.phase);
  const role = text(root.role);
  if (!phase || phase === "finished") return null;

  if (phase === "warmup" || phase === "setup" || "progress" in root || "answers" in root) {
    return {
      key: `warmup:${role}`,
      now: role === "host" ? "Poczekaj, aż wszyscy wypełnią rozgrzewkę na telefonach." : "Odpowiedz na pytania rozgrzewkowe na swoim telefonie.",
      who: role === "host" ? "Wszyscy gracze odpowiadają samodzielnie." : "Ty odpowiadasz samodzielnie.",
      where: "Tylko na własnych telefonach. Nie konsultujcie odpowiedzi.",
      next: "Po zebraniu odpowiedzi prowadzący rozpocznie pierwszą rundę teleturnieju.",
    };
  }

  const roundLabel = phase === "final" ? "finał" : phase.replace("round_", "rundę ");
  return {
    key: `${phase}:${role}`,
    now: role === "host" ? `Prowadź ${roundLabel} zgodnie z bieżącym panelem i komunikatem rundy.` : `Wykonaj akcję dla ${roundLabel}, którą pokazuje Twój telefon.`,
    who: role === "host" ? "Prowadzący steruje przejściami, gracze wykonują swoje akcje." : "Ty lub wskazany reprezentant, zależnie od rundy.",
    where: role === "host" ? "Ten ekran prowadzącego. Prywatne wybory pozostają na telefonach graczy." : "Na swoim telefonie. Jeśli wybór jest tajny, nie pokazuj go innym.",
    next: role === "host" ? "Gdy warunek bieżącego etapu będzie spełniony, użyj konkretnego przycisku przejścia dalej." : "Po zatwierdzeniu poczekaj na prowadzącego albo pozostałych graczy.",
  };
}

function guidanceFor(slug: string, value: unknown): Guidance | null {
  const root = asObject(value);
  switch (slug) {
    case "va-banque":
      return vaBanqueGuidance(root);
    case "szyfr":
      return szyfrGuidance(root);
    case "tylko-my":
      return tylkoMyGuidance(root);
    case "zakrecone-haslo":
      return zakreconeGuidance(root);
    case "pod-przykrywka":
      return podPrzykrywkaGuidance(root);
    case "akta-nocy":
      return aktaNocyGuidance(root);
    case "co-ludzie-powiedza":
      return coLudzieGuidance(root);
    default:
      return null;
  }
}

const labels = [
  ["TERAZ", "now"],
  ["KTO", "who"],
  ["GDZIE", "where"],
  ["NASTĘPNIE", "next"],
] as const;

export default function LiveGameGuidance() {
  const pathname = usePathname();
  const route = useMemo(() => {
    const match = pathname.match(/^\/gra\/([^/]+)\/([A-Z0-9]{4,6})\/?$/i);
    if (!match) return null;
    return { slug: match[1], code: match[2].toUpperCase() };
  }, [pathname]);

  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [open, setOpen] = useState(false);
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const lastKey = useRef("");

  const load = useCallback(async () => {
    if (!route || document.hidden) return;
    try {
      const response = await fetch(`/api/gra/${route.slug}/${route.code}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const next = guidanceFor(route.slug, payload);
      setGuidance(next);

      if (next && next.key !== lastKey.current) {
        lastKey.current = next.key;
        setManuallyOpened(false);
        setOpen(true);
      }
    } catch {
      // Warstwa pomocy jest dodatkiem, więc nie może blokować samej gry.
    }
  }, [route]);

  useEffect(() => {
    if (!route) return;
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    document.addEventListener("visibilitychange", load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load, route]);

  useEffect(() => {
    if (!open || manuallyOpened) return;
    const timer = window.setTimeout(() => setOpen(false), 7000);
    return () => window.clearTimeout(timer);
  }, [guidance?.key, manuallyOpened, open]);

  if (!route || !guidance) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setManuallyOpened(true);
          setOpen(true);
        }}
        className="fixed right-3 top-[68px] z-[115] rounded-full border border-cyan-300/25 bg-[#07131a]/95 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.16em] text-cyan-100 shadow-[0_12px_40px_rgba(0,0,0,.38)] backdrop-blur-xl sm:right-5"
        aria-label="Pokaż instrukcję co robić teraz"
      >
        ? CO TERAZ
      </button>
    );
  }

  return (
    <aside
      className="fixed right-3 top-[68px] z-[115] w-[min(92vw,430px)] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07131a]/96 text-white shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl sm:right-5"
      aria-live="polite"
      aria-label="Aktualna instrukcja gry"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <span className="block text-[8px] font-black uppercase tracking-[.2em] text-cyan-300/60">ZA GRAJ · POMOC W GRZE</span>
          <strong className="mt-0.5 block text-sm font-black">Co robimy teraz?</strong>
        </div>
        <button
          type="button"
          onClick={() => {
            setManuallyOpened(false);
            setOpen(false);
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-sm text-white/60"
          aria-label="Zwiń instrukcję"
        >
          ×
        </button>
      </div>

      <div className="grid gap-px bg-white/8 sm:grid-cols-2">
        {labels.map(([label, key], index) => (
          <div key={key} className="bg-[#08151c]/98 px-4 py-3">
            <span className={`block text-[8px] font-black uppercase tracking-[.17em] ${index === 0 ? "text-emerald-300" : index === 3 ? "text-violet-300" : "text-cyan-300/55"}`}>
              {label}
            </span>
            <p className="mt-1 text-xs font-bold leading-5 text-zinc-200">{guidance[key]}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
