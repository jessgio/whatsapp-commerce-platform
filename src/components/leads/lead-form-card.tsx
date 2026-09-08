import type * as React from "react";
import { BrandMark } from "@/components/brand-mark";
import { LeadForm } from "@/components/leads/lead-form";
import type { FormField, FormPageCopy } from "@/lib/form-templates";
import { cn } from "@/lib/utils";

/**
 * The registration card as visitors see it. Shared by `/daftar`, `/f/[slug]`,
 * and the form builder canvas so the preview can never drift.
 */
export function LeadFormCard({
  formPage,
  fields,
  preview = false,
  className,
  wrapHeader,
  wrapField,
  formSlug,
}: {
  formPage: FormPageCopy;
  fields: FormField[];
  preview?: boolean;
  className?: string;
  wrapHeader?: (node: React.ReactNode) => React.ReactNode;
  wrapField?: (field: FormField, node: React.ReactNode) => React.ReactNode;
  formSlug?: string;
}) {
  const header = (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <BrandMark size={40} />
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {formPage.brandTitle}
          </p>
          <p className="text-xs text-muted">{formPage.eyebrow}</p>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-foreground">
        {formPage.headline}
      </h1>
      <p className="mt-1 text-sm text-muted">{formPage.intro}</p>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-[20px] border border-border bg-surface p-6 shadow-[0_12px_40px_rgba(45,43,42,0.10)] sm:p-8",
        className,
      )}
    >
      {wrapHeader ? wrapHeader(header) : header}

      <div className="mt-6">
        <LeadForm
          fields={fields}
          submitLabel={formPage.submitLabel}
          preview={preview}
          wrapField={wrapField}
          formSlug={formSlug}
        />
      </div>
    </div>
  );
}
