"use client";

import * as React from "react";
import { CanvasSelectable } from "@/components/editor/canvas-selectable";
import { LeadFormCard } from "@/components/leads/lead-form-card";
import type { FormField, FormPageCopy } from "@/lib/form-templates";

/** Sentinel selection id for the page copy / settings panel. */
export const FORM_COPY_ID = "__copy__";

export const FormCanvas = React.memo(function FormCanvas({
  formPage,
  fields,
  selectedId,
  onSelect,
}: {
  formPage: FormPageCopy;
  fields: FormField[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selectCopy = React.useCallback(() => onSelect(null), [onSelect]);
  const selectField = React.useCallback(
    (id: string) => onSelect(id),
    [onSelect],
  );

  const wrapHeader = React.useCallback(
    (node: React.ReactNode) => (
      <CanvasSelectable
        id={FORM_COPY_ID}
        label="Page copy"
        selected={selectedId === null}
        onSelect={selectCopy}
      >
        {node}
      </CanvasSelectable>
    ),
    [selectedId, selectCopy],
  );

  const wrapField = React.useCallback(
    (field: FormField, node: React.ReactNode) => (
      <CanvasSelectable
        key={field.id}
        id={field.id}
        label={field.label || field.type}
        selected={selectedId === field.id}
        onSelect={selectField}
      >
        {node}
      </CanvasSelectable>
    ),
    [selectedId, selectField],
  );

  return (
    <LeadFormCard
      formPage={formPage}
      fields={fields}
      preview
      wrapHeader={wrapHeader}
      wrapField={wrapField}
    />
  );
});
