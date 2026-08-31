import type { ShipmentStatus } from "@/lib/types";

/** API uses snake_case; some docs show camelCase. */
export function normalizeBiteshipStatus(raw: string): string {
  return raw
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Local shipment_status used in CRM, from a Biteship tracking status. */
export const BITESHIP_TO_SHIPMENT: Record<string, ShipmentStatus> = {
  confirmed: "requested",
  allocated: "requested",
  picking_up: "picked_up",
  picked: "picked_up",
  dropping_off: "in_transit",
  on_the_way: "in_transit",
  in_transit: "in_transit",
  on_hold: "in_transit",
  delivered: "delivered",
  return_in_transit: "returned",
  returned: "returned",
};

export const BITESHIP_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  allocated: "Allocated",
  picking_up: "Picking up",
  picked: "Picked",
  dropping_off: "Dropping off",
  on_the_way: "On the way",
  in_transit: "In transit",
  on_hold: "On hold",
  delivered: "Delivered",
  return_in_transit: "Return in transit",
  returned: "Returned",
  rejected: "Rejected",
  courier_not_found: "Courier not found",
  cancelled: "Cancelled",
  disposed: "Disposed",
};

export type BiteshipStatusTone = "neutral" | "merlot" | "success" | "warning" | "danger" | "info";

export const BITESHIP_STATUS_TONES: Record<string, BiteshipStatusTone> = {
  confirmed: "info",
  allocated: "info",
  picking_up: "merlot",
  picked: "merlot",
  dropping_off: "warning",
  on_the_way: "warning",
  in_transit: "warning",
  on_hold: "warning",
  delivered: "success",
  return_in_transit: "danger",
  returned: "danger",
  rejected: "danger",
  courier_not_found: "danger",
  cancelled: "danger",
  disposed: "danger",
};

export function mapBiteshipToShipmentStatus(raw: string): ShipmentStatus {
  const key = normalizeBiteshipStatus(raw);
  return BITESHIP_TO_SHIPMENT[key] ?? "in_transit";
}

export function biteshipStatusLabel(raw: string): string {
  const key = normalizeBiteshipStatus(raw);
  return BITESHIP_STATUS_LABELS[key] ?? raw.replace(/_/g, " ");
}

export function isBiteshipInTransit(raw: string): boolean {
  const key = normalizeBiteshipStatus(raw);
  return [
    "picking_up",
    "picked",
    "dropping_off",
    "on_the_way",
    "in_transit",
    "on_hold",
  ].includes(key);
}

export function isBiteshipCancelled(raw: string): boolean {
  const key = normalizeBiteshipStatus(raw);
  return ["cancelled", "rejected", "courier_not_found", "disposed"].includes(key);
}
