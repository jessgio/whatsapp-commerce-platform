import type { ConsentChannel, Customer } from "@/lib/types";

/** Stamped on every Excel import so staff can split in-house lists from voucher signups. */
export const TAG_INTERNAL = "internal";
/** Older imports used this tag; still treated as internal. */
export const TAG_IMPORTED_LEGACY = "imported";
/** Stamped when someone submits the QR / voucher form (`/daftar`). */
export const TAG_VOUCHER = "qr_lead";

export type CustomerSource = "internal" | "voucher";

export const SOURCE_LABEL: Record<CustomerSource, string> = {
  internal: "Internal",
  voucher: "Voucher",
};

export function customerSources(
  customer: Pick<Customer, "tags" | "consentChannel">,
): CustomerSource[] {
  const tags = new Set((customer.tags ?? []).map((t) => t.toLowerCase()));
  const out: CustomerSource[] = [];
  if (tags.has(TAG_VOUCHER) || customer.consentChannel === "web_form") {
    out.push("voucher");
  }
  if (
    tags.has(TAG_INTERNAL) ||
    tags.has(TAG_IMPORTED_LEGACY) ||
    customer.consentChannel === "import"
  ) {
    out.push("internal");
  }
  return out;
}

export function matchesCustomerSource(
  customer: Pick<Customer, "tags" | "consentChannel">,
  source: "all" | CustomerSource,
): boolean {
  if (source === "all") return true;
  return customerSources(customer).includes(source);
}

export function extraCustomerTags(tags: string[] | null | undefined): string[] {
  const hidden = new Set([TAG_INTERNAL, TAG_IMPORTED_LEGACY, TAG_VOUCHER]);
  return (tags ?? []).filter((t) => !hidden.has(t.toLowerCase()));
}

export function mergeImportedCustomerTags(
  existing: string[] | null | undefined,
  extra: string[],
): string[] {
  return [...new Set([...(existing ?? []), ...extra, TAG_INTERNAL])];
}

export function consentChannelLabel(channel: ConsentChannel): string {
  if (channel === "import") return "Internal import";
  if (channel === "web_form") return "Voucher form";
  return channel.replace(/_/g, " ");
}
