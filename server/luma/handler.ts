import { getUserRoleFromFirestore, isAdminRole, isPortalAdminEmail, verifyFirebaseIdToken } from "../email/auth";
import { normalizeLumaEventUrl, type LumaEventImport } from "../../src/lib/lumaEventImportTypes";
import { extractLumaEvent } from "./extract";

type HandlerResult = { ok: true; event: LumaEventImport } | { ok: false; status: number; error: string };
const MAX_PAGE_BYTES = 2_000_000;

export async function fetchLumaEvent(url: string): Promise<LumaEventImport> {
  let currentUrl = normalizeLumaEventUrl(url);
  const signal = AbortSignal.timeout(15_000);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal,
      headers: { Accept: "text/html", "User-Agent": "Cognisor-Event-Import/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location || redirects === 4) throw new Error("Luma redirected too many times. Paste the final event link.");
      currentUrl = normalizeLumaEventUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(response.status === 404 ? "This Luma event was not found. Check the link." : "Luma could not share this event. Check that the page is publicly accessible and try again.");
    }
    if (!response.headers.get("content-type")?.includes("text/html") || Number(response.headers.get("content-length")) > MAX_PAGE_BYTES) {
      await response.body?.cancel();
      throw new Error("Luma did not return a readable event page.");
    }
    if (!response.body) throw new Error("Luma returned an empty page.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_PAGE_BYTES) throw new Error("This event page is too large to import.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    return extractLumaEvent(Buffer.concat(chunks).toString("utf8"), currentUrl);
  }
  throw new Error("Could not load this Luma event.");
}

export async function handleLumaEventImportRequest(input: { method?: string; authorization?: string; body: unknown }): Promise<HandlerResult> {
  if (input.method !== "POST") return { ok: false, status: 405, error: "Method not allowed." };
  let user;
  try { user = await verifyFirebaseIdToken(input.authorization); }
  catch { return { ok: false, status: 401, error: "Sign in to import a Luma event." }; }
  try {
    const role = await getUserRoleFromFirestore(user.uid, input.authorization!.slice("Bearer ".length).trim());
    if (role !== "host" && !isAdminRole(role) && !isPortalAdminEmail(user.email)) {
      return { ok: false, status: 403, error: "Host or admin access required." };
    }
  } catch { return { ok: false, status: 403, error: "Could not verify host access." }; }
  const body = input.body && typeof input.body === "object" ? input.body as Record<string, unknown> : {};
  let url: string;
  try { url = normalizeLumaEventUrl(typeof body.url === "string" ? body.url : ""); }
  catch (error) { return { ok: false, status: 400, error: error instanceof Error ? error.message : "Enter a valid Luma event link." }; }
  try { return { ok: true, event: await fetchLumaEvent(url) }; }
  catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return { ok: false, status: timedOut ? 504 : 502, error: timedOut ? "Luma took too long to respond. Please try again." : error instanceof TypeError ? "Could not reach Luma. Please try again." : error instanceof Error ? error.message : "Could not import the Luma event." };
  }
}
