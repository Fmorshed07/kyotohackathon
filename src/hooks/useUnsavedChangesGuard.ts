import { useEffect } from "react";

/** Warn before tab close / refresh when there are unsaved edits. */
export function useUnsavedChangesGuard(isDirty: boolean, message = "You have unsaved changes.") {
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, message]);
}
