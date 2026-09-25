import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const GAME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_PATH = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|jpeg|webp)$/;

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return NextResponse.json({ error: "Brak dostępu." }, { status: 403, headers });
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!GAME_SLUG.test(slug) || slug.length > 80) {
    return NextResponse.json({ error: "Nieprawidłowa gra." }, { status: 400, headers });
  }
  const { data, error } = await context.client.rpc("zagraj_admin_media_list", { p_slug: slug });
  if (error) return NextResponse.json({
    error: error.message.includes("MEDIA_FORBIDDEN") ? "Brak dostępu do mediów tej gry." : "Nie można pobrać grafik.",
  }, { status: error.message.includes("MEDIA_FORBIDDEN") ? 403 : 500, headers });
  return NextResponse.json(data, { headers });
}

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return NextResponse.json({ error: "Brak dostępu." }, { status: 403, headers });
  let value: unknown;
  try { value = await request.json(); } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400, headers });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400, headers });
  }
  const body = value as Record<string, unknown>;
  if (typeof body.path !== "string" || !IMAGE_PATH.test(body.path) ||
      typeof body.altText !== "string" || body.altText.length > 160) {
    return NextResponse.json({ error: "Nieprawidłowa ścieżka lub opis grafiki." }, { status: 400, headers });
  }
  const { data, error } = await context.client.rpc("zagraj_admin_media_register", {
    p_path: body.path,
    p_alt_text: body.altText,
  });
  if (error) return NextResponse.json({
    error: error.message.includes("MEDIA_FORBIDDEN") ? "Brak uprawnień do tej gry." :
      error.message.includes("MEDIA_NOT_UPLOADED_BY_USER") ? "Nie znaleziono Twojej przesłanej grafiki." :
      "Nie udało się zarejestrować grafiki.",
  }, { status: error.message.includes("MEDIA_FORBIDDEN") ? 403 : 400, headers });
  return NextResponse.json(data, { headers });
}
