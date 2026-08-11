import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import {
  welcomeEmail,
  submissionEmail,
  htmlWithHttpLogo,
} from "../server/email/templates.ts";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readEnv(name) {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const to = process.argv[2] || "farhanmorshedwork@gmail.com";
const kind = (process.argv[3] || "submission").toLowerCase();
const host = readEnv("SMTP_HOST");
const user = readEnv("SMTP_USER");
const pass = readEnv("SMTP_PASS").replace(/\s+/g, "");
const port = Number(readEnv("SMTP_PORT") || "465");
const secure = readEnv("SMTP_SECURE") === "true" || port === 465;
const rawFrom = readEnv("SMTP_FROM");
const from =
  rawFrom.includes("<") && rawFrom.includes(">")
    ? rawFrom
    : `"${readEnv("EMAIL_FROM_NAME") || "Cognisor AI"}" <${rawFrom || user}>`;

const template =
  kind === "welcome"
    ? welcomeEmail({})
    : submissionEmail({
        kind: "submission_created",
        title: "Horizon Demo Project",
        teamName: "Team Cognisor",
        hackathonName: "Impact Kyoto 2026",
      });

const previewPath = resolve(
  process.cwd(),
  kind === "welcome" ? "scripts/email-preview-welcome.html" : "scripts/email-preview-submission.html",
);
writeFileSync(previewPath, htmlWithHttpLogo(template.html), "utf8");
console.log(`Preview written: ${previewPath}`);

if (!host || !user || !pass) {
  console.error("Missing SMTP credentials in .env.local — preview HTML only.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

const info = await transporter.sendMail({
  from,
  to,
  subject: template.subject,
  text: template.text,
  html: template.html,
  attachments: (template.attachments || []).map((file) => ({
    filename: file.filename,
    content: file.content,
    cid: file.cid,
    contentType: file.contentType,
    contentDisposition: "inline",
  })),
});

console.log("SENT");
console.log(`to: ${to}`);
console.log(`kind: ${kind}`);
console.log(`subject: ${template.subject}`);
console.log(`messageId: ${info.messageId || ""}`);
console.log(`response: ${info.response || ""}`);
