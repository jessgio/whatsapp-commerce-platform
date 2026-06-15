import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/guard";
import { getOrder, getProductBarcode } from "@/lib/data/repo";
import { Barcode } from "@/components/warehouse/barcode";
import { PrintButton } from "@/components/warehouse/label-actions";

export default async function LabelPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requirePermission("warehouse.view");
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) notFound();

  if (!order.labelNumber) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-muted">
          No label has been generated for {order.code} yet. Generate one from the
          warehouse fulfillment queue first.
        </p>
        <Link href="/warehouse" className="mt-3 inline-block text-sm text-merlot hover:underline">
          ← Back to warehouse
        </Link>
      </div>
    );
  }

  const items = await Promise.all(
    order.items.map(async (it) => ({
      ...it,
      barcode: await getProductBarcode(it.productId),
    })),
  );

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/warehouse" className="text-sm text-muted hover:text-foreground">
          ← Back to warehouse
        </Link>
        <PrintButton />
      </div>

      <div className="print-area mx-auto max-w-md rounded-[14px] border border-charcoal bg-white p-6 text-charcoal">
        <div className="flex items-start justify-between border-b border-charcoal/30 pb-3">
          <div>
            <div className="text-lg font-bold">{order.courier ?? "3PL"}</div>
            <div className="text-xs uppercase tracking-wide">{order.code}</div>
          </div>
          <div className="text-right text-xs">
            <div className="font-semibold">Aeris Beaute</div>
            <div>Origin: Jakarta 12190</div>
          </div>
        </div>

        <div className="flex flex-col items-center py-4">
          <Barcode value={order.labelNumber} />
          <div className="mt-1 text-xs text-charcoal/70">AWB / Label No.</div>
        </div>

        <div className="border-t border-charcoal/30 pt-3 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">
            Ship to
          </div>
          <div className="font-medium">{order.shippingAddress?.recipientName}</div>
          <div className="text-xs">
            {order.shippingAddress?.line1}
            <br />
            {order.shippingAddress?.city} {order.shippingAddress?.postalCode}
          </div>
        </div>

        <div className="mt-3 border-t border-charcoal/30 pt-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">
            Pack checklist
          </div>
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li key={it.productId} className="flex items-center justify-between text-xs">
                <span>
                  <span className="inline-block w-5">☐</span>
                  {it.name} <span className="text-charcoal/60">×{it.qty}</span>
                </span>
                <span className="font-mono text-charcoal/70">{it.barcode}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
