export type FormDraftEnvelope<T> = {
  version: 1;
  savedAt: string;
  value: T;
};

const PREFIX = "cognisor_form_draft:";

export function formDraftStorageKey(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts.map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean);
  if (cleaned.length === 0) return null;
  return `${PREFIX}${cleaned.join(":")}`;
}

export function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function readFormDraft<T>(key: string | null | undefined): FormDraftEnvelope<T> | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormDraftEnvelope<T>;
    if (!parsed || parsed.version !== 1 || typeof parsed.savedAt !== "string") return null;
    if (parsed.value === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFormDraft<T>(key: string | null | undefined, value: T): string | null {
  if (!key || typeof window === "undefined") return null;
  const savedAt = new Date().toISOString();
  const envelope: FormDraftEnvelope<T> = { version: 1, savedAt, value };
  try {
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearFormDraft(key: string | null | undefined): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore quota / privacy mode failures
  }
}

export function draftsDiffer<T>(left: T, right: T): boolean {
  return stableSerialize(left) !== stableSerialize(right);
}
