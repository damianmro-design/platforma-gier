"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type FinishedLobbyState = {
  room: {
    status: "lobby" | "active" | "finished";
    gameSlug: string;
  };
  currentPlayerId: string | null;
  isHost: boolean;
};

export default function AktaFinishedRecovery({ code }: { code: string }) {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openClosedCase = useCallback(() => {
    window.location.assign(`/gra/akta-nocy/${code}`);
  }, [code]);

  const checkExistingSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/pokoj/${code}`, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as FinishedLobbyState | null;

      if (!response.ok || !data) {
        setError("Nie udało się sprawdzić zamkniętej sprawy. Spróbuj ponownie.");
        return;
      }

      if (data.room.status !== "finished" || data.room.gameSlug !== "akta-nocy") {
        window.location.reload();
        return;
      }

      if (data.currentPlayerId || data.isHost) {
        openClosedCase();
      }
    } catch {
      setError("Nie udało się połączyć z pokojem. Spróbuj ponownie.");
    } finally {
      setChecking(false);
    }
  }, [code, openClosedCase]);

  useEffect(() => {
    void checkExistingSession();
  }, [checkExistingSession]);

  async function recover(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || recoveryCode.length !== 6) {
      setError("Wpisz imię użyte w grze i 6-znakowy kod powrotu.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/pokoj/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recover",
          name: name.trim(),
          recoveryCode,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true) {
        setError(result?.error ?? "Nie udało się odzyskać gracza. Sprawdź imię i kod powrotu.");
        return;
      }

      openClosedCase();
    } catch {
      setError("Nie udało się połączyć z pokojem. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <div className="lobby-loading">Sprawdzanie dostępu do zamkniętych akt…</div>;
  }

  return (
    <section className="player-join-panel room-already-started">
      <span className="lobby-label">POWRÓT DO ZAMKNIĘTEJ SPRAWY</span>
      <h2>Odzyskaj swoją postać</h2>
      <p>
        Jeśli brałeś udział w tej sprawie, wpisz dokładnie to samo imię oraz 6-znakowy
        kod powrotu zapisany w poczekalni. Wrócisz wyłącznie do finalnego, zamkniętego ekranu.
      </p>

      <form className="mt-5" onSubmit={recover}>
        <label className="player-name-label" htmlFor="finishedRecoverName">Twoje imię z gry</label>
        <input
          id="finishedRecoverName"
          className="player-name-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="np. Damian"
        />

        <label className="player-name-label" htmlFor="finishedRecoverCode">Kod powrotu</label>
        <input
          id="finishedRecoverCode"
          className="player-name-input"
          value={recoveryCode}
          onChange={(event) =>
            setRecoveryCode(
              event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
            )
          }
          maxLength={6}
          autoComplete="off"
          placeholder="ABC234"
        />

        <button
          className="join-player-button"
          type="submit"
          disabled={busy || !name.trim() || recoveryCode.length !== 6}
        >
          {busy ? "Odzyskiwanie…" : "WRÓĆ DO ZAMKNIĘTYCH AKT"}
        </button>
      </form>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Po zakończeniu sprawy nie można już dołączyć jako nowy gracz ani wznowić rozgrywki.
      </p>

      {error && <div className="lobby-error">{error}</div>}
    </section>
  );
}
