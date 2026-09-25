import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ email: context.user.email, ...context.access }, { headers: { "Cache-Control": "no-store" } });
}
