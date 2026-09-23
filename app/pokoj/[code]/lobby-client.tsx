"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import { PartyPlayAvatar, PARTYPLAY_STARTER_AVATARS, normalizePartyPlayAvatar } from "@/components/partyplay-avatar";

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
    isTest?: boolean;
  };
  players: Player[];
  currentPlayerId: string | null;
  recoveryCode: string | null;
  isHost: boolean;
};

export default function LobbyClient({ code }: { code: string }) {
  const [data, setData] = useState<LobbyState | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("avatar-01");
  const [recoverName, setRecoverName] = useState("");
  const [recoverCode, setRecoverCode] = useState("");
  const [accountSignedIn, setAccountSignedIn] = useState(false);
  const [accountProfileReady, setAccountProfileReady] = useState(false);
  const autoJoinAttempted = useRef(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLobby = useCallback(async () => {
    try {
      const response = await fetch(`/api/pokoj/${code}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as LobbyState;

      if (next.room.status === "active" && (next.isHost || next.currentPlayerId)) {
        if (next.room.gameSlug === "co-ludzie-powiedza") {
          window.location.assign(`/gra/co-ludzie-powiedza/${code}`);
          return;
        }

        if (next.room.gameSlug === "zakrecone-haslo") {
          window.location.assign(`/gra/zakrecone-haslo/${code}`);
          return;
        }

        if (next.room.gameSlug === "pod-przykrywka") {
          window.location.assign(`/gra/pod-przykrywka/${code}`);
          return;
        }

        if (next.room.gameSlug === "akta-nocy") {
          window.location.assign(`/gra/akta-nocy/${code}`);
          return;
        }

        if (next.room.gameSlug === "tylko-my") {
          window.location.assign(`/gra/tylko-my/${code}`);
          return;
        }
      }

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

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!mounted || !userData.user || userData.user.is_anonymous === true) {
        if (mounted) setAccountProfileReady(true);
        return;
      }

      setAccountSignedIn(true);

      const { data: profileData } = await supabase.rpc("get_my_partyplay_profile");
      if (!mounted) return;

      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      const profileName =
        String(profile?.display_name ?? "").trim() ||
        String(userData.user.user_metadata?.full_name ?? "").trim() ||
        userData.user.email?.split("@")[0] ||
        "";

      const profileAvatar = normalizePartyPlayAvatar(String(profile?.avatar ?? "").trim());

      if (profileName) setName(profileName.slice(0, 20));
      setAvatar(profileAvatar);
      setAccountProfileReady(true);
    };

    void loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setInviteUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (
      !accountProfileReady ||
      !accountSignedIn ||
      !data ||
      data.currentPlayerId ||
      data.room.status !== "lobby" ||
      (data.isHost && (data.room.isTest || !["zakrecone-haslo", "tylko-my"].includes(data.room.gameSlug))) ||
      autoJoinAttempted.current
    ) {
      return;
    }

    autoJoinAttempted.current = true;

    const autoJoin = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token || !name.trim()) {
        autoJoinAttempted.current = false;
        return;
      }

      try {
        const response = await fetch(`/api/pokoj/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "join",
            name,
            avatar,
            partyPlayAccessToken: token,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          setError(result.error ?? "Nie udało się automatycznie dołączyć do pokoju.");
          autoJoinAttempted.current = false;
          return;
        }

        await loadLobby();
      } catch {
        setError("Nie udało się automatycznie dołączyć do pokoju.");
        autoJoinAttempted.current = false;
      }
    };

    void autoJoin();
  }, [
    accountProfileReady,
    accountSignedIn,
    avatar,
    code,
    data,
    loadLobby,
    name,
  ]);

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "Dołącz do gry w zaGRAj",
        text: `Kod pokoju: ${code}`,
        url: inviteUrl,
      });
      return;
    }
    await copyInvite();
  }

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

    const supabase = createPartyPlayAuthClient();
    const { data: sessionData } = await supabase.auth.getSession();

    await send({
      action: "join",
      name,
      avatar,
      partyPlayAccessToken: sessionData.session?.access_token ?? null,
    });
  }

  async function recover(event: FormEvent) {
    event.preventDefault();
    if (!recoverName.trim() || recoverCode.trim().length !== 6) {
      setError("Wpisz imię i 6-znakowy kod powrotu.");
      return;
    }

    await send({
      action: "recover",
      name: recoverName,
      recoveryCode: recoverCode,
    });
  }

  const me = data?.players.find((player) => player.id === data.currentPlayerId) ?? null;
  const isWordGame = data?.room.gameSlug === "zakrecone-haslo";
  const isUndercoverGame = data?.room.gameSlug === "pod-przykrywka";
  const isAktaNocy = data?.room.gameSlug === "akta-nocy";
  const isCoLudzie = data?.room.gameSlug === "co-ludzie-powiedza";
  const isTylkoMy = data?.room.gameSlug === "tylko-my";
  const isIndividualGame = isWordGame || isUndercoverGame || isAktaNocy || isTylkoMy;
  const minPlayers = isTylkoMy ? 2 : isWordGame ? 3 : isUndercoverGame ? 6 : isAktaNocy ? 5 : 4;
  const maxPlayers = isTylkoMy ? 2 : isWordGame || isAktaNocy ? 12 : 14;
  const teamA = data?.players.filter((player) => player.team === "A") ?? [];
  const teamB = data?.players.filter((player) => player.team === "B") ?? [];
  const waiting = isIndividualGame
    ? data?.players ?? []
    : data?.players.filter((player) => !player.team) ?? [];
  const allReady = Boolean(data?.players.length && data.players.every((player) => player.ready));
  const allAssigned = isIndividualGame
    ? true
    : Boolean(data?.players.length && data.players.every((player) => player.team));
  const canStart = Boolean(
    data?.isHost &&
    data.players.length >= minPlayers &&
    data.players.length <= maxPlayers &&
    allReady &&
    allAssigned,
  );

  const readyCount = useMemo(
    () => data?.players.filter((player) => player.ready).length ?? 0,
    [data?.players],
  );

  useEffect(() => {
    if (!data || (!isWordGame && !isTylkoMy) || !canStart || busy) return;
    const timer = window.setTimeout(() => {
      void send({ action: "start" });
    }, isTylkoMy ? 1200 : 1800);
    return () => window.clearTimeout(timer);
    // Te gry nie potrzebują osobnego prowadzącego do uruchomienia rozgrywki.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.room.status, isWordGame, isTylkoMy, canStart, busy]);

  if (!data) {
    return <div className="lobby-loading">Łączenie z pokojem…</div>;
  }

  const activeWithoutSession =
    data.room.status === "active" && !me && !data.isHost;

  return (
    <div className="lobby-live">
      {activeWithoutSession ? (
        <form className="player-join-panel room-already-started" onSubmit={recover}>
          <span className="lobby-label">ROZGRYWKA JUŻ TRWA</span>
          <h2>Nowi gracze nie mogą już dołączyć.</h2>
          <p>
            Jeśli wcześniej brałeś udział w tej grze, odzyskaj swoją postać
            za pomocą imienia i kodu powrotu pokazanego w lobby.
          </p>

          <label className="player-name-label" htmlFor="recoverName">Twoje imię</label>
          <input
            id="recoverName"
            className="player-name-input"
            value={recoverName}
            onChange={(event) => setRecoverName(event.target.value)}
            maxLength={20}
            autoComplete="off"
            placeholder="np. Damian"
          />

          <label className="player-name-label" htmlFor="recoverCode">Kod powrotu</label>
          <input
            id="recoverCode"
            className="player-name-input"
            value={recoverCode}
            onChange={(event) =>
              setRecoverCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
              )
            }
            maxLength={6}
            autoComplete="off"
            placeholder="ABC234"
          />

          <button className="join-player-button" type="submit" disabled={busy}>
            {busy ? "Odzyskiwanie…" : "Odzyskaj swoją postać"}
          </button>
        </form>
      ) : !me ? (
        data.isHost && data.room.isTest ? (
          <section className="player-join-panel">
            <span className="lobby-label">TRYB TESTOWY</span>
            <h2>Pokój jest gotowy bez innych osób</h2>
            <p>
              Boty tworzą pełną minimalną obsadę tej gry. Ty zostajesz prowadzącym
              i po starcie możesz przełączać widok między ekranem prowadzącego a
              każdym testerem.
            </p>
            {accountSignedIn && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] p-4">
                <PartyPlayAvatar id={avatar} size={58} />
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-[.15em] text-cyan-300">TESTER</span>
                  <strong className="mt-1 block text-base font-black">{name || "Damian"}</strong>
                  <small className="mt-1 block text-zinc-500">Nie zajmujesz miejsca gracza.</small>
                </div>
              </div>
            )}
          </section>
        ) : (
        <form className="player-join-panel" onSubmit={join}>
          <span className="lobby-label">DOŁĄCZ JAKO GRACZ</span>
          <h2>{accountSignedIn ? "Twój profil zaGRAj jest gotowy" : "Jak mamy Cię wyświetlać?"}</h2>
          {accountSignedIn ? (
            <p>Łączymy Cię automatycznie z nazwą i avatarem zapisanymi na Twoim koncie zaGRAj.</p>
          ) : (
            <p>
              Możesz wejść jako gość albo <a href={`/login?next=/pokoj/${code}`} className="font-black text-violet-300">zalogować się do zaGRAj</a>.
            </p>
          )}

          {accountSignedIn ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-300/[.05] p-4">
              <PartyPlayAvatar id={avatar} size={58} />
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[.15em] text-violet-300">TWÓJ PROFIL</span>
                <strong className="mt-1 block text-base font-black">{name || "Ładowanie…"}</strong>
              </div>
            </div>
          ) : (
            <>
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
                {PARTYPLAY_STARTER_AVATARS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={avatar === item.id ? "avatar-choice active" : "avatar-choice"}
                    onClick={() => setAvatar(item.id)}
                    aria-label={item.name}
                  >
                    <PartyPlayAvatar id={item.id} size={48} />
                  </button>
                ))}
              </div>

              <button className="join-player-button" type="submit" disabled={busy}>
                {busy ? "Dołączanie…" : "Dołącz jako gość"}
              </button>
            </>
          )}
        </form>
        )
      ) : (
        <section className="my-player-panel">
          <div className="my-player-avatar"><PartyPlayAvatar id={me.avatar} size={52} /></div>
          <div>
            <span>GRASZ JAKO</span>
            <strong>{me.display_name}</strong>
          </div>
          {data.recoveryCode && (
            <div className="recovery-code">
              <small>KOD POWROTU</small>
              <strong>{data.recoveryCode}</strong>
            </div>
          )}
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
            <h2>{data.players.length}/{maxPlayers} osób</h2>
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

        {isCoLudzie && allAssigned && data.players.length > 0 && (
          <div className="teams-layout">
            <Team title="Drużyna A" players={teamA} currentPlayerId={data.currentPlayerId} />
            <div className="versus">VS</div>
            <Team title="Drużyna B" players={teamB} currentPlayerId={data.currentPlayerId} />
          </div>
        )}
      </section>

      {data.isHost && (
        <>
          <section className="host-controls">
            <div className="w-full">
              <span className="lobby-label">{isTylkoMy ? "ZAPROŚ DRUGĄ OSOBĘ" : "ZAPROŚ GRACZY"}</span>
              <h3>{isTylkoMy ? "Wyślij kod, link albo pokaż QR" : "Kod, QR albo gotowy link"}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                {inviteUrl && (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`}
                    alt="Kod QR do pokoju"
                    className="h-36 w-36 rounded-2xl border border-white/10 bg-white p-2"
                  />
                )}
                <div className="min-w-0">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <small className="block text-[8px] font-black uppercase tracking-[.16em] text-zinc-500">KOD POKOJU</small>
                    <strong className="mt-1 block text-3xl font-black tracking-[.18em] text-violet-200">{code}</strong>
                    <p className="mt-2 break-all text-[10px] text-zinc-500">{inviteUrl}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => void copyInvite()} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-xs font-black text-zinc-300">
                      {copied ? "✓ Skopiowano" : "Kopiuj link"}
                    </button>
                    <button type="button" onClick={() => void shareInvite()} className="rounded-xl border border-violet-300/20 bg-violet-300/[.07] px-3 py-3 text-xs font-black text-violet-200">
                      Wyślij znajomym
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="host-controls">
          <div>
            <span className="lobby-label">{data.room.isTest ? "TRYB TESTOWY" : "STEROWANIE POKOJEM"}</span>
            <h3>
              {isTylkoMy
                ? "Gdy oboje będziecie gotowi, gra ruszy automatycznie"
                : isWordGame
                  ? "Gra ruszy automatycznie, gdy wszyscy będą gotowi"
                  : "Ty kontrolujesz start"}
            </h3>
          </div>
          <div className="host-buttons">
            {!isIndividualGame && (
              <button
                type="button"
                className="shuffle-button"
                disabled={busy || data.players.length < 2}
                onClick={() => void send({ action: "shuffle" })}
              >
                🎲 {allAssigned ? "Losuj ponownie" : "Podziel na drużyny"}
              </button>
            )}
            {isTylkoMy ? (
              <div className="rounded-xl border border-pink-300/20 bg-pink-300/[.07] px-4 py-3 text-xs font-black text-pink-100">
                ♡ START AUTOMATYCZNY
              </div>
            ) : (
              <button
                type="button"
                className="start-button"
                disabled={busy || !canStart}
                onClick={() => void send({ action: "start" })}
              >
                START GRY
              </button>
            )}
          </div>
          {!canStart && (
            <p className="start-hint">
              {isWordGame
                ? "Do startu: 3–12 osób i wszyscy oznaczeni jako gotowi."
                : isUndercoverGame
                  ? "Do startu: 6–14 osób i wszyscy oznaczeni jako gotowi."
                  : isAktaNocy
                    ? "Do startu: 5–12 osób i wszyscy oznaczeni jako gotowi."
                    : isTylkoMy
                      ? data.players.length < 2
                        ? "Dołączcie we 2 na telefonach. Gdy druga osoba wejdzie i oboje klikniecie „Gotowy”, gra wystartuje sama."
                        : "Kliknijcie „Gotowy” na obu telefonach. Potem startujemy automatycznie."
                      : "Do startu: min. 4 osoby, wszyscy gotowi i podzieleni na drużyny."}
            </p>
          )}
        </section>
        </>
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
      <span className="tile-avatar"><PartyPlayAvatar id={player.avatar} size={42} /></span>
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
