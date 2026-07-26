import { NextRequest, NextResponse } from "next/server";
import { DEMO_CUSTOMERS } from "@/lib/demo/data";
import { getLeadProfileByEditToken } from "@/lib/data/lead-profile";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveCanonicalCity } from "@/lib/cities";
import { parseLeadFields } from "@/lib/lead-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const profile = await getLeadProfileByEditToken(token);
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Tautan tidak ditemukan atau sudah tidak berlaku." },
      { status: token.length < 16 ? 400 : 404 },
    );
  }
  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    name?: string;
    birthDate?: string;
    phone?: string;
    countryCode?: string;
    email?: string;
    city?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, error: "Tautan tidak valid." }, { status: 400 });
  }

  const parsed = parseLeadFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const cityResolved = await resolveCanonicalCity(parsed.data.city);
  if ("error" in cityResolved) {
    return NextResponse.json({ ok: false, error: cityResolved.error }, { status: 400 });
  }
  const data = { ...parsed.data, city: cityResolved.city };

  if (!isSupabaseConfigured()) {
    const idx = DEMO_CUSTOMERS.findIndex((c) => c.editToken === token);
    if (idx < 0) {
      return NextResponse.json(
        { ok: false, error: "Tautan tidak ditemukan atau sudah tidak berlaku." },
        { status: 404 },
      );
    }
    DEMO_CUSTOMERS[idx] = {
      ...DEMO_CUSTOMERS[idx],
      name: data.name,
      birthDate: data.birthDate,
      phone: data.phone,
      waId: data.waId,
      email: data.email,
      city: data.city,
    };
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("id")
    .eq("edit_token", token)
    .maybeSingle();

  if (findError || !existing) {
    return NextResponse.json(
      { ok: false, error: "Tautan tidak ditemukan atau sudah tidak berlaku." },
      { status: 404 },
    );
  }

  const { data: waOwner } = await supabase
    .from("customers")
    .select("id")
    .eq("wa_id", data.waId)
    .maybeSingle();

  const updateRow =
    waOwner && waOwner.id !== existing.id
      ? {
          name: data.name,
          phone: data.phone,
          email: data.email,
          city: data.city,
          birth_date: data.birthDate,
        }
      : {
          name: data.name,
          phone: data.phone,
          wa_id: data.waId,
          email: data.email,
          city: data.city,
          birth_date: data.birthDate,
        };

  const { error } = await supabase
    .from("customers")
    .update(updateRow)
    .eq("id", existing.id);

  if (error) {
    console.error("[leads/profile] update failed", error);
    return NextResponse.json(
      { ok: false, error: "Gagal menyimpan perubahan. Coba lagi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
