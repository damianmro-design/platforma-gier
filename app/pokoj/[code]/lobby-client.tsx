"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
  ready: boolean;
};

type LobbyState = {
  room: {
    code: string;
    gameSlug: string;
    status: "lobby" | "active" | "finished";
  };
  players: Player[];
  currentPlayerId: string | null;
  isHost: boolean;
};

const AVATARS = [
  ["lion", "🦁"],
  ["fox", "🦊"],
  ["panda", "🐼"],
  ["tiger", "🐯"],
  ["koala", "🐨"],
  ["owl", "🦉"],
  ["frog", "🐸"],
  ["penguin", "🐧"],
  ["bear", "🐻"],
  ["rabbit", "🐰"],
  ["monkey", "🐵"],
  ["cat", "🐱"],
] as const;

const AVATAR_EMOJI = Object.fromEntries(AVATARS) as Record<string, string>;

export default function LobbyClient({ code }: { code: string }) {
  const [data, setData] = useState<LobbyState | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("lion");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLobby = useCallback(async () => {
    try {
      const response = await fetch(`/api/pokoj/${code}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as LobbyState;
      setData(next);
    } catch {
      // Kolejny polling spróbuje ponownie.
    }
  }, [code]);

  useEffect(() => {
    void loadLobby();
    const timer = window.setInterval(() => void loadLobby(), 1400);
    return () => window.clearInterval(timer);
  }, [loadLobby]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/pokoj/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Coś poszło nie tak.");
        return false;
      }

      await loadLobby();
      return true;
    } catch {
      setError("Nie udało się połączyć z pokojem.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Wpisz swoje imię.");
      return;
    }

    await send({ action: "join", name, avatar });
  }

  const me = data?.players.find((player) => player.id === data.currentPlayerId) ?? null;
  const teamA = data?.players.filter((player) => player.team === "A") ?? [];
  const teamB = data?.players.filter((player) => player.team === "B") ?? [];
  const waiting = data?.players.filter((player) => !player.team) ?? [];
  const allReady = Boolean(data?.players.length && data.players.every((player) => player.ready));
  const allAssigned = Boolean(data?.players.length && data.players.every((player) => player.team));
  const canStart = Boolean(data?.isHost && data.players.length >= 4 && allReady && allAssigned);

  const readyCount = useMemo(
    () => data?.players.filter((player) => player.ready).length ?? 0,
    [data?.players],
  );

  if (!data) {
    return <div className="lobby-loading">Łączenie z pokojem…</div>;
  }

  if (data.room.status === "active") {
    return (
      <section className="lobby-started">
        <span>GRA WYSTARTOWAŁA</span>
        <h2>Wszyscy gotowi!</h2>
        <p>Poczekalnia zadziałała. Następny etap to przekierowanie do pierwszej rundy gry.</p>
      </section>
    );
  }

  return (
    <div className="lobby-live">
      {!me ? (
        <form className="player-join-panel" onSubmit={join}>
          <span className="lobby-label">DOŁĄCZ JAKO GRACZ</span>
          <h2>Jak mamy Cię wyświetlać?</h2>

          <label className="player-name-label" htmlFor="playerName">Twoje imię</label>
          <input
            id="playerName"
            className="player-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            autoComplete="off"
            placeholder="np. Damian"
          />

          <p className="avatar-label">Wybierz avatar</p>
          <div className="avatar-grid">
            {AVATARS.map(([id, emoji]) => (
              <button
                key={id}
                type="button"
                className={avatar === id ? "avatar-choice active" : "avatar-choice"}
                onClick={() => setAvatar(id)}
                aria-label={id}
              >
                {emoji}
              </button>
            ))}
          </div>

          <button className="join-player-button" type="submit" disabled={busy}>
            {busy ? "Dołączanie…" : "Dołącz do pokoju"}
          </button>
        </form>
      ) : (
        <section className="my-player-panel">
          <div className="my-player-avatar">{AVATAR_EMOJI[me.avatar] ?? "🎮"}</div>
          <div>
            <span>GRASZ JAKO</span>
            <strong>{me.display_name}</strong>
          </div>
          <button
            type="button"
            className={me.ready ? "ready-button ready" : "ready-button"}
            onClick={() => void send({ action: "ready", ready: !me.ready })}
            disabled={busy}
          >
            {me.ready ? "✓ Gotowy" : "Jestem gotowy"}
          </button>
        </section>
      )}

      {error && <div className="lobby-error">{error}</div>}

      <section className="lobby-roster">
        <div className="roster-head">
          <div>
            <span className="lobby-label">UCZESTNICY</span>
            <h2>{data.players.length}/14 osób</h2>
          </div>
          <div className="ready-counter">{readyCount}/{data.players.length} gotowych</div>
        </div>

        {waiting.length > 0 && (
          <div className="waiting-grid">
            {waiting.map((player) => (
              <PlayerTile key={player.id} player={player} current={player.id === data.currentPlayerId} />
            ))}
          </div>
        )}

        {allAssigned && data.players.length > 0 && (
          <div className="teams-layout">
            <Team title="Drużyna A" players={teamA} currentPlayerId={data.currentPlayerId} />
            <div className="versus">VS</div>
            <Team title="Drużyna B" players={teamB} currentPlayerId={data.currentPlayerId} />
          </div>
        )}
      </section>

      {data.isHost && (
        <section className="host-controls">
          <div>
            <span className="lobby-label">STEROWANIE HOSTA</span>
            <h3>Ty kontrolujesz start</h3>
          </div>
          <div className="host-buttons">
            <button
              type="button"
              className="shuffle-button"
              disabled={busy || data.players.length < 2}
              onClick={() => void send({ action: "shuffle" })}
            >
              🎲 {allAssigned ? "Losuj ponownie" : "Podziel na drużyny"}
            </button>
            <button
              type="button"
              className="start-button"
              disabled={busy || !canStart}
              onClick={() => void send({ action: "start" })}
            >
              START GRY
            </button>
          </div>
          {!canStart && (
            <p className="start-hint">
              Do startu: min. 4 osoby, wszyscy gotowi i podzieleni na drużyny.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function PlayerTile({
  player,
  current,
}: {
  player: Player;
  current: boolean;
}) {
  return (
    <article className={current ? "player-tile current" : "player-tile"}>
      <span className="tile-avatar">{AVATAR_EMOJI[player.avatar] ?? "🎮"}</span>
      <strong>{player.display_name}</strong>
      <small className={player.ready ? "player-ready yes" : "player-ready"}>
        {player.ready ? "✓ GOTOWY" : "czeka"}
      </small>
    </article>
  );
}

function Team({
  title,
  players,
  currentPlayerId,
}: {
  title: string;
  players: Player[];
  currentPlayerId: string | null;
}) {
  return (
    <section className="team-card">
      <h3>{title}</h3>
      <div>
        {players.map((player) => (
          <PlayerTile
            key={player.id}
            player={player}
            current={player.id === currentPlayerId}
          />
        ))}
      </div>
    </section>
  );
}
