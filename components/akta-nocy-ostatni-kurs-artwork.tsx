"use client";

import { OSTATNI_KURS_CARRIAGES } from "@/lib/akta-nocy-ostatni-kurs";

const PAPER = "#d8c8aa";
const INK = "#2a211a";
const RED = "#8f2d25";
const BLUE = "#18263a";
const GOLD = "#b8874e";

export function OstatniKursCover({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[16/9] min-h-[230px] overflow-hidden rounded-[1.7rem] border border-slate-200/10 bg-[#05070a] shadow-[0_30px_80px_rgba(0,0,0,.55)] ${className}`}
      role="img"
      aria-label="Akta Nocy, sprawa Ostatni Kurs, nocny pociąg N417 Orion"
    >
      <svg viewBox="0 0 1600 900" data-artwork="true" className="h-full w-full">
        <defs>
          <linearGradient id="ok-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#05070a" />
            <stop offset=".5" stopColor="#101927" />
            <stop offset="1" stopColor="#190b0d" />
          </linearGradient>
          <linearGradient id="ok-train" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#35445a" />
            <stop offset=".65" stopColor="#121a26" />
            <stop offset="1" stopColor="#070b11" />
          </linearGradient>
          <radialGradient id="ok-lamp">
            <stop offset="0" stopColor="#ffc66d" stopOpacity=".75" />
            <stop offset="1" stopColor="#ffc66d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#ok-bg)" />
        <circle cx="1250" cy="155" r="210" fill="url(#ok-lamp)" opacity=".42" />
        <path d="M0 715h1600v185H0z" fill="#030405" />
        <path d="M0 760h1600M0 815h1600" stroke="#5b4630" strokeWidth="6" opacity=".5" />

        <g transform="translate(580 290)">
          <path d="M20 130 180 20h675c120 0 218 82 240 195l28 145H0l10-170c2-22 5-40 10-60Z" fill="url(#ok-train)" stroke="#7d899b" strokeOpacity=".45" strokeWidth="4" />
          {[0,1,2,3,4,5].map((i) => (
            <g key={i}>
              <rect x={210+i*128} y="82" width="92" height="72" rx="10" fill="#e0a85b" opacity={i===4 ? .8 : .42} />
              <rect x={220+i*128} y="92" width="72" height="52" rx="7" fill="#121b28" />
            </g>
          ))}
          <circle cx="225" cy="366" r="57" fill="#050607" stroke="#596477" strokeWidth="14" />
          <circle cx="870" cy="366" r="57" fill="#050607" stroke="#596477" strokeWidth="14" />
          <path d="M102 233h866" stroke="#8d2632" strokeWidth="18" />
          <text x="120" y="320" fill="#cbd5e1" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="36" letterSpacing="8">N417 ORION</text>
        </g>

        <g transform="translate(92 110)">
          <text x="0" y="0" fill="#d3a969" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="900" letterSpacing="6">AKTA NOCY · SPRAWA 002</text>
          <text x="0" y="90" fill="#f7efe4" fontFamily="Georgia, serif" fontSize="92" fontWeight="700">OSTATNI</text>
          <text x="0" y="178" fill="#f7efe4" fontFamily="Georgia, serif" fontSize="92" fontWeight="700">KURS</text>
          <line x1="0" y1="216" x2="425" y2="216" stroke="#a73a36" strokeWidth="5" />
          <text x="0" y="265" fill="#aeb7c5" fontFamily="Arial, sans-serif" fontSize="21" letterSpacing="3">NOCNY EKSPRES · 6 WAGONÓW</text>
          <text x="0" y="305" fill="#aeb7c5" fontFamily="Arial, sans-serif" fontSize="21" letterSpacing="3">1 ZAGINIONY PASAŻER</text>
          <g transform="translate(0 355) rotate(-3)">
            <rect width="215" height="58" rx="6" fill="none" stroke="#bf4545" strokeWidth="4" />
            <text x="107" y="38" textAnchor="middle" fill="#ee8174" fontFamily="Arial, sans-serif" fontSize="23" fontWeight="900" letterSpacing="5">POUFNE</text>
          </g>
        </g>

        <g transform="translate(95 720)">
          <rect width="455" height="82" rx="13" fill="#d1c09f" opacity=".95" />
          <text x="26" y="34" fill="#4b3627" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24">„W pociągu nie ma miejsca,</text>
          <text x="26" y="65" fill="#4b3627" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24">w którym można po prostu zniknąć.”</text>
        </g>
      </svg>
    </div>
  );
}

export function OstatniKursTrainMap({
  selected = [],
  onToggle,
  compact = false,
}: {
  selected?: string[];
  onToggle?: (key: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300/10 bg-[#08101a]/95 p-4 shadow-[0_22px_70px_rgba(0,0,0,.4)] sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300/60">N417 ORION</span>
          <h3 className="mt-1 text-xl font-black text-slate-100">Mapa składu</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500">{onToggle ? "klikaj wagony, aby zaznaczać trasę" : "układ operacyjny"}</span>
      </div>
      <div className={`mt-5 grid gap-2 ${compact ? "grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
        {OSTATNI_KURS_CARRIAGES.map((carriage) => {
          const active = selected.includes(carriage.key);
          return (
            <button
              key={carriage.key}
              type="button"
              onClick={() => onToggle?.(carriage.key)}
              disabled={!onToggle}
              className={`relative overflow-hidden rounded-xl border p-3 text-left transition ${
                active
                  ? "border-amber-300/50 bg-amber-300/[.09] shadow-[0_0_35px_rgba(245,158,11,.12)]"
                  : "border-slate-200/10 bg-white/[.025]"
              }`}
            >
              <span className="block text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{carriage.short}</span>
              <strong className="mt-1 block text-sm text-slate-100">{carriage.title}</strong>
              {!compact && <small className="mt-2 block leading-5 text-slate-500">{carriage.copy}</small>}
              <span className="absolute bottom-0 left-0 h-1 w-full" style={{ background: carriage.accent }} />
            </button>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
          <div className="rounded-xl border border-red-300/10 bg-red-400/[.04] p-3">⛔ W3↔W4 zamknięte 00:46:00–00:54:20</div>
          <div className="rounded-xl border border-amber-300/10 bg-amber-300/[.04] p-3">🔑 W5↔W6 wymaga M-1</div>
        </div>
      )}
    </div>
  );
}

function PaperFrame({
  no,
  title,
  source,
  children,
}: {
  no: string;
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <div className="aspect-[4/5] min-h-[350px] overflow-hidden rounded-2xl border border-[#b79f78]/25 bg-[#0a0c10] p-4">
      <div className="relative h-full overflow-hidden rounded-lg bg-[#d8c8aa] shadow-[0_25px_60px_rgba(0,0,0,.45)]">
        <div className="border-b border-[#765f48]/25 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[.22em] text-[#7d2c28]">{no}</span>
              <h4 className="mt-1 font-serif text-xl font-black text-[#2a211a] sm:text-2xl">{title}</h4>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#705c48]">{source}</p>
            </div>
            <span className="rotate-[5deg] rounded border-2 border-[#8f2d25] px-2 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#8f2d25]">dowód</span>
          </div>
        </div>
        <div className="h-[calc(100%-94px)] overflow-hidden px-5 py-4 text-[#2a211a]">{children}</div>
      </div>
    </div>
  );
}

export function OstatniKursEvidenceArtwork({ id }: { id: string }) {
  if (id === "train-map") {
    return (
      <PaperFrame no="A-01" title="PLAN SKŁADU N417" source="Dokument operacyjny">
        <OstatniKursTrainMap compact />
        <p className="mt-4 text-xs font-bold leading-5 text-[#513f31]">W5: przedział Adriana · W6: magazyn i szafa S-3 · W3↔W4: reset 00:46–00:54:20.</p>
      </PaperFrame>
    );
  }

  if (id === "manifest") {
    const rows = [
      ["Adrian Socha","W5 · 7/42"],
      ["Kamil Drzewiecki","W2 · 3/18"],
      ["Nina Radecka","W4 · 10/31"],
      ["Zofia Rudzka","W2 · 5/27"],
      ["Filip Gajda","W1 · 12"],
    ];
    return (
      <PaperFrame no="A-02" title="MANIFEST PASAŻERÓW" source="System rezerwacyjny">
        <div className="rounded-lg border border-[#7c6751]/30">
          {rows.map(([name,seat],i)=>(
            <div key={name} className={`flex items-center justify-between gap-4 px-3 py-3 text-xs ${i%2 ? "bg-[#cdbb98]" : "bg-[#e1d2b5]"}`}>
              <strong>{name}</strong><span className="font-mono font-bold">{seat}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 border-l-4 border-[#8f2d25] pl-3 font-serif text-base font-bold italic">Rezerwacja mówi, gdzie ktoś miał spać. Nie mówi, gdzie naprawdę był.</p>
      </PaperFrame>
    );
  }

  if (id === "platform-coat" || id === "platform-return") {
    const twist = id === "platform-return";
    return (
      <PaperFrame no={twist ? "T-01" : "A-03"} title={twist ? "DRUGI KĄT KAMERY" : "KADR Z PERONU"} source={twist ? "P-4 · 00:53:06" : "P-2 · 00:52:31"}>
        <div className="relative h-[62%] overflow-hidden rounded-lg bg-[#111923]">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#2b3036]" />
          <div className="absolute left-[62%] top-[8%] h-[72%] w-9 bg-[#303842]" />
          <div className={`absolute top-[28%] h-32 w-16 rounded-t-full bg-[#c79b63] ${twist ? "left-[46%]" : "left-[63%]"}`}>
            <div className="absolute -top-5 left-4 h-10 w-9 rounded-full bg-[#151719]" />
            <div className="absolute -left-3 top-20 h-2 w-24 rotate-[8deg] bg-[#c79b63]" />
          </div>
          <div className="absolute left-4 top-4 rounded bg-black/65 px-3 py-2 font-mono text-[10px] text-amber-100">
            CAM {twist ? "P-4" : "P-2"} · {twist ? "00:53:06" : "00:52:31"}
          </div>
          {twist && <div className="absolute bottom-6 left-[36%] text-4xl text-red-400">↩</div>}
        </div>
        <p className="mt-4 font-serif text-lg font-black">{twist ? "POSTAĆ WRACA DO W6" : "PŁASZCZ ADRIANA?"}</p>
        <p className="mt-2 text-xs leading-5 text-[#5b4939]">{twist ? "Ta sama sylwetka zawraca za słupem. 57 sekund później pociąg odjeżdża." : "Twarz niewidoczna. Wyjście następuje z okolicy drzwi serwisowych W6."}</p>
      </PaperFrame>
    );
  }

  if (id === "master-key") {
    return (
      <PaperFrame no="A-04" title="KLUCZ SERWISOWY M-1" source="Notatka obsługi">
        <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center rounded-full border-[12px] border-[#9b7549] text-6xl">🔑</div>
        <div className="mt-6 space-y-2 font-mono text-sm">
          <p>00:31 · BRAK NA TABLICY</p>
          <p>— · BRAK PODPISU POBRANIA</p>
          <p>01:02 · KLUCZ ZNÓW NA HAKU</p>
        </div>
        <p className="mt-5 border-t border-[#75604a]/30 pt-4 text-xs font-bold">M-1: W5↔W6 · S-3 · tylne drzwi W6</p>
      </PaperFrame>
    );
  }

  if (id === "restaurant-receipt" || id === "receipt-metadata") {
    const meta = id === "receipt-metadata";
    return (
      <PaperFrame no={meta ? "B-01" : "A-05"} title={meta ? "LOG POS-3" : "PARAGON · STOLIK 4"} source="Wagon restauracyjny W3">
        <div className="mx-auto max-w-[280px] bg-[#efe5cf] p-5 font-mono text-xs shadow">
          <p className="text-center font-black">ORION · WAGON W3</p>
          <p className="mt-4">KAWA CZARNA ........ 12,00</p>
          <p>WODA ................. 8,00</p>
          <hr className="my-4 border-[#7d6954]/40" />
          <p className="font-black">{meta ? "UTWORZONO 00:34:12" : "CZAS 00:49:03"}</p>
          {meta && <><p>AUTORYZACJA 00:34:19</p><p className="mt-2 text-[#8f2d25]">SYNC / DRUK 00:49:03</p></>}
          <p className="mt-3">KARTA: K. DRZEWIECKI</p>
        </div>
        <p className="mt-5 font-serif text-base font-bold italic">{meta ? "00:49 nie jest godziną zamówienia." : "Czy to naprawdę alibi?"}</p>
      </PaperFrame>
    );
  }

  if (id === "service-door-log") {
    const rows=[["00:45:12","M-1","W5→W6"],["00:47:05","S-3","PLOMBA NARUSZONA"],["00:54:37","M-1","W6→W5"]];
    return (
      <PaperFrame no="B-02" title="LOG STREFY SERWISOWEJ" source="Sterownik W6">
        <div className="mt-2 overflow-hidden rounded-lg border border-[#6f5b47]/30">
          {rows.map(([time,key,event],i)=>(
            <div key={time} className={`grid grid-cols-[90px_70px_1fr] gap-2 px-3 py-4 font-mono text-xs ${i===1?"bg-[#c99286]":"bg-[#e3d5b8]"}`}>
              <strong>{time}</strong><span>{key}</span><strong className={i===1?"text-[#8f2d25]":""}>{event}</strong>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-5">Brak zaplanowanej pracy obsługi w W6 w całym tym przedziale.</p>
      </PaperFrame>
    );
  }

  if (id === "northbridge-file") {
    return (
      <PaperFrame no="B-03" title="NORTHBRIDGE / DO PRZEKAZANIA" source="Katalog Adriana">
        <div className="rounded-lg bg-[#ede1c8] p-4 text-xs leading-6">
          <p><strong>VEKTOR CARGO → NORTHBRIDGE CONSULTING</strong></p>
          <p>seria przelewów · zatwierdzenie: <strong className="text-[#8f2d25]">K.D.</strong></p>
          <p className="mt-5 font-serif text-lg font-bold italic">„Kamil — rozmowa 00:40, W5. Ostatnia szansa na wyjaśnienie.”</p>
          <p className="mt-5">ZAŁĄCZNIKI: karta pamięci / oryginalne potwierdzenia</p>
        </div>
        <div className="mt-5 rotate-[-2deg] border-4 border-[#8f2d25] p-3 text-center text-sm font-black uppercase tracking-[.15em] text-[#8f2d25]">DO PRZEKAZANIA RANO</div>
      </PaperFrame>
    );
  }

  if (id === "phone-wifi") {
    return (
      <PaperFrame no="B-04" title="ORION-W3 · LOG WI-FI" source="Punkt dostępowy wagonu W3">
        <div className="mt-5 rounded-lg bg-[#18263a] p-5 font-mono text-xs text-[#dbe8f7]">
          <p>DEVICE: KD-PHONE</p>
          <p className="mt-3 text-emerald-300">00:36:08 CONNECTED</p>
          <p>AP: ORION-W3</p>
          <p>ROAMING: NONE</p>
          <p className="mt-3 text-amber-300">00:56:02 ACTIVE USER</p>
        </div>
        <p className="mt-6 border-l-4 border-[#8f2d25] pl-3 font-serif text-lg font-bold italic">Telefon był w W3. Czy Kamil też?</p>
      </PaperFrame>
    );
  }

  if (id === "corridor-audio") {
    return (
      <PaperFrame no="B-05" title="NAGRANIE · W5" source="Dyktafon Niny · 00:41:38">
        <div className="mt-4 rounded-lg bg-[#111827] p-5">
          <div className="flex h-20 items-center gap-1">
            {[18,42,25,58,34,69,25,52,74,30,62,44,78,32,48,68,24,55,38,70].map((h,i)=>(
              <span key={i} className="w-1.5 rounded-full bg-amber-300/75" style={{height:h}} />
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3 font-serif text-base font-bold italic">
          <p>„Nie zabierzesz tego rano dalej.”</p>
          <p>„To już nie jest do cofnięcia.”</p>
          <p className="text-[#8f2d25]">00:42:18 · UDERZENIE / PRZESUNIĘCIE</p>
        </div>
      </PaperFrame>
    );
  }

  return (
    <PaperFrame no="—" title="MATERIAŁ DOWODOWY" source="Akta Nocy">
      <p className="mt-10 text-sm">Brak podglądu dla tego dokumentu.</p>
    </PaperFrame>
  );
}

export function OstatniKursStageArtwork({
  kind,
}: {
  kind: "map" | "reconstruction" | "accusation" | "reveal" | "closed";
}) {
  const data = {
    map: ["MAPA POCIĄGU","Kto mógł przejść tę trasę?","🗺️"],
    reconstruction: ["REKONSTRUKCJA","Ułóż minuty Ostatniego Kursu","🧩"],
    accusation: ["AKT OSKARŻENIA","Nazwisko, motyw, sposób, dowód","⚖️"],
    reveal: ["UJAWNIENIE","Prawdziwa trasa wychodzi na jaw","🚆"],
    closed: ["SPRAWA ZAMKNIĘTA","N417 dotarł do końca trasy","✓"],
  }[kind];
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-300/10 bg-[linear-gradient(135deg,#0a1019,#171015)] p-6 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      <div className="flex min-h-[180px] items-center justify-between gap-6">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300/60">AKTA NOCY · 002</span>
          <h3 className="mt-3 font-serif text-3xl font-black text-slate-100">{data[0]}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{data[1]}</p>
        </div>
        <span className="text-7xl opacity-70">{data[2]}</span>
      </div>
    </div>
  );
}
