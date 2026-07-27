"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Settings2,
  Type,
} from "lucide-react";
import { saveFormFieldsAction } from "@/app/(portal)/marketing/design/form/actions";
import {
  AddPalette,
  EditorShell,
  type EditorDevice,
  type EditorMessage,
} from "@/components/editor/editor-shell";
import { EditorRail, type EditorRailItem } from "@/components/editor/editor-rail";
import { useEditorHistory } from "@/components/editor/use-editor-history";
import {
  useEditorShortcuts,
  useUnsavedChangesGuard,
} from "@/components/editor/use-editor-shortcuts";
import { FormCanvas } from "@/components/marketing/form-canvas";
import {
  FormInspector,
  isFieldLocked,
  type FormDoc,
} from "@/components/marketing/form-inspector";
import {
  OPTIONAL_SYSTEM_KEYS,
  createCustomField,
  createSystemField,
  isSystemFieldKey,
  newFormFieldId,
  type FormField,
  type FormFieldType,
  type FormPageCopy,
  type FormTemplate,
  type SystemFormFieldKey,
} from "@/lib/form-templates";
import { cn } from "@/lib/utils";

type CustomFieldType = "text" | "textarea" | "select" | "checkbox";

const CUSTOM_FIELD_OPTIONS: { id: CustomFieldType; label: string }[] = [
  { id: "text", label: "Short text" },
  { id: "textarea", label: "Long text" },
  { id: "select", label: "Select" },
  { id: "checkbox", label: "Checkbox" },
];

const FIELD_ICONS: Record<FormFieldType, React.ReactNode> = {
  text: <Type size={14} />,
  date: <Calendar size={14} />,
  phone: <Phone size={14} />,
  email: <Mail size={14} />,
  city: <MapPin size={14} />,
  terms: <ShieldCheck size={14} />,
  textarea: <AlignLeft size={14} />,
  select: <ChevronDownSquare size={14} />,
  checkbox: <CheckSquare size={14} />,
};

const SYSTEM_KEY_LABELS: Record<SystemFormFieldKey, string> = {
  name: "Name",
  birthDate: "Birth date",
  phone: "Phone",
  email: "Email",
  city: "City",
  terms: "Terms",
};

export function FormTemplateEditor({
  initial,
  canEdit = true,
  heightClass,
  active = true,
}: {
  initial: FormTemplate;
  canEdit?: boolean;
  heightClass?: string;
  /** Set false when the editor is mounted but hidden, so shortcuts stay off. */
  active?: boolean;
}) {
  const router = useRouter();
  const readOnly = !canEdit;

  const history = useEditorHistory<FormDoc>({
    name: initial.name,
    discountCode: initial.discountCode,
    formPage: initial.formPage,
    fields: initial.fields,
  });
  const { doc, commit, markSaved } = history;

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [device, setDevice] = React.useState<EditorDevice>("mobile");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<EditorMessage>(null);

  useUnsavedChangesGuard(history.isDirty && !readOnly);

  // Keystrokes stay responsive; the canvas repaints in a lower-priority pass.
  const canvasDoc = React.useDeferredValue(doc);

  const selectedField = React.useMemo(
    () => doc.fields.find((f) => f.id === selectedId) ?? null,
    [doc.fields, selectedId],
  );

  const presentSystemKeys = React.useMemo(
    () =>
      new Set(
        doc.fields.filter((f) => isSystemFieldKey(f.key)).map((f) => f.key),
      ),
    [doc.fields],
  );

  const missingOptional = React.useMemo(
    () => OPTIONAL_SYSTEM_KEYS.filter((k) => !presentSystemKeys.has(k)),
    [presentSystemKeys],
  );

  /* ---------- Document mutations ---------- */

  const changeDoc = React.useCallback(
    (patch: Partial<Omit<FormDoc, "formPage" | "fields">>) => {
      commit(
        (prev) => ({ ...prev, ...patch }),
        `doc:${Object.keys(patch).join(",")}`,
      );
    },
    [commit],
  );

  const changeCopy = React.useCallback(
    (patch: Partial<FormPageCopy>) => {
      commit(
        (prev) => ({ ...prev, formPage: { ...prev.formPage, ...patch } }),
        `copy:${Object.keys(patch).join(",")}`,
      );
    },
    [commit],
  );

  const changeField = React.useCallback(
    (id: string, patch: Partial<FormField>) => {
      commit(
        (prev) => ({
          ...prev,
          fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }),
        `field:${id}`,
      );
    },
    [commit],
  );

  const addCustom = React.useCallback(
    (type: CustomFieldType) => {
      const field = createCustomField(type);
      commit((prev) => {
        const at = prev.fields.findIndex((f) => f.id === selectedId);
        const fields = [...prev.fields];
        fields.splice(at < 0 ? fields.length : at + 1, 0, field);
        return { ...prev, fields };
      });
      setSelectedId(field.id);
    },
    [commit, selectedId],
  );

  const restoreSystem = React.useCallback(
    (key: SystemFormFieldKey) => {
      const field = createSystemField(key);
      commit((prev) => {
        if (prev.fields.some((f) => f.key === key)) return prev;
        return { ...prev, fields: [...prev.fields, field] };
      });
      setSelectedId(field.id);
    },
    [commit],
  );

  /** System keys are unique, so only custom fields can be duplicated. */
  const duplicateField = React.useCallback(
    (id: string) => {
      const newId = newFormFieldId();
      commit((prev) => {
        const at = prev.fields.findIndex((f) => f.id === id);
        if (at < 0) return prev;
        const source = prev.fields[at]!;
        if (isSystemFieldKey(source.key)) return prev;
        const fields = [...prev.fields];
        fields.splice(at + 1, 0, {
          ...source,
          id: newId,
          key: `custom_${newId}`,
          options: source.options ? [...source.options] : undefined,
        });
        return { ...prev, fields };
      });
      setSelectedId(newId);
    },
    [commit],
  );

  const removeField = React.useCallback(
    (id: string) => {
      const target = doc.fields.find((f) => f.id === id);
      if (!target || isFieldLocked(target)) return;
      commit((prev) => ({
        ...prev,
        fields: prev.fields.filter((f) => f.id !== id),
      }));
      setSelectedId((current) => {
        if (current !== id) return current;
        const at = doc.fields.findIndex((f) => f.id === id);
        const neighbour = doc.fields[at + 1] ?? doc.fields[at - 1];
        return neighbour?.id ?? null;
      });
    },
    [commit, doc.fields],
  );

  const reorder = React.useCallback(
    (from: number, to: number) => {
      commit((prev) => ({ ...prev, fields: arrayMove(prev.fields, from, to) }));
    },
    [commit],
  );

  /* ---------- Save ---------- */

  const handleSave = React.useCallback(async () => {
    if (readOnly || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await saveFormFieldsAction({
        id: initial.id,
        name: doc.name,
        formPage: doc.formPage,
        fields: doc.fields,
        discountCode: doc.discountCode,
        isPublished: initial.isPublished,
      });
      setMessage({
        ok: res.ok,
        text: res.ok
          ? "Form saved. The public /daftar page uses this design."
          : (res.error ?? "Save failed."),
      });
      if (res.ok) {
        markSaved();
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }, [
    readOnly,
    saving,
    initial.id,
    initial.isPublished,
    doc,
    markSaved,
    router,
  ]);

  useEditorShortcuts({
    enabled: !readOnly && active,
    onUndo: history.undo,
    onRedo: history.redo,
    onSave: () => void handleSave(),
    onDuplicate: () => {
      if (selectedId) duplicateField(selectedId);
    },
    onDelete: () => {
      if (selectedId) removeField(selectedId);
    },
  });

  /* ---------- Rail ---------- */

  const railItems = React.useMemo<EditorRailItem[]>(
    () =>
      doc.fields.map((field) => ({
        id: field.id,
        label: field.label || field.key,
        sublabel: `${field.type}${field.required ? " · required" : ""}`,
        icon: FIELD_ICONS[field.type],
        locked: isFieldLocked(field),
        noDuplicate: isSystemFieldKey(field.key),
      })),
    [doc.fields],
  );

  const rail = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
          selectedId === null
            ? "border-merlot/50 bg-merlot/5"
            : "border-transparent hover:border-border hover:bg-surface-muted/60",
        )}
      >
        <Settings2
          size={14}
          className={selectedId === null ? "text-merlot" : "text-muted"}
        />
        <span className="truncate text-[13px] font-medium text-foreground">
          Form settings
        </span>
      </button>

      <div>
        <p className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Fields
        </p>
        <EditorRail
          items={railItems}
          selectedId={selectedId}
          disabled={readOnly}
          onSelect={setSelectedId}
          onReorder={reorder}
          onDuplicate={duplicateField}
          onRemove={removeField}
        />
      </div>
    </div>
  );

  const railFooter = !readOnly ? (
    <div className="space-y-2.5">
      <AddPalette
        title="Add field"
        options={CUSTOM_FIELD_OPTIONS}
        onAdd={addCustom}
      />
      {missingOptional.length > 0 ? (
        <AddPalette
          title="Restore"
          options={missingOptional.map((key) => ({
            id: key,
            label: SYSTEM_KEY_LABELS[key],
          }))}
          onAdd={restoreSystem}
        />
      ) : null}
    </div>
  ) : null;

  return (
    <EditorShell
      heightClass={heightClass}
      railTitle="Content"
      rail={rail}
      railFooter={railFooter}
      canvasBackdrop="bg-[#efe9df]"
      canvas={
        <FormCanvas
          formPage={canvasDoc.formPage}
          fields={canvasDoc.fields}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      }
      inspectorTitle={
        selectedField ? selectedField.label || "Field" : "Form settings"
      }
      inspector={
        <FormInspector
          field={selectedField}
          doc={doc}
          readOnly={readOnly}
          onChangeDoc={changeDoc}
          onChangeCopy={changeCopy}
          onChangeField={changeField}
        />
      }
      device={device}
      onDeviceChange={setDevice}
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      onUndo={history.undo}
      onRedo={history.redo}
      isDirty={history.isDirty}
      saving={saving}
      onSave={() => void handleSave()}
      saveLabel="Save form"
      readOnly={readOnly}
      message={message}
      onDismissMessage={() => setMessage(null)}
    />
  );
}
