"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import { FormTemplateEditor } from "@/components/marketing/form-template-editor";
import { saveFormThankYouAction } from "@/app/(portal)/marketing/design/form/actions";
import type { EmailTemplate } from "@/lib/email-templates";
import type { FormTemplate } from "@/lib/form-templates";
import { cn } from "@/lib/utils";

type Tab = "form" | "thankyou";

export function FormTemplateTabs({
  template,
  canEdit,
}: {
  template: FormTemplate;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("form");

  const thankYouAsEmail: EmailTemplate = {
    id: template.id,
    name: template.name,
    description: "Thank-you landing page",
    kind: template.kind === "system" ? "system" : "campaign",
    subject: "(landing page)",
    accentColor: template.thankYou.accentColor,
    blocks: template.thankYou.blocks,
    updatedAt: template.updatedAt ?? new Date().toISOString(),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          {(
            [
              ["form", "Form"],
              ["thankyou", "Thank you"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                tab === id
                  ? "bg-merlot text-white"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Related welcome email:{" "}
          <Link
            href="/marketing/design/email/lead_welcome"
            className="text-merlot hover:underline"
          >
            edit lead welcome
          </Link>
        </p>
      </div>

      {!canEdit ? (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
          You can view this template but need marketing edit permission to save
          changes.
        </p>
      ) : null}

      {tab === "form" ? (
        <FormTemplateEditor
          key={`form-${template.updatedAt}`}
          initial={template}
          canEdit={canEdit}
        />
      ) : (
        <EmailTemplateEditor
          key={`ty-${template.updatedAt}`}
          initial={thankYouAsEmail}
          onSave={
            canEdit
              ? async (input) => {
                  const res = await saveFormThankYouAction(input);
                  if (res.ok) router.refresh();
                  return res;
                }
              : async () => ({
                  ok: false,
                  error: "You do not have permission to edit.",
                })
          }
          showNameField={false}
          showSubjectField={false}
          previewVariant="web"
          discountCode={template.discountCode}
          successMessage="Thank-you landing page saved."
          saveLabel="Save thank-you page"
        />
      )}
    </div>
  );
}
