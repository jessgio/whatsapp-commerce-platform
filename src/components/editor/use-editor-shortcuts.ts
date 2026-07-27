"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export type EditorShortcuts = {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
};

/**
 * Editor keyboard shortcuts.
 *
 * Undo/redo, duplicate and delete are ignored while a text field has focus so
 * the browser's native text editing keeps working. Save is always handled.
 */
export function useEditorShortcuts({
  onUndo,
  onRedo,
  onSave,
  onDuplicate,
  onDelete,
  enabled = true,
}: EditorShortcuts) {
  // Kept in a ref so the listener is bound once instead of on every render.
  const handlers = useRef({ onUndo, onRedo, onSave, onDuplicate, onDelete });

  useEffect(() => {
    handlers.current = { onUndo, onRedo, onSave, onDuplicate, onDelete };
  }, [onUndo, onRedo, onSave, onDuplicate, onDelete]);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      const inText = isTextEntry(event.target);
      const h = handlers.current;

      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        h.onSave?.();
        return;
      }

      if (inText) return;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) h.onRedo?.();
        else h.onUndo?.();
        return;
      }

      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        h.onRedo?.();
        return;
      }

      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        h.onDuplicate?.();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!h.onDelete) return;
        event.preventDefault();
        h.onDelete();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/** Warns before a full page unload while there are unsaved edits. */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
}

const subscribeToNothing = () => () => {};

function readModifierKey(): string {
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ?? navigator.platform;
  return /mac|iphone|ipad/i.test(platform) ? "⌘" : "Ctrl";
}

/** Renders the correct modifier glyph in shortcut hints. */
export function useModifierKey(): string {
  return useSyncExternalStore(
    subscribeToNothing,
    readModifierKey,
    () => "Ctrl",
  );
}
