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
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    value: unknown;
    savedAt: string;
  } | null>(null);

  const valueRef = useRef(value);
  const baselineRef = useRef(baseline);
  const enabledRef = useRef(enabled);
  const keyRef = useRef(storageKey);

  valueRef.current = value;
  baselineRef.current = baseline;
  enabledRef.current = enabled;
  keyRef.current = storageKey;

  const isDirty =
    enabled &&
    Boolean(storageKey) &&
    baseline != null &&
    draftsDiffer(value, baseline);

  const flushDraft = useCallback(() => {
    const key = keyRef.current;
    if (!key || !enabledRef.current) return;

    const current = valueRef.current;
    const base = baselineRef.current;
    if (base != null && !draftsDiffer(current, base)) {
      clearFormDraft(key);
      setDraftSavedAt(null);
      return;
    }

    const savedAt = writeFormDraft(key, current);
    if (savedAt) setDraftSavedAt(savedAt);
  }, []);

  const clearDraft = useCallback(() => {
    const key = keyRef.current;
    clearFormDraft(key);
    setDraftSavedAt(null);
    setPendingRestore(null);
  }, []);

  const consumePendingRestore = useCallback(() => {
    setPendingRestore(null);
  }, []);

  // Load any existing draft when the storage key becomes available / changes.
  useEffect(() => {
    setPendingRestore(null);
    setDraftSavedAt(null);
    if (!storageKey || !enabled) return;

    const existing = readFormDraft<T>(storageKey);
    if (!existing) return;

    if (baseline != null && !draftsDiffer(existing.value, baseline)) {
      clearFormDraft(storageKey);
      return;
    }

    setDraftSavedAt(existing.savedAt);
    setPendingRestore({ value: existing.value, savedAt: existing.savedAt });
    // Only re-read when the key or enabled flag changes — not on every baseline tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // Debounced write while editing.
  useEffect(() => {
    if (!storageKey || !enabled) return;

    if (baseline != null && !draftsDiffer(value, baseline)) {
      clearFormDraft(storageKey);
      setDraftSavedAt(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const savedAt = writeFormDraft(storageKey, value);
      if (savedAt) setDraftSavedAt(savedAt);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [storageKey, enabled, value, baseline, debounceMs]);

  // Flush immediately when the tab hides or the page is unloading.
  useEffect(() => {
    if (!storageKey || !enabled) return;

    const flush = () => flushDraft();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storageKey, enabled, flushDraft]);

  return {
    draftSavedAt,
    isDirty,
    clearDraft,
    flushDraft,
    pendingRestore,
    consumePendingRestore,
  };
}
