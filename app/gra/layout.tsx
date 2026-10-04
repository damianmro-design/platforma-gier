import type { ReactNode } from "react";
import ActiveGameRejoinPanel from "@/components/active-game-rejoin-panel";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ActiveGameRejoinPanel />
    </>
  );
}
