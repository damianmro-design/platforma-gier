import { NextResponse } from "next/server";
import { getPartyPlayUserFromAccessToken } from "@/lib/partyplay-auth";
import {
  getPartyPlayAccountHistory,
  getPartyPlayAccountSummary,
} from "@/lib/platform-db";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function GET(request: Request) {
  const accessToken = bearerToken(request);
  const user = await getPartyPlayUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ error: "Nie jesteś zalogowany." }, { status: 401 });
  }

  try {
    const [summary, history] = await Promise.all([
      getPartyPlayAccountSummary(user.id),
      getPartyPlayAccountHistory(user.id, 20),
    ]);

    return NextResponse.json({
      summary,
      history,
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się pobrać statystyk PartyPlay." },
      { status: 500 },
    );
  }
}
