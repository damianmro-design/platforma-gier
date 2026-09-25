import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return fail("Brak dostępu.", 403);
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!SLUG.test(slug) || slug.length > 80) return fail("Nieprawidłowa gra.", 400);
  const { data, error } = await context.client.rpc("zagraj_catalog_history_list", { p_slug: slug });
  if (error) return fail(error.message.includes("HISTORY_FORBIDDEN") ?
    "Brak dostępu do historii tej gry." : "Nie można wczytać historii publikacji.",
    error.message.includes("HISTORY_FORBIDDEN") ? 403 : 400);
  return NextResponse.json(data, { headers });
}

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (!context || context.access.role !== "owner") return fail("Tylko właściciel może przywracać wersje.", 403);
  let value: unknown;
  try { value = await request.json(); } catch { return fail("Nieprawidłowe dane.", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("Nieprawidłowe dane.", 400);
  const body = value as Record<string, unknown>;
  if (typeof body.slug !== "string" || !SLUG.test(body.slug) || body.slug.length > 80 ||
      !Number.isSafeInteger(body.publishedRevision) || Number(body.publishedRevision) < 1 ||
      !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1) {
    return fail("Nieprawidłowa wersja lub gra.", 400);
  }
  const { data, error } = await context.client.rpc("zagraj_catalog_restore_draft", {
    p_slug: body.slug,
    p_published_revision: body.publishedRevision,
    p_expected_revision: body.expectedRevision,
  });
  if (error) {
    if (error.message.includes("CATALOG_REVISION_CONFLICT")) return fail("Gra została zmieniona. Odśwież i ponów próbę.", 409);
    if (error.message.includes("OWNER_REQUIRED")) return fail("Brak uprawnień właściciela.", 403);
    if (error.message.includes("HISTORY_NOT_FOUND")) return fail("Nie znaleziono tej opublikowanej wersji.", 404);
    return fail("Nie udało się przywrócić wersji do szkicu. Sprawdź zgodność starych pól z aktualnym katalogiem.", 400);
  }
  return NextResponse.json(data, { headers });
}
