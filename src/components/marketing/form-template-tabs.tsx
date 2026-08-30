"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import { FormTemplateEditor } from "@/components/marketing/form-template-editor";
import { saveFormThankYouAction } from "@/app/(portal)/marketing/design/form/actions";
import { saveEmailTemplateAction } from "@/app/(portal)/marketing/design/email/actions";
import type { EmailCustomFont } from "@/lib/email-fonts";
import type { EmailTemplate } from "@/lib/email-templates";
import type { FormTemplate } from "@/lib/form-templates";
import {
  isQrLeadForm,
  QR_LEAD_FUNNEL,
} from "@/lib/qr-lead-funnel";
import { cn } from "@/lib/utils";

type Tab = "form" | "thankyou" | "email";

export function FormTemplateTabs({
  template,
  canEdit,
  welcomeEmail,
  customFonts = [],
}: {
  template: FormTemplate;
  canEdit: boolean;
  /** Only for the system QR form — enables the Welcome email tab. */
  welcomeEmail?: EmailTemplate | null;
  customFonts?: EmailCustomFont[];
}) {
  const router = useRouter();
  const isFunnel = isQrLeadForm(template.id) && Boolean(welcomeEmail);
  const [tab, setTab] = useState<Tab>("form");
  // Editors stay mounted once opened so switching tabs never drops unsaved work.
  const [visited, setVisited] = useState<Set<Tab>>(
    () => new Set<Tab>(["form"]),
  );

  function openTab(next: Tab) {
    setTab(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  }

  // Read once on mount by the editor's history state, so a fresh object is fine.
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

  const tabs = (
    [
      ["form", "Form"],
      ["thankyou", "Thank you"],
      ...(isFunnel ? ([["email", "Welcome email"]] as const) : []),
    ] as const
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => openTab(id)}
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
        {!isFunnel ? (
          <p className="text-xs text-muted">
            Related welcome email:{" "}
            <Link
              href={QR_LEAD_FUNNEL.emailPath}
              className="text-merlot hover:underline"
            >
              edit lead welcome
            </Link>
          </p>
        ) : null}
      </div>

      {!canEdit ? (
        <p className="shrink-0 text-xs text-muted">
          You can view this template but need marketing edit permission to save
          changes.
        </p>
      ) : null}

      <div
        className={
          tab === "form" ? "flex min-h-0 flex-1 flex-col" : "hidden"
        }
      >
        <FormTemplateEditor
          key={`form-${template.id}`}
          initial={template}
          canEdit={canEdit}
          active={tab === "form"}
          heightClass="h-full min-h-0"
        />
      </div>

      {visited.has("thankyou") ? (
        <div
          className={
            tab === "thankyou" ? "flex min-h-0 flex-1 flex-col" : "hidden"
          }
        >
          <EmailTemplateEditor
            key={`ty-${template.id}`}
            initial={thankYouAsEmail}
            onSave={async (input) => {
              const res = await saveFormThankYouAction(input);
              if (res.ok) router.refresh();
              return res;
            }}
            readOnly={!canEdit}
            active={tab === "thankyou"}
            heightClass="h-full min-h-0"
            showNameField={false}
            showSubjectField={false}
            previewVariant="web"
            discountCode={template.discountCode}
            linkedDiscountCode={template.discountCode}
            linkedDiscountHref={QR_LEAD_FUNNEL.formPath}
            successMessage="Thank-you landing page saved."
            saveLabel="Save thank-you page"
          />
        </div>
      ) : null}

      {isFunnel && welcomeEmail && visited.has("email") ? (
        <div
          className={
            tab === "email" ? "flex min-h-0 flex-1 flex-col" : "hidden"
          }
        >
          <EmailTemplateEditor
            key={`welcome-${welcomeEmail.id}`}
            initial={welcomeEmail}
            customFonts={customFonts}
            onSave={async (input) => {
              const res = await saveEmailTemplateAction(input);
              if (res.ok) router.refresh();
              return res;
            }}
            readOnly={!canEdit}
            active={tab === "email"}
            heightClass="h-full min-h-0"
            discountCode={template.discountCode}
            linkedDiscountCode={template.discountCode}
            linkedDiscountHref={QR_LEAD_FUNNEL.formPath}
            successMessage="Welcome template saved. New form submissions will use this design."
            saveLabel="Save welcome email"
          />
        </div>
      ) : null}
    </div>
  );
}
