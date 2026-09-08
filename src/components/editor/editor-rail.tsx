"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type EditorRailItem = {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  /** Cannot be removed (required system fields). */
  locked?: boolean;
  /** Cannot be duplicated (single-instance items). */
  noDuplicate?: boolean;
};

const Row = React.memo(function Row({
  item,
  selected,
  disabled,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  item: EditorRailItem;
  selected: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 transition-colors",
        selected
          ? "border-merlot/50 bg-merlot/5"
          : "border-transparent hover:border-border hover:bg-surface-muted/60",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${item.label}`}
        className={cn(
          "shrink-0 cursor-grab touch-none rounded p-0.5 text-muted/60 transition active:cursor-grabbing",
          "hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        )}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {item.icon ? (
          <span
            className={cn(
              "shrink-0 transition-colors",
              selected ? "text-merlot" : "text-muted",
            )}
          >
            {item.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {item.label}
          </span>
          {item.sublabel ? (
            <span className="block truncate text-[11px] text-muted">
              {item.sublabel}
            </span>
          ) : null}
        </span>
      </button>

      {!disabled ? (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {onDuplicate && !item.noDuplicate ? (
            <button
              type="button"
              aria-label={`Duplicate ${item.label}`}
              title="Duplicate"
              onClick={() => onDuplicate(item.id)}
              className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            >
              <Copy size={13} />
            </button>
          ) : null}
          {onRemove && !item.locked ? (
            <button
              type="button"
              aria-label={`Remove ${item.label}`}
              title="Remove"
              onClick={() => onRemove(item.id)}
              className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
});

export function EditorRail({
  items,
  selectedId,
  disabled = false,
  onSelect,
  onReorder,
  onDuplicate,
  onRemove,
  dndId = "editor-rail",
}: {
  items: EditorRailItem[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
  /** Stable DndContext id so SSR/client aria-describedby attributes match. */
  dndId?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = React.useMemo(() => items.map((i) => i.id), [items]);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return;
      onReorder(from, to);
    },
    [ids, onReorder],
  );

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              disabled={disabled}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
