import { getFirebaseAuth } from "@/lib/firebaseClient";

export type ParticipantEmailPayload =
  | {
      type: "welcome";
      hackathonName?: string;
    }
  | {
      type: "participant_details";
      hackathonName?: string;
      fullName?: string;
      publicRole?: string;
      experienceLevel?: string;
      organization?: string;
      location?: string;
      bio?: string;
      skills?: string;
      interests?: string;
      lookingFor?: string;
      languages?: string;
      githubUsername?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      xUrl?: string;
      discordHandle?: string;
    }
  | {
      type: "submission_created" | "submission_updated" | "admin_submission";
      toEmail?: string;
      title?: string;
      teamName?: string;
      hackathonName?: string;
    }
  | {
      type: "broadcast";
      subject: string;
      message: string;
      recipients: string[];
      hackathonName?: string;
    };

export type ParticipantEmailResult =
  | { ok: true; preview?: boolean; sent?: number; failed?: number }
  | { ok: false; error: string };

async function getIdToken() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("You must be signed in to send email.");
  return user.getIdToken();
}

export async function sendParticipantEmail(
  payload: ParticipantEmailPayload,
): Promise<ParticipantEmailResult> {
  try {
    const token = await getIdToken();
    const response = await fetch("/api/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      preview?: boolean;
      sent?: number;
      failed?: number;
    };

    if (!response.ok) {
      return { ok: false, error: data.error || `Email request failed (${response.status}).` };
    }

    return {
      ok: true,
      preview: data.preview,
      sent: data.sent,
      failed: data.failed,
    };
  } catch (error: unknown) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Email request failed.";
    return { ok: false, error: message };
  }
}

/** Fire-and-forget helper so auth/submit flows never block on mail delivery. */
export function queueParticipantEmail(payload: ParticipantEmailPayload) {
  void sendParticipantEmail(payload).then((result) => {
    if (result.ok === false) {
      console.warn("[participant-email]", result.error);
      return;
    }
    if (result.preview) {
      console.info("[participant-email] SMTP not configured — email logged on server.");
    }
  });
}
