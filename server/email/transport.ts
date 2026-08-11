import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function readEnv(name: string) {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

export function isSmtpConfigured() {
  return Boolean(readEnv("SMTP_HOST") && readEnv("SMTP_USER") && readEnv("SMTP_PASS"));
}

export function getFromAddress() {
  const rawFrom = readEnv("SMTP_FROM");
  if (rawFrom.includes("<") && rawFrom.includes(">")) {
    return rawFrom;
  }

  const fromEmail = rawFrom || readEnv("SMTP_USER") || "noreply@cognisor.dev";
  const fromName = readEnv("EMAIL_FROM_NAME") || "Cognisor AI";
  return `"${fromName}" <${fromEmail}>`;
}

export function getMailTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || "587");
  const secureFlag = readEnv("SMTP_SECURE").toLowerCase();
  const secure = secureFlag === "true" || secureFlag === "1" || port === 465;
  // Gmail app passwords are often stored with spaces; SMTP auth expects no spaces.
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS").replace(/\s+/g, "");

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    cid: string;
    contentType?: string;
  } | null>;
}) {
  const transporter = getMailTransporter();
  const attachments = (options.attachments || []).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  if (!transporter) {
    console.info("[email:dev]", {
      to: options.to,
      subject: options.subject,
      text: options.text,
      attachments: attachments.map((a) => a.filename),
    });
    return { messageId: `dev-${Date.now()}`, preview: true as const };
  }

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: attachments.map((file) => ({
      filename: file.filename,
      content: file.content,
      cid: file.cid,
      contentType: file.contentType,
      contentDisposition: "inline" as const,
    })),
  });

  return { messageId: info.messageId || `sent-${Date.now()}`, preview: false as const };
}

export async function verifySmtpConnection() {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { ok: false as const, error: "SMTP is not configured in environment variables." };
  }
  await transporter.verify();
  return {
    ok: true as const,
    host: readEnv("SMTP_HOST"),
    user: readEnv("SMTP_USER"),
    from: getFromAddress(),
  };
}
