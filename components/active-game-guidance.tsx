"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import InGameGuidance from "@/components/in-game-guidance";

type Cue = {
  now: string;
  who: string;
  where: string;
  next: string;
};

type AnyState = Record<string, any>;

function vaBanqueCue(game: AnyState): Cue | null {
  const phase = String(game.phase ?? "");
  const viewer = game.viewer ?? null;
  const viewerId = viewer?.id ?? null;
  const main = game.winningPlayerId ?? null;
  const takeover = game.takeoverPlayerId ?? null;

  if (phase === "finished") return null;
  if (phase === "intro") return {
    now: "Przeczytajcie zasady i przygotujcie się do pierwszej kategorii.",
    who: "Wszyscy gracze",
    where: "Każdy na swoim telefonie",
    next: "System pokaże kategorię i rozpocznie licytację.",
  };
  if (phase === "category" || phase === "final_category") return {
    now: "Poznajcie kategorię. Jeszcze niczego nie wybierajcie.",
    who: "Wszyscy gracze",
    where: "Patrzcie na własne telefony",
    next: phase === "final_category" ? "Za chwilę wybierzecie finałową stawkę." : "Za chwilę rozpocznie się licytacja.",
  };
  if (phase === "bidding" || phase === "final_bidding") return {
    now: phase === "final_bidding" ? "Wybierz swoją finałową stawkę i zatwierdź." : "Wybierz stawkę albo spasuj i zatwierdź decyzję.",
    who: "Każdy gracz osobno",
    where: "Tylko własny telefon, nie pokazuj stawki innym",
    next: "Gdy wszyscy zatwierdzą, stawki zostaną odsłonięte.",
  };
  if (phase === "tie_bid") return {
    now: "Dogrywka licytacyjna, uczestnicy remisu wybierają kolejną decyzję.",
    who: Array.isArray(game.tiePlayerIds) && viewerId && game.tiePlayerIds.includes(viewerId) ? "Ty bierzesz udział w dogrywce" : "Tylko gracze objęci remisem",
    where: "Na własnych telefonach",
    next: "System rozstrzygnie, kto odpowiada.",
  };
  if (phase === "bid_reveal" || phase === "tie_reveal") return {
    now: "Sprawdźcie wynik licytacji.",
    who: "Wszyscy gracze",
    where: "Możecie patrzeć na swoje ekrany",
    next: "Za chwilę pytanie dostanie zwycięzca licytacji.",
  };
  if (phase === "question" || phase === "final_question") {
    const active = phase === "final_question" || viewerId === main;
    return {
      now: active ? "Przeczytaj pytanie, wybierz odpowiedź i zatwierdź." : "Poczekaj, aż osoba odpowiadająca podejmie decyzję.",
      who: phase === "final_question" ? "Każdy odpowiada na swoje finałowe pytanie" : active ? "Teraz odpowiadasz Ty" : "Odpowiada zwycięzca licytacji",
      where: "Na własnym telefonie",
      next: phase === "final_question" ? "Po odpowiedziach zobaczycie finałowe odsłonięcie." : "Po odpowiedzi zobaczycie wynik i możliwość przejęcia.",
    };
  }
  if (phase === "takeover_open") return {
    now: viewerId && viewerId !== main ? "Możesz przejąć pytanie, jeśli chcesz zaryzykować." : "Poczekaj, inni gracze mogą spróbować przejąć pytanie.",
    who: viewerId && viewerId !== main ? "Gracze, którzy nie odpowiadali" : "Pozostali gracze",
    where: "Na własnych telefonach",
    next: "Jeśli ktoś przejmie, odpowie na to pytanie. Jeśli nie, runda przejdzie dalej.",
  };
  if (phase === "takeover_question") return {
    now: viewerId === takeover ? "Odpowiedz na przejęte pytanie i zatwierdź." : "Poczekaj na odpowiedź gracza, który przejął pytanie.",
    who: viewerId === takeover ? "Teraz odpowiadasz Ty" : "Odpowiada gracz przejmujący",
    where: "Na własnym telefonie",
    next: "Po odpowiedzi zobaczycie wynik przejęcia.",
  };
  if (["main_result", "takeover_result", "round_result", "final_reveal"].includes(phase)) return {
    now: "Sprawdźcie wynik tego etapu.",
    who: "Wszyscy gracze",
    where: "Możecie patrzeć na swoje ekrany",
    next: phase === "final_reveal" ? "Za chwilę końcowy ranking." : "System przeprowadzi Was do kolejnego etapu.",
  };
  return null;
}

function szyfrCue(game: AnyState): Cue | null {
  if (["finished", "failed"].includes(String(game.phase ?? ""))) return null;
  const hasViewer = Boolean(game.viewer);
  return {
    now: hasViewer ? "Przeczytaj swoje prywatne wskazówki i opisz je zespołowi." : "Obserwuj postęp zespołu, prywatne wskazówki widzą tylko gracze.",
    who: hasViewer ? "Wszyscy gracze współpracują" : "Gracze z aktywnymi telefonami",
    where: hasViewer ? "Patrz tylko na swój telefon, nie pokazuj ekranu innym" : "Ten ekran jest tylko obserwatorem",
    next: "Gdy ustalicie rozwiązanie, dowolny gracz zatwierdza wspólną odpowiedź.",
  };
}

function tylkoMyCue(game: AnyState): Cue | null {
  if (game.finished) return null;
  const viewerId = game.viewerPlayerId ?? null;
  const viewerAnswered = Boolean(game.viewerAnswer);
  const revealed = Boolean(game.revealed);
  const subject = game.question?.subject?.name ?? null;

  if (revealed) return {
    now: "Porównajcie odpowiedzi i zobaczcie, czy złapaliście ten sam sygnał.",
    who: "Oboje",
    where: "Możecie już spojrzeć na swoje ekrany",
    next: "Po wyniku przejdziecie do następnego pytania.",
  };
  if (!viewerId) return {
    now: "Poczekajcie, aż obie osoby będą w aktywnej grze.",
    who: "Oboje gracze",
    where: "Każdy na swoim telefonie",
    next: "Pytanie ruszy, gdy oboje będziecie gotowi.",
  };
  if (viewerAnswered) return {
    now: "Twoja odpowiedź jest zapisana. Nie zdradzaj jej drugiej osobie.",
    who: "Teraz czekasz na drugiego gracza",
    where: "Zostań na swoim telefonie",
    next: "Gdy oboje odpowiecie, wynik odsłoni się automatycznie.",
  };
  return {
    now: subject ? `Odpowiedz na pytanie dotyczące: ${subject}.` : "Wybierz swoją odpowiedź i zatwierdź.",
    who: "Ty",
    where: "Tylko własny telefon, bez podglądania odpowiedzi drugiej osoby",
    next: "Po odpowiedzi poczekaj, aż druga osoba wybierze swoją.",
  };
}

function cueFor(slug: string, payload: AnyState): Cue | null {
  const game = payload?.game ?? payload;
  if (!game) return null;
  if (slug === "va-banque") return vaBanqueCue(game);
  if (slug === "szyfr") return szyfrCue(game);
  if (slug === "tylko-my") return tylkoMyCue(game);
  return null;
}

export default function ActiveGameGuidance() {
  const pathname = usePathname();
  const route = useMemo(() => {
    const match = pathname.match(/^\/gra\/([^/]+)\/([A-Z0-9]{4,6})\/?$/i);
    if (!match) return null;
    return { slug: match[1], code: match[2].toUpperCase() };
  }, [pathname]);
  const [cue, setCue] = useState<Cue | null>(null);

  const load = useCallback(async () => {
    if (!route || !["va-banque", "szyfr", "tylko-my"].includes(route.slug) || document.hidden) return;
    try {
      const response = await fetch(`/api/gra/${route.slug}/${route.code}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setCue(cueFor(route.slug, payload));
    } catch {
      // Instrukcja jest warstwą pomocniczą i nigdy nie może zatrzymać gry.
    }
  }, [route]);

  useEffect(() => {
    if (!route || !["va-banque", "szyfr", "tylko-my"].includes(route.slug)) {
      setCue(null);
      return;
    }
    void load();
    const timer = window.setInterval(() => void load(), 1600);
    document.addEventListener("visibilitychange", load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load, route]);

  if (!route || !cue) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-[105] mx-auto w-[calc(100%-1rem)] max-w-5xl px-1 sm:bottom-4">
      <InGameGuidance {...cue} compact />
    </div>
  );
}
