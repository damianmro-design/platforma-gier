import fs from "node:fs/promises";

function assert(value, message) {
  if (!value) throw new Error(message);
}

const setupSource = await fs.readFile("lib/game-play-setup.ts", "utf8");
const rulesSource = await fs.readFile("lib/zagraj-game-page-rules.ts", "utf8");
const pageSource = await fs.readFile("app/gry/akta-nocy/page.tsx", "utf8");

const expectedSetup = [
  "75–115 min, zależnie od sprawy",
  "Apartament 214: wymagany. Ostatni Kurs: prowadzący albo tryb automatyczny",
  "Z prowadzącym: zalecany wspólny ekran. Ostatni Kurs bez prowadzącego: niepotrzebny",
  "Każdy gracz potrzebuje własnego telefonu. Prowadzący może użyć laptopa lub TV jako wspólnego ekranu",
  "W Ostatnim Kursie bez prowadzącego twórca pokoju również dołącza jako gracz. Gdy 5–12 graczy kliknie „Gotowy”, gra wystartuje automatycznie.",
];

for (const text of expectedSetup) {
  assert(setupSource.includes(text), `Brak poprawnego komunikatu setupu AKTA NOCY: ${text}`);
}

const expectedRules = [
  "Apartament 214 zawsze wymaga prowadzącego. W Ostatnim Kursie może prowadzić jedna osoba albo system może prowadzić wszystkich automatycznie.",
  "Na końcu każdy wskazuje podejrzanego, motyw i kluczowy dowód. W Ostatnim Kursie dodatkowo wskazujecie sposób zniknięcia, zanim prawda zostanie ujawniona.",
];

for (const text of expectedRules) {
  assert(rulesSource.includes(text), `Brak poprawnej zasady publicznej AKTA NOCY: ${text}`);
}

assert(pageSource.includes('value="apartament-214"'), "Brak Apartamentu 214 na stronie wyboru sprawy");
assert(pageSource.includes('value="ostatni-kurs"'), "Brak Ostatniego Kursu na stronie wyboru sprawy");
assert(pageSource.includes('value="host"'), "Brak trybu z prowadzącym");
assert(pageSource.includes('value="auto"'), "Brak trybu automatycznego Ostatniego Kursu");
assert(pageSource.includes("75–105 min"), "Brak czasu Apartamentu 214");
assert(pageSource.includes("85–115 min"), "Brak czasu Ostatniego Kursu");

console.log("AKTA NOCY final UX source contract PASS");

const baseURL = process.env.AKTA_BASE_URL;
if (!baseURL) process.exit(0);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const artifacts = "artifacts/akta-nocy-final-ux";
await fs.mkdir(artifacts, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${baseURL}/gry/akta-nocy`, { waitUntil: "networkidle", timeout: 60000 });

  await page.getByRole("heading", { name: "Jak gramy?", exact: true }).waitFor({ timeout: 20000 });
  await page.getByText("75–115 min, zależnie od sprawy", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("Apartament 214: wymagany. Ostatni Kurs: prowadzący albo tryb automatyczny", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("Z prowadzącym: zalecany wspólny ekran. Ostatni Kurs bez prowadzącego: niepotrzebny", { exact: true }).waitFor({ timeout: 10000 });

  await page.getByRole("heading", { name: "Apartament 214", exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "UTWÓRZ POKÓJ", exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole("heading", { name: "Ostatni Kurs", exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Z PROWADZĄCYM", exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "BEZ PROWADZĄCEGO", exact: true }).waitFor({ timeout: 10000 });

  // Te 2 teksty przechodzą przez warstwę CMS. Jeśli produkcja nadal ma stary override,
  // test ma celowo wykryć niespójność zamiast ją maskować.
  await page.getByText(expectedRules[0], { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText(expectedRules[1], { exact: true }).waitFor({ timeout: 10000 });

  await page.screenshot({ path: `${artifacts}/01-akta-nocy-public-page.png`, fullPage: true });
  console.log(`AKTA NOCY final UX production PASS base=${baseURL}`);
} finally {
  await browser.close();
}
