"use client";

import { useEffect, useMemo, useState } from "react";

export default function RoomInvite({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const joinUrl = origin ? `${origin}/pokoj/${code}` : "";
  const qrUrl = useMemo(
    () =>
      joinUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(joinUrl)}`
        : "",
    [joinUrl],
  );

  async function copyLink() {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (!joinUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: `Dołącz do gry zaGRAj · ${code}`,
        text: `Dołącz do mojego pokoju zaGRAj. Kod: ${code}`,
        url: joinUrl,
      });
      return;
    }
    await copyLink();
  }

  return (
    <section className="mt-5 grid gap-4 rounded-3xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-[136px_1fr] sm:items-center">
      <div className="mx-auto grid h-[136px] w-[136px] place-items-center overflow-hidden rounded-2xl bg-white p-2">
        {qrUrl ? (
          <img src={qrUrl} alt={`Kod QR do pokoju ${code}`} className="h-full w-full" />
        ) : (
          <span className="text-xs font-black text-zinc-900">QR</span>
        )}
      </div>
      <div>
        <span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">
          SZYBKIE DOŁĄCZANIE
        </span>
        <h2 className="mt-1 text-lg font-black">Zeskanuj QR albo wyślij link znajomym</h2>
        <p className="mt-2 break-all text-xs leading-5 text-zinc-500">
          {joinUrl || `https://zagraj.fun/pokoj/${code}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl border border-white/10 bg-white/[.05] px-4 py-2.5 text-xs font-black text-zinc-200"
          >
            {copied ? "✓ Skopiowano" : "Kopiuj link"}
          </button>
          <button
            type="button"
            onClick={() => void shareLink()}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2.5 text-xs font-black text-white"
          >
            Udostępnij
          </button>
        </div>
      </div>
    </section>
  );
}
