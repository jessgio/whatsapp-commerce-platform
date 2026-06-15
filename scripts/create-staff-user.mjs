/**
 * One-off staff provisioning via Supabase Admin API.
 * Usage: node scripts/create-staff-user.mjs <email> [name] [role] [password]
 * Loads SUPABASE_* from .env.local in the project root.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const raw = readFileSync(envPath, "utf8");
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

const [email, name = "Jessica", role = "admin", passwordArg] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node scripts/create-staff-user.mjs <email> [name] [role] [password]");
  process.exit(1);
}

const validRoles = new Set(["admin", "sales", "cs", "warehouse"]);
if (!validRoles.has(role)) {
  console.error(`Invalid role "${role}". Use: admin | sales | cs | warehouse`);
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const password = passwordArg ?? randomBytes(12).toString("base64url");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, role },
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

const userId = data.user.id;

const { error: profileError } = await supabase.from("users").upsert(
  { id: userId, name, email, role },
  { onConflict: "id" },
);

if (profileError) {
  console.error("Auth user created but profile upsert failed:", profileError.message);
  process.exit(1);
}

console.log(JSON.stringify({ email, name, role, userId, password: passwordArg ? "(as provided)" : password }, null, 2));
