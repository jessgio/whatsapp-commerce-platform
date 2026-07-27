import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/cities";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Generous, because this backs type-ahead: one lookup per keystroke after
  // the client's debounce. It only needs to stop outright egress abuse.
  const limited = await enforceRateLimit(req, {
    scope: "cities:search",
    limit: 120,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  try {
    const cities = await searchCities(q, 10);
    return NextResponse.json({ cities });
  } catch (e) {
    console.error("[cities] search failed", e);
    return NextResponse.json(
      { cities: [], error: "City search unavailable" },
      { status: 502 },
    );
  }
}
