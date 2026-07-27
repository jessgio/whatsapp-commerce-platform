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
  // Editors stay mounted once opened so switching tabs never drops unsaved work.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(["form"]));

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
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
        <p className="shrink-0 rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
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
          heightClass="min-h-[520px] flex-1"
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
            heightClass="min-h-[520px] flex-1"
            showNameField={false}
            showSubjectField={false}
            previewVariant="web"
            discountCode={template.discountCode}
            successMessage="Thank-you landing page saved."
            saveLabel="Save thank-you page"
          />
        </div>
      ) : null}
    </div>
  );
}
