import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const { data, error } = await context.client.rpc("zagraj_admin_dashboard");
  if (error) return NextResponse.json({ error: "Nie udało się pobrać pulpitu." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
