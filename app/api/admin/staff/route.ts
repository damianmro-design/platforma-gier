import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context || context.access.role !== "owner") return NextResponse.json({ error: "Dostęp tylko dla właściciela." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const { data, error } = await context.client.rpc("zagraj_admin_list_staff");
  if (error) return NextResponse.json({ error: "Nie udało się pobrać zespołu." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

const allowedRoles = new Set(["admin", "editor", "author", "moderator", "analyst", "support"]);
const allowedPermissions = new Set(["games.read","games.create","games.edit","games.publish","games.manage","media.manage","users.read","users.moderate","analytics.read","progress.manage","admin.read","admin.manage","settings.manage","audit.read"]);

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (!context || context.access.role !== "owner") return NextResponse.json({ error: "Dostęp tylko dla właściciela." }, { status: 403 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  const value = payload as Record<string, unknown>;
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const role = typeof value.role === "string" ? value.role : "";
  const permissions = value.permissions;
  const gameSlugs = value.gameSlugs;
  const active = value.active;
  if (!email || email.length > 320 || !allowedRoles.has(role)
    || !Array.isArray(permissions) || permissions.length > 30
    || !permissions.every((p) => typeof p === "string" && allowedPermissions.has(p))
    || !Array.isArray(gameSlugs) || gameSlugs.length > 100
    || !gameSlugs.every((s) => typeof s === "string" && s.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
    || typeof active !== "boolean") {
    return NextResponse.json({ error: "Nieprawidłowa rola, uprawnienia lub zakres gier." }, { status: 400 });
  }
  const { data, error } = await context.client.rpc("zagraj_admin_set_staff", {
    p_email: email, p_role: role, p_permissions: permissions, p_game_slugs: gameSlugs, p_active: active,
  });
  if (error) {
    if (error.message.includes("MFA_REQUIRED")) return NextResponse.json({ error: "Przed zmianą ról włącz i potwierdź weryfikację 2-etapową w /admin/bezpieczenstwo.", code: "MFA_REQUIRED" }, { status: 428, headers: { "Cache-Control": "no-store" } });
    const message = error.message.includes("CONFIRMED_ACCOUNT_NOT_FOUND")
      ? "Ta osoba musi najpierw zarejestrować i potwierdzić konto zaGRAj."
      : error.message.includes("OWNER_IMMUTABLE")
        ? "Nie można zmienić dostępu właściciela."
        : "Nie udało się zapisać uprawnień.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
