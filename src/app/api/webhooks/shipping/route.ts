import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const STATUS_MAP: Record<string, string> = {
  confirmed: "requested",
  allocated: "requested",
  picking_up: "picked_up",
  picked: "picked_up",
  dropping_off: "in_transit",
  on_the_way: "in_transit",
  delivered: "delivered",
  returned: "returned",
};

/** Biteship tracking webhook -> updates shipment + appends a tracking event. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const referenceId: string | undefined = body.order_id ?? body.reference_id;
  const courierStatus: string = body.status ?? body.courier_status ?? "";
  const mapped = STATUS_MAP[courierStatus] ?? "in_transit";

  if (!isSupabaseConfigured()) {
    console.info("[webhook:shipping] (demo)", referenceId, courierStatus, "->", mapped);
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseAdminClient();

  const { data: shipment } = await supabase
    .from("shipments")
    .update({ status: mapped })
    .eq("biteship_order_id", body.id ?? referenceId)
    .select("id")
    .single();

  if (shipment) {
    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      status: courierStatus,
      note: body.note ?? body.courier_tracking?.message ?? "",
      at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
