import Link from "next/link";
import { ReactNode } from "react";
import LegalFooter from "./legal-footer";

export default function LegalPageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.10),transparent_28%)]" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 transition hover:text-violet-300"
          >
            ← zaGRAj
          </Link>
          <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-7 w-auto" />
        </div>

        <header className="mt-10 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-[-.05em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
            {intro}
          </p>
        </header>

        <article className="mt-6 space-y-5">{children}</article>
        <LegalFooter />
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/8 bg-[#0a0d1c]/88 p-6 sm:p-8">
      <h2 className="text-lg font-black tracking-tight text-violet-200 sm:text-xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-400">
        {children}
      </div>
    </section>
  );
}
