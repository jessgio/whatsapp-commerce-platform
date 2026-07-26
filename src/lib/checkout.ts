import { randomBytes } from "node:crypto";
import { publicFormBaseUrl } from "@/lib/lead-edit";

/** Default per-unit weight when catalog products have no weight field. */
export const DEFAULT_ITEM_WEIGHT_GRAMS = 250;

/** Checkout link validity after WhatsApp cart submit. */
export const CHECKOUT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function newCheckoutToken(): string {
  return randomBytes(24).toString("base64url");
}

export function checkoutExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + CHECKOUT_TOKEN_TTL_MS).toISOString();
}

export function checkoutUrl(token: string): string {
  const url = new URL("/checkout", publicFormBaseUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export function newOrderCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `WA-${stamp}${suffix}`;
}

export function cartWeightGrams(items: { qty: number }[]): number {
  const total = items.reduce(
    (sum, it) => sum + it.qty * DEFAULT_ITEM_WEIGHT_GRAMS,
    0,
  );
  return Math.max(total, DEFAULT_ITEM_WEIGHT_GRAMS);
}

export interface ParsedCartItem {
  retailerId: string;
  quantity: number;
  itemPrice: number;
  currency: string;
}

export interface ParsedWhatsAppOrder {
  catalogId: string | null;
  text: string | null;
  items: ParsedCartItem[];
}

/** Extract product line items from a WhatsApp Cloud API `order` message. */
export function parseWhatsAppOrder(raw: unknown): ParsedWhatsAppOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as Record<string, unknown>;
  if (msg.type !== "order") return null;
  const order = msg.order as Record<string, unknown> | undefined;
  if (!order) return null;
  const productItems = Array.isArray(order.product_items)
    ? order.product_items
    : [];
  const items: ParsedCartItem[] = [];
  for (const row of productItems) {
    if (!row || typeof row !== "object") continue;
    const it = row as Record<string, unknown>;
    const retailerId = String(
      it.product_retailer_id ?? it.product_retailerId ?? "",
    ).trim();
    const quantity = Number(it.quantity ?? 0);
    const itemPrice = Number(it.item_price ?? it.itemPrice ?? 0);
    if (!retailerId || !Number.isFinite(quantity) || quantity <= 0) continue;
    items.push({
      retailerId,
      quantity: Math.floor(quantity),
      itemPrice: Number.isFinite(itemPrice) ? itemPrice : 0,
      currency: String(it.currency ?? "IDR"),
    });
  }
  if (items.length === 0) return null;
  return {
    catalogId: order.catalog_id ? String(order.catalog_id) : null,
    text: order.text ? String(order.text) : null,
    items,
  };
}
