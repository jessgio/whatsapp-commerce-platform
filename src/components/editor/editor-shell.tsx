"use client";

import * as React from "react";
import {
  Check,
  Layers,
  Monitor,
  Redo2,
  Settings2,
  Smartphone,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useModifierKey } from "./use-editor-shortcuts";

export type EditorDevice = "desktop" | "mobile";

const DEVICE_WIDTH: Record<EditorDevice, number> = {
  desktop: 680,
  mobile: 390,
};

export type EditorMessage = { ok: boolean; text: string } | null;

function ToolbarIconButton({
  label,
  hint,
  disabled,
  onClick,
  children,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={hint ? `${label} (${hint})` : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-muted transition-colors",
        "hover:bg-surface-muted hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-35",
      )}
    >
      {children}
    </button>
  );
}

function Pane({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </p>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}

export function EditorShell({
  heightClass = "h-[calc(100dvh-13rem)] min-h-[560px]",
  railTitle = "Structure",
  rail,
  railFooter,
  canvas,
  canvasBackdrop = "bg-[#efe9df]",
  inspectorTitle = "Design",
  inspector,
  device,
  onDeviceChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
  saving,
  onSave,
  saveLabel = "Save",
  readOnly = false,
  message,
  onDismissMessage,
  toolbarExtra,
}: {
  heightClass?: string;
  railTitle?: string;
  rail: React.ReactNode;
  railFooter?: React.ReactNode;
  canvas: React.ReactNode;
  canvasBackdrop?: string;
  inspectorTitle?: string;
  inspector: React.ReactNode;
  device: EditorDevice;
  onDeviceChange: (device: EditorDevice) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  saveLabel?: string;
  readOnly?: boolean;
  message?: EditorMessage;
  onDismissMessage?: () => void;
  toolbarExtra?: React.ReactNode;
}) {
  const mod = useModifierKey();
  const [drawer, setDrawer] = React.useState<"rail" | "inspector" | null>(null);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[14px] border border-border bg-surface",
        "shadow-[0_1px_2px_rgba(45,43,42,0.04)]",
        heightClass,
      )}
    >
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2.5">
        <div className="flex items-center gap-1 xl:hidden">
          <ToolbarIconButton
            label="Show structure"
            onClick={() => setDrawer("rail")}
          >
            <Layers size={16} />
          </ToolbarIconButton>
        </div>

        <div className="flex items-center gap-0.5">
          <ToolbarIconButton
            label="Undo"
            hint={`${mod}Z`}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 size={16} />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="Redo"
            hint={`${mod}⇧Z`}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 size={16} />
          </ToolbarIconButton>
        </div>

        <div className="mx-1 h-5 w-px shrink-0 bg-border" />

        <div className="inline-flex rounded-lg border border-border bg-surface-muted/40 p-0.5">
          {(
            [
              ["desktop", Monitor, "Desktop width"],
              ["mobile", Smartphone, "Mobile width"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={device === id}
              onClick={() => onDeviceChange(id)}
              className={cn(
                "rounded-md p-1.5 transition",
                device === id
                  ? "bg-surface text-merlot shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>

        {toolbarExtra ? (
          <>
            <div className="mx-1 hidden h-5 w-px shrink-0 bg-border sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              {toolbarExtra}
            </div>
          </>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {!readOnly ? (
            <span
              className={cn(
                "hidden items-center gap-1.5 text-xs sm:inline-flex",
                isDirty ? "text-warning" : "text-muted",
              )}
            >
              {isDirty ? (
                <>
                  <span className="size-1.5 rounded-full bg-warning" />
                  Unsaved
                </>
              ) : (
                <>
                  <Check size={13} />
                  Saved
                </>
              )}
            </span>
          ) : null}

          {!readOnly ? (
            <Button
              type="button"
              disabled={saving || !isDirty}
              onClick={onSave}
              title={`${saveLabel} (${mod}S)`}
              className="h-8 px-3 py-0 text-[13px]"
            >
              {saving ? "Saving…" : saveLabel}
            </Button>
          ) : null}

          <div className="xl:hidden">
            <ToolbarIconButton
              label="Show design panel"
              onClick={() => setDrawer("inspector")}
            >
              <Settings2 size={16} />
            </ToolbarIconButton>
          </div>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 border-b px-3 py-2 text-[13px]",
            message.ok
              ? "border-success/20 bg-success/10 text-success"
              : "border-danger/20 bg-danger/10 text-danger",
          )}
          role="status"
        >
          <span className="min-w-0 flex-1">{message.text}</span>
          {onDismissMessage ? (
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={onDismissMessage}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Panes */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[260px] shrink-0 border-r border-border xl:flex xl:flex-col">
          <Pane title={railTitle} className="flex-1">
            <div className="p-2">{rail}</div>
          </Pane>
          {railFooter ? (
            <div className="shrink-0 border-t border-border p-2.5">
              {railFooter}
            </div>
          ) : null}
        </aside>

        <div
          className={cn(
            "min-w-0 flex-1 overflow-y-auto overscroll-contain",
            canvasBackdrop,
          )}
        >
          <div className="flex justify-center p-4 sm:p-6">
            <div
              className="w-full transition-[max-width] duration-200 ease-out"
              style={{ maxWidth: DEVICE_WIDTH[device] }}
            >
              {canvas}
            </div>
          </div>
        </div>

        <aside className="hidden w-[320px] shrink-0 border-l border-border xl:flex xl:flex-col">
          <Pane title={inspectorTitle} className="flex-1">
            {inspector}
          </Pane>
        </aside>
      </div>

      {/* Drawers below xl */}
      {drawer ? (
        <div className="absolute inset-0 z-30 flex xl:hidden">
          <button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 bg-charcoal/30"
            onClick={() => setDrawer(null)}
          />
          <div
            className={cn(
              "animate-fade-in relative flex w-[300px] max-w-[85%] flex-col bg-surface shadow-2xl",
              drawer === "rail"
                ? "mr-auto border-r border-border"
                : "ml-auto border-l border-border",
            )}
          >
            <Pane
              title={drawer === "rail" ? railTitle : inspectorTitle}
              className="flex-1"
              action={
                <button
                  type="button"
                  aria-label="Close panel"
                  onClick={() => setDrawer(null)}
                  className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
                >
                  <X size={15} />
                </button>
              }
            >
              {drawer === "rail" ? <div className="p-2">{rail}</div> : inspector}
            </Pane>
            {drawer === "rail" && railFooter ? (
              <div className="shrink-0 border-t border-border p-2.5">
                {railFooter}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Inspector building blocks ---------- */

export function InspectorSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border-b border-border px-3 py-3 last:border-b-0", className)}
    >
      {title ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </p>
      ) : null}
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function InspectorField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] leading-relaxed text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function InspectorEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <p className="text-[13px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

/** Compact palette of "add" buttons used in the rail footer. */
export function AddPalette<T extends string>({
  title = "Add",
  options,
  onAdd,
  disabled,
}: {
  title?: string;
  options: { id: T; label: string; icon?: React.ReactNode }[];
  onAdd: (id: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(option.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5",
              "text-[11px] font-medium text-foreground transition-colors",
              "hover:border-merlot/40 hover:bg-merlot/5",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {option.icon ? (
              <span className="shrink-0 text-muted">{option.icon}</span>
            ) : null}
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
