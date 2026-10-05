import type { ReactNode } from "react";
import ActiveGameRejoinPanel from "@/components/active-game-rejoin-panel";
import LiveGameGuidance from "@/components/live-game-guidance";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <LiveGameGuidance />
      <ActiveGameRejoinPanel />
    </>
  );
}
