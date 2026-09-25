import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/zagraj-admin-server";

export const dynamic = "force-dynamic";

/**
 * SMS requires a separately purchased Supabase Phone MFA add-on and configured
 * messaging provider. Default off: never trigger a paid message before approval.
 */
export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context) {
    return NextResponse.json({ error: "Brak uprawnień administratora." }, {
      status: 403, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({
    smsEnabled: process.env.ZAGRAJ_ADMIN_SMS_MFA_ENABLED === "true",
  }, { headers: { "Cache-Control": "no-store" } });
}
