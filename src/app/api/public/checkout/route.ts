import { NextRequest, NextResponse } from "next/server";
import { loadCheckoutSession } from "@/lib/checkout-public";
import { isSupabaseConfigured } from "@/lib/env";

/** GET /api/public/checkout?token= — order summary for the hosted checkout page. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token wajib." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Checkout hanya tersedia saat mode live." },
      { status: 503 },
    );
  }

  const session = await loadCheckoutSession(token);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Link checkout tidak valid." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    order: {
      code: session.code,
      subtotal: session.subtotal,
      shippingCost: session.shippingCost,
      total: session.total,
      items: session.items,
      expired: session.expired,
      alreadyPaid: session.alreadyPaid,
      paymentLink: session.paymentLink,
      customer: {
        name: session.customer.name,
        phone: session.customer.phone,
      },
      savedAddress: session.savedAddress,
    },
  });
}
