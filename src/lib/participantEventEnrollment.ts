import type { Firestore } from "firebase/firestore";
import { fetchAiHackathon } from "@/lib/aiHackathons";
import { eventRegistrationClosedMessage, isEventRegistrationClosed } from "@/lib/eventRegistration";
import { normalizeHackathonIds } from "@/lib/hackathons";

export const UNAVAILABLE_EVENT_REGISTRATION_MESSAGE = "This event is unavailable for registration.";

/** Recheck the current public event before adding a participant membership. */
export async function checkParticipantEventEnrollment(
  db: Firestore,
  eventId: string,
  existingEventIds?: unknown,
  primaryEventId?: unknown,
): Promise<"existing" | "new"> {
  const existingIds = normalizeHackathonIds(existingEventIds, primaryEventId);
  // Returning members retain read access without another enrollment write.
  if (existingIds.includes(eventId)) return "existing";
  const event = await fetchAiHackathon(db, eventId);
  if (!event || !event.published) throw new Error(UNAVAILABLE_EVENT_REGISTRATION_MESSAGE);
  if (isEventRegistrationClosed(event)) throw new Error(eventRegistrationClosedMessage(event));
  return "new";
}
