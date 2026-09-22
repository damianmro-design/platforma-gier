export default function AktaNocyCoverArtwork({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-orange-200/15 bg-[#0b0705] shadow-[0_20px_60px_rgba(0,0,0,.45)] ${className}`}
      aria-label="Akta Nocy, sprawa Apartament 214"
      role="img"
    >
      <svg
        viewBox="0 0 1600 900"
        className="block h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="an-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#110807" />
            <stop offset=".5" stopColor="#23100b" />
            <stop offset="1" stopColor="#090504" />
          </linearGradient>
          <linearGradient id="an-folder" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5c1e16" />
            <stop offset=".55" stopColor="#31100d" />
            <stop offset="1" stopColor="#170907" />
          </linearGradient>
          <linearGradient id="an-tag" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8f2d1f" />
            <stop offset=".55" stopColor="#5d1b14" />
            <stop offset="1" stopColor="#2c0d0b" />
          </linearGradient>
          <linearGradient id="an-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5d39a" />
            <stop offset=".45" stopColor="#b87935" />
            <stop offset="1" stopColor="#6f421e" />
          </linearGradient>
          <linearGradient id="an-photo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#51291c" />
            <stop offset=".45" stopColor="#1d130f" />
            <stop offset="1" stopColor="#090807" />
          </linearGradient>
          <radialGradient id="an-glow" cx=".7" cy=".22" r=".55">
            <stop offset="0" stopColor="#d97706" stopOpacity=".4" />
            <stop offset=".45" stopColor="#7f1d1d" stopOpacity=".12" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <filter id="an-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="24" stdDeviation="24" floodColor="#000" floodOpacity=".65" />
          </filter>
          <filter id="an-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <pattern id="an-grain" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="9" r="1" fill="#fff" opacity=".035" />
            <circle cx="27" cy="16" r=".8" fill="#fff" opacity=".025" />
            <circle cx="18" cy="33" r=".7" fill="#fff" opacity=".03" />
          </pattern>
        </defs>

        <rect width="1600" height="900" fill="url(#an-bg)" />
        <rect width="1600" height="900" fill="url(#an-glow)" />
        <ellipse cx="1180" cy="195" rx="340" ry="220" fill="#b45309" opacity=".09" filter="url(#an-soft)" />
        <rect width="1600" height="900" fill="url(#an-grain)" />

        <g transform="translate(78 84) rotate(-4 350 285)" filter="url(#an-shadow)">
          <path
            d="M30 70h215l54-52h360c30 0 54 24 54 54v486c0 30-24 54-54 54H54c-30 0-54-24-54-54V124c0-30 24-54 54-54Z"
            fill="url(#an-folder)"
            stroke="#8a3b2a"
            strokeOpacity=".55"
            strokeWidth="3"
          />
          <path d="M0 135h713v423c0 30-24 54-54 54H54c-30 0-54-24-54-54Z" fill="#260d0b" opacity=".82" />
          <text x="70" y="238" fill="#f4dec0" fontFamily="Georgia, serif" fontWeight="700" fontSize="76" letterSpacing="8">
            AKTA NOCY
          </text>
          <line x1="72" y1="268" x2="555" y2="268" stroke="#c98b4f" strokeOpacity=".5" strokeWidth="2" />
          <text x="74" y="320" fill="#d9a467" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="24" letterSpacing="7">
            SPRAWA 001
          </text>
          <text x="74" y="366" fill="#e9c995" fontFamily="Georgia, serif" fontWeight="700" fontSize="36" letterSpacing="4">
            APARTAMENT 214
          </text>
          <g transform="translate(76 430)">
            <rect width="220" height="58" rx="8" fill="#130807" stroke="#b74232" strokeWidth="3" transform="rotate(-3 110 29)" />
            <text x="30" y="39" fill="#ef7d6d" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="24" letterSpacing="5">
              POUFNE
            </text>
          </g>
          <text x="74" y="540" fill="#b98658" fontFamily="Arial, sans-serif" fontSize="18" letterSpacing="3">
            HOTEL NOCTIS · WARSZAWA
          </text>
        </g>

        <g transform="translate(900 85) rotate(3 270 210)" filter="url(#an-shadow)">
          <rect x="0" y="0" width="540" height="395" rx="12" fill="#d6c5aa" />
          <rect x="28" y="28" width="484" height="278" rx="8" fill="url(#an-photo)" />
          <path d="M70 279V90h395v189" fill="#130d0a" />
          <path d="M70 279 170 130h190l105 149Z" fill="#0b0908" />
          <path d="M166 278 230 119h69l68 159Z" fill="#24140e" />
          <path d="M297 120v158" stroke="#a86129" strokeOpacity=".45" strokeWidth="10" />
          <circle cx="435" cy="86" r="32" fill="#d68b3a" opacity=".28" />
          <text x="210" y="206" fill="#eabf79" fontFamily="Georgia, serif" fontWeight="700" fontSize="48">
            214
          </text>
          <text x="66" y="350" fill="#4a3024" fontFamily="Georgia, serif" fontStyle="italic" fontSize="30">
            Ten sam pokój. Zawsze 214.
          </text>
          <line x1="250" y1="367" x2="466" y2="367" stroke="#9b2f24" strokeWidth="4" />
        </g>

        <g transform="translate(775 500) rotate(9 155 128)" filter="url(#an-shadow)">
          <rect x="40" y="22" width="280" height="240" rx="64" fill="url(#an-tag)" stroke="#b45b42" strokeWidth="3" />
          <circle cx="180" cy="58" r="28" fill="#1a0b08" stroke="#d8a062" strokeWidth="7" />
          <text x="180" y="148" textAnchor="middle" fill="#f0d0a0" fontFamily="Georgia, serif" fontWeight="700" fontSize="34">
            HOTEL NOCTIS
          </text>
          <text x="180" y="190" textAnchor="middle" fill="#c99054" fontFamily="Arial, sans-serif" fontSize="20" letterSpacing="4">
            WARSZAWA
          </text>
          <text x="180" y="245" textAnchor="middle" fill="#f2d2a4" fontFamily="Georgia, serif" fontWeight="700" fontSize="62">
            214
          </text>
          <circle cx="355" cy="85" r="50" fill="none" stroke="url(#an-gold)" strokeWidth="18" />
          <path d="M390 105 540 212" stroke="url(#an-gold)" strokeWidth="26" strokeLinecap="round" />
          <path d="M505 187 540 156M527 205l42-24" stroke="#b97838" strokeWidth="16" strokeLinecap="round" />
        </g>

        <g transform="translate(1110 585) rotate(-5 190 110)">
          <rect width="360" height="200" fill="#c9b28f" opacity=".96" />
          <text x="34" y="58" fill="#4a3426" fontFamily="Georgia, serif" fontStyle="italic" fontSize="30">
            DOSTĘP · MOŻLIWOŚĆ
          </text>
          <text x="34" y="102" fill="#4a3426" fontFamily="Georgia, serif" fontStyle="italic" fontSize="30">
            · MOTYW ·
          </text>
          <line x1="34" y1="133" x2="290" y2="133" stroke="#9b2f24" strokeWidth="4" />
          <text x="34" y="170" fill="#765845" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="16" letterSpacing="3">
            ŁĄCZ FAKTY. NIE ZAŁOŻENIA.
          </text>
        </g>

        <g transform="translate(520 625) rotate(-8 150 90)">
          <rect width="300" height="180" rx="8" fill="#15110e" stroke="#87725d" strokeWidth="2" opacity=".95" />
          <rect x="28" y="24" width="244" height="132" rx="5" fill="#0a0908" />
          <text x="50" y="70" fill="#c8ab86" fontFamily="Arial, sans-serif" fontSize="18" letterSpacing="3">
            KARTA DOSTĘPU
          </text>
          <text x="50" y="108" fill="#e7c594" fontFamily="Georgia, serif" fontWeight="700" fontSize="40">
            214
          </text>
          <path d="M216 98q22 18 0 36M230 87q38 30 0 58" fill="none" stroke="#c46b52" strokeWidth="5" strokeLinecap="round" />
        </g>

        <rect x="0" y="0" width="1600" height="900" fill="none" stroke="#d2965c" strokeOpacity=".12" strokeWidth="3" />
      </svg>
    </div>
  );
}
