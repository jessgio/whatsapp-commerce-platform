/**
 * Resend the designed lead-welcome template (with images) for a customer.
 * Usage: npx tsx --env-file=.env.local scripts/resend-lead-welcome.ts jessica@aerisbeaute.com
 */
import { createClient } from "@supabase/supabase-js";
import { sendLeadWelcomeEmail } from "../src/lib/email";
import { LEAD_DISCOUNT_CODE } from "../src/lib/lead-offer";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error(
      "Usage: npx tsx --env-file=.env.local scripts/resend-lead-welcome.ts <email>",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("customers")
    .select("name, edit_token, email, lead_discount_code")
    .ilike("email", email)
    .maybeSingle();

  if (error || !data?.edit_token) {
    console.error("Customer not found or missing edit_token", error);
    process.exit(1);
  }

  const result = await sendLeadWelcomeEmail({
    to: data.email ?? email,
    name: data.name,
    editToken: data.edit_token,
    discountCode: data.lead_discount_code?.trim() || LEAD_DISCOUNT_CODE,
  });

  if (!result.ok) {
    console.error("Send failed:", result.error);
    process.exit(1);
  }

  console.log("Sent designed template to", data.email ?? email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
