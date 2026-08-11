import { getUserRoleFromFirestore, isAdminRole, isPortalAdminEmail, verifyFirebaseIdToken } from "./auth";
import { broadcastEmail, submissionEmail, welcomeEmail } from "./templates";
import { sendMail } from "./transport";
import type { EmailRequestBody, SendError, SendResult } from "./types";

function jsonError(error: string, status: number): SendError {
  return { ok: false, error, status };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function handleEmailRequest(input: {
  method?: string;
  authorization?: string;
  body: unknown;
}): Promise<SendResult | SendError> {
  if (input.method && input.method !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  let authUser;
  try {
    authUser = await verifyFirebaseIdToken(input.authorization);
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status) || 401
        : 401;
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Unauthorized.";
    return jsonError(message, status);
  }

  const body = (input.body || {}) as EmailRequestBody;
  if (!body || typeof body !== "object" || !("type" in body)) {
    return jsonError("Invalid email payload.", 400);
  }

  const idToken = input.authorization!.slice("Bearer ".length).trim();

  if (body.type === "welcome") {
    if (!authUser.email) return jsonError("Authenticated user has no email address.", 400);
    const template = welcomeEmail({ hackathonName: body.hackathonName });
    const result = await sendMail({ to: authUser.email, ...template });
    return { ok: true, messageId: result.messageId, preview: result.preview };
  }

  if (
    body.type === "submission_created" ||
    body.type === "submission_updated" ||
    body.type === "admin_submission"
  ) {
    let toEmail = authUser.email;
    if (body.type === "admin_submission") {
      const role = await getUserRoleFromFirestore(authUser.uid, idToken);
      if (!isAdminRole(role) && !isPortalAdminEmail(authUser.email)) {
        return jsonError("Admin access required.", 403);
      }
      if (!body.toEmail || !isValidEmail(body.toEmail)) {
        return jsonError("A valid participant email is required.", 400);
      }
      toEmail = body.toEmail;
    }

    if (!toEmail) return jsonError("No recipient email available.", 400);

    const template = submissionEmail({
      kind: body.type,
      title: body.title,
      teamName: body.teamName,
      hackathonName: body.hackathonName,
    });
    const result = await sendMail({ to: toEmail, ...template });
    return { ok: true, messageId: result.messageId, preview: result.preview };
  }

  if (body.type === "broadcast") {
    const role = await getUserRoleFromFirestore(authUser.uid, idToken);
    if (!isAdminRole(role) && !isPortalAdminEmail(authUser.email)) {
      return jsonError("Admin access required.", 403);
    }

    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!subject || !message) {
      return jsonError("Broadcast subject and message are required.", 400);
    }

    const recipients = Array.isArray(body.recipients)
      ? [...new Set(body.recipients.map((email) => normalizeEmail(String(email))).filter(isValidEmail))]
      : [];

    if (recipients.length === 0) {
      return jsonError("Add at least one participant recipient.", 400);
    }

    const template = broadcastEmail({
      subject,
      message,
      hackathonName: body.hackathonName,
    });

    let sent = 0;
    let failed = 0;
    let lastMessageId = `broadcast-${Date.now()}`;

    for (const recipient of recipients) {
      try {
        const result = await sendMail({ to: recipient, ...template });
        lastMessageId = result.messageId;
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("[email:broadcast] failed", recipient, error);
      }
    }

    if (sent === 0) {
      return jsonError("Failed to send broadcast emails.", 502);
    }

    return { ok: true, messageId: lastMessageId, sent, failed };
  }

  return jsonError("Unsupported email type.", 400);
}
