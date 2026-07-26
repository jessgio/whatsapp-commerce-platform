/**
 * One-off: resend the lead welcome email for a customer.
 * Usage:
 *   node scripts/resend-lead-welcome.mjs --email jessica@aerisbeaute.com
 *   node scripts/resend-lead-welcome.mjs --email x --name "Name" --token TOKEN
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const env = loadEnv();
const email = arg("email");
if (!email) {
  console.error("Missing --email");
  process.exit(1);
}

let name = arg("name");
let token = arg("token");

if (!name || !token) {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data, error } = await supabase
    .from("customers")
    .select("name, edit_token, email")
    .ilike("email", email)
    .maybeSingle();
  if (error || !data) {
    console.error("Customer not found", error);
    process.exit(1);
  }
  name = name || data.name;
  token = token || data.edit_token;
}

if (!token) {
  console.error("Customer has no edit_token");
  process.exit(1);
}

const base = (env.PUBLIC_FORM_BASE_URL || "https://join.aerisbeaute.com").replace(
  /\/$/,
  "",
);
const editUrl = `${base}/daftar/edit?token=${encodeURIComponent(token)}`;
const fromRaw = env.EMAIL_FROM || "cs@aerisbeaute.com";
const from = fromRaw.includes("<") ? fromRaw : `Aeris Beauté <${fromRaw}>`;

const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f1e9;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e6dccb;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6f2c3f;">Aeris Beauté</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#2d2b2a;">Halo, ${name}</h1>
    <p style="margin:0 0 16px;color:#5f5448;line-height:1.5;">Terima kasih sudah bergabung. Berikut kode diskon spesial Anda:</p>
    <div style="text-align:center;border:1px dashed #6f2c3f66;background:#6f2c3f0d;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:11px;color:#8a7e72;text-transform:uppercase;">Kode diskon Anda</p>
      <p style="margin:8px 0 0;font-size:28px;letter-spacing:.18em;font-weight:700;color:#6f2c3f;">AERIS15</p>
    </div>
    <p style="margin:0 0 12px;color:#5f5448;line-height:1.5;">
      Perlu memperbarui data?
      <a href="${editUrl}" style="color:#6f2c3f;">Klik di sini</a>.
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#8a7e72;">© Aeris Beauté</p>
  </div>
</body></html>`;

const resend = new Resend(env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from,
  to: email,
  subject: `Halo ${name} — kode diskon Aeris Beauté`,
  html,
});

if (error) {
  console.error("Send failed", error);
  process.exit(1);
}
console.log("Sent", data?.id, "to", email);
console.log("Edit URL", editUrl);
