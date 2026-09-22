import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import GameHomeLink from "./game-home-link";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "zaGRAj — gry imprezowe",
  description:
    "Nowoczesna platforma z grami imprezowymi, teleturniejami i grami społecznymi dla znajomych.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={geist.variable}>{children}<GameHomeLink /></body>
    </html>
  );
}
