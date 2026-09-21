"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

export default function AuthFinishPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Kończymy logowanie…");

  useEffect(() => {
    const supabase = createPartyPlayAuthClient();
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next");
    const next =
      nextParam?.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/profil";

    const finish = async () => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();

        if (!error && data.session) {
          router.replace(next);
          router.refresh();
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      setMessage("Nie udało się dokończyć logowania. Wróć do ekranu logowania.");
    };

    void finish();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#050713] p-5 text-white">
      <div className="text-center">
        <span className="text-4xl">✦</span>
        <p className="mt-4 text-sm font-black text-violet-200">{message}</p>
      </div>
    </main>
  );
}
