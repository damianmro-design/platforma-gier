"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GameHomeLink() {
  const pathname = usePathname();
  const show = pathname.startsWith("/gra/") || pathname.startsWith("/pokoj/");

  if (!show) return null;

  return (
    <Link
      href="/"
      aria-label="Wróć na stronę główną zaGRAj"
      className="fixed bottom-4 left-4 z-[100] inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#080a14]/90 px-4 py-2.5 text-xs font-black text-white shadow-2xl backdrop-blur-xl transition hover:border-violet-300/40 hover:bg-[#11152a]"
    >
      <span aria-hidden="true">←</span>
      zaGRAj
    </Link>
  );
}
