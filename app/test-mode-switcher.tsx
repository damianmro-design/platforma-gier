"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type TestPlayer = {
  id: string;
  displayName: string;
  avatar: string;
};

export default function TestModeSwitcher() {
  const pathname = usePathname();
  const [players, setPlayers] = useState<TestPlayer[]>([]);
  const [view, setView] = useState("host");
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const parts = pathname.split("/").filter(Boolean);
  const code = parts[0] === "gra" && parts.length >= 3 ? parts[parts.length - 1] : "";

  const load = useCallback(async () => {
    if (!code) return;
    const response = await fetch(`/api/test-room/${code}`, { cache: "no-store" });
    if (!response.ok) {
      setEnabled(false);
      return;
    }
    const data = await response.json();
    setEnabled(true);
    setPlayers(data.players ?? []);
    setView(data.view ?? "host");
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!enabled || !code) return null;

  async function switchView(payload: Record<string, string>) {
    setBusy(true);
    try {
      const response = await fetch(`/api/test-room/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed right-4 top-4 z-[120]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-cyan-300/30 bg-[#07131b]/95 px-4 py-2 text-xs font-black text-cyan-100 shadow-2xl backdrop-blur-xl"
      >
        🧪 TEST
      </button>

      {open && (
        <div className="mt-2 w-72 rounded-2xl border border-cyan-300/20 bg-[#071018]/95 p-3 text-white shadow-2xl backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">
            Widok testera
          </p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">
            Przełączaj się między ekranem prowadzącego i każdym uczestnikiem bez innych osób.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void switchView({ view: "host" })}
            className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-left text-xs font-black ${view === "host" ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100" : "border-white/8 bg-white/[.03] text-zinc-400"}`}
          >
            🖥 Ekran / prowadzący
          </button>

          <div className="mt-2 max-h-64 space-y-1 overflow-auto">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={busy}
                onClick={() => void switchView({ view: "player", playerId: player.id })}
                className="w-full rounded-xl border border-white/8 bg-white/[.03] px-3 py-2.5 text-left text-xs font-bold text-zinc-300 hover:bg-white/[.06]"
              >
                📱 {player.displayName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
