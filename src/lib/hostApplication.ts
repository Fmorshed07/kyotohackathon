export type HostApplication = {
  organizerTitle: string;
  website: string;
  eventName: string;
  eventType: string;
  format: string;
  theme: string;
  audience: string;
  expectedAttendees: string;
  targetDate: string;
  duration: string;
  location: string;
  timezone: string;
  goals: string;
  successDefinition: string;
  supportNeeded: string;
  experience: string;
  submittedAt: string;
};

export type HostApplicationDraft = Omit<HostApplication, "submittedAt">;

export function emptyHostApplicationDraft(): HostApplicationDraft {
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timezone = "";
  }
  return {
    organizerTitle: "",
    website: "",
    eventName: "",
    eventType: "Hackathon",
    format: "Online",
    theme: "",
    audience: "",
    expectedAttendees: "",
    targetDate: "",
    duration: "",
    location: "",
    timezone,
    goals: "",
    successDefinition: "",
    supportNeeded: "",
    experience: "",
  };
}

function clean(value: unknown, limit = 1_500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeWebsite(value: unknown) {
  const website = clean(value, 300);
  if (!website) return "";
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website.replace(/^\/+/, "")}`;
}

export function buildHostApplication(
  draft: HostApplicationDraft,
  submittedAt = new Date().toISOString(),
): HostApplication {
  return {
    organizerTitle: clean(draft.organizerTitle, 120),
    website: normalizeWebsite(draft.website),
    eventName: clean(draft.eventName, 160),
    eventType: clean(draft.eventType, 80),
    format: clean(draft.format, 40),
    theme: clean(draft.theme),
    audience: clean(draft.audience, 500),
    expectedAttendees: clean(draft.expectedAttendees, 80),
    targetDate: clean(draft.targetDate, 80),
    duration: clean(draft.duration, 80),
    location: clean(draft.location, 180),
    timezone: clean(draft.timezone, 100),
    goals: clean(draft.goals),
    successDefinition: clean(draft.successDefinition, 800),
    supportNeeded: clean(draft.supportNeeded, 1_000),
    experience: clean(draft.experience, 1_000),
    submittedAt,
  };
}

export function getHostApplicationStepError(
  step: number,
  input: { fullName: string; organization: string; draft: HostApplicationDraft },
) {
  if (step === 0) {
    if (!input.fullName.trim()) return "Enter your name to continue.";
    if (!input.organization.trim()) return "Enter your organization or community.";
    return null;
  }
  if (step === 1) {
    if (!input.draft.eventName.trim()) return "Enter a working event name.";
    if (!input.draft.audience.trim()) return "Describe who the event is for.";
    if (!input.draft.targetDate.trim()) return "Add a target date or month.";
    return null;
  }
  if (!input.draft.theme.trim()) return "Describe the event theme or challenge.";
  if (!input.draft.goals.trim()) return "Tell us what you want the event to achieve.";
  return null;
}

export function parseHostApplication(value: unknown): HostApplication | undefined {
  if (!value || typeof value !== "object") return undefined;
  const draft = value as Record<string, unknown>;
  const application = buildHostApplication(
    {
      organizerTitle: clean(draft.organizerTitle),
      website: clean(draft.website),
      eventName: clean(draft.eventName),
      eventType: clean(draft.eventType),
      format: clean(draft.format),
      theme: clean(draft.theme),
      audience: clean(draft.audience),
      expectedAttendees: clean(draft.expectedAttendees),
      targetDate: clean(draft.targetDate),
      duration: clean(draft.duration),
      location: clean(draft.location),
      timezone: clean(draft.timezone),
      goals: clean(draft.goals),
      successDefinition: clean(draft.successDefinition),
      supportNeeded: clean(draft.supportNeeded),
      experience: clean(draft.experience),
    },
    clean(draft.submittedAt, 80),
  );
  return application.eventName || application.theme || application.goals ? application : undefined;
}
