/**
 * Smoke-test /api/staff/* with Demo auth.
 * Requires Next running with STAFF_API_ALLOW_DEMO=true (or no Supabase env).
 *
 *   node scripts/smoke-staff-api.mjs
 *   node scripts/smoke-staff-api.mjs http://localhost:3000
 */

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

async function req(path, { method = "GET", auth = "Demo u-cs-1", body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: auth,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const me = await req("/api/staff/me");
assert(me.status === 200 && me.data.user?.role === "cs", `me failed: ${me.status}`);

const convs = await req("/api/staff/conversations");
assert(convs.status === 200 && convs.data.conversations?.length > 0, "conversations empty");

const orders = await req("/api/staff/orders");
assert(orders.status === 200 && orders.data.orders?.length > 0, "orders empty");

const forbidden = await req(`/api/staff/orders/${orders.data.orders[0].id}/advance`, {
  method: "POST",
});
assert(forbidden.status === 403, `cs advance expected 403, got ${forbidden.status}`);

const target =
  orders.data.orders.find((o) => o.status === "new") ?? orders.data.orders[0];
const advance = await req(`/api/staff/orders/${target.id}/advance`, {
  method: "POST",
  auth: "Demo u-sales-1",
});
assert(advance.status === 200 && advance.data.ok, `sales advance failed: ${JSON.stringify(advance.data)}`);

const cid = convs.data.conversations[0].id;
const reply = await req(`/api/staff/conversations/${cid}/reply`, {
  method: "POST",
  body: { body: "Smoke test reply from scripts/smoke-staff-api.mjs" },
});
assert(reply.status === 200 && reply.data.ok, `reply failed: ${JSON.stringify(reply.data)}`);

const unauth = await req("/api/staff/me", { auth: "" });
assert(unauth.status === 401, `unauth expected 401, got ${unauth.status}`);

console.log("staff API smoke OK against", base);
