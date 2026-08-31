import { env } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/http";
import { mapBiteshipToShipmentStatus, normalizeBiteshipStatus } from "@/lib/biteship-status";
import type { Shipment } from "@/lib/types";

const BASE = "https://api.biteship.com/v1";

export interface RateInput {
  destinationPostalCode: string;
  weightGrams: number;
  itemValue: number;
}

export interface CourierRate {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

const DEMO_COURIERS = [
  { courier: "SiCepat", service: "REG", description: "Regular", base: 18000, etd: "2-3 hari" },
  { courier: "J&T", service: "EZ", description: "Reguler", base: 20000, etd: "2-4 hari" },
  { courier: "JNE", service: "REG", description: "Layanan Reguler", base: 22000, etd: "2-3 hari" },
  { courier: "Anteraja", service: "REG", description: "Regular", base: 19000, etd: "2-3 hari" },
  { courier: "SiCepat", service: "BEST", description: "Besok Sampai", base: 32000, etd: "1 hari" },
];

interface BiteshipPricing {
  courier_name?: string;
  courier_service_code?: string;
  courier_service_name?: string;
  price?: number;
  duration?: string;
}

function configured() {
  return Boolean(env.shipping.biteshipKey);
}

export async function getRates(input: RateInput): Promise<CourierRate[]> {
  if (!configured()) {
    const surcharge = Math.round(input.weightGrams / 1000) * 3000;
    return DEMO_COURIERS.map((c) => ({
      courier: c.courier,
      service: c.service,
      description: c.description,
      cost: c.base + surcharge,
      etd: c.etd,
    }));
  }
  try {
    // Shorter than the others: a customer is waiting on this at checkout.
    const res = await fetchWithTimeout(`${BASE}/rates/couriers`, {
      method: "POST",
      timeoutMs: 8_000,
      headers: {
        Authorization: env.shipping.biteshipKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin_postal_code: env.shipping.originPostalCode,
        destination_postal_code: input.destinationPostalCode,
        couriers: "sicepat,jnt,jne,anteraja",
        items: [
          {
            name: "Order",
            value: input.itemValue,
            weight: input.weightGrams,
            quantity: 1,
          },
        ],
      }),
    });
    const json = (await res.json()) as { pricing?: BiteshipPricing[] };
    return (json.pricing ?? []).map((p) => ({
      courier: p.courier_name ?? "",
      service: p.courier_service_code ?? "",
      description: p.courier_service_name ?? "",
      cost: Number(p.price ?? 0),
      etd: p.duration ?? "",
    }));
  } catch (e) {
    console.error("[shipping] getRates failed", e);
    return [];
  }
}

export interface CreateShipmentInput {
  orderCode: string;
  courier: string;
  service: string;
  recipientName: string;
  recipientPhone: string;
  destinationAddress: string;
  destinationPostalCode: string;
}

export interface ShipmentResult {
  ok: boolean;
  trackingNumber?: string;
  biteshipOrderId?: string;
  mocked?: boolean;
  error?: string;
}

export async function createShipment(
  input: CreateShipmentInput,
): Promise<ShipmentResult> {
  if (!configured()) {
    console.info("[shipping:mock] createShipment", input.orderCode);
    return {
      ok: true,
      mocked: true,
      trackingNumber: `${input.courier.slice(0, 2).toUpperCase()}${Math.floor(
        Math.random() * 1e9,
      )}`,
      biteshipOrderId: `mock-${input.orderCode}`,
    };
  }
  try {
    const res = await fetchWithTimeout(`${BASE}/orders`, {
      method: "POST",
      timeoutMs: 15_000,
      headers: {
        Authorization: env.shipping.biteshipKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin_contact_name: env.shipping.originContactName,
        origin_contact_phone: env.shipping.originContactPhone,
        origin_address: env.shipping.originAddress,
        origin_postal_code: Number(env.shipping.originPostalCode),
        destination_contact_name: input.recipientName,
        destination_contact_phone: input.recipientPhone || "081000000000",
        destination_address: input.destinationAddress,
        destination_postal_code: Number(input.destinationPostalCode),
        courier_company: input.courier.toLowerCase(),
        courier_type: input.service.toLowerCase(),
        delivery_type: "now",
        reference_id: input.orderCode,
        items: [
          {
            name: input.orderCode,
            quantity: 1,
            value: 100000,
            weight: 1000,
          },
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(json) };
    return {
      ok: true,
      trackingNumber: json.courier?.waybill_id ?? json.id,
      biteshipOrderId: json.id,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export type BiteshipLiveOrder = {
  id: string;
  status: string;
  trackingNumber: string | null;
  courier: string;
  service: string;
  recipientName: string;
  destination: string;
  cost: number;
  link: string | null;
  history: { status: string; note: string; at: string }[];
};

type BiteshipOrderResponse = {
  success?: boolean;
  id?: string;
  status?: string;
  price?: number;
  destination?: { contact_name?: string; address?: string };
  courier?: {
    waybill_id?: string;
    company?: string;
    type?: string;
    link?: string;
    history?: { status?: string; note?: string; updated_at?: string }[];
  };
};

export async function getBiteshipOrder(id: string): Promise<BiteshipLiveOrder | null> {
  if (!configured() || !id.trim()) return null;
  try {
    const res = await fetchWithTimeout(`${BASE}/orders/${encodeURIComponent(id.trim())}`, {
      timeoutMs: 8_000,
      headers: { Authorization: env.shipping.biteshipKey },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[shipping] getBiteshipOrder", id, res.status);
      return null;
    }
    const json = (await res.json()) as BiteshipOrderResponse;
    const history = (json.courier?.history ?? []).map((h) => ({
      status: normalizeBiteshipStatus(String(h.status ?? "")),
      note: h.note ?? "",
      at: h.updated_at ?? "",
    }));
    return {
      id: json.id ?? id,
      status: normalizeBiteshipStatus(String(json.status ?? "")),
      trackingNumber: json.courier?.waybill_id ?? null,
      courier: json.courier?.company ?? "",
      service: json.courier?.type ?? "",
      recipientName: json.destination?.contact_name ?? "",
      destination: json.destination?.address ?? "",
      cost: Number(json.price ?? 0),
      link: json.courier?.link ?? null,
      history,
    };
  } catch (e) {
    console.error("[shipping] getBiteshipOrder failed", id, e);
    return null;
  }
}

export async function getBiteshipOrders(
  ids: string[],
): Promise<Map<string, BiteshipLiveOrder>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 30);
  const out = new Map<string, BiteshipLiveOrder>();
  const results = await Promise.allSettled(unique.map((id) => getBiteshipOrder(id)));
  for (let i = 0; i < unique.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled" && result.value) {
      out.set(unique[i], result.value);
    }
  }
  return out;
}

export type BoardShipment = Shipment & {
  biteshipStatus: string | null;
  biteshipLink: string | null;
  live: boolean;
};

export async function loadShipmentBoard(local: Shipment[]): Promise<{
  shipments: BoardShipment[];
  connected: boolean;
}> {
  const connected = configured();
  if (!connected) {
    return {
      shipments: local.map((s) => ({
        ...s,
        biteshipStatus: null,
        biteshipLink: null,
        live: false,
      })),
      connected: false,
    };
  }

  const extraIds = [
    env.shipping.testDeliveredOrderId,
    env.shipping.testCancelledOrderId,
  ].filter(Boolean);
  const ids = [
    ...local.map((s) => s.biteshipOrderId).filter((id): id is string => Boolean(id)),
    ...extraIds,
  ];
  const liveById = await getBiteshipOrders(ids);

  const shipments: BoardShipment[] = local.map((s) => {
    const live = s.biteshipOrderId ? liveById.get(s.biteshipOrderId) : undefined;
    if (!live) {
      return { ...s, biteshipStatus: null, biteshipLink: null, live: false };
    }
    return {
      ...s,
      status: mapBiteshipToShipmentStatus(live.status),
      trackingNumber: live.trackingNumber || s.trackingNumber,
      courier: live.courier || s.courier,
      service: live.service || s.service,
      events: live.history.length
        ? live.history.map((h) => ({ status: h.status, note: h.note, at: h.at }))
        : s.events,
      biteshipStatus: live.status,
      biteshipLink: live.link,
      live: true,
    };
  });

  const seen = new Set(
    shipments.map((s) => s.biteshipOrderId).filter((id): id is string => Boolean(id)),
  );
  for (const [id, live] of liveById) {
    if (seen.has(id)) continue;
    shipments.unshift({
      id: `biteship-${id}`,
      orderId: "",
      orderCode: id.slice(0, 10),
      customerName: live.recipientName || "Biteship",
      courier: live.courier,
      service: live.service,
      trackingNumber: live.trackingNumber ?? id,
      status: mapBiteshipToShipmentStatus(live.status),
      cost: live.cost,
      destinationCity: live.destination,
      events: live.history.map((h) => ({ status: h.status, note: h.note, at: h.at })),
      createdAt: live.history[0]?.at || new Date().toISOString(),
      biteshipOrderId: id,
      biteshipStatus: live.status,
      biteshipLink: live.link,
      live: true,
    });
  }

  return { shipments, connected: true };
}
