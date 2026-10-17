export const RULEBOOK_URL_ERROR = "Enter a rule book URL starting with https://, http://, or /.";

/** Safe optional link for event resources and public rule book buttons. */
export function normalizeRulebookUrl(value?: string | null): string {
  const candidate = value?.trim() ?? "";
  if (!candidate || candidate.includes("\\") || Array.from(candidate).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  })) return "";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function isValidRulebookUrl(value?: string | null): boolean {
  return !value?.trim() || Boolean(normalizeRulebookUrl(value));
}

/** Reject a nonempty invalid link before any event write takes place. */
export function validateRulebookUrl(value?: string | null): string {
  if (!isValidRulebookUrl(value)) throw new Error(RULEBOOK_URL_ERROR);
  return normalizeRulebookUrl(value);
}
