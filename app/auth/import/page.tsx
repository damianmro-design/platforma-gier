"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

export default function PartyPlayAuthImportPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Przenosimy Twoją sesję do zaGRAj…");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const requestedNext = params.get("next");
      const next =
        requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/profil";

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      if (!accessToken || !refreshToken) {
        setMessage("Nie udało się przenieść sesji. Zaloguj się do zaGRAj.");
        return;
      }

      const supabase = createPartyPlayAuthClient();
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error || !data.user || data.user.is_anonymous === true) {
        setMessage("Sesja wygasła. Zaloguj się ponownie do zaGRAj.");
        return;
      }

      router.replace(next);
      router.refresh();
    };

    void run();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#050713] p-5 text-white">
      <div className="text-center">
        <img src="/zagraj-logo.webp" alt="zaGRAj" className="mx-auto h-12 w-auto" />
        <p className="mt-4 max-w-sm text-sm font-black leading-6 text-violet-200">
          {message}
        </p>
      </div>
    </main>
  );
}
