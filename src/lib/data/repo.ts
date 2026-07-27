import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEMO_ADDRESSES,
  DEMO_CASES,
  DEMO_CONVERSATIONS,
  DEMO_CUSTOMERS,
  DEMO_NOTICES,
  DEMO_ORDERS,
  DEMO_PACK_SESSIONS,
  DEMO_PRODUCTS,
  DEMO_SHIPMENTS,
  demoMessages,
} from "@/lib/demo/data";
import type {
  Address,
  Conversation,
  Customer,
  Message,
  Order,
  PackScanLog,
  PackSession,
  Product,
  Shipment,
  ShipmentEvent,
  SupportCase,
  WarehouseNotice,
} from "@/lib/types";

/**
 * Single data-access facade. Each reader runs against Supabase when the project
 * is configured, otherwise against the in-memory demo dataset. Pages only ever
 * import from here, so swapping storage never touches the UI layer.
 */

/**
 * Unwraps a live multi-row read. A failed query must never fall through to the
 * demo dataset, or an outage/RLS misconfiguration would show staff fabricated
 * customers and orders that look entirely real.
 */
function liveRows<T>(
  scope: string,
  { data, error }: { data: T[] | null; error: PostgrestError | null },
): T[] {
  if (error) {
    console.error(`[repo] ${scope} failed`, error);
    return [];
  }
  return data ?? [];
}

/** Single-row variant of {@link liveRows}. */
function liveRow<T>(
  scope: string,
  { data, error }: { data: T | null; error: PostgrestError | null },
): T | null {
  if (error) {
    console.error(`[repo] ${scope} failed`, error);
    return null;
  }
  return data;
}

/* ---------- Customers ---------- */

export async function listCustomers(): Promise<Customer[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    return liveRows("listCustomers", res).map(mapCustomer);
  }
  return DEMO_CUSTOMERS;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
    const row = liveRow("getCustomer", res);
    return row ? mapCustomer(row) : null;
  }
  return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
}

export async function getCustomerAddresses(customerId: string): Promise<Address[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.from("addresses").select("*").eq("customer_id", customerId);
    return liveRows("getCustomerAddresses", res).map(mapAddress);
  }
  return DEMO_ADDRESSES.filter((a) => a.customerId === customerId);
}

/* ---------- Conversations & messages ---------- */

export async function listConversations(): Promise<Conversation[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("conversations")
      .select(
        "*, customers!conversations_customer_id_fkey(name, wa_id), users!conversations_assignee_id_fkey(name)",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    return liveRows("listConversations", res).map(mapConversation);
  }
  return DEMO_CONVERSATIONS.slice().sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("conversations")
      .select(
        "*, customers!conversations_customer_id_fkey(name, wa_id), users!conversations_assignee_id_fkey(name)",
      )
      .eq("id", id)
      .maybeSingle();
    const row = liveRow("getConversation", res);
    return row ? mapConversation(row) : null;
  }
  return DEMO_CONVERSATIONS.find((c) => c.id === id) ?? null;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return liveRows("listMessages", res).map(mapMessage);
  }
  return demoMessages(conversationId);
}

/* ---------- Catalog ---------- */

export async function listProducts(): Promise<Product[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.from("products").select("*").order("name");
    return liveRows("listProducts", res).map(mapProduct);
  }
  return DEMO_PRODUCTS;
}

/* ---------- Orders ---------- */

export async function listOrders(): Promise<Order[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    return liveRows("listOrders", res).map(mapOrder);
  }
  return DEMO_ORDERS.slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getOrder(id: string): Promise<Order | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .eq("id", id)
      .maybeSingle();
    const row = liveRow("getOrder", res);
    return row ? mapOrder(row) : null;
  }
  return DEMO_ORDERS.find((o) => o.id === id) ?? null;
}

export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    return liveRows("listOrdersForCustomer", res).map(mapOrder);
  }
  return DEMO_ORDERS.filter((o) => o.customerId === customerId);
}

/* ---------- Cases ---------- */

export async function listCases(): Promise<SupportCase[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("cases")
      .select(
        "*, customers!cases_customer_id_fkey(name), users!cases_owner_id_fkey(name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    return liveRows("listCases", res).map(mapCase);
  }
  return DEMO_CASES;
}

/* ---------- Shipments ---------- */

export async function listShipments(): Promise<Shipment[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("shipments")
      .select(
        "*, orders!shipments_order_id_fkey(code, customers!orders_customer_id_fkey(name)), shipment_events(status, note, at)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    return liveRows("listShipments", res).map(mapShipment);
  }
  return DEMO_SHIPMENTS;
}

/* ---------- Warehouse ---------- */

export async function listNotices(): Promise<WarehouseNotice[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("warehouse_notices")
      .select(
        "*, orders!warehouse_notices_order_id_fkey(code), users!warehouse_notices_raised_by_fkey(name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    return liveRows("listNotices", res).map(mapNotice);
  }
  return DEMO_NOTICES;
}

/* ---------- Pick & Pack ---------- */

/** Orders that are paid/allocated and have a label affixed — ready to pack. */
export async function listPackableOrders(): Promise<Order[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .in("status", ["paid", "allocated"])
      .not("label_number", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    return liveRows("listPackableOrders", res).map(mapOrder);
  }
  return DEMO_ORDERS.filter(
    (o) => ["paid", "allocated"].includes(o.status) && o.labelNumber,
  );
}

export async function findOrderByLabel(label: string): Promise<Order | null> {
  const norm = label.trim();
  if (!norm) return null;

  if (shouldUseSupabaseData()) {
    // `.or()` takes a raw PostgREST filter string, so a scanned value containing
    // commas or dots could graft on extra conditions. AWBs and order codes are
    // alphanumeric with dashes, and anything else cannot match a real order.
    if (!/^[A-Za-z0-9_-]+$/.test(norm)) return null;

    const supabase = await createSupabaseServerClient();
    // Packers scan the AWB but may also key in the order code; `ilike` keeps the
    // lookup case-insensitive (see the trigram indexes in migration 0018).
    const res = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .or(`label_number.ilike.${norm},code.ilike.${norm}`)
      .limit(1)
      .maybeSingle();
    const row = liveRow("findOrderByLabel", res);
    return row ? mapOrder(row) : null;
  }

  const lower = norm.toLowerCase();
  return (
    DEMO_ORDERS.find(
      (o) =>
        o.labelNumber?.toLowerCase() === lower || o.code.toLowerCase() === lower,
    ) ?? null
  );
}

export async function listPackSessions(): Promise<PackSession[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("pack_sessions")
      .select(PACK_SESSION_SELECT)
      .order("started_at", { ascending: false })
      .limit(200);
    return liveRows("listPackSessions", res).map(mapPackSession);
  }
  return [...DEMO_PACK_SESSIONS].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

const PACK_SESSION_SELECT =
  "*, orders!pack_sessions_order_id_fkey(code), users!pack_sessions_packer_id_fkey(name), pack_session_items(product_id, sku, barcode, name, required, scanned), pack_scans(sku, name, scanned_at)";

export async function getPackSession(sessionId: string): Promise<PackSession | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase
      .from("pack_sessions")
      .select(PACK_SESSION_SELECT)
      .eq("id", sessionId)
      .maybeSingle();
    const row = liveRow("getPackSession", res);
    return row ? mapPackSession(row) : null;
  }
  return DEMO_PACK_SESSIONS.find((s) => s.id === sessionId) ?? null;
}

/**
 * Scannable barcodes for a set of products, keyed by product id. Batched
 * because callers resolve every line item of an order at once.
 */
export async function getProductBarcodes(
  productIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.from("products").select("id, sku, barcode").in("id", ids);
    return new Map(
      liveRows<{ id: string; sku: string; barcode: string | null }>(
        "getProductBarcodes",
        res,
      ).map((p) => [p.id, p.barcode ?? p.sku]),
    );
  }

  return new Map(
    ids.map((id) => {
      const product = DEMO_PRODUCTS.find((p) => p.id === id);
      return [id, product?.barcode ?? id];
    }),
  );
}

/* ---------- Row mappers (snake_case DB -> domain) ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCustomer(r: any): Customer {
  return {
    id: r.id,
    waId: r.wa_id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    city: r.city,
    birthDate: r.birth_date ?? null,
    consentStatus: r.consent_status,
    consentChannel: r.consent_channel,
    segments: r.segments ?? [],
    tags: r.tags ?? [],
    lifetimeValue: r.lifetime_value ?? 0,
    orderCount: r.order_count ?? 0,
    firstSeenAt: r.first_seen_at,
    lastOrderAt: r.last_order_at,
    termsAcceptedAt: r.terms_accepted_at ?? null,
    termsVersion: r.terms_version ?? null,
    formAnswers:
      r.form_answers &&
      typeof r.form_answers === "object" &&
      !Array.isArray(r.form_answers)
        ? r.form_answers
        : undefined,
    createdAt: r.created_at,
  };
}

function mapAddress(r: any): Address {
  return {
    id: r.id,
    customerId: r.customer_id,
    label: r.label,
    recipientName: r.recipient_name,
    recipientPhone: r.recipient_phone,
    line1: r.line1,
    district: r.district,
    city: r.city,
    province: r.province,
    postalCode: r.postal_code,
    lat: r.lat,
    lng: r.lng,
    isDefault: r.is_default,
  };
}

function mapProduct(r: any): Product {
  return {
    id: r.id,
    sku: r.sku,
    barcode: r.barcode ?? r.sku,
    name: r.name,
    category: r.category,
    imageColor: r.image_color ?? "#6f2c3f",
    retailPrice: r.retail_price,
    discountPercent: r.discount_percent ?? 0,
    stock: r.stock ?? 0,
    reserved: r.reserved ?? 0,
    reorderPoint: r.reorder_point ?? 0,
    active: r.active ?? true,
    catalogSync: r.catalog_sync ?? "pending",
    units30d: r.units_30d ?? 0,
    unitsPrev30d: r.units_prev_30d ?? 0,
  };
}

function mapConversation(r: any): Conversation {
  const customer = r.customers ?? r.customer ?? null;
  const assignee = r.users ?? r.assignee ?? null;
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: customer?.name ?? "Unknown",
    customerWaId: customer?.wa_id ?? "",
    assigneeId: r.assignee_id,
    assigneeName: assignee?.name ?? null,
    status: r.status,
    unread: r.unread ?? 0,
    lastMessagePreview: r.last_message_preview ?? "",
    lastMessageAt: r.last_message_at ?? r.created_at,
    lastInboundAt: r.last_inbound_at,
    firstResponseSeconds: r.first_response_seconds,
    topic: r.topic,
  };
}

function mapMessage(r: any): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    direction: r.direction,
    kind: r.kind ?? "text",
    body: r.body ?? "",
    createdAt: r.created_at,
    authorName: r.author_name,
    status: r.status ?? null,
  };
}

function mapCase(r: any): SupportCase {
  const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
  const owner = Array.isArray(r.users) ? r.users[0] : r.users;
  return {
    id: r.id,
    code: r.code,
    customerId: r.customer_id ?? "",
    customerName: customer?.name ?? "Unknown",
    subject: r.subject,
    priority: r.priority,
    status: r.status,
    ownerId: r.owner_id ?? null,
    ownerName: owner?.name ?? null,
    orderId: r.order_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  };
}

function mapShipment(r: any): Shipment {
  const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers;
  const events: ShipmentEvent[] = (r.shipment_events ?? [])
    .map((e: any) => ({
      status: e.status ?? "",
      note: e.note ?? "",
      at: e.at,
    }))
    .sort(
      (a: ShipmentEvent, b: ShipmentEvent) =>
        new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  return {
    id: r.id,
    orderId: r.order_id,
    orderCode: order?.code ?? "",
    customerName: customer?.name ?? "Unknown",
    courier: r.courier ?? "",
    service: r.service ?? "",
    trackingNumber: r.tracking_number ?? "",
    status: r.status,
    cost: Number(r.cost ?? 0),
    destinationCity: r.destination_city ?? "",
    events,
    createdAt: r.created_at,
  };
}

function mapNotice(r: any): WarehouseNotice {
  const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
  const raisedBy = Array.isArray(r.users) ? r.users[0] : r.users;
  return {
    id: r.id,
    orderId: r.order_id ?? "",
    orderCode: order?.code ?? "",
    raisedByName: raisedBy?.name ?? "System",
    type: r.type,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapPackSession(r: any): PackSession {
  const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
  const packer = Array.isArray(r.users) ? r.users[0] : r.users;
  return {
    id: r.id,
    orderId: r.order_id,
    orderCode: order?.code ?? "",
    labelNumber: r.label_number ?? order?.code ?? "",
    packerId: r.packer_id ?? "",
    packerName: packer?.name ?? "Unknown",
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at ?? null,
    items: (r.pack_session_items ?? []).map((it: any) => ({
      productId: it.product_id ?? "",
      sku: it.sku ?? "",
      barcode: it.barcode ?? it.sku ?? "",
      name: it.name ?? it.sku ?? "Item",
      required: Number(it.required ?? 0),
      scanned: Number(it.scanned ?? 0),
    })),
    scans: (r.pack_scans ?? [])
      .map((s: any) => ({
        sku: s.sku ?? "",
        name: s.name ?? s.sku ?? "Item",
        at: s.scanned_at,
      }))
      .sort(
        (a: PackScanLog, b: PackScanLog) =>
          new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
  };
}

function mapOrder(r: any): Order {
  const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
  const items = (r.order_items ?? r.items ?? []).map((it: any) => ({
    productId: it.product_id ?? "",
    sku: it.sku ?? "",
    name: it.name ?? it.sku ?? "Item",
    qty: Number(it.qty ?? 0),
    unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
  }));
  const snap = r.shipping_address_snapshot ?? null;
  return {
    id: r.id,
    code: r.code,
    customerId: r.customer_id,
    customerName: customer?.name ?? r.customer_name ?? "Unknown",
    status: r.status,
    paymentStatus: r.payment_status,
    paymentProvider: r.payment_provider ?? null,
    paymentLink: r.payment_link ?? null,
    channel: r.channel === "agent" ? "agent" : "whatsapp_cart",
    items,
    subtotal: Number(r.subtotal ?? 0),
    shippingCost: Number(r.shipping_cost ?? 0),
    total: Number(r.total ?? 0),
    shippingAddress: snap
      ? {
          recipientName: snap.recipientName ?? snap.recipient_name ?? "",
          line1: snap.line1 ?? "",
          city: snap.city ?? "",
          postalCode: snap.postalCode ?? snap.postal_code ?? "",
        }
      : null,
    courier: r.courier ?? null,
    trackingNumber: r.tracking_number ?? null,
    labelNumber: r.label_number ?? null,
    flaggedIssue: r.flagged_issue ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
