import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearFormDraft,
  draftsDiffer,
  readFormDraft,
  writeFormDraft,
} from "@/lib/formDrafts";

type UseFormDraftPersistenceOptions<T> = {
  /** localStorage key; null disables persistence */
  storageKey: string | null;
  value: T;
  /** When false, drafts are not written (e.g. still loading server data) */
  enabled?: boolean;
  debounceMs?: number;
  /**
   * Baseline (usually last server/saved snapshot). Dirty = value differs from baseline.
   * Also used so we don't keep rewriting identical server data as a "draft".
   */
  baseline?: T | null;
};

type UseFormDraftPersistenceResult = {
  draftSavedAt: string | null;
  isDirty: boolean;
  clearDraft: () => void;
  flushDraft: () => void;
  /** One-shot restored draft for the current storageKey (caller should apply then ignore). */
  pendingRestore: { value: unknown; savedAt: string } | null;
  consumePendingRestore: () => void;
};

/**
 * Debounced localStorage drafts + flush on tab hide / page unload so sudden closes keep work.
 */
export function useFormDraftPersistence<T>({
  storageKey,
  value,
  enabled = true,
  debounceMs = 500,
  baseline = null,
}: UseFormDraftPersistenceOptions<T>): UseFormDraftPersistenceResult {
  type DraftState = { storageKey: string | null; value: T; baseline: T | null; enabled: boolean };
  type Restore = { storageKey: string; value: unknown; savedAt: string };
  const [savedDraft, setSavedDraft] = useState<{ storageKey: string; savedAt: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Restore | null>(null);
  const restoreRef = useRef<Restore | null>(null);
  const committedRef = useRef<DraftState>({ storageKey, value, baseline, enabled });
  const clearedRef = useRef<{ storageKey: string; value: T; baseline: T | null } | null>(null);
  const timerRef = useRef<{ storageKey: string; id: number } | null>(null);

  const isDirty =
    enabled &&
    Boolean(storageKey) &&
    baseline != null &&
    draftsDiffer(value, baseline);

  const persistDraft = useCallback((draft: DraftState) => {
    const { storageKey: key, value: current, baseline: base } = draft;
    if (!key || !draft.enabled || restoreRef.current?.storageKey === key) return undefined;
    // A successful save/discard must not be undone by a timer or cleanup.
    if (clearedRef.current?.storageKey === key &&
        !draftsDiffer(current, clearedRef.current.value) &&
        !draftsDiffer(base, clearedRef.current.baseline)) return null;
    if (base != null && !draftsDiffer(current, base)) {
      clearFormDraft(key);
      return null;
    }
    return writeFormDraft(key, current);
  }, []);

  const flushDraft = useCallback(() => {
    const draft = committedRef.current;
    if (!storageKey || draft.storageKey !== storageKey) return;
    const savedAt = persistDraft(draft);
    if (savedAt !== undefined) setSavedDraft(savedAt ? { storageKey, savedAt } : null);
  }, [storageKey, persistDraft]);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    clearFormDraft(storageKey);
    if (timerRef.current?.storageKey === storageKey) {
      window.clearTimeout(timerRef.current.id);
      timerRef.current = null;
    }
    if (committedRef.current.storageKey === storageKey) {
      clearedRef.current = { storageKey, value: committedRef.current.value, baseline: committedRef.current.baseline };
    }
    if (restoreRef.current?.storageKey === storageKey) restoreRef.current = null;
    setSavedDraft((current) => current?.storageKey === storageKey ? null : current);
    setPendingRestore((current) => current?.storageKey === storageKey ? null : current);
  }, [storageKey]);

  const consumePendingRestore = useCallback(() => {
    if (restoreRef.current?.storageKey === storageKey) restoreRef.current = null;
    setPendingRestore((current) => current?.storageKey === storageKey ? null : current);
  }, [storageKey]);

  // Resolve restoration before any write can clear or replace the stored draft.
  useEffect(() => {
    restoreRef.current = null;
    setPendingRestore(null);
    setSavedDraft(null);
    if (!storageKey || !enabled) return;

    const existing = readFormDraft<T>(storageKey);
    if (existing && baseline != null && !draftsDiffer(existing.value, baseline)) {
      clearFormDraft(storageKey);
    } else if (existing) {
      const restored = { storageKey, value: existing.value, savedAt: existing.savedAt };
      restoreRef.current = restored;
      setSavedDraft({ storageKey, savedAt: existing.savedAt });
      setPendingRestore(restored);
    }

    return () => {
      const previous = committedRef.current;
      if (previous.storageKey === storageKey) persistDraft(previous);
    };
    // Baseline changes must not re-restore old edits after a successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled, persistDraft]);

  // Commit after the previous scope's cleanup, so it flushes to its own key.
  useEffect(() => {
    committedRef.current = { storageKey, value, baseline, enabled };
  }, [storageKey, value, baseline, enabled]);

  // Debounced write while editing.
  useEffect(() => {
    if (!storageKey || !enabled || restoreRef.current?.storageKey === storageKey) return;

    if (baseline != null && !draftsDiffer(value, baseline)) {
      clearFormDraft(storageKey);
      setSavedDraft(null);
      return;
    }

    const timer = window.setTimeout(flushDraft, debounceMs);
    timerRef.current = { storageKey, id: timer };
    return () => {
      window.clearTimeout(timer);
      if (timerRef.current?.id === timer) timerRef.current = null;
    };
  }, [storageKey, enabled, value, baseline, debounceMs, flushDraft]);

  // Flush immediately when the tab hides or the page is unloading.
  useEffect(() => {
    if (!storageKey || !enabled) return;

    const flush = () => flushDraft();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storageKey, enabled, flushDraft]);

  return {
    draftSavedAt: savedDraft?.storageKey === storageKey ? savedDraft.savedAt : null,
    isDirty,
    clearDraft,
    flushDraft,
    pendingRestore: enabled && pendingRestore?.storageKey === storageKey ? pendingRestore : null,
    consumePendingRestore,
  };
}
