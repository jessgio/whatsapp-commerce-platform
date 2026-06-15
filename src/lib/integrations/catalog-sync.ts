import { env } from "@/lib/env";
import type { Product } from "@/lib/types";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface CatalogSyncResult {
  ok: boolean;
  pushed: number;
  mocked?: boolean;
  error?: string;
}

function configured() {
  return Boolean(env.whatsapp.token && env.whatsapp.catalogId);
}

function effectivePrice(p: Product): number {
  return Math.round(p.retailPrice * (1 - p.discountPercent / 100));
}

/**
 * Pushes price + availability to the WhatsApp/Meta catalog using the batch
 * Commerce API. Batched to respect rate limits. Mocked when not configured.
 */
export async function pushCatalog(products: Product[]): Promise<CatalogSyncResult> {
  const batch = products.map((p) => ({
    method: "UPDATE",
    retailer_id: p.sku,
    data: {
      name: p.name,
      price: `${effectivePrice(p)} IDR`,
      availability: p.stock > 0 ? "in stock" : "out of stock",
      inventory: p.stock,
    },
  }));

  if (!configured()) {
    console.info("[catalog:mock] pushCatalog", batch.length, "items");
    return { ok: true, pushed: batch.length, mocked: true };
  }

  try {
    const res = await fetch(`${GRAPH}/${env.whatsapp.catalogId}/items_batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item_type: "PRODUCT_ITEM", requests: batch }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, pushed: 0, error: JSON.stringify(json) };
    return { ok: true, pushed: batch.length };
  } catch (e) {
    return { ok: false, pushed: 0, error: String(e) };
  }
}
