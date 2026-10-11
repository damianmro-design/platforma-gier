import type { ReactNode } from "react";
import ActiveGameRejoinPanel from "@/components/active-game-rejoin-panel";
import GameGuidanceGate from "@/components/game-guidance-gate";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GameGuidanceGate />
      <ActiveGameRejoinPanel />
    </>
  );
}
