import { env } from "@/lib/env";

export interface PaymentLinkInput {
  orderCode: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
}

export interface PaymentLinkResult {
  ok: boolean;
  provider: "midtrans" | "xendit";
  paymentUrl?: string;
  reference?: string;
  mocked?: boolean;
  error?: string;
}

/**
 * Creates a hosted payment link. Provider selectable via PAYMENT_PROVIDER.
 * Falls back to a deterministic mock URL when keys are absent (demo).
 */
export async function createPaymentLink(
  input: PaymentLinkInput,
): Promise<PaymentLinkResult> {
  const provider = env.payments.provider;

  if (provider === "midtrans") {
    if (!env.payments.midtransServerKey) return mock("midtrans", input);
    return createMidtransLink(input);
  }
  if (!env.payments.xenditSecretKey) return mock("xendit", input);
  return createXenditInvoice(input);
}

function mock(
  provider: "midtrans" | "xendit",
  input: PaymentLinkInput,
): PaymentLinkResult {
  console.info(`[payments:mock] ${provider} link`, input.orderCode, input.amount);
  return {
    ok: true,
    provider,
    mocked: true,
    reference: `MOCK-${input.orderCode}`,
    paymentUrl: `https://pay.demo/${provider}/${input.orderCode}`,
  };
}

async function createMidtransLink(
  input: PaymentLinkInput,
): Promise<PaymentLinkResult> {
  const base = env.payments.isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  try {
    const auth = Buffer.from(`${env.payments.midtransServerKey}:`).toString("base64");
    const res = await fetch(base, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderCode,
          gross_amount: input.amount,
        },
        customer_details: {
          first_name: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail ?? undefined,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, provider: "midtrans", error: JSON.stringify(json) };
    return {
      ok: true,
      provider: "midtrans",
      paymentUrl: json.redirect_url,
      reference: json.token,
    };
  } catch (e) {
    return { ok: false, provider: "midtrans", error: String(e) };
  }
}

async function createXenditInvoice(
  input: PaymentLinkInput,
): Promise<PaymentLinkResult> {
  try {
    const auth = Buffer.from(`${env.payments.xenditSecretKey}:`).toString("base64");
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: input.orderCode,
        amount: input.amount,
        payer_email: input.customerEmail ?? undefined,
        description: `Order ${input.orderCode}`,
      }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, provider: "xendit", error: JSON.stringify(json) };
    return {
      ok: true,
      provider: "xendit",
      paymentUrl: json.invoice_url,
      reference: json.id,
    };
  } catch (e) {
    return { ok: false, provider: "xendit", error: String(e) };
  }
}
