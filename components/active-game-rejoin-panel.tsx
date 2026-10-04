"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type RejoinRequest = {
  request_id: string;
  player_id: string;
  display_name: string;
  avatar: string;
  created_at: string;
};

type RoomState = {
  room?: {
    status?: string;
    gameSlug?: string;
  };
  isHost?: boolean;
  rejoinRequests?: RejoinRequest[];
};

export default function ActiveGameRejoinPanel() {
  const pathname = usePathname();
  const route = useMemo(() => {
    const match = pathname.match(/^\/gra\/([^/]+)\/([A-Z0-9]{4,6})\/?$/i);
    if (!match) return null;
    return { slug: match[1], code: match[2].toUpperCase() };
  }, [pathname]);

  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [requests, setRequests] = useState<RejoinRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!route || route.slug === "zakrecone-haslo" || document.hidden) return;

    try {
      const response = await fetch(`/api/pokoj/${route.code}`, { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as RoomState;
      const active = data.room?.status === "active";
      setIsRoomOwner(Boolean(active && data.isHost));
      setRequests(active && data.isHost && Array.isArray(data.rejoinRequests) ? data.rejoinRequests : []);
    } catch {
      // Kolejny polling ponowi próbę. Nie zasłaniamy gry błędem sieci.
    }
  }, [route]);

  useEffect(() => {
    if (!route || route.slug === "zakrecone-haslo") return;

    void load();
    const timer = window.setInterval(() => void load(), 1800);
    document.addEventListener("visibilitychange", load);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load, route]);

  async function approve(requestId: string) {
    if (!route || busyId) return;
    setBusyId(requestId);
    setError("");

    try {
      const response = await fetch(`/api/pokoj/${route.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approveRejoin", requestId }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? "Nie udało się przywrócić gracza.");
        return;
      }

      setRequests((current) => current.filter((item) => item.request_id !== requestId));
      await load();
    } catch {
      setError("Nie udało się przywrócić gracza. Spróbuj ponownie.");
    } finally {
      setBusyId(null);
    }
  }

  if (!route || route.slug === "zakrecone-haslo" || !isRoomOwner || requests.length === 0) {
    return null;
  }

  return (
    <aside
      className="fixed bottom-4 right-4 z-[120] w-[min(92vw,360px)] rounded-3xl border border-emerald-300/25 bg-[#07130f]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl"
      aria-live="polite"
      aria-label="Prośby graczy o powrót do gry"
    >
      <div className="mb-3">
        <span className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">
          POWRÓT DO GRY
        </span>
        <h2 className="mt-1 text-base font-black">
          {requests.length === 1 ? "Gracz chce wrócić" : `${requests.length} graczy chce wrócić`}
        </h2>
        <p className="mt-1 text-xs leading-5 text-emerald-50/55">
          Zatwierdź tylko osobę, którą rozpoznajesz. Po akceptacji jej telefon wróci do bieżącego etapu automatycznie.
        </p>
      </div>

      <div className="space-y-2">
        {requests.map((request) => (
          <div
            key={request.request_id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3"
          >
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[.15em] text-emerald-300/70">
                PROŚBA O POWRÓT
              </span>
              <strong className="mt-1 block truncate text-sm">{request.display_name}</strong>
            </div>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void approve(request.request_id)}
              className="shrink-0 rounded-xl bg-emerald-300 px-3 py-2.5 text-[11px] font-black text-emerald-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId === request.request_id ? "WPUSZCZAM…" : "WPUŚĆ Z POWROTEM"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-300/20 bg-red-400/[.08] px-3 py-2 text-xs font-bold text-red-100">
          {error}
        </p>
      )}
    </aside>
  );
}
