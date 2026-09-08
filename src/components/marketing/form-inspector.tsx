"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  InspectorEmpty,
  InspectorField,
  InspectorSection,
} from "@/components/editor/editor-shell";
import {
  EditorToggle,
  editorFieldClass,
} from "@/components/editor/controls";
import {
  REQUIRED_SYSTEM_KEYS,
  isSystemFieldKey,
  type FormField,
  type FormFieldOption,
  type FormPageCopy,
} from "@/lib/form-templates";
import { QR_LEAD_FUNNEL } from "@/lib/qr-lead-funnel";
import { DatePicker } from "@/components/date-picker";
import { FormShareQr } from "@/components/marketing/form-share-qr";
import { digitalFormUrl } from "@/lib/digital-form";
import { cn } from "@/lib/utils";

export type FormDoc = {
  name: string;
  discountCode: string;
  formPage: FormPageCopy;
  fields: FormField[];
  isPublished: boolean;
  publicSlug: string | null;
  expiresOn: string;
};

export function isFieldLocked(field: FormField): boolean {
  return (
    isSystemFieldKey(field.key) && REQUIRED_SYSTEM_KEYS.includes(field.key)
  );
}

function parseOptionLines(raw: string): FormFieldOption[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split("|");
      return {
        label: (label ?? "").trim(),
        value: (value ?? label ?? "").trim(),
      };
    })
    .filter((o) => o.label && o.value);
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: FormFieldOption[];
  onChange: (options: FormFieldOption[]) => void;
}) {
  const [advanced, setAdvanced] = React.useState(false);
  const [raw, setRaw] = React.useState("");

  function openAdvanced() {
    setRaw(options.map((o) => `${o.label}|${o.value}`).join("\n"));
    setAdvanced(true);
  }

  function patch(index: number, next: Partial<FormFieldOption>) {
    onChange(
      options.map((o, i) => (i === index ? { ...o, ...next } : o)),
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Options
        </p>
        <button
          type="button"
          onClick={() => (advanced ? setAdvanced(false) : openAdvanced())}
          className="text-[11px] font-medium text-merlot hover:underline"
        >
          {advanced ? "Simple" : "Bulk edit"}
        </button>
      </div>

      {advanced ? (
        <>
          <textarea
            className={cn(editorFieldClass, "min-h-[110px] font-mono text-[11px]")}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              onChange(parseOptionLines(e.target.value));
            }}
          />
          <p className="mt-1 text-[11px] text-muted">
            One option per line as <code>label|value</code>.
          </p>
        </>
      ) : (
        <div className="mt-1 space-y-1.5">
          {options.length === 0 ? (
            <p className="text-[11px] text-muted">No options yet.</p>
          ) : null}

          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-1">
              <input
                className={cn(editorFieldClass, "mt-0")}
                value={option.label}
                placeholder="Label"
                aria-label={`Option ${index + 1} label`}
                onChange={(e) => patch(index, { label: e.target.value })}
              />
              <input
                className={cn(editorFieldClass, "mt-0 w-20 font-mono text-[11px]")}
                value={option.value}
                placeholder="value"
                aria-label={`Option ${index + 1} value`}
                onChange={(e) => patch(index, { value: e.target.value })}
              />
              <button
                type="button"
                aria-label={`Remove option ${index + 1}`}
                className="shrink-0 rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                onClick={() => onChange(options.filter((_, i) => i !== index))}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              onChange([
                ...options,
                { label: `Opsi ${options.length + 1}`, value: `opsi_${options.length + 1}` },
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground hover:border-merlot/40 hover:bg-merlot/5"
          >
            <Plus size={12} />
            Add option
          </button>
        </div>
      )}
    </div>
  );
}

export function FormInspector({
  field,
  doc,
  readOnly,
  isDigital,
  publicBaseUrl,
  onChangeDoc,
  onChangeCopy,
  onChangeField,
}: {
  /** `null` shows form-level settings and page copy. */
  field: FormField | null;
  doc: FormDoc;
  readOnly: boolean;
  isDigital: boolean;
  publicBaseUrl: string;
  onChangeDoc: (patch: Partial<Omit<FormDoc, "formPage" | "fields">>) => void;
  onChangeCopy: (patch: Partial<FormPageCopy>) => void;
  onChangeField: (id: string, patch: Partial<FormField>) => void;
}) {
  if (!field) {
    const shareUrl =
      isDigital && doc.publicSlug
        ? digitalFormUrl(publicBaseUrl, doc.publicSlug)
        : "";
    return (
      <>
        <InspectorSection title="Template">
          <InspectorField label="Template name">
            <input
              className={editorFieldClass}
              value={doc.name}
              disabled={readOnly}
              onChange={(e) => onChangeDoc({ name: e.target.value })}
            />
          </InspectorField>
          <InspectorField
            label="Discount code"
            hint={QR_LEAD_FUNNEL.discountSourceHint}
          >
            <input
              className={editorFieldClass}
              value={doc.discountCode}
              disabled={readOnly}
              placeholder="AERIS15"
              onChange={(e) => onChangeDoc({ discountCode: e.target.value })}
            />
          </InspectorField>
        </InspectorSection>

        {isDigital ? (
          <InspectorSection title="Public link">
            <EditorToggle
              label="Published"
              checked={doc.isPublished}
              disabled={readOnly}
              onChange={(isPublished) => onChangeDoc({ isPublished })}
            />
            <InspectorField
              label="Link expiry"
              hint={
                doc.expiresOn
                  ? "Expires at the end of that day (Jakarta)."
                  : "Leave empty for a Basic form with no expiry. Set a date to make this an Exp form."
              }
            >
              <DatePicker
                value={doc.expiresOn}
                onChange={(expiresOn) => onChangeDoc({ expiresOn })}
                placeholder="No expiry"
              />
              {doc.expiresOn ? (
                <button
                  type="button"
                  className="mt-1 text-[11px] font-medium text-merlot hover:underline"
                  onClick={() => onChangeDoc({ expiresOn: "" })}
                  disabled={readOnly}
                >
                  Clear expiry
                </button>
              ) : null}
            </InspectorField>
            {shareUrl ? (
              <InspectorField label="QR code" hint="Logo uses aeris-mark-512.png in the center.">
                <FormShareQr
                  url={shareUrl}
                  fileName={`aeris-form-${doc.publicSlug ?? "digital"}`}
                />
              </InspectorField>
            ) : (
              <p className="text-[11px] text-muted">
                Save the form once to generate a unique public link and QR.
              </p>
            )}
          </InspectorSection>
        ) : null}

        <InspectorSection title="Page copy">
          <InspectorField label="Brand title">
            <input
              className={editorFieldClass}
              value={doc.formPage.brandTitle}
              disabled={readOnly}
              onChange={(e) => onChangeCopy({ brandTitle: e.target.value })}
            />
          </InspectorField>
          <InspectorField label="Eyebrow">
            <input
              className={editorFieldClass}
              value={doc.formPage.eyebrow}
              disabled={readOnly}
              onChange={(e) => onChangeCopy({ eyebrow: e.target.value })}
            />
          </InspectorField>
          <InspectorField label="Headline">
            <input
              className={editorFieldClass}
              value={doc.formPage.headline}
              disabled={readOnly}
              onChange={(e) => onChangeCopy({ headline: e.target.value })}
            />
          </InspectorField>
          <InspectorField label="Intro">
            <textarea
              className={cn(editorFieldClass, "min-h-[80px] resize-y")}
              value={doc.formPage.intro}
              disabled={readOnly}
              onChange={(e) => onChangeCopy({ intro: e.target.value })}
            />
          </InspectorField>
          <InspectorField label="Submit button">
            <input
              className={editorFieldClass}
              value={doc.formPage.submitLabel}
              disabled={readOnly}
              onChange={(e) => onChangeCopy({ submitLabel: e.target.value })}
            />
          </InspectorField>
        </InspectorSection>
      </>
    );
  }

  if (readOnly) {
    return (
      <InspectorEmpty text="You need marketing edit permission to change this form." />
    );
  }

  const locked = isFieldLocked(field);

  return (
    <>
      <InspectorSection title="Field">
        <InspectorField label="Label">
          <input
            className={editorFieldClass}
            value={field.label}
            onChange={(e) => onChangeField(field.id, { label: e.target.value })}
          />
        </InspectorField>

        {field.type !== "terms" && field.type !== "checkbox" ? (
          <InspectorField label="Placeholder">
            <input
              className={editorFieldClass}
              value={field.placeholder ?? ""}
              onChange={(e) =>
                onChangeField(field.id, { placeholder: e.target.value })
              }
            />
          </InspectorField>
        ) : null}

        <InspectorField
          label="Help text"
          hint={
            field.type === "checkbox"
              ? "Shown as the checkbox caption."
              : undefined
          }
        >
          <input
            className={editorFieldClass}
            value={field.helpText ?? ""}
            onChange={(e) =>
              onChangeField(field.id, { helpText: e.target.value })
            }
          />
        </InspectorField>

        {field.type === "terms" ? (
          <InspectorField label="Terms copy">
            <textarea
              className={cn(editorFieldClass, "min-h-[120px] resize-y")}
              value={field.termsText ?? ""}
              onChange={(e) =>
                onChangeField(field.id, { termsText: e.target.value })
              }
            />
          </InspectorField>
        ) : null}

        {field.type === "select" ? (
          <OptionsEditor
            options={field.options ?? []}
            onChange={(options) => onChangeField(field.id, { options })}
          />
        ) : null}
      </InspectorSection>

      <InspectorSection title="Validation">
        {locked ? (
          <p className="text-[11px] leading-relaxed text-muted">
            This system field is always required and cannot be removed.
          </p>
        ) : (
          <EditorToggle
            label="Required"
            checked={field.required}
            onChange={(required) => onChangeField(field.id, { required })}
          />
        )}
      </InspectorSection>

      <InspectorSection title="Data">
        <p className="text-[11px] leading-relaxed text-muted">
          Stored as{" "}
          <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[10px]">
            {field.key}
          </code>
          {isSystemFieldKey(field.key)
            ? " on the customer record."
            : " in the form answers."}
        </p>
      </InspectorSection>
    </>
  );
}
