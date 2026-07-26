import { DEMO_CUSTOMERS } from "@/lib/demo/data";
import { isSupabaseConfigured } from "@/lib/env";
import { splitWaIdToFormParts } from "@/lib/phone-split";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type PublicLeadProfile = {
  name: string;
  birthDate: string;
  email: string;
  city: string;
  countryCode: string;
  phone: string;
};

function toProfile(customer: {
  name: string;
  birthDate: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  waId: string;
}): PublicLeadProfile {
  const { countryCode, national } = splitWaIdToFormParts(
    customer.waId || customer.phone,
  );
  return {
    name: customer.name,
    birthDate: customer.birthDate ?? "",
    email: customer.email ?? "",
    city: customer.city ?? "",
    countryCode,
    phone: national,
  };
}

export async function getLeadProfileByEditToken(
  token: string,
): Promise<PublicLeadProfile | null> {
  if (!token || token.length < 16) return null;

  if (!isSupabaseConfigured()) {
    const customer = DEMO_CUSTOMERS.find((c) => c.editToken === token);
    if (!customer) return null;
    return toProfile(customer);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("name, birth_date, phone, email, city, wa_id")
    .eq("edit_token", token)
    .maybeSingle();

  if (error || !data) return null;

  return toProfile({
    name: data.name,
    birthDate: data.birth_date,
    phone: data.phone ?? "",
    email: data.email,
    city: data.city,
    waId: data.wa_id,
  });
}
