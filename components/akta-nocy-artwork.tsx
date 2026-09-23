"use client";

import { useState, type ReactNode } from "react";

export type AktaNocyEvidenceArtworkId =
  | "monitoring-gap"
  | "door-log"
  | "late-message"
  | "missing-drive"
  | "scheduled-message"
  | "mirror-photo"
  | "hallway-audio"
  | "medical-window"
  | "wicher-file";

export type AktaNocyStageArtworkKind =
  | "reconstruction"
  | "accusation"
  | "reveal"
  | "culprit"
  | "closed";

const PAPER = "#d9c6a4";
const PAPER_DARK = "#b59d79";
const INK = "#241a15";
const RED = "#8f251e";
const GOLD = "#b97838";
const NIGHT = "#090605";

function EvidenceFrame({
  children,
  label,
  number,
}: {
  children: ReactNode;
  label: string;
  number: string;
}) {
  return (
    <svg
      viewBox="0 0 900 1125"
      data-artwork="true"
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`paper-${number}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ead9b8" />
          <stop offset=".55" stopColor={PAPER} />
          <stop offset="1" stopColor="#bda57f" />
        </linearGradient>
        <filter id={`shadow-${number}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#000" floodOpacity=".55" />
        </filter>
        <pattern id={`grain-${number}`} width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="11" r="1" fill="#23170f" opacity=".045" />
          <circle cx="34" cy="18" r=".8" fill="#23170f" opacity=".035" />
          <circle cx="20" cy="39" r=".7" fill="#23170f" opacity=".04" />
          <path d="M2 29h16M29 4h10" stroke="#6a4b36" strokeWidth=".7" opacity=".035" />
        </pattern>
        <radialGradient id={`vignette-${number}`} cx=".5" cy=".45" r=".75">
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </radialGradient>
      </defs>

      <rect width="900" height="1125" fill="#090605" />
      <g transform="translate(62 48) rotate(-1 388 505)" filter={`url(#shadow-${number})`}>
        <rect width="776" height="1018" rx="9" fill={`url(#paper-${number})`} />
        <rect width="776" height="1018" rx="9" fill={`url(#grain-${number})`} />
        <path d="M0 0h776v1018H0z" fill={`url(#vignette-${number})`} opacity=".22" />
        <path d="M24 19h728M24 994h728" stroke="#6e513c" strokeOpacity=".25" />
        <g transform="translate(46 42)">
          <text x="0" y="22" fill={INK} fontFamily="Georgia, serif" fontWeight="700" fontSize="20" letterSpacing="4">
            HOTEL NOCTIS · WARSZAWA
          </text>
          <text x="0" y="53" fill="#664c39" fontFamily="Arial, sans-serif" fontSize="11" letterSpacing="2">
            AKTA NOCY · SPRAWA 001 · APARTAMENT 214
          </text>
          <text x="640" y="20" textAnchor="end" fill={RED} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="15" letterSpacing="3">
            DOWÓD {number}
          </text>
          <line x1="0" y1="72" x2="684" y2="72" stroke="#6f513d" strokeOpacity=".5" strokeWidth="2" />
        </g>
        <g transform="translate(46 132)">{children}</g>
      </g>
    </svg>
  );
}

function Stamp({ x, y, text, rotate = -5 }: { x: number; y: number; text: string; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect width="250" height="54" rx="5" fill="none" stroke={RED} strokeWidth="4" opacity=".8" />
      <text x="125" y="35" textAnchor="middle" fill={RED} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="19" letterSpacing="3">
        {text}
      </text>
    </g>
  );
}

function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <text x="0" y="34" fill={INK} fontFamily="Georgia, serif" fontWeight="700" fontSize="42">
        {title}
      </text>
      <text x="0" y="68" fill="#6d513c" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="14" letterSpacing="2">
        {subtitle}
      </text>
      <line x1="0" y1="91" x2="684" y2="91" stroke="#6f513d" strokeOpacity=".5" />
    </>
  );
}

function SmallText({ x, y, children, bold = false }: { x: number; y: number; children: ReactNode; bold?: boolean }) {
  return (
    <text x={x} y={y} fill={INK} fontFamily="Arial, sans-serif" fontWeight={bold ? "800" : "500"} fontSize="16">
      {children}
    </text>
  );
}

function MonitoringArt() {
  return (
    <EvidenceFrame label="Raport monitoringu z luką w nagraniu" number="A-01">
      <Title title="RAPORT MONITORINGU" subtitle="KAMERA C-02 · KORYTARZ, PIĘTRO 2" />
      <g transform="translate(0 126)">
        <rect width="684" height="300" rx="8" fill="#18130f" stroke="#5e4b3c" strokeWidth="3" />
        <g opacity=".85">
          <rect x="28" y="36" width="220" height="210" fill="#0b0b0a" stroke="#7b684f" />
          <path d="M28 246 100 70h75l73 176" fill="#18120d" />
          <path d="M138 70v176" stroke="#7b4b26" strokeWidth="10" opacity=".5" />
          <text x="48" y="228" fill="#d4c3a8" fontFamily="monospace" fontSize="13">22:48:12</text>
          <rect x="436" y="36" width="220" height="210" fill="#0b0b0a" stroke="#7b684f" />
          <path d="M436 246 508 70h75l73 176" fill="#18120d" />
          <path d="M546 70v176" stroke="#7b4b26" strokeWidth="10" opacity=".5" />
          <text x="456" y="228" fill="#d4c3a8" fontFamily="monospace" fontSize="13">22:56:08</text>
        </g>
        <rect x="260" y="78" width="164" height="110" rx="8" fill="#070605" stroke={RED} strokeWidth="3" />
        <text x="342" y="122" textAnchor="middle" fill="#d8c6a8" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="15">BRAK</text>
        <text x="342" y="148" textAnchor="middle" fill="#d8c6a8" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="15">NAGRANIA</text>
        <text x="342" y="173" textAnchor="middle" fill="#a94a3d" fontFamily="monospace" fontSize="12">07:54 MIN</text>
      </g>
      <Stamp x={420} y={466} text="LUKA 22:48–22:56" rotate={-3} />
      <g transform="translate(0 560)">
        <SmallText x={0} y={0} bold>USTALENIA TECHNICZNE</SmallText>
        <SmallText x={0} y={42}>• brak dotyczy wyłącznie kamery C-02</SmallText>
        <SmallText x={0} y={76}>• system nie został uruchomiony ponownie</SmallText>
        <SmallText x={0} y={110}>• zapis wraca dokładnie o 22:56:08</SmallText>
        <SmallText x={0} y={144}>• możliwa ręczna ingerencja w zapis</SmallText>
        <line x1="0" y1="182" x2="684" y2="182" stroke="#876b52" opacity=".45" />
        <SmallText x={0} y={226} bold>PYTANIE ŚLEDCZE</SmallText>
        <text x="0" y="264" fill={RED} fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="24">
          Kto skorzystał z niemal ośmiu minut ciemności?
        </text>
      </g>
    </EvidenceFrame>
  );
}

function DoorLogArt() {
  const rows = [
    ["22:47:31", "KARTA 214", "DOSTĘP PRZYJĘTY"],
    ["22:47:36", "DRZWI", "OTWARCIE"],
    ["22:47:40", "DRZWI", "ZAMKNIĘCIE"],
    ["22:49:32", "OD WEWNĄTRZ", "OTWARCIE"],
    ["22:49:38", "DRZWI", "ZAMKNIĘCIE"],
    ["22:54:09", "OD WEWNĄTRZ", "OTWARCIE"],
    ["22:54:14", "DRZWI", "ZAMKNIĘCIE"],
    ["23:05:41", "MASTER", "DOSTĘP SERWISOWY"],
  ];
  return (
    <EvidenceFrame label="Rejestr wejść do apartamentu 214" number="A-02">
      <Title title="REJESTR ZAMKA" subtitle="APARTAMENT 214 · CZYTNIK HN-214" />
      <g transform="translate(0 132)">
        <rect width="684" height="420" rx="6" fill="#cbb893" stroke="#6e513c" strokeWidth="2" />
        <rect width="684" height="42" fill="#423126" />
        <text x="24" y="27" fill="#ead9b8" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="13">CZAS</text>
        <text x="180" y="27" fill="#ead9b8" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="13">ŹRÓDŁO</text>
        <text x="420" y="27" fill="#ead9b8" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="13">ZDARZENIE</text>
        {rows.map((row, index) => (
          <g key={row[0]} transform={`translate(0 ${42 + index * 46})`}>
            <rect width="684" height="46" fill={index === 3 || index === 5 ? "#cda991" : index % 2 ? "#d7c5a4" : "#dfcfaf"} />
            <text x="24" y="30" fill={INK} fontFamily="monospace" fontWeight="700" fontSize="16">{row[0]}</text>
            <text x="180" y="30" fill={INK} fontFamily="Arial, sans-serif" fontWeight="700" fontSize="14">{row[1]}</text>
            <text x="420" y="30" fill={index === 3 || index === 5 ? RED : INK} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="13">{row[2]}</text>
          </g>
        ))}
        <ellipse cx="475" cy="295" rx="185" ry="31" fill="none" stroke={RED} strokeWidth="5" transform="rotate(-2 475 295)" />
      </g>
      <Stamp x={420} y={580} text="WYJŚCIE 22:54" />
      <g transform="translate(0 675)">
        <SmallText x={0} y={0} bold>UWAGA</SmallText>
        <SmallText x={0} y={42}>O 22:49 i 22:54 drzwi otwarto od środka.</SmallText>
        <SmallText x={0} y={76}>W obu przypadkach nie zarejestrowano użycia karty.</SmallText>
        <line x1="0" y1="122" x2="684" y2="122" stroke="#876b52" opacity=".45" />
        <text x="0" y="180" fill={RED} fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="21">
          Kogo wpuszczono o 22:49 i kto wyszedł o 22:54?
        </text>
      </g>
    </EvidenceFrame>
  );
}

function MessageArt({ scheduled = false }: { scheduled?: boolean }) {
  return (
    <EvidenceFrame label={scheduled ? "Metadane zaplanowanej wiadomości" : "Wiadomość wysłana o 23:02"} number={scheduled ? "B-01" : "A-03"}>
      <Title
        title={scheduled ? "METADANE WIADOMOŚCI" : "WIADOMOŚĆ 23:02"}
        subtitle={scheduled ? "EKSPORT Z SESJI LAPTOPA MARKA RADECKIEGO" : "KONTO MARKA RADECKIEGO → OSKAR DĘBSKI"}
      />
      <g transform="translate(120 126)">
        <rect width="444" height="530" rx="52" fill="#171513" stroke="#45372d" strokeWidth="7" />
        <rect x="24" y="44" width="396" height="426" rx="22" fill="#0b0b0b" />
        <circle cx="222" cy="22" r="8" fill="#3b312a" />
        <text x="222" y="92" textAnchor="middle" fill="#d7c9b7" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="20">Oskar Dębski</text>
        <rect x="72" y="146" width="300" height="142" rx="24" fill="#2d2b29" />
        <text x="96" y="184" fill="#f1ece6" fontFamily="Arial, sans-serif" fontSize="16">Nie publikuj nic.</text>
        <text x="96" y="214" fill="#f1ece6" fontFamily="Arial, sans-serif" fontSize="16">Muszę to sprawdzić</text>
        <text x="96" y="244" fill="#f1ece6" fontFamily="Arial, sans-serif" fontSize="16">jeszcze raz.</text>
        <text x="96" y="274" fill="#f1ece6" fontFamily="Arial, sans-serif" fontSize="16">Odezwę się rano.</text>
        <text x="330" y="315" textAnchor="end" fill="#8b8178" fontFamily="monospace" fontSize="14">23:02</text>
        {scheduled && (
          <>
            <rect x="58" y="340" width="328" height="88" rx="12" fill="#17110e" stroke={RED} strokeWidth="2" />
            <text x="222" y="374" textAnchor="middle" fill="#cda98d" fontFamily="monospace" fontSize="13">UTWORZONO: 22:53:41</text>
            <text x="222" y="401" textAnchor="middle" fill="#e97868" fontFamily="monospace" fontWeight="800" fontSize="13">WYŚLIJ O: 23:02:00</text>
          </>
        )}
      </g>
      {scheduled ? (
        <Stamp x={400} y={700} text="ZAPLANOWANO 22:53" rotate={-4} />
      ) : (
        <Stamp x={430} y={700} text="WYSŁANO 23:02" rotate={-4} />
      )}
      <g transform="translate(0 820)">
        <SmallText x={0} y={0} bold>{scheduled ? "WNIOSKI Z METADANYCH" : "CO WIEMY"}</SmallText>
        <SmallText x={0} y={42}>{scheduled ? "• wiadomość pochodziła z laptopa, nie telefonu" : "• wiadomość została dostarczona o 23:02"}</SmallText>
        <SmallText x={0} y={76}>{scheduled ? "• ustawiono ją kilka minut wcześniej" : "• sam czas wysyłki nie dowodzi, że Marek żył"}</SmallText>
      </g>
    </EvidenceFrame>
  );
}

function DriveArt() {
  return (
    <EvidenceFrame label="Puste etui po pendrivie" number="A-04">
      <Title title="BRAKUJĄCY NOŚNIK" subtitle="MIEJSCE UJAWNIENIA · BIURKO W APARTAMENCIE 214" />
      <g transform="translate(42 130)">
        <rect x="40" y="42" width="520" height="500" rx="26" fill="#aaa08f" fillOpacity=".35" stroke="#6d5b49" strokeWidth="3" />
        <path d="M70 85h460l34 410H34Z" fill="#d9d1c4" fillOpacity=".18" stroke="#8f8170" strokeWidth="4" />
        <rect x="178" y="174" width="285" height="150" rx="28" fill="#151311" transform="rotate(8 320 250)" />
        <rect x="408" y="211" width="140" height="70" rx="8" fill="#9b8b71" transform="rotate(8 478 246)" />
        <rect x="432" y="226" width="24" height="30" fill="#292522" transform="rotate(8 444 241)" />
        <rect x="480" y="233" width="24" height="30" fill="#292522" transform="rotate(8 492 248)" />
        <rect x="116" y="52" width="355" height="110" rx="8" fill={PAPER} stroke="#75614d" strokeWidth="2" transform="rotate(-4 294 107)" />
        <text x="292" y="104" textAnchor="middle" fill={INK} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="32" transform="rotate(-4 292 104)">DOWÓD A</text>
        <text x="292" y="142" textAnchor="middle" fill={INK} fontFamily="Georgia, serif" fontSize="24" transform="rotate(-4 292 142)">PENDRIVE — BRAK</text>
        <path d="M135 420c52-62 120-58 168-3M385 430c38-48 91-50 134-4" fill="none" stroke="#3d332c" strokeOpacity=".35" strokeWidth="8" strokeLinecap="round" />
      </g>
      <Stamp x={390} y={660} text="NOŚNIKA NIE MA" rotate={3} />
      <g transform="translate(0 785)">
        <SmallText x={0} y={0} bold>USTALENIA</SmallText>
        <SmallText x={0} y={42}>• na biurku znaleziono puste czarne etui USB</SmallText>
        <SmallText x={0} y={76}>• Marek używał go do przechowywania wrażliwych plików</SmallText>
        <SmallText x={0} y={110}>• laptop i telefon pozostały na miejscu</SmallText>
      </g>
    </EvidenceFrame>
  );
}

function MirrorArt() {
  return (
    <EvidenceFrame label="Zdjęcie z odbiciem osoby z identyfikatorem prasowym" number="B-02">
      <Title title="FOTOGRAFIA Z KORYTARZA" subtitle="PLIK IMG_8241 · 22:49:27" />
      <g transform="translate(55 128) rotate(2 285 300)">
        <rect width="574" height="620" fill="#e2d6c1" stroke="#7b6550" strokeWidth="3" />
        <rect x="28" y="28" width="518" height="475" fill="#15100d" />
        <path d="M28 503 168 116h250l128 387" fill="#0b0908" />
        <path d="M267 112v391" stroke="#6d3e25" strokeWidth="18" opacity=".55" />
        <rect x="366" y="115" width="114" height="245" rx="4" fill="#251713" stroke="#a46d43" strokeWidth="4" />
        <g transform="translate(390 170)" opacity=".92">
          <ellipse cx="44" cy="48" rx="28" ry="38" fill="#080707" />
          <path d="M10 90q34-28 68 0l28 120H-15Z" fill="#090808" />
          <rect x="50" y="112" width="64" height="36" rx="4" fill="#d1c0a3" transform="rotate(6 82 130)" />
          <text x="82" y="136" textAnchor="middle" fill={RED} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="10" transform="rotate(6 82 136)">PRESS</text>
        </g>
        <text x="38" y="555" fill="#4a3529" fontFamily="Georgia, serif" fontStyle="italic" fontSize="23">„odbicie, nie twarz”</text>
        <text x="520" y="585" textAnchor="end" fill="#6d5543" fontFamily="monospace" fontSize="14">22:49:27</text>
      </g>
      <Stamp x={412} y={790} text="IDENTYFIKATOR PRASOWY" rotate={-4} />
    </EvidenceFrame>
  );
}

function AudioArt() {
  return (
    <EvidenceFrame label="Nagranie audio z korytarza" number="B-03">
      <Title title="NAGRANIE AUDIO" subtitle="PLIK VID_2251 · ŚCIEŻKA DŹWIĘKOWA · 22:51" />
      <g transform="translate(0 140)">
        <rect width="684" height="330" rx="18" fill="#15110f" stroke="#66503c" strokeWidth="3" />
        <text x="38" y="54" fill="#cbb89b" fontFamily="monospace" fontSize="14">00:00:11.42 / 00:00:17.09</text>
        <g transform="translate(35 112)">
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 18 + ((i * 37) % 92);
            return <rect key={i} x={i * 12.7} y={(120 - h) / 2} width="5" height={h} rx="2" fill={i > 15 && i < 37 ? "#c95b4c" : "#80654c"} />;
          })}
        </g>
        <circle cx="342" cy="268" r="33" fill="#3a1511" stroke="#9e3a2f" strokeWidth="3" />
        <path d="M330 249 330 287 360 268Z" fill="#e0c9a4" />
      </g>
      <g transform="translate(32 520)">
        <rect width="620" height="162" rx="8" fill="#c7b38f" fillOpacity=".75" stroke="#84694f" strokeWidth="2" />
        <text x="30" y="42" fill="#5a4030" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="13" letterSpacing="2">TRANSKRYPCJA · FRAGMENT ROZMOWY</text>
        <text x="310" y="104" textAnchor="middle" fill={RED} fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="31">„Nie zniszczysz mi kariery.”</text>
      </g>
      <Stamp x={402} y={742} text="GŁOS MĘSKI" />
      <g transform="translate(0 850)">
        <SmallText x={0} y={0} bold>ANALIZA</SmallText>
        <SmallText x={0} y={42}>Nagranie nie pozwala na pewną identyfikację głosu.</SmallText>
        <SmallText x={0} y={76}>Treść rozmowy wskazuje jednak bezpośrednio na konflikt zawodowy.</SmallText>
      </g>
    </EvidenceFrame>
  );
}

function MedicalArt() {
  return (
    <EvidenceFrame label="Wstępna karta medyczna Marka Radeckiego" number="B-04">
      <Title title="WSTĘPNA KARTA MEDYCZNA" subtitle="BADANIE NA MIEJSCU · APARTAMENT 214" />
      <g transform="translate(0 132)">
        <rect width="684" height="470" rx="6" fill="#d7c7aa" stroke="#6e513c" strokeWidth="2" />
        <text x="30" y="52" fill={INK} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14">PACJENT</text>
        <text x="205" y="52" fill={INK} fontFamily="Georgia, serif" fontWeight="700" fontSize="23">Marek Radecki</text>
        <text x="30" y="98" fill={INK} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14">MIEJSCE</text>
        <text x="205" y="98" fill={INK} fontFamily="Arial, sans-serif" fontSize="18">Hotel Noctis · apartament 214</text>
        <line x1="28" y1="124" x2="656" y2="124" stroke="#80664e" opacity=".5" />
        <text x="30" y="174" fill={INK} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14">WSTĘPNY PRZEDZIAŁ CZASU ŚMIERCI</text>
        <rect x="28" y="199" width="628" height="115" rx="8" fill="#c6ad89" stroke={RED} strokeWidth="3" />
        <text x="342" y="270" textAnchor="middle" fill={RED} fontFamily="Georgia, serif" fontWeight="700" fontSize="50">22:50–22:55</text>
        <text x="30" y="360" fill={INK} fontFamily="Arial, sans-serif" fontSize="16">Ocena orientacyjna. Nie wskazuje dokładnej minuty.</text>
        <text x="30" y="398" fill={INK} fontFamily="Arial, sans-serif" fontSize="16">Stan ciała nie jest zgodny z aktywnością o 23:02.</text>
      </g>
      <Stamp x={402} y={655} text="PRZED 23:02" rotate={-5} />
      <g transform="translate(0 780)">
        <SmallText x={0} y={0} bold>ZNACZENIE DLA ŚLEDZTWA</SmallText>
        <SmallText x={0} y={42}>Wiadomość z 23:02 nie może być traktowana jako dowód życia.</SmallText>
      </g>
    </EvidenceFrame>
  );
}

function WicherArt() {
  return (
    <EvidenceFrame label="Materiały redakcyjne dotyczące Maksa Wichra" number="B-05">
      <Title title="PLIK REDAKCYJNY" subtitle="ODZYSKANY INDEKS OSTATNIO OTWIERANYCH DOKUMENTÓW" />
      <g transform="translate(45 132)">
        <rect x="0" y="0" width="594" height="260" rx="10" fill="#17120f" stroke="#5b4535" strokeWidth="3" />
        <rect x="42" y="44" width="510" height="62" rx="6" fill="#2a211b" />
        <text x="68" y="83" fill="#d8c5a5" fontFamily="monospace" fontSize="18">WICHER_notatki_redakcyjne.docx</text>
        <rect x="42" y="122" width="510" height="62" rx="6" fill="#211a16" />
        <text x="68" y="161" fill="#a8957a" fontFamily="monospace" fontSize="18">SERAFIN_finanse_2026.xlsx</text>
        <rect x="42" y="200" width="510" height="38" rx="6" fill="#211a16" />
        <text x="68" y="226" fill="#887761" fontFamily="monospace" fontSize="15">pendrive_black / indeks</text>
      </g>
      <g transform="translate(146 450) rotate(-4 190 140)">
        <rect width="380" height="270" rx="12" fill="#5b1e18" stroke="#9a4c37" strokeWidth="4" />
        <circle cx="190" cy="72" r="34" fill="#26100d" stroke={GOLD} strokeWidth="6" />
        <text x="190" y="142" textAnchor="middle" fill="#efdbb9" fontFamily="Georgia, serif" fontWeight="700" fontSize="32">MAKS WICHER</text>
        <text x="190" y="184" textAnchor="middle" fill="#c99054" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="17" letterSpacing="4">PRESS</text>
        <text x="190" y="224" textAnchor="middle" fill="#bd9a72" fontFamily="Arial, sans-serif" fontSize="14">IDENTYFIKATOR VIP</text>
      </g>
      <Stamp x={405} y={760} text="OSTATNIO OTWIERANY" />
      <g transform="translate(0 872)">
        <SmallText x={0} y={0} bold>PYTANIE</SmallText>
        <text x="0" y="46" fill={RED} fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="24">
          Dlaczego nazwisko Wichra było w najnowszych aktach Marka?
        </text>
      </g>
    </EvidenceFrame>
  );
}

export function AktaNocyEvidenceArtwork({
  id,
  className = "",
}: {
  id: AktaNocyEvidenceArtworkId | string;
  className?: string;
}) {
  return (
    <div className={`aspect-[4/5] min-h-[320px] overflow-hidden bg-[#090605] ${className}`}>
      {id === "monitoring-gap" && <MonitoringArt />}
      {id === "door-log" && <DoorLogArt />}
      {id === "late-message" && <MessageArt />}
      {id === "missing-drive" && <DriveArt />}
      {id === "scheduled-message" && <MessageArt scheduled />}
      {id === "mirror-photo" && <MirrorArt />}
      {id === "hallway-audio" && <AudioArt />}
      {id === "medical-window" && <MedicalArt />}
      {id === "wicher-file" && <WicherArt />}
      {![
        "monitoring-gap",
        "door-log",
        "late-message",
        "missing-drive",
        "scheduled-message",
        "mirror-photo",
        "hallway-audio",
        "medical-window",
        "wicher-file",
      ].includes(id) && (
        <div className="grid aspect-[4/5] place-items-center bg-[#120907] p-8 text-center text-sm text-orange-50/50">
          Materiał dowodowy
        </div>
      )}
    </div>
  );
}

function StageCanvas({
  kind,
}: {
  kind: AktaNocyStageArtworkKind;
}) {
  const isReconstruction = kind === "reconstruction";
  const isAccusation = kind === "accusation";
  const isReveal = kind === "reveal";
  const isCulprit = kind === "culprit";
  const isClosed = kind === "closed";

  return (
    <svg
      viewBox="0 0 1500 850"
      data-artwork="true"
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={
        isReconstruction
          ? "Materiały do rekonstrukcji nocy"
          : isAccusation
            ? "Akt oskarżenia"
            : isCulprit
              ? "Ujawnienie sprawcy"
              : isClosed
                ? "Sprawa zamknięta"
                : "Materiały ujawnienia"
      }
    >
      <defs>
        <linearGradient id={`stage-bg-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#080504" />
          <stop offset=".48" stopColor="#1f0e0b" />
          <stop offset="1" stopColor="#090504" />
        </linearGradient>
        <radialGradient id={`stage-glow-${kind}`} cx=".65" cy=".3" r=".7">
          <stop offset="0" stopColor={isCulprit ? "#991b1b" : "#c26122"} stopOpacity=".35" />
          <stop offset=".55" stopColor="#7f1d1d" stopOpacity=".08" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={`stage-shadow-${kind}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="20" floodColor="#000" floodOpacity=".6" />
        </filter>
      </defs>
      <rect width="1500" height="850" fill={`url(#stage-bg-${kind})`} />
      <rect width="1500" height="850" fill={`url(#stage-glow-${kind})`} />

      {isReconstruction && (
        <>
          <text x="95" y="105" fill="#c98b4f" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18" letterSpacing="6">REKONSTRUKCJA NOCY</text>
          <text x="95" y="175" fill="#f1e3cf" fontFamily="Georgia, serif" fontWeight="700" fontSize="60">18 minut, które zmieniają wszystko.</text>
          <line x1="130" y1="600" x2="1360" y2="600" stroke="#7b3a2d" strokeWidth="5" />
          {[
            ["22:47","POWRÓT"],
            ["22:49","ODBITIE"],
            ["22:51","GŁOS"],
            ["22:52","KONFRONTACJA"],
            ["22:53","WIADOMOŚĆ"],
            ["22:54","WYJŚCIE"],
            ["23:02","WYSYŁKA"],
          ].map((item, i) => {
            const x = 150 + i * 190;
            return (
              <g key={item[0]} transform={`translate(${x} 0)`}>
                <circle cx="0" cy="600" r="16" fill="#b43c30" stroke="#e2a066" strokeWidth="3" />
                <text x="0" y="655" textAnchor="middle" fill="#e9cda5" fontFamily="monospace" fontWeight="800" fontSize="18">{item[0]}</text>
                <text x="0" y="687" textAnchor="middle" fill="#9e8169" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" letterSpacing="2">{item[1]}</text>
              </g>
            );
          })}
          <g transform="translate(960 245) rotate(4 200 120)" filter={`url(#stage-shadow-${kind})`}>
            <rect width="390" height="250" fill="#d3c0a1" />
            <text x="28" y="55" fill={INK} fontFamily="Georgia, serif" fontWeight="700" fontSize="30">APARTAMENT 214</text>
            <path d="M35 205h320M70 188V95h225v93M180 95v93" stroke="#624935" strokeWidth="5" fill="none" />
            <circle cx="184" cy="142" r="28" fill="none" stroke={RED} strokeWidth="5" />
          </g>
        </>
      )}

      {isAccusation && (
        <>
          <g transform="translate(180 85) rotate(-2 555 330)" filter={`url(#stage-shadow-${kind})`}>
            <rect width="1110" height="650" rx="10" fill={PAPER} />
            <text x="72" y="82" fill={INK} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18" letterSpacing="5">HOTEL NOCTIS · AKTA NOCY</text>
            <text x="72" y="170" fill={INK} fontFamily="Georgia, serif" fontWeight="700" fontSize="70">AKT OSKARŻENIA</text>
            <line x1="72" y1="205" x2="1035" y2="205" stroke="#765b46" strokeWidth="3" />
            <text x="72" y="270" fill="#66503d" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="18">OSKARŻAM:</text>
            <line x1="250" y1="278" x2="985" y2="278" stroke="#6d5542" strokeWidth="2" />
            <text x="72" y="350" fill="#66503d" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="18">MOTYW:</text>
            <line x1="250" y1="358" x2="985" y2="358" stroke="#6d5542" strokeWidth="2" />
            <text x="72" y="430" fill="#66503d" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="18">KLUCZOWY DOWÓD:</text>
            <line x1="310" y1="438" x2="985" y2="438" stroke="#6d5542" strokeWidth="2" />
            <g transform="translate(760 490) rotate(-6 130 35)">
              <rect width="260" height="70" rx="5" fill="none" stroke={RED} strokeWidth="5" />
              <text x="130" y="44" textAnchor="middle" fill={RED} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="24" letterSpacing="4">OSTATECZNE</text>
            </g>
            <text x="72" y="585" fill="#80654e" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24">Po podpisaniu decyzji nie można zmienić.</text>
          </g>
        </>
      )}

      {isReveal && (
        <>
          <text x="750" y="105" textAnchor="middle" fill="#c98b4f" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18" letterSpacing="7">UJAWNIENIE</text>
          <text x="750" y="180" textAnchor="middle" fill="#f1e3cf" fontFamily="Georgia, serif" fontWeight="700" fontSize="62">Fakty zaczynają się łączyć.</text>
          <g transform="translate(150 255)">
            {[0,1,2,3].map((i) => (
              <g key={i} transform={`translate(${i*300} ${i%2?28:0}) rotate(${i%2?3:-3} 125 150)`}>
                <rect width="250" height="310" fill="#d4c3a6" filter={`url(#stage-shadow-${kind})`} />
                <rect x="24" y="26" width="202" height="158" fill="#17110e" />
                <line x1="28" y1="220" x2="218" y2="220" stroke="#745947" strokeWidth="3" />
                <line x1="28" y1="244" x2="195" y2="244" stroke="#745947" strokeWidth="3" />
                <line x1="28" y1="268" x2="210" y2="268" stroke="#745947" strokeWidth="3" />
              </g>
            ))}
          </g>
          <path d="M280 640C520 490 725 720 960 535S1260 530 1330 420" fill="none" stroke="#9a3328" strokeWidth="6" strokeDasharray="12 12" />
        </>
      )}

      {isCulprit && (
        <>
          <text x="750" y="105" textAnchor="middle" fill="#d16050" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18" letterSpacing="7">UJAWNIENIE SPRAWCY</text>
          <text x="750" y="205" textAnchor="middle" fill="#fff0dd" fontFamily="Georgia, serif" fontWeight="700" fontSize="86">MAKS WICHER</text>
          <text x="750" y="255" textAnchor="middle" fill="#c9a37a" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="22" letterSpacing="6">REPORTER · IDENTYFIKATOR PRESS</text>
          <g transform="translate(455 330)" filter={`url(#stage-shadow-${kind})`}>
            <rect width="590" height="320" rx="16" fill="#541a15" stroke="#a24938" strokeWidth="4" />
            <circle cx="295" cy="95" r="54" fill="#1d0b09" stroke="#bd8243" strokeWidth="8" />
            <rect x="118" y="188" width="354" height="72" rx="10" fill="#d6c4a4" />
            <text x="295" y="233" textAnchor="middle" fill={RED} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="30" letterSpacing="8">PRESS</text>
          </g>
          <g transform="translate(1050 620) rotate(-7 120 32)">
            <rect width="240" height="64" rx="4" fill="none" stroke="#d04a3c" strokeWidth="5" />
            <text x="120" y="42" textAnchor="middle" fill="#e36254" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="20" letterSpacing="4">SPRAWCA</text>
          </g>
        </>
      )}

      {isClosed && (
        <>
          <g transform="translate(230 105) rotate(-2 520 290)" filter={`url(#stage-shadow-${kind})`}>
            <path d="M0 82h315l72-64h654v580H0Z" fill="#4d1813" stroke="#8f3d2f" strokeWidth="4" />
            <text x="80" y="215" fill="#f2dfc1" fontFamily="Georgia, serif" fontWeight="700" fontSize="72">AKTA NOCY</text>
            <text x="82" y="270" fill="#c68e57" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="18" letterSpacing="6">SPRAWA 001 · APARTAMENT 214</text>
            <g transform="translate(500 350) rotate(-8 215 55)">
              <rect width="430" height="110" rx="7" fill="none" stroke="#d74f40" strokeWidth="8" />
              <text x="215" y="72" textAnchor="middle" fill="#e35e4e" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="42" letterSpacing="7">SPRAWA ZAMKNIĘTA</text>
            </g>
          </g>
          <text x="750" y="775" textAnchor="middle" fill="#a88663" fontFamily="Georgia, serif" fontStyle="italic" fontSize="26">Prawda była w aktach od początku.</text>
        </>
      )}
    </svg>
  );
}

export function AktaNocyStageArtwork({
  kind,
  className = "",
}: {
  kind: AktaNocyStageArtworkKind;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<AktaNocyStageArtworkKind, string> = {
    reconstruction: "Materiały do rekonstrukcji nocy",
    accusation: "Akt oskarżenia",
    reveal: "Materiały ujawnienia",
    culprit: "Ujawnienie sprawcy",
    closed: "Sprawa zamknięta",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative mt-6 block aspect-[30/17] min-h-[260px] w-full overflow-hidden rounded-2xl border border-orange-100/10 bg-black/35 text-left shadow-[0_18px_60px_rgba(0,0,0,.35)] ${className}`}
      >
        <StageCanvas kind={kind} />
        <span className="absolute bottom-3 right-3 rounded-full border border-orange-100/15 bg-black/75 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-orange-50/80 backdrop-blur">
          powiększ
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels[kind]}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 p-3 backdrop-blur-md sm:p-8"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-xs font-black text-white"
          >
            ZAMKNIJ ×
          </button>
          <div
            className="w-full max-w-6xl overflow-hidden rounded-xl shadow-[0_35px_120px_rgba(0,0,0,.82)]"
            onClick={(event) => event.stopPropagation()}
          >
            <StageCanvas kind={kind} />
          </div>
        </div>
      )}
    </>
  );
}
