/**
 * Create Biteship sandbox test orders for API activation.
 * Biteship requires one order to simulate Delivered and one for Cancelled
 * (status changes are done in the Biteship dashboard after creation).
 *
 * Usage: node scripts/create-biteship-test-orders.mjs
 * Loads BITESHIP_API_KEY and WAREHOUSE_ORIGIN_POSTAL_CODE from .env.local.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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

function authHeader(apiKey) {
  const trimmed = apiKey.trim();
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed : trimmed;
}

function buildOrderPayload({ referenceId, originPostalCode, label }) {
  return {
    shipper_contact_name: "WA Commerce",
    shipper_contact_phone: "081234567890",
    origin_contact_name: "Warehouse",
    origin_contact_phone: "081234567890",
    origin_address: "Jl. Sudirman No. 1, Jakarta Selatan",
    origin_postal_code: Number(originPostalCode),
    destination_contact_name: "Test Customer",
    destination_contact_phone: "081298765432",
    destination_address: "Jl. Gatot Subroto No. 10, Jakarta Selatan",
    destination_postal_code: 12950,
    courier_company: "jne",
    courier_type: "reg",
    delivery_type: "now",
    reference_id: referenceId,
    order_note: `Biteship API activation test — ${label}`,
    items: [
      {
        name: `Test package (${label})`,
        description: "Sandbox test order for API activation",
        category: "others",
        value: 100000,
        quantity: 1,
        weight: 1000,
      },
    ],
  };
}

async function createOrder(apiKey, payload) {
  const res = await fetch("https://api.biteship.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

function upsertEnvVar(filePath, key, value) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split("\n");
  const prefix = `${key}=`;
  let found = false;
  const updated = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    updated.push(`${key}=${value}`);
  }
  writeFileSync(filePath, updated.join("\n"));
}

const env = loadEnv();
const apiKey = env.BITESHIP_API_KEY;
const originPostalCode = env.WAREHOUSE_ORIGIN_POSTAL_CODE ?? "12190";

if (!apiKey) {
  console.error("Missing BITESHIP_API_KEY in .env.local");
  process.exit(1);
}

if (!apiKey.startsWith("biteship_test.")) {
  console.warn(
    "Warning: BITESHIP_API_KEY does not look like a sandbox key (expected biteship_test.* prefix).",
  );
}

const stamp = Date.now();
const orders = [
  {
    label: "delivered",
    referenceId: `merlot-test-delivered-${stamp}`,
    envKey: "BITESHIP_TEST_DELIVERED_ORDER_ID",
  },
  {
    label: "cancelled",
    referenceId: `merlot-test-cancelled-${stamp}`,
    envKey: "BITESHIP_TEST_CANCELLED_ORDER_ID",
  },
];

const results = [];

for (const order of orders) {
  const payload = buildOrderPayload({
    referenceId: order.referenceId,
    originPostalCode,
    label: order.label,
  });
  const { ok, status, json } = await createOrder(apiKey, payload);
  results.push({ ...order, ok, status, json });
}

const created = results.filter((r) => r.ok && r.json?.id);
const failed = results.filter((r) => !r.ok);

for (const r of created) {
  upsertEnvVar(envPath, r.envKey, r.json.id);
}

console.log(
  JSON.stringify(
    {
      created: created.map((r) => ({
        purpose: r.label,
        orderId: r.json.id,
        status: r.json.status,
        referenceId: r.referenceId,
        waybillId: r.json.courier?.waybill_id ?? null,
      })),
      failed: failed.map((r) => ({
        purpose: r.label,
        httpStatus: r.status,
        error: r.json,
      })),
      nextSteps: [
        "Open Biteship Dashboard > Pengiriman and find both test orders.",
        "For the delivered test order: use Update Status until status is Delivered.",
        "For the cancelled test order: use Update Status > CANCEL.",
        "Submit order IDs at https://dashboard.biteship.com/api-activation-form",
        "Order IDs were saved to .env.local as BITESHIP_TEST_DELIVERED_ORDER_ID and BITESHIP_TEST_CANCELLED_ORDER_ID.",
      ],
    },
    null,
    2,
  ),
);

if (failed.length > 0) process.exit(1);
