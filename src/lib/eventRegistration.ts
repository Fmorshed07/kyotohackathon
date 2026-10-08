import type { HostedHackathon } from "@/lib/aiHackathons";

export function isEventRegistrationClosed(event: Pick<HostedHackathon, "status" | "registrationStatus">) {
  return event.status === "past" || event.registrationStatus === "closed";
}

export function eventRegistrationClosedMessage(event: Pick<HostedHackathon, "status">) {
  return event.status === "past"
    ? "This event has ended. Registration is closed."
    : "Registration for this event is closed.";
}

export function eventRegistrationLabel(event: HostedHackathon) {
  if (isEventRegistrationClosed(event)) return "View on Luma";
  return event.registrationStatus === "waitlist" ? "Join waitlist on Luma" : "Register now";
}
