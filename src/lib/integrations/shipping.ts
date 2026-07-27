import { env } from "@/lib/env";

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
    const res = await fetch(`${BASE}/rates/couriers`, {
      method: "POST",
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
    const res = await fetch(`${BASE}/orders`, {
      method: "POST",
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
