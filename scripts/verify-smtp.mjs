import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import nodemailer from "nodemailer";

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
loadEnvFile(resolve(process.cwd(), ".env"));

const host = readEnv("SMTP_HOST");
const user = readEnv("SMTP_USER");
const pass = readEnv("SMTP_PASS").replace(/\s+/g, "");
const port = Number(readEnv("SMTP_PORT") || "465");
const secureFlag = readEnv("SMTP_SECURE").toLowerCase();
const secure = secureFlag === "true" || secureFlag === "1" || port === 465;
const rawFrom = readEnv("SMTP_FROM");
const from =
  rawFrom.includes("<") && rawFrom.includes(">")
    ? rawFrom
    : `"${readEnv("EMAIL_FROM_NAME") || "Cognisor Hackathons"}" <${rawFrom || user}>`;

if (!host || !user || !pass) {
  console.error("Missing SMTP_HOST / SMTP_USER / SMTP_PASS in .env.local");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

try {
  await transporter.verify();
  console.log("SMTP OK");
  console.log(`host: ${host}:${port} (secure=${secure})`);
  console.log(`user: ${user}`);
  console.log(`from: ${from}`);
} catch (error) {
  console.error("SMTP verify failed:", error?.message || error);
  process.exit(1);
}
