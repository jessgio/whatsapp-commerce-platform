import {
  customerSources,
  extraCustomerTags,
  SOURCE_LABEL,
} from "@/lib/customers/source";
import type { Customer } from "@/lib/types";

const SOURCE_CHIP: Record<string, string> = {
  internal: "bg-beige-200 text-brown",
  voucher: "bg-merlot/10 text-merlot",
};

export function CustomerTags({
  customer,
}: {
  customer: Pick<Customer, "tags" | "consentChannel">;
}) {
  const sources = customerSources(customer);
  const extra = extraCustomerTags(customer.tags);

  if (sources.length === 0 && extra.length === 0) {
    return <span className="text-sm text-muted">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((s) => (
        <span
          key={s}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SOURCE_CHIP[s]}`}
        >
          {SOURCE_LABEL[s]}
        </span>
      ))}
      {extra.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
