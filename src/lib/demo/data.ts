import type {
  Address,
  AppUser,
  Conversation,
  Customer,
  Message,
  Order,
  PackProgressItem,
  PackScanLog,
  PackSession,
  Product,
  Shipment,
  SupportCase,
  WarehouseNotice,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Team                                                               */
/* ------------------------------------------------------------------ */

export const DEMO_USERS: AppUser[] = [
  { id: "u-admin", name: "Rina Wijaya", email: "rina@aerisbeaute.com", role: "admin", avatarColor: "#6f2c3f" },
  { id: "u-sales-1", name: "Dewi Lestari", email: "dewi@aerisbeaute.com", role: "sales", avatarColor: "#8a3a4f" },
  { id: "u-sales-2", name: "Bagus Pratama", email: "bagus@aerisbeaute.com", role: "sales", avatarColor: "#5f5448" },
  { id: "u-cs-1", name: "Sari Putri", email: "sari@aerisbeaute.com", role: "cs", avatarColor: "#3a5a7a" },
  { id: "u-cs-2", name: "Andi Nugroho", email: "andi@aerisbeaute.com", role: "cs", avatarColor: "#3f6f53" },
  { id: "u-wh-1", name: "Joko Susilo", email: "joko@aerisbeaute.com", role: "warehouse", avatarColor: "#b5862f" },
];

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                              */
/* ------------------------------------------------------------------ */

const CITIES = [
  ["Jakarta Selatan", "DKI Jakarta", "12190"],
  ["Bandung", "Jawa Barat", "40115"],
  ["Surabaya", "Jawa Timur", "60271"],
  ["Medan", "Sumatera Utara", "20111"],
  ["Semarang", "Jawa Tengah", "50132"],
  ["Tangerang", "Banten", "15117"],
  ["Bekasi", "Jawa Barat", "17141"],
  ["Yogyakarta", "DI Yogyakarta", "55171"],
];

const FIRST = ["Adinda", "Bayu", "Citra", "Dimas", "Eka", "Fitri", "Gilang", "Hana", "Indra", "Joya", "Kanya", "Lukman", "Maya", "Nadia", "Oka", "Putra", "Qori", "Rama", "Sinta", "Tari", "Umar", "Vina", "Wawan", "Yuni"];
const LAST = ["Santoso", "Wijaya", "Halim", "Saputra", "Hidayat", "Permata", "Kusuma", "Anggraini", "Salim", "Pranata"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function minsAgo(n: number): string {
  return new Date(Date.now() - n * 60000).toISOString();
}

/* ------------------------------------------------------------------ */
/* Catalog                                                            */
/* ------------------------------------------------------------------ */

const PRODUCT_DEFS: Array<[string, string, number, number]> = [
  ["Merlot Silk Scarf", "Accessories", 189000, 320],
  ["Charm Leather Tote", "Bags", 649000, 84],
  ["Cream Linen Shirt", "Apparel", 329000, 210],
  ["Taupe Wool Cardigan", "Apparel", 459000, 60],
  ["Beige Canvas Sneakers", "Footwear", 549000, 145],
  ["Brown Suede Loafers", "Footwear", 729000, 38],
  ["Velvet Hair Claw", "Accessories", 79000, 540],
  ["Merlot Lip Tint", "Beauty", 129000, 410],
  ["Charcoal Tote Organizer", "Bags", 159000, 12],
  ["Silk Pillowcase Set", "Home", 289000, 96],
  ["Aroma Soy Candle", "Home", 149000, 230],
  ["Gold Charm Bracelet", "Jewelry", 399000, 70],
  ["Pearl Drop Earrings", "Jewelry", 349000, 130],
  ["Cream Ribbed Socks 3pk", "Apparel", 99000, 600],
  ["Taupe Crossbody Bag", "Bags", 499000, 54],
  ["Merlot Matte Nail Set", "Beauty", 119000, 0],
];

export const DEMO_PRODUCTS: Product[] = PRODUCT_DEFS.map(([name, category, price, stock], i) => {
  const discount = i % 5 === 0 ? 15 : i % 3 === 0 ? 10 : 0;
  const units30d = 40 + ((i * 37) % 220);
  const trend = i % 4 === 0 ? -0.3 : i % 3 === 0 ? 0.45 : 0.12;
  return {
    id: `p-${i + 1}`,
    sku: `MC-${String(1000 + i)}`,
    barcode: String(8990000000000 + i),
    name,
    category,
    imageColor: pick(["#6f2c3f", "#b49e8e", "#5f5448", "#d8c9b5", "#8a3a4f"], i),
    retailPrice: price,
    discountPercent: discount,
    stock,
    reserved: Math.min(stock, (i * 7) % 30),
    reorderPoint: 40,
    active: true,
    catalogSync: stock === 0 ? "error" : i % 6 === 0 ? "pending" : "synced",
    units30d,
    unitsPrev30d: Math.round(units30d / (1 + trend)),
  };
});

/* ------------------------------------------------------------------ */
/* Customers + addresses                                              */
/* ------------------------------------------------------------------ */

export const DEMO_CUSTOMERS: Customer[] = Array.from({ length: 64 }, (_, i) => {
  const name = `${pick(FIRST, i)} ${pick(LAST, i * 3)}`;
  const [city] = pick(CITIES, i);
  const orderCount = (i * 5) % 9;
  const consent = i % 11 === 0 ? "opted_out" : i % 5 === 0 ? "pending" : "opted_in";
  return {
    id: `c-${i + 1}`,
    waId: `62812${String(10000000 + i * 137).slice(0, 8)}`,
    name,
    phone: `+62 812-${String(1000 + i).slice(0, 4)}-${String(2000 + i * 3).slice(0, 4)}`,
    email: i % 3 === 0 ? `${name.split(" ")[0].toLowerCase()}@mail.com` : null,
    city,
    consentStatus: consent as Customer["consentStatus"],
    consentChannel: pick(["click_to_chat", "web_form", "ad", "import"], i) as Customer["consentChannel"],
    segments: orderCount >= 5 ? ["VIP", "Repeat"] : orderCount > 0 ? ["Repeat"] : ["New"],
    tags: i % 4 === 0 ? ["wholesale-interest"] : [],
    lifetimeValue: orderCount * (150000 + (i % 7) * 90000),
    orderCount,
    firstSeenAt: daysAgo(60 - (i % 55)),
    lastOrderAt: orderCount > 0 ? daysAgo((i * 2) % 40) : null,
    createdAt: daysAgo(60 - (i % 55)),
  };
});

export const DEMO_ADDRESSES: Address[] = DEMO_CUSTOMERS.flatMap((cust, i) => {
  const [city, province, postal] = pick(CITIES, i);
  const base: Address = {
    id: `a-${cust.id}-1`,
    customerId: cust.id,
    label: "Rumah",
    recipientName: cust.name,
    recipientPhone: cust.phone,
    line1: `Jl. ${pick(LAST, i)} No. ${10 + (i % 80)}, RT 0${(i % 8) + 1}`,
    district: `Kec. ${pick(["Kebayoran", "Cilandak", "Menteng", "Coblong", "Gubeng"], i)}`,
    city,
    province,
    postalCode: postal,
    lat: -6.2 - (i % 10) * 0.01,
    lng: 106.8 + (i % 10) * 0.01,
    isDefault: true,
  };
  if (i % 6 === 0) {
    return [
      base,
      { ...base, id: `a-${cust.id}-2`, label: "Kantor", isDefault: false, line1: `Gedung ${pick(LAST, i)} Lt. ${2 + (i % 20)}` },
    ];
  }
  return [base];
});

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */

export const DEMO_ORDERS: Order[] = Array.from({ length: 48 }, (_, i) => {
  const cust = pick(DEMO_CUSTOMERS, i * 7);
  const addr = DEMO_ADDRESSES.find((a) => a.customerId === cust.id && a.isDefault)!;
  const itemCount = 1 + (i % 3);
  const items = Array.from({ length: itemCount }, (_, j) => {
    const p = pick(DEMO_PRODUCTS, i * 3 + j);
    const qty = 1 + ((i + j) % 3);
    return { productId: p.id, sku: p.sku, name: p.name, qty, unitPrice: p.retailPrice };
  });
  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const shippingCost = 18000 + (i % 4) * 6000;
  const statuses: Order["status"][] = ["new", "paid", "allocated", "packed", "shipped", "delivered"];
  const status = i % 13 === 0 ? "cancelled" : pick(statuses, i);
  const paid = ["paid", "allocated", "packed", "shipped", "delivered"].includes(status);
  const couriers = ["SiCepat", "J&T", "JNE", "Anteraja"];
  const courier = pick(couriers, i);
  const shipped = ["shipped", "delivered"].includes(status);
  // Label/AWB is affixed once an order is ready to fulfill (paid onward).
  const hasLabel = ["paid", "allocated", "packed", "shipped", "delivered"].includes(status);
  const awb = `${courier.slice(0, 2).toUpperCase()}${900000000 + i * 31}`;
  return {
    id: `o-${i + 1}`,
    code: `WA-${24010 + i}`,
    customerId: cust.id,
    customerName: cust.name,
    status,
    paymentStatus: status === "cancelled" ? "expired" : paid ? "paid" : i % 2 === 0 ? "pending" : "unpaid",
    paymentProvider: paid ? "midtrans" : i % 2 === 0 ? "midtrans" : null,
    paymentLink: paid || i % 2 === 0 ? `https://app.sandbox.midtrans.com/snap/v3/redirection/demo-${i}` : null,
    channel: i % 3 === 0 ? "agent" : "whatsapp_cart",
    items,
    subtotal,
    shippingCost,
    total: subtotal + shippingCost,
    shippingAddress: {
      recipientName: addr.recipientName,
      line1: addr.line1,
      city: addr.city,
      postalCode: addr.postalCode,
    },
    courier: hasLabel ? courier : null,
    trackingNumber: shipped ? awb : null,
    labelNumber: hasLabel ? awb : null,
    flaggedIssue: i % 9 === 0 ? "Customer requested address change after payment" : null,
    createdAt: daysAgo((i * 2) % 45),
    updatedAt: daysAgo((i % 10)),
  };
});

/* ------------------------------------------------------------------ */
/* Conversations + messages                                          */
/* ------------------------------------------------------------------ */

const TOPICS = ["Product question", "Promo inquiry", "Order status", "Return request", "Sizing help", "Stock check"];
const PREVIEWS = [
  "Halo kak, ini masih ready stock?",
  "Apakah ada promo untuk pembelian 2?",
  "Pesanan saya sudah dikirim belum ya?",
  "Mau tanya warna lain ada?",
  "Terima kasih kak, ditunggu paketnya!",
  "Bisa COD tidak kak?",
];

export const DEMO_CONVERSATIONS: Conversation[] = Array.from({ length: 28 }, (_, i) => {
  const cust = pick(DEMO_CUSTOMERS, i * 3);
  const agents = DEMO_USERS.filter((u) => u.role === "sales" || u.role === "cs");
  const assigned = i % 5 === 0 ? null : pick(agents, i);
  const statuses: Conversation["status"][] = ["open", "pending", "resolved"];
  const status = pick(statuses, i);
  const lastInboundMins = (i * 37) % 1600;
  return {
    id: `cv-${i + 1}`,
    customerId: cust.id,
    customerName: cust.name,
    customerWaId: cust.waId,
    assigneeId: assigned?.id ?? null,
    assigneeName: assigned?.name ?? null,
    status,
    unread: i % 4 === 0 ? (i % 3) + 1 : 0,
    lastMessagePreview: pick(PREVIEWS, i),
    lastMessageAt: minsAgo(lastInboundMins),
    lastInboundAt: minsAgo(lastInboundMins),
    firstResponseSeconds: status === "resolved" ? 120 + (i % 8) * 90 : i % 3 === 0 ? null : 60 + (i % 10) * 45,
    topic: pick(TOPICS, i),
  };
});

export function demoMessages(conversationId: string): Message[] {
  const idx = Number(conversationId.split("-")[1] ?? 1);
  const conv = DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
  const agentName = conv?.assigneeName ?? "Dewi Lestari";
  return [
    { id: `${conversationId}-m1`, conversationId, direction: "in", kind: "text", body: pick(PREVIEWS, idx), createdAt: minsAgo(180), authorName: null, status: null },
    { id: `${conversationId}-m2`, conversationId, direction: "out", kind: "text", body: "Halo kak! Iya betul masih ready ya. Mau dibantu pesan sekarang?", createdAt: minsAgo(176), authorName: agentName, status: "read" },
    { id: `${conversationId}-m3`, conversationId, direction: "in", kind: "text", body: "Boleh kak, yang warna merlot ya. Ongkir ke Bandung berapa?", createdAt: minsAgo(170), authorName: null, status: null },
    { id: `${conversationId}-m4`, conversationId, direction: "out", kind: "text", body: "Ongkir ke Bandung mulai Rp18.000 (SiCepat REG). Saya buatkan link pembayaran ya 🙏", createdAt: minsAgo(168), authorName: agentName, status: "read" },
    { id: `${conversationId}-m5`, conversationId, direction: "out", kind: "order", body: "Order WA-24018 · Merlot Silk Scarf x1 · Total Rp207.000", createdAt: minsAgo(167), authorName: agentName, status: "delivered" },
    { id: `${conversationId}-m6`, conversationId, direction: "in", kind: "text", body: pick(PREVIEWS, idx + 2), createdAt: minsAgo(conv ? Math.min(160, (idx * 37) % 1600) : 30), authorName: null, status: null },
  ];
}

/* ------------------------------------------------------------------ */
/* Cases                                                              */
/* ------------------------------------------------------------------ */

export const DEMO_CASES: SupportCase[] = Array.from({ length: 14 }, (_, i) => {
  const cust = pick(DEMO_CUSTOMERS, i * 5);
  const csAgents = DEMO_USERS.filter((u) => u.role === "cs" || u.role === "sales");
  const owner = i % 6 === 0 ? null : pick(csAgents, i);
  const priorities: SupportCase["priority"][] = ["low", "medium", "high", "urgent"];
  const statuses: SupportCase["status"][] = ["new", "in_progress", "waiting", "resolved"];
  return {
    id: `case-${i + 1}`,
    code: `CS-${3100 + i}`,
    customerId: cust.id,
    customerName: cust.name,
    subject: pick(["Paket belum sampai", "Salah ukuran", "Barang rusak saat tiba", "Refund request", "Komplain warna berbeda", "Resi tidak update"], i),
    priority: pick(priorities, i),
    status: pick(statuses, i),
    ownerId: owner?.id ?? null,
    ownerName: owner?.name ?? null,
    orderId: i % 2 === 0 ? pick(DEMO_ORDERS, i).id : null,
    createdAt: daysAgo(i % 12),
    updatedAt: minsAgo((i * 53) % 800),
  };
});

/* ------------------------------------------------------------------ */
/* Shipments                                                          */
/* ------------------------------------------------------------------ */

export const DEMO_SHIPMENTS: Shipment[] = DEMO_ORDERS.filter((o) => o.trackingNumber).map((o, i) => {
  const delivered = o.status === "delivered";
  const events = [
    { status: "Pengiriman dibuat", note: "Order dialokasikan ke kurir", at: daysAgo(i % 6 + 3) },
    { status: "Picked up", note: `Paket diambil kurir ${o.courier}`, at: daysAgo(i % 6 + 2) },
    { status: "In transit", note: `Dalam perjalanan ke ${o.shippingAddress?.city}`, at: daysAgo(i % 6 + 1) },
  ];
  if (delivered) events.push({ status: "Delivered", note: "Diterima oleh penerima", at: daysAgo(i % 3) });
  return {
    id: `s-${i + 1}`,
    orderId: o.id,
    orderCode: o.code,
    customerName: o.customerName,
    courier: o.courier!,
    service: pick(["REG", "BEST", "YES", "Express"], i),
    trackingNumber: o.trackingNumber!,
    status: delivered ? "delivered" : pick(["in_transit", "picked_up"], i) as Shipment["status"],
    cost: o.shippingCost,
    destinationCity: o.shippingAddress?.city ?? "Jakarta",
    events,
    createdAt: daysAgo(i % 6 + 3),
  };
});

/* ------------------------------------------------------------------ */
/* Warehouse notices                                                 */
/* ------------------------------------------------------------------ */

export const DEMO_NOTICES: WarehouseNotice[] = DEMO_ORDERS.filter((o) => o.flaggedIssue).map((o, i) => ({
  id: `wn-${i + 1}`,
  orderId: o.id,
  orderCode: o.code,
  raisedByName: pick(DEMO_USERS.filter((u) => u.role === "sales" || u.role === "cs"), i).name,
  type: pick(["address_issue", "stock_issue", "damage", "delay"], i) as WarehouseNotice["type"],
  message: o.flaggedIssue!,
  status: pick(["open", "ack", "resolved"], i) as WarehouseNotice["status"],
  createdAt: daysAgo(i % 5),
}));

/* ------------------------------------------------------------------ */
/* Pack sessions (mutable in demo mode)                              */
/* ------------------------------------------------------------------ */

function barcodeFor(productId: string): string {
  return DEMO_PRODUCTS.find((p) => p.id === productId)?.barcode ?? productId;
}

function buildCompletedSession(order: Order, idx: number): PackSession {
  const packers = DEMO_USERS.filter((u) => u.role === "warehouse");
  const packer = pick(packers.length ? packers : DEMO_USERS, idx);
  const startMins = 90 - idx * 25;
  const items: PackProgressItem[] = order.items.map((it) => ({
    productId: it.productId,
    sku: it.sku,
    barcode: barcodeFor(it.productId),
    name: it.name,
    required: it.qty,
    scanned: it.qty,
  }));
  const scans: PackScanLog[] = [];
  let t = startMins;
  for (const it of items) {
    for (let q = 0; q < it.required; q++) {
      t -= 0.4 + (q % 3) * 0.2;
      scans.push({ sku: it.sku, name: it.name, at: minsAgo(t) });
    }
  }
  return {
    id: `pack-${idx + 1}`,
    orderId: order.id,
    orderCode: order.code,
    labelNumber: order.labelNumber ?? order.code,
    packerId: packer.id,
    packerName: packer.name,
    status: "completed",
    startedAt: minsAgo(startMins),
    completedAt: minsAgo(t),
    items,
    scans,
  };
}

export const DEMO_PACK_SESSIONS: PackSession[] = DEMO_ORDERS.filter(
  (o) => o.status === "packed" || o.status === "shipped" || o.status === "delivered",
)
  .slice(0, 4)
  .map((o, i) => buildCompletedSession(o, i));
