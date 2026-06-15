"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/data/repo";
import { pushCatalog } from "@/lib/integrations/catalog-sync";
import { DEMO_PRODUCTS } from "@/lib/demo/data";

export async function updatePricing(
  productId: string,
  retailPrice: number,
  discountPercent: number,
) {
  await requirePermission("catalog.edit");

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("products")
      .update({ retail_price: retailPrice, discount_percent: discountPercent, catalog_sync: "pending" })
      .eq("id", productId);
  } else {
    const p = DEMO_PRODUCTS.find((x) => x.id === productId);
    if (p) {
      p.retailPrice = retailPrice;
      p.discountPercent = discountPercent;
      p.catalogSync = "pending";
    }
  }
  revalidatePath("/catalog");
}

export async function pushCatalogNow() {
  await requirePermission("catalog.edit");
  const products = await listProducts();
  const result = await pushCatalog(products);

  if (result.ok && !isSupabaseConfigured()) {
    DEMO_PRODUCTS.forEach((p) => {
      if (p.stock > 0) p.catalogSync = "synced";
    });
  }
  revalidatePath("/catalog");
}
