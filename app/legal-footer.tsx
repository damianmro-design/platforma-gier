import Link from "next/link";
import { LEGAL_CONFIG } from "@/lib/legal-config";

export default function LegalFooter() {
  return (
    <footer className="mt-8 border-t border-white/8 pt-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">
        <Link href="/privacy" className="transition hover:text-violet-300">
          Polityka prywatności
        </Link>
        <Link href="/terms" className="transition hover:text-violet-300">
          Regulamin
        </Link>
        <Link href="/contact" className="transition hover:text-violet-300">
          Kontakt
        </Link>
        <a href={`mailto:${LEGAL_CONFIG.contactEmail}`} className="transition hover:text-violet-300">
          {LEGAL_CONFIG.contactEmail}
        </a>
      </div>
      <p className="mt-4 text-[9px] leading-4 text-zinc-700">
        zaGRAj to platforma gier towarzyskich. Elementy punktowe, poziomy, XP,
        wirtualne nagrody i fabularne kwoty w grach nie mają wartości pieniężnej,
        chyba że organizator konkretnego wydarzenia wyraźnie postanowi inaczej
        na własną odpowiedzialność.
      </p>
    </footer>
  );
}
