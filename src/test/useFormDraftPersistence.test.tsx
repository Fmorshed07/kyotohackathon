import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFormDraftPersistence } from "@/hooks/useFormDraftPersistence";
import { readFormDraft, writeFormDraft } from "@/lib/formDrafts";

const baseline = { title: "Saved project" };
const edited = { title: "Unsaved project" };
const options = (storageKey = "draft-a", value = baseline) => ({ storageKey, value, baseline, debounceMs: 400 });

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("form draft persistence", () => {
  it("keeps an existing draft intact until the form consumes its restoration", () => {
    writeFormDraft("draft-a", edited);
    const view = renderHook(() => useFormDraftPersistence(options()));

    expect(view.result.current.pendingRestore?.value).toEqual(edited);
    expect(readFormDraft("draft-a")?.value).toEqual(edited);
    act(() => { view.result.current.flushDraft(); vi.advanceTimersByTime(500); });
    expect(readFormDraft("draft-a")?.value).toEqual(edited);
    view.unmount();
    expect(readFormDraft("draft-a")?.value).toEqual(edited);
  });

  it("does not resurrect a cleared draft from a pending timer or unmount flush", () => {
    const view = renderHook(() => useFormDraftPersistence(options("draft-a", edited)));
    act(() => view.result.current.clearDraft());
    act(() => vi.advanceTimersByTime(500));
    expect(readFormDraft("draft-a")).toBeNull();
    view.unmount();
    expect(readFormDraft("draft-a")).toBeNull();
  });

  it("persists the last edit when navigating before the debounce completes", () => {
    const view = renderHook((props) => useFormDraftPersistence(props), { initialProps: options() });
    view.rerender(options("draft-a", edited));
    view.unmount();
    expect(readFormDraft("draft-a")?.value).toEqual(edited);
  });

  it("flushes the previous scope and keeps delayed clear callbacks scoped to their original draft", () => {
    const view = renderHook((props) => useFormDraftPersistence(props), { initialProps: options("draft-a", edited) });
    const clearOldDraft = view.result.current.clearDraft;
    view.rerender(options("draft-b", { title: "Second account's draft" }));
    expect(readFormDraft("draft-a")?.value).toEqual(edited);
    act(() => vi.advanceTimersByTime(500));
    act(() => clearOldDraft());
    expect(readFormDraft("draft-a")).toBeNull();
    expect(readFormDraft("draft-b")?.value).toEqual({ title: "Second account's draft" });
  });

  it("saves new edits after clearing a submitted draft", () => {
    const view = renderHook((props) => useFormDraftPersistence(props), { initialProps: options("draft-a", edited) });
    act(() => view.result.current.clearDraft());
    const nextEdit = { title: "More edits after saving" };
    view.rerender(options("draft-a", nextEdit));
    act(() => vi.advanceTimersByTime(500));
    expect(readFormDraft("draft-a")?.value).toEqual(nextEdit);
  });

  it("keeps other unsaved fields when only part of a workspace is saved", () => {
    const initial = { storageKey: "scores", value: { first: 80, second: 90 }, baseline: { first: 0, second: 0 } };
    const view = renderHook((props) => useFormDraftPersistence(props), { initialProps: initial });
    act(() => view.result.current.clearDraft());
    view.rerender({ ...initial, baseline: { first: 80, second: 0 } });
    view.unmount();
    expect(readFormDraft("scores")?.value).toEqual(initial.value);
  });

  it("waits for server data before reading or writing a disabled form", () => {
    writeFormDraft("draft-a", edited);
    const view = renderHook((props) => useFormDraftPersistence(props), { initialProps: { ...options(), enabled: false } });
    expect(view.result.current.pendingRestore).toBeNull();
    act(() => vi.advanceTimersByTime(500));
    expect(readFormDraft("draft-a")?.value).toEqual(edited);
    view.rerender({ ...options(), enabled: true });
    expect(view.result.current.pendingRestore?.value).toEqual(edited);
  });
});
