export type CitySuggestion = {
  id: number;
  label: string;
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
};

type OpenMeteoResult = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
};

type OpenMeteoResponse = {
  results?: OpenMeteoResult[];
};

export function formatCityLabel(city: {
  name: string;
  admin1?: string | null;
  country?: string | null;
}): string {
  const parts = [city.name.trim()];
  const admin1 = city.admin1?.trim();
  const country = city.country?.trim();
  if (admin1 && admin1.toLowerCase() !== city.name.trim().toLowerCase()) {
    parts.push(admin1);
  }
  if (country) parts.push(country);
  return parts.join(", ");
}

export function toCitySuggestion(r: OpenMeteoResult): CitySuggestion | null {
  if (!r.name || !r.country) return null;
  return {
    id: r.id,
    name: r.name,
    admin1: r.admin1 ?? null,
    country: r.country,
    countryCode: (r.country_code ?? "").toUpperCase(),
    label: formatCityLabel({
      name: r.name,
      admin1: r.admin1,
      country: r.country,
    }),
  };
}

/** Search worldwide cities (Open-Meteo geocoding — no API key). */
export async function searchCities(
  query: string,
  limit = 8,
): Promise<CitySuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", String(Math.min(Math.max(limit, 1), 20)));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(`City search failed (${res.status})`);
  }

  const json = (await res.json()) as OpenMeteoResponse;
  const seen = new Set<string>();
  const out: CitySuggestion[] = [];
  for (const r of json.results ?? []) {
    const suggestion = toCitySuggestion(r);
    if (!suggestion) continue;
    const key = suggestion.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(suggestion);
  }
  return out;
}

/** Ensure an optional city value was chosen from suggestions (not free text). */
export async function resolveCanonicalCity(
  city: string | null | undefined,
): Promise<{ city: string | null } | { error: string }> {
  const trimmed = city?.trim() || null;
  if (!trimmed) return { city: null };

  const namePart = trimmed.split(",")[0]?.trim() ?? trimmed;
  try {
    const results = await searchCities(namePart, 12);
    const exact = results.find(
      (r) => r.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exact) return { city: exact.label };

    // Migrate short legacy values (e.g. "Jakarta") when uniquely matched by name.
    const byName = results.filter(
      (r) => r.name.toLowerCase() === namePart.toLowerCase(),
    );
    if (
      byName.length === 1 &&
      (trimmed === namePart ||
        trimmed.toLowerCase().startsWith(`${namePart.toLowerCase()},`))
    ) {
      return { city: byName[0].label };
    }

    return {
      error: "Pilih kota dari daftar saran (bukan mengetik bebas).",
    };
  } catch {
    return {
      error: "Tidak dapat memverifikasi kota saat ini. Coba lagi sebentar.",
    };
  }
}
