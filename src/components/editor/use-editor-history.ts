"use client";

import { useCallback, useMemo, useReducer, type Reducer } from "react";

const HISTORY_LIMIT = 100;
/** Rapid edits sharing a tag collapse into a single undo step. */
const COALESCE_MS = 700;

type State<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Last persisted document. Reference equality drives the dirty flag. */
  baseline: T;
  lastTag: string | null;
  lastAt: number;
};

type Action<T> =
  | { kind: "commit"; updater: (prev: T) => T; tag?: string; at: number }
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "saved" }
  | { kind: "replace"; value: T };

function init<T>(value: T): State<T> {
  return {
    past: [],
    present: value,
    future: [],
    baseline: value,
    lastTag: null,
    lastAt: 0,
  };
}

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.kind) {
    case "commit": {
      const present = action.updater(state.present);
      if (present === state.present) return state;

      const coalesce =
        action.tag != null &&
        action.tag === state.lastTag &&
        action.at - state.lastAt < COALESCE_MS;

      if (coalesce) {
        return { ...state, present, future: [], lastAt: action.at };
      }

      const past = [...state.past, state.present];
      return {
        ...state,
        past:
          past.length > HISTORY_LIMIT
            ? past.slice(past.length - HISTORY_LIMIT)
            : past,
        present,
        future: [],
        lastTag: action.tag ?? null,
        lastAt: action.at,
      };
    }

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (previous === undefined) return state;
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastTag: null,
        lastAt: 0,
      };
    }

    case "redo": {
      const [next, ...rest] = state.future;
      if (next === undefined) return state;
      return {
        ...state,
        past: [...state.past, state.present],
        present: next,
        future: rest,
        lastTag: null,
        lastAt: 0,
      };
    }

    case "saved":
      return { ...state, baseline: state.present, lastTag: null, lastAt: 0 };

    case "replace":
      return init(action.value);
  }
}

export type EditorHistory<T> = {
  doc: T;
  commit: (updater: T | ((prev: T) => T), tag?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  /** Call after a successful save so the current document becomes the baseline. */
  markSaved: () => void;
  /** Discard history and start over from a new server document. */
  replace: (value: T) => void;
};

/**
 * Undo/redo document state with dirty tracking.
 *
 * Undoing back to the start restores the original object reference, so
 * `isDirty` correctly returns false without any deep comparison.
 */
export function useEditorHistory<T>(initial: T): EditorHistory<T> {
  const [state, dispatch] = useReducer(
    reducer as Reducer<State<T>, Action<T>>,
    initial,
    init,
  );

  const commit = useCallback(
    (updater: T | ((prev: T) => T), tag?: string) => {
      const fn =
        typeof updater === "function"
          ? (updater as (prev: T) => T)
          : () => updater;
      dispatch({ kind: "commit", updater: fn, tag, at: Date.now() });
    },
    [],
  );

  const undo = useCallback(() => dispatch({ kind: "undo" }), []);
  const redo = useCallback(() => dispatch({ kind: "redo" }), []);
  const markSaved = useCallback(() => dispatch({ kind: "saved" }), []);
  const replace = useCallback(
    (value: T) => dispatch({ kind: "replace", value }),
    [],
  );

  return useMemo(
    () => ({
      doc: state.present,
      commit,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      isDirty: state.present !== state.baseline,
      markSaved,
      replace,
    }),
    [state, commit, undo, redo, markSaved, replace],
  );
}
