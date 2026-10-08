import { getFirebaseAuth } from "@/lib/firebaseClient";
import { emptyHostEventBriefForm, type HostEventBriefForm } from "@/lib/hostEventBriefForm";
import { toDatetimeLocalValue } from "@/lib/hostEvents";
import { normalizeLumaEventUrl, type LumaEventImport } from "@/lib/lumaEventImportTypes";

export function lumaImportToForm(result: LumaEventImport): HostEventBriefForm {
  return {
    ...emptyHostEventBriefForm(),
    ...result.details,
    registrationUrl: result.sourceUrl,
    startAt: result.details.startAt ? toDatetimeLocalValue(result.details.startAt) : "",
    endAt: result.details.endAt ? toDatetimeLocalValue(result.details.endAt) : "",
  };
}

export async function importLumaEvent(url: string, signal?: AbortSignal): Promise<LumaEventImport> {
  const sourceUrl = normalizeLumaEventUrl(url);
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in as a host or admin to import an event.");
  const token = await user.getIdToken();
  const response = await fetch("/api/luma-event-import", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: sourceUrl }),
    signal,
  });
  const data = await response.json().catch(() => null) as { event?: LumaEventImport; error?: string } | null;
  if (!response.ok || !data?.event?.details?.name) {
    throw new Error(data?.error || "Could not import this Luma event. Please try again.");
  }
  return data.event;
}
