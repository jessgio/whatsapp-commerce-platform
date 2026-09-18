/**
 * Push non-empty vars from .env.local to Vercel environments.
 * Usage: node scripts/sync-vercel-env.mjs [production|preview|development]
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["production", "preview", "development"];

function loadEnv() {
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim();
    if (value) env[key] = value;
  }
  return env;
}

const skip = new Set([
  "BITESHIP_TEST_DELIVERED_ORDER_ID",
  "BITESHIP_TEST_CANCELLED_ORDER_ID",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "SUPABASE_URL",
]);

const sensitive = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "API_SECRET",
  "BITESHIP_API_KEY",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_APP_SECRET",
  "MIDTRANS_SERVER_KEY",
  "XENDIT_SECRET_KEY",
  "RESEND_API_KEY",
]);

function addEnv(key, value, target) {
  const args = [
    "env",
    "add",
    key,
    target,
    "--value",
    value,
    "--yes",
    "--force",
    "--non-interactive",
  ];
  if (sensitive.has(key)) args.push("--sensitive");
  const result = spawnSync("vercel", args, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    timeout: 120_000,
  });
  if (result.status !== 0) {
    console.error(result.stdout ?? "");
    console.error(result.stderr ?? "");
    throw new Error(`Failed ${key} -> ${target}`);
  }
  console.log(`[ok] ${key} -> ${target}`);
}

const env = loadEnv();
for (const target of targets) {
  for (const [key, value] of Object.entries(env)) {
    if (skip.has(key)) continue;
    addEnv(key, value, target);
  }
}
