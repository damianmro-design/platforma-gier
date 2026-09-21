import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { lookupPlatformRoom } from "@/lib/platform-db";

type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function AktaNocyRoomPage({ params }: RoomPageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const room = await lookupPlatformRoom(code);

  if (!room || room.game_slug !== "akta-nocy") {
    notFound();
  }

  if (room.status === "lobby") {
    redirect(`/pokoj/${code}`);
  }

  const cookieStore = await cookies();
  const isHost = Boolean(cookieStore.get(`partyplay_host_${code}`)?.value);
  const isPlayer = Boolean(cookieStore.get(`partyplay_player_${code}`)?.value);

  if (!isHost && !isPlayer) {
    redirect(`/pokoj/${code}`);
  }

  return (
    <main className="min-h-screen bg-[#070504] text-[#f8eee2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(194,65,12,.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(127,29,29,.16),transparent_27%)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-orange-100/10 bg-[#120907] p-6 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-orange-300/60">
              Akta Nocy · Sprawa #001
            </p>
            <h1 className="mt-2 font-serif text-4xl font-black">Apartament 214</h1>
            <p className="mt-2 text-sm text-orange-50/50">
              Kod pokoju: <strong className="text-orange-100">{code}</strong>
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-orange-100/10 bg-white/[.03] px-4 py-3 text-sm font-black text-orange-50/80 transition hover:bg-white/[.07]"
          >
            Wróć do platformy
          </Link>
        </header>

        <section className="mt-8 rounded-[1.75rem] border border-red-400/15 bg-red-950/15 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.26em] text-red-300">
            Etap 00 · Akta osobowe
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.04em]">Rozgrywka została rozpoczęta.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
            Lobby działa już bez drużyn i prowadzi do osobnej przestrzeni Akt Nocy.
            W następnym etapie w tym miejscu każdy uczestnik otrzyma trwały przydział
            postaci, prywatny sekret, cel oraz własny fragment osi czasu.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[1.5rem] border border-orange-100/10 bg-[#120907] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.26em] text-red-300">
              Wspólna tablica
            </p>
            <h2 className="mt-3 text-2xl font-black">Miejsce zdarzenia zabezpieczone</h2>
            <p className="mt-3 text-sm leading-7 text-orange-50/50">
              Tu będą pojawiały się komunikaty prowadzące fabułę, paczki dowodowe,
              zdjęcia, logi, zeznania i rekonstrukcja wydarzeń.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-6">
            <p className="text-[10px] font-black uppercase tracking-[.26em] text-orange-300">
              {isHost ? "Panel prowadzącego" : "Twoje akta"}
            </p>
            <h2 className="mt-3 text-2xl font-black">
              {isHost ? "Sterowanie śledztwem" : "Karta postaci"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-orange-50/50">
              {isHost
                ? "Host będzie tutaj uruchamiał kolejne etapy śledztwa i ujawniał dowody."
                : "Tutaj pojawią się informacje widoczne wyłącznie dla Ciebie: rola, sekret, cel i oś czasu."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
