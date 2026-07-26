import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/cities";

export async function GET(req: NextRequest) {
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
