import "server-only";
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
  PackSession,
  Product,
  Shipment,
  SupportCase,
  WarehouseNotice,
} from "@/lib/types";

/**
 * Single data-access facade. Each reader runs against Supabase when the project
 * is configured, otherwise against the in-memory demo dataset. Pages only ever
 * import from here, so swapping storage never touches the UI layer.
 */

/* ---------- Customers ---------- */

export async function listCustomers(): Promise<Customer[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) return data.map(mapCustomer);
  }
  return DEMO_CUSTOMERS;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("customers").select("*").eq("id", id).single();
    if (data) return mapCustomer(data);
    return null;
  }
  return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
}

export async function getCustomerAddresses(customerId: string): Promise<Address[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("addresses").select("*").eq("customer_id", customerId);
    if (data) return data.map(mapAddress);
  }
  return DEMO_ADDRESSES.filter((a) => a.customerId === customerId);
}

/* ---------- Conversations & messages ---------- */

export async function listConversations(): Promise<Conversation[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("conversations")
      .select(
        "*, customers!conversations_customer_id_fkey(name, wa_id), users!conversations_assignee_id_fkey(name)",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (data) return data.map(mapConversation);
  }
  return DEMO_CONVERSATIONS.slice().sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("conversations")
      .select(
        "*, customers!conversations_customer_id_fkey(name, wa_id), users!conversations_assignee_id_fkey(name)",
      )
      .eq("id", id)
      .maybeSingle();
    if (data) return mapConversation(data);
    return null;
  }
  return DEMO_CONVERSATIONS.find((c) => c.id === id) ?? null;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) return data.map(mapMessage);
  }
  return demoMessages(conversationId);
}

/* ---------- Catalog ---------- */

export async function listProducts(): Promise<Product[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) return data.map(mapProduct);
  }
  return DEMO_PRODUCTS;
}

/* ---------- Orders ---------- */

export async function listOrders(): Promise<Order[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) return data.map(mapOrder);
  }
  return DEMO_ORDERS.slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getOrder(id: string): Promise<Order | null> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .eq("id", id)
      .maybeSingle();
    if (data) return mapOrder(data);
    return null;
  }
  return DEMO_ORDERS.find((o) => o.id === id) ?? null;
}

export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  if (shouldUseSupabaseData()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "*, customers!orders_customer_id_fkey(name), order_items(product_id, sku, name, qty, unit_price)",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (data) return data.map(mapOrder);
    return [];
  }
  return DEMO_ORDERS.filter((o) => o.customerId === customerId);
}

/* ---------- Cases ---------- */

export async function listCases(): Promise<SupportCase[]> {
  return DEMO_CASES;
}

/* ---------- Shipments ---------- */

export async function listShipments(): Promise<Shipment[]> {
  return DEMO_SHIPMENTS;
}

/* ---------- Warehouse ---------- */

export async function listNotices(): Promise<WarehouseNotice[]> {
  return DEMO_NOTICES;
}

/* ---------- Pick & Pack ---------- */

/** Orders that are paid/allocated and have a label affixed — ready to pack. */
export async function listPackableOrders(): Promise<Order[]> {
  const orders = await listOrders();
  return orders.filter(
    (o) => ["paid", "allocated"].includes(o.status) && o.labelNumber,
  );
}

export async function findOrderByLabel(label: string): Promise<Order | null> {
  const norm = label.trim().toLowerCase();
  const orders = await listOrders();
  return (
    orders.find(
      (o) =>
        o.labelNumber?.toLowerCase() === norm || o.code.toLowerCase() === norm,
    ) ?? null
  );
}

export async function listPackSessions(): Promise<PackSession[]> {
  return [...DEMO_PACK_SESSIONS].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

export async function getProductBarcode(productId: string): Promise<string> {
  return DEMO_PRODUCTS.find((p) => p.id === productId)?.barcode ?? productId;
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
