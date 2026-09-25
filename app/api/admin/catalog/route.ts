import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers });
}

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context || (context.access.role !== "owner" && !context.access.permissions?.some(
    (value) => ["games.read", "games.create", "games.edit"].includes(value)
  ))) return errorResponse("Brak dostępu do katalogu.", 403);
  const { data, error } = await context.client.rpc("zagraj_catalog_my_games");
  if (error) return errorResponse("Nie można wczytać katalogu.", 500);
  return NextResponse.json(data, { headers });
}

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return errorResponse("Brak dostępu.", 403);
  let value: unknown;
  try { value = await request.json(); } catch { return errorResponse("Nieprawidłowe dane.", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return errorResponse("Nieprawidłowe dane.", 400);
  const body = value as Record<string, unknown>;
  if (typeof body.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.slug)
    || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1
    || !["save", "submit", "publish"].includes(String(body.action))) {
    return errorResponse("Nieprawidłowe parametry.", 400);
  }
  if (body.action === "publish" && context.access.role !== "owner") {
    return errorResponse("Publikację musi zatwierdzić właściciel.", 403);
  }
  const name = body.action === "save" ? "zagraj_catalog_save_draft" :
    body.action === "submit" ? "zagraj_catalog_submit" : "zagraj_catalog_publish";
  const params = body.action === "save" ? {
    p_slug: body.slug, p_expected_revision: body.expectedRevision, p_data: body.data,
  } : { p_slug: body.slug, p_expected_revision: body.expectedRevision };
  const { data, error } = await context.client.rpc(name, params);
  if (error) {
    if (error.message.includes("MFA_REQUIRED")) return NextResponse.json({ error: "Publikacja wymaga weryfikacji 2-etapowej. Przejdź do /admin/bezpieczenstwo.", code: "MFA_REQUIRED" }, { status: 428, headers });
    const code = error.message;
    if (code.includes("CATALOG_REVISION_CONFLICT")) return errorResponse("Ktoś zmienił tę grę. Odśwież dane i ponów operację.", 409);
    if (code.includes("GAME_EDIT_FORBIDDEN") || code.includes("OWNER_REQUIRED")) return errorResponse("Brak odpowiednich uprawnień.", 403);
    if (code.includes("NOT_SUBMITTED")) return errorResponse("Najpierw prześlij projekt do zatwierdzenia.", 409);
    return errorResponse("Nie udało się zapisać. Sprawdź treść, limity graczy, czas i pozostałe pola.", 400);
  }
  return NextResponse.json(data, { headers });
}
