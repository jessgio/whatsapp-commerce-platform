"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Table, Th, Td, Badge } from "@/components/ui";
import { SyncBadge } from "@/components/status";
import { formatIDR } from "@/lib/format";
import { updatePricing } from "@/app/(portal)/catalog/actions";
import type { Product } from "@/lib/types";

export function CatalogTable({
  products,
  canEdit,
}: {
  products: Product[];
  canEdit: boolean;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Product</Th>
          <Th>SKU</Th>
          <Th className="text-right">Retail price</Th>
          <Th className="text-right">Disc %</Th>
          <Th className="text-right">Effective</Th>
          <Th className="text-right">Stock</Th>
          <Th>Catalog</Th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <Row key={p.id} product={p} canEdit={canEdit} />
        ))}
      </tbody>
    </Table>
  );
}

function Row({ product, canEdit }: { product: Product; canEdit: boolean }) {
  const [price, setPrice] = useState(product.retailPrice);
  const [disc, setDisc] = useState(product.discountPercent);
  const [pending, startTransition] = useTransition();
  const dirty = price !== product.retailPrice || disc !== product.discountPercent;
  const effective = Math.round(price * (1 - disc / 100));
  const low = product.stock <= product.reorderPoint;

  return (
    <tr className="hover:bg-surface-muted">
      <Td>
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-md" style={{ background: product.imageColor }} />
          <div>
            <div className="text-sm font-medium text-foreground">{product.name}</div>
            <div className="text-xs text-muted">{product.category}</div>
          </div>
        </div>
      </Td>
      <Td className="font-mono text-xs text-muted">{product.sku}</Td>
      <Td className="text-right">
        {canEdit ? (
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-28 rounded-md border border-border bg-surface px-2 py-1 text-right text-sm outline-none focus:border-merlot"
          />
        ) : (
          <span className="text-sm">{formatIDR(price)}</span>
        )}
      </Td>
      <Td className="text-right">
        {canEdit ? (
          <input
            type="number"
            value={disc}
            onChange={(e) => setDisc(Number(e.target.value))}
            className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-right text-sm outline-none focus:border-merlot"
          />
        ) : (
          <span className="text-sm">{disc}%</span>
        )}
      </Td>
      <Td className="text-right text-sm font-medium text-merlot">{formatIDR(effective)}</Td>
      <Td className="text-right">
        <span className={low ? "text-sm font-medium text-danger" : "text-sm"}>{product.stock}</span>
        {low && <Badge tone="danger" className="ml-1">low</Badge>}
      </Td>
      <Td>
        {dirty && canEdit ? (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(() => updatePricing(product.id, price, disc))
            }
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-merlot-600"
          >
            <Check size={12} /> {pending ? "Saving…" : "Save"}
          </button>
        ) : (
          <SyncBadge state={product.catalogSync} />
        )}
      </Td>
    </tr>
  );
}
