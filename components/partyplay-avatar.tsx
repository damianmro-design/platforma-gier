"use client";

import { useId } from "react";

import {
  PARTYPLAY_AVATARS,
  PARTYPLAY_STARTER_AVATARS,
  getPartyPlayAvatar,
  isPartyPlayAvatarUnlocked,
  normalizePartyPlayAvatar,
  type PartyPlayAvatarDefinition,
} from "@/lib/partyplay-avatars";

export {
  PARTYPLAY_AVATARS,
  PARTYPLAY_STARTER_AVATARS,
  getPartyPlayAvatar,
  isPartyPlayAvatarUnlocked,
  normalizePartyPlayAvatar,
  type PartyPlayAvatarDefinition,
};

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M7.5 10V7.6a4.5 4.5 0 0 1 9 0V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor" />
      <circle cx="12" cy="15.5" r="1.5" fill="#090b18" />
    </svg>
  );
}

export function PartyPlayAvatarLock() {
  return (
    <span className="inline-flex items-center gap-1">
      <LockIcon />
    </span>
  );
}

export function PartyPlayAvatar({
  id,
  size = 64,
  locked = false,
  className = "",
}: {
  id: string | null | undefined;
  size?: number;
  locked?: boolean;
  className?: string;
}) {
  const avatar = getPartyPlayAvatar(id);
  const index = PARTYPLAY_AVATARS.findIndex((item) => item.id === avatar.id) + 1;
  const reactId = useId().replace(/:/g, "");
  const g1 = `pp-a-${index}-${reactId}`;
  const g2 = `pp-b-${index}-${reactId}`;
  const glow = `pp-glow-${index}-${reactId}`;

  const shape = (() => {
    switch (index) {
      case 1:
        return (
          <>
            <circle cx="50" cy="50" r="29" fill="none" stroke={`url(#${g1})`} strokeWidth="8" />
            <circle cx="53" cy="47" r="24" fill="none" stroke={`url(#${g2})`} strokeWidth="3" opacity=".9" />
          </>
        );
      case 2:
        return (
          <>
            <path d="M50 18 76 69 50 84 24 69Z" fill={`url(#${g1})`} />
            <path d="M50 18 50 58 24 69Z" fill="#22d3ee" opacity=".82" />
            <path d="M50 58 76 69 50 84Z" fill="#2563eb" opacity=".85" />
            <path d="M50 58 24 69 50 84Z" fill="#7c3aed" opacity=".72" />
          </>
        );
      case 3:
        return (
          <>
            <circle cx="50" cy="50" r="27" fill="none" stroke={`url(#${g1})`} strokeWidth="7" />
            <ellipse cx="50" cy="51" rx="39" ry="12" fill="none" stroke="#f472d0" strokeWidth="4" />
          </>
        );
      case 4:
        return (
          <g fill={`url(#${g1})`}>
            <rect x="20" y="42" width="7" height="16" rx="3.5" />
            <rect x="31" y="34" width="7" height="32" rx="3.5" />
            <rect x="42" y="25" width="7" height="50" rx="3.5" />
            <rect x="53" y="15" width="7" height="70" rx="3.5" />
            <rect x="64" y="29" width="7" height="42" rx="3.5" />
            <rect x="75" y="38" width="7" height="24" rx="3.5" />
          </g>
        );
      case 5:
        return (
          <>
            <path d="M50 17 76 32 76 67 50 83 24 67 24 32Z" fill={`url(#${g1})`} />
            <path d="M50 17 50 50 24 32Z" fill="#f0abfc" opacity=".75" />
            <path d="M50 50 76 32 76 67Z" fill="#7e22ce" opacity=".72" />
            <path d="M50 50 50 83 24 67Z" fill="#2563eb" opacity=".75" />
          </>
        );
      case 6:
        return (
          <>
            <path d="M26 30c13 7 16 18 15 28-1 9-6 17-14 22 21 4 39-8 45-27 4-14 0-27-10-36 2 18-8 31-22 34-6 1-11 0-14-1Z" fill={`url(#${g1})`} />
            <path d="M39 25c11 8 16 17 16 27 0 11-5 20-14 27 15-4 27-14 31-29 3-12 0-23-8-32-2 15-10 24-25 27Z" fill="#fb7185" opacity=".65" />
          </>
        );
      case 7:
        return (
          <>
            <path d="M50 15 58 42 85 50 58 58 50 85 42 58 15 50 42 42Z" fill={`url(#${g1})`} />
            <circle cx="50" cy="50" r="28" fill="none" stroke="#60a5fa" strokeWidth="2" opacity=".45" />
          </>
        );
      case 8:
        return (
          <>
            <circle cx="50" cy="50" r="28" fill="none" stroke={`url(#${g1})`} strokeWidth="7" />
            <path d="M22 78 79 21" stroke="#f0abfc" strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 9:
        return (
          <>
            <path d="m50 23 30 14-30 14-30-14Z" fill={`url(#${g1})`} />
            <path d="m50 42 30 14-30 14-30-14Z" fill={`url(#${g2})`} opacity=".92" />
            <path d="m50 61 30 14-30 14-30-14Z" fill="#7c3aed" opacity=".82" />
          </>
        );
      case 10:
        return (
          <g fill={`url(#${g1})`}>
            <path d="M50 50c1-19 13-31 31-34-10 10-14 20-12 31Z" />
            <path d="M50 50c19 1 31 13 34 31-10-10-20-14-31-12Z" transform="rotate(72 50 50)" />
            <path d="M50 50c19 1 31 13 34 31-10-10-20-14-31-12Z" transform="rotate(144 50 50)" />
            <path d="M50 50c19 1 31 13 34 31-10-10-20-14-31-12Z" transform="rotate(216 50 50)" />
            <path d="M50 50c19 1 31 13 34 31-10-10-20-14-31-12Z" transform="rotate(288 50 50)" />
          </g>
        );
      case 11:
        return (
          <>
            <circle cx="50" cy="50" r="31" fill="none" stroke="#4f46e5" strokeWidth="2" opacity=".55" />
            <path d="M50 13 58 42 87 50 58 58 50 87 42 58 13 50 42 42Z" fill={`url(#${g1})`} />
            <circle cx="50" cy="50" r="7" fill="#fff" opacity=".82" />
          </>
        );
      case 12:
        return (
          <>
            <path d="M48 18 61 53 48 79 35 50Z" fill={`url(#${g1})`} />
            <path d="m24 35 18 11-12 25-14-17Z" fill="#22d3ee" opacity=".88" />
            <path d="m73 28 11 15-18 8-6-18Z" fill="#f472b6" opacity=".9" />
            <path d="m69 57 17 7-21 19-9-16Z" fill="#8b5cf6" opacity=".88" />
            <path d="m18 68 14 1-7 13Z" fill="#60a5fa" opacity=".8" />
          </>
        );
      case 13:
        return (
          <>
            <path d="M50 20 77 35 77 66 50 82 23 66 23 35Z" fill="none" stroke={`url(#${g1})`} strokeWidth="4" />
            <path d="M50 20v31m27-16L50 51 23 35m27 16v31" fill="none" stroke="#c4b5fd" strokeWidth="2" opacity=".9" />
          </>
        );
      case 14:
        return (
          <>
            <circle cx="48" cy="52" r="29" fill="none" stroke={`url(#${g1})`} strokeWidth="7" />
            <circle cx="76" cy="28" r="8" fill={`url(#${g2})`} />
          </>
        );
      case 15:
        return (
          <>
            <path d="m18 65 13-30 18 18 11-36 11 36 18-18 13 30-42 20Z" fill={`url(#${g1})`} />
            <path d="M26 66h48L50 82Z" fill="#7c3aed" opacity=".85" />
          </>
        );
      case 16:
        return (
          <>
            <circle cx="39" cy="50" r="23" fill="none" stroke={`url(#${g1})`} strokeWidth="8" />
            <circle cx="61" cy="50" r="23" fill="none" stroke={`url(#${g2})`} strokeWidth="8" />
          </>
        );
      case 17:
        return (
          <>
            <path d="m50 18 24 17-24 17-24-17Z" fill="#38bdf8" opacity=".9" />
            <path d="m50 39 31 20-31 20-31-20Z" fill={`url(#${g1})`} />
            <path d="m50 59 35 21-35 11-35-11Z" fill="#ec4899" opacity=".75" />
          </>
        );
      case 18:
        return (
          <g fill={`url(#${g1})`}>
            <path d="M50 50c2-19 13-30 31-35-8 12-10 23-5 34Z" />
            <path d="M50 50c19 2 30 13 35 31-12-8-23-10-34-5Z" transform="rotate(60 50 50)" />
            <path d="M50 50c19 2 30 13 35 31-12-8-23-10-34-5Z" transform="rotate(120 50 50)" />
            <path d="M50 50c19 2 30 13 35 31-12-8-23-10-34-5Z" transform="rotate(180 50 50)" />
            <path d="M50 50c19 2 30 13 35 31-12-8-23-10-34-5Z" transform="rotate(240 50 50)" />
            <path d="M50 50c19 2 30 13 35 31-12-8-23-10-34-5Z" transform="rotate(300 50 50)" />
          </g>
        );
      case 19:
        return (
          <>
            <path d="m22 34 23-16v64L22 66Z" fill={`url(#${g1})`} />
            <path d="m78 34-23-16v64l23-16Z" fill={`url(#${g2})`} />
            <path d="M48 20h4v60h-4Z" fill="#090b18" />
          </>
        );
      case 20:
        return (
          <g fill={`url(#${g1})`}>
            <rect x="24" y="28" width="13" height="13" rx="2" />
            <rect x="43" y="39" width="18" height="18" rx="2" />
            <rect x="65" y="24" width="8" height="8" rx="1" />
            <rect x="68" y="58" width="14" height="14" rx="2" />
            <rect x="29" y="61" width="12" height="12" rx="2" />
            <rect x="49" y="68" width="8" height="8" rx="1" />
            <rect x="76" y="42" width="6" height="6" rx="1" />
          </g>
        );
      default:
        return <circle cx="50" cy="50" r="28" fill={`url(#${g1})`} />;
    }
  })();

  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] bg-[#080b1d] ${className}`}
      style={{
        width: size,
        height: size,
        filter: locked ? "grayscale(1)" : undefined,
        opacity: locked ? 0.34 : 1,
      }}
      aria-label={avatar.name}
      title={avatar.name}
    >
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true" style={{ width: "100%", height: "100%", flex: "1 1 auto" }}>
        <defs>
          <linearGradient id={g1} x1="18" y1="18" x2="82" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset=".48" stopColor="#6d5dfc" />
            <stop offset="1" stopColor="#f43f9e" />
          </linearGradient>
          <linearGradient id={g2} x1="80" y1="18" x2="24" y2="84" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb7185" />
            <stop offset=".45" stopColor="#d946ef" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
          <filter id={glow} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="4.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="100" rx="28" fill="#080b1d" />
        <circle cx="50" cy="50" r="42" fill="#11112c" opacity=".82" />
        <g filter={`url(#${glow})`}>{shape}</g>
      </svg>
    </span>
  );
}
