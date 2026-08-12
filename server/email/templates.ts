import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COGNISOR_SITE,
  COGNISOR_SOCIALS,
  CREATORS_CIRCUIT_COMMUNITY,
  CREATORS_CIRCUIT_SITE,
  CREATORS_CIRCUIT_WHATSAPP,
} from "../../src/lib/brandLinks.ts";

const brand = "Cognisor AI";
const brandSite = COGNISOR_SITE;
const LOGO_CID = "cognisor-logo@cognisorai";

/** Email-safe Cognisor palette */
const C = {
  void: "#05080F",
  card: "#0D1420",
  inset: "#0A101A",
  line: "#1C2A3D",
  text: "#F5F8FC",
  body: "#A9B8CC",
  muted: "#73879C",
  dim: "#53657A",
  cyan: "#00A3FF",
  cyanSoft: "#4FC3FF",
  white: "#FFFFFF",
} as const;

const FONT = "Arial, Helvetica, sans-serif";
const PAD = "40px"; // single gutter — every section shares this edge

const __dirname = dirname(fileURLToPath(import.meta.url));

function appOrigin() {
  const raw =
    (typeof process !== "undefined" &&
      (process.env.EMAIL_APP_URL || process.env.PUBLIC_SITE_URL || process.env.VITE_APP_URL)) ||
    "";
  return raw.replace(/\/$/, "") || brandSite;
}

function portalUrl(path = "/signin") {
  return `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function logoHttpUrl() {
  const configured =
    (typeof process !== "undefined" && process.env.EMAIL_LOGO_URL) || "";
  if (configured.trim()) return configured.trim();
  return `${appOrigin()}/app.png`;
}

export function getLogoAttachment(): {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
} | null {
  const candidates = [
    join(__dirname, "assets/cognisor-ai-logo.png"),
    resolve(process.cwd(), "server/email/assets/cognisor-ai-logo.png"),
    resolve(process.cwd(), "public/app.png"),
    join(__dirname, "../../public/app.png"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return {
        filename: "cognisor-ai-logo.png",
        content: readFileSync(path),
        cid: LOGO_CID,
        contentType: "image/png",
      };
    }
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function spacer(px: number) {
  return `<tr><td height="${px}" style="height:${px}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

function hairline() {
  return `<tr>
  <td style="padding:0 ${PAD};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td height="1" bgcolor="${C.line}" style="height:1px;font-size:0;line-height:0;background-color:${C.line};">&nbsp;</td>
      </tr>
    </table>
  </td>
</tr>`;
}

function brandRibbon() {
  return `<tr>
  <td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="48%" height="4" bgcolor="${C.cyan}" style="height:4px;font-size:0;line-height:0;background-color:${C.cyan};">&nbsp;</td>
        <td width="18%" height="4" bgcolor="${C.cyanSoft}" style="height:4px;font-size:0;line-height:0;background-color:${C.cyanSoft};">&nbsp;</td>
        <td width="8%" height="4" bgcolor="${C.white}" style="height:4px;font-size:0;line-height:0;background-color:${C.white};">&nbsp;</td>
        <td width="16%" height="4" bgcolor="#7C3AED" style="height:4px;font-size:0;line-height:0;background-color:#7C3AED;">&nbsp;</td>
        <td width="10%" height="4" bgcolor="${C.card}" style="height:4px;font-size:0;line-height:0;background-color:${C.card};">&nbsp;</td>
      </tr>
    </table>
  </td>
</tr>`;
}

function featureRow(index: string, label: string, detail: string, isLast = false) {
  const border = isLast ? "" : `border-bottom:1px solid ${C.line};`;
  return `<tr>
  <td style="padding:16px 0;${border}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;color:${C.cyanSoft};">${escapeHtml(index)}</td>
        <td valign="top">
          <p style="margin:0 0 4px;font-family:${FONT};font-size:14px;font-weight:700;color:${C.text};">${escapeHtml(label)}</p>
          <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.body};">${escapeHtml(detail)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function detailRow(label: string, value: string, isLast = false) {
  const border = isLast ? "" : `border-bottom:1px solid ${C.line};`;
  return `<tr>
  <td style="padding:14px 0;${border}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="130" valign="middle" style="font-family:${FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.dim};">${escapeHtml(label)}</td>
        <td valign="middle" align="left" style="font-family:${FONT};font-size:14px;font-weight:700;color:${C.text};text-align:left;">${escapeHtml(value)}</td>
      </tr>
    </table>
  </td>
</tr>`;
}

type LayoutOptions = {
  kicker?: string;
  title: string;
  lead?: string;
  bodyHtml: string;
  features?: Array<{ label: string; detail: string }>;
  details?: Array<{ label: string; value: string }>;
  primaryCta?: { label: string; href: string };
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Follow Cognisor socials + Creators Circuit community invite */
  showFollowCommunity?: boolean;
  preheader?: string;
};

function socialChip(label: string, href: string) {
  return `<tr>
  <td style="padding:0 0 8px;">
    <a href="${escapeHtml(href)}" target="_blank" style="display:block;padding:11px 14px;font-family:${FONT};font-size:13px;font-weight:700;text-decoration:none;color:${C.text};border:1px solid ${C.line};border-radius:8px;background-color:${C.card};text-align:left;">
      ${escapeHtml(label)}
      <span style="float:right;color:${C.cyanSoft};font-weight:700;">↗</span>
    </a>
  </td>
</tr>`;
}

function followCommunityBlock() {
  const socialRows = COGNISOR_SOCIALS.map((s) => socialChip(s.label, s.href)).join("");

  return `<tr>
  <td style="padding:0 ${PAD};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.inset}" style="background-color:${C.inset};border:1px solid ${C.line};border-radius:12px;">
      <tr>
        <td style="padding:22px 22px 10px;">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${C.cyanSoft};">
            Stay with Cognisor AI
          </p>
          <p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.body};">
            Follow us on every channel at <a href="${escapeHtml(brandSite)}" style="color:${C.cyanSoft};text-decoration:none;font-weight:700;">www.cognisorai.com</a>
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${socialRows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 22px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td height="1" bgcolor="${C.line}" style="height:1px;font-size:0;line-height:0;background-color:${C.line};">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 22px 22px;">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${C.cyanSoft};">
            Join the community
          </p>
          <p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:1.65;color:${C.body};">
            Meet creators, builders, and founders in <strong style="color:${C.text};">Creators Circuit</strong> — the Cognisor-powered community at
            <a href="${escapeHtml(CREATORS_CIRCUIT_SITE)}" style="color:${C.cyanSoft};text-decoration:none;font-weight:700;">creatorscircuit.tech</a>.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" bgcolor="${C.cyan}" style="background-color:${C.cyan};border-radius:8px;">
                <a href="${escapeHtml(CREATORS_CIRCUIT_SITE)}" target="_blank" style="display:block;padding:14px 20px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;color:${C.white};text-align:center;">
                  <span style="color:${C.white};">Join Creators Circuit&nbsp;&nbsp;→</span>
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">
            <a href="${escapeHtml(CREATORS_CIRCUIT_COMMUNITY)}" style="color:${C.cyanSoft};text-decoration:none;">Community hub</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(CREATORS_CIRCUIT_WHATSAPP)}" style="color:${C.cyanSoft};text-decoration:none;">WhatsApp group</a>
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/**
 * Horizon Letter — single aligned column, shared gutters, full-width CTA.
 * No multi-column cards (those break alignment in Gmail/Outlook).
 */
function layout(options: LayoutOptions) {
  const {
    kicker,
    title,
    lead,
    bodyHtml,
    features,
    details,
    primaryCta,
    secondaryHref,
    secondaryLabel,
    showFollowCommunity,
    preheader,
  } = options;
  const year = new Date().getFullYear();
  const preview = preheader || `${kicker ? `${kicker} ` : ""}${title}`;

  const featuresBlock =
    features && features.length
      ? `<tr>
  <td style="padding:0 ${PAD};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.inset}" style="background-color:${C.inset};border:1px solid ${C.line};border-radius:10px;">
      <tr>
        <td style="padding:8px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${features
              .map((f, i) =>
                featureRow(
                  String(i + 1).padStart(2, "0"),
                  f.label,
                  f.detail,
                  i === features.length - 1,
                ),
              )
              .join("")}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
      : "";

  const detailsBlock =
    details && details.length
      ? `<tr>
  <td style="padding:0 ${PAD};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${C.cyan};">
      <tr>
        <td style="padding:4px 0 4px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${details
              .map((row, i) => detailRow(row.label, row.value, i === details.length - 1))
              .join("")}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
      : "";

  const ctaBlock = primaryCta
    ? `<tr>
  <td style="padding:0 ${PAD};" align="left">
    <!-- Full-width primary for perfect edge alignment -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" bgcolor="${C.cyan}" style="background-color:${C.cyan};border-radius:8px;">
          <a href="${escapeHtml(primaryCta.href)}" target="_blank" style="display:block;padding:16px 24px;font-family:${FONT};font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;color:${C.white};text-align:center;">
            <span style="color:${C.white};">${escapeHtml(primaryCta.label)}&nbsp;&nbsp;→</span>
          </a>
        </td>
      </tr>
    </table>
    ${
      secondaryHref
        ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:13px;text-align:center;">
            <a href="${escapeHtml(secondaryHref)}" target="_blank" style="color:${C.cyanSoft};text-decoration:none;font-weight:600;">${escapeHtml(secondaryLabel || "Visit cognisorai.com")}&nbsp;↗</a>
          </p>`
        : ""
    }
  </td>
</tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(preview)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${C.void} !important; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
    a { color: ${C.cyanSoft}; }
    p { margin: 0; }
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .email-title { font-size: 28px !important; line-height: 1.15 !important; }
    }
    @media (prefers-color-scheme: dark), (prefers-color-scheme: light) {
      .bg-void { background-color: ${C.void} !important; }
      .bg-card { background-color: ${C.card} !important; }
      .t-main { color: ${C.text} !important; }
      .t-body { color: ${C.body} !important; }
      .t-cyan { color: ${C.cyanSoft} !important; }
    }
  </style>
</head>
<body class="bg-void" style="margin:0;padding:0;background-color:${C.void};color:${C.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.void};">
    ${escapeHtml(preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" class="bg-void" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.void}" style="background-color:${C.void};border-collapse:collapse;">
    <tr>
      <td align="center" bgcolor="${C.void}" style="padding:32px 16px 48px;background-color:${C.void};">
        <!--[if mso]>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td>
        <![endif]-->
        <table role="presentation" class="email-shell bg-card" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="max-width:600px;width:100%;background-color:${C.card};border:1px solid ${C.line};border-radius:16px;border-collapse:collapse;">
          ${brandRibbon()}

          <!-- Logo lockup (centered, one axis) -->
          <tr>
            <td class="email-pad" align="center" style="padding:36px ${PAD} 0;">
              <a href="${escapeHtml(brandSite)}" target="_blank" style="text-decoration:none;">
                <img src="cid:${LOGO_CID}" alt="Cognisor AI" width="72" height="72" style="margin:0 auto;width:72px;height:72px;border:0;border-radius:18px;background-color:${C.inset};" />
              </a>
              <p class="t-main" style="margin:18px 0 0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.32em;text-transform:uppercase;color:${C.text};text-align:center;">
                Cognisor AI
              </p>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};text-align:center;">
                <a href="${escapeHtml(brandSite)}" style="color:${C.muted};text-decoration:none;">www.cognisorai.com</a>
              </p>
            </td>
          </tr>

          ${spacer(28)}
          ${hairline()}
          ${spacer(28)}

          <!-- Headline -->
          <tr>
            <td class="email-pad" align="left" style="padding:0 ${PAD};">
              ${
                kicker
                  ? `<p class="t-cyan" style="margin:0 0 10px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:${C.cyanSoft};text-align:left;">${escapeHtml(kicker)}</p>`
                  : ""
              }
              <h1 class="email-title t-main" style="margin:0;font-family:${FONT};font-size:32px;line-height:1.15;font-weight:700;letter-spacing:-0.025em;color:${C.text};text-align:left;">
                ${escapeHtml(title)}
              </h1>
              ${
                lead
                  ? `<p class="t-body" style="margin:16px 0 0;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.body};text-align:left;">${escapeHtml(lead)}</p>`
                  : ""
              }
            </td>
          </tr>

          ${spacer(22)}

          <!-- Body -->
          <tr>
            <td class="email-pad" align="left" style="padding:0 ${PAD};">
              ${bodyHtml}
            </td>
          </tr>

          ${features ? spacer(28) + featuresBlock : ""}
          ${details ? spacer(28) + detailsBlock : ""}
          ${primaryCta ? spacer(32) + ctaBlock : ""}
          ${showFollowCommunity ? spacer(28) + followCommunityBlock() : ""}

          ${spacer(36)}
          ${hairline()}

          <!-- Signature -->
          <tr>
            <td class="email-pad" style="padding:24px ${PAD} 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="44" valign="middle" style="width:44px;">
                    <img src="cid:${LOGO_CID}" alt="" width="36" height="36" style="width:36px;height:36px;border:0;border-radius:9px;background-color:${C.inset};" />
                  </td>
                  <td valign="middle" style="padding-left:4px;">
                    <p style="margin:0;font-family:${FONT};font-size:13px;font-weight:700;color:${C.text};text-align:left;">The Cognisor AI team</p>
                    <p style="margin:4px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};text-align:left;">AI development · Automation · Hackathons</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer (aligned under shell) -->
        <table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:24px 16px 0;">
              <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">
                Sent by <span style="color:${C.text};">${brand}</span>. Reply anytime if you need help.
              </p>
              <p style="margin:0;font-family:${FONT};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${C.dim};text-align:center;">
                <a href="${escapeHtml(brandSite)}" style="color:${C.dim};text-decoration:none;">Website</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${escapeHtml(portalUrl("/"))}" style="color:${C.dim};text-decoration:none;">Portal</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;© ${year}
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(input: { hackathonName?: string }) {
  const event = input.hackathonName?.trim();
  const text = [
    `Welcome to Cognisor AI.`,
    ``,
    `You're in. Cognisor AI builds AI development and business automation solutions — and hosts hackathons that scale.`,
    event ? `You're registered for ${event}.` : null,
    ``,
    `Open your portal: ${portalUrl("/signin")}`,
    `Learn more: ${brandSite}`,
    ``,
    `— The Cognisor AI team`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = layout({
    kicker: "Welcome to",
    title: "Cognisor AI",
    lead: "You're part of the Cognisor ecosystem — AI development, business automation, and hackathons built to scale.",
    preheader: "Welcome to Cognisor AI — your portal is ready.",
    bodyHtml: `<p class="t-body" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.body};text-align:left;">
        Open your portal to set up your profile, join your team, and manage submissions from one place.
      </p>`,
    features: [
      { label: "Build with AI", detail: "Intelligent systems and digital products that ship faster." },
      { label: "Automate workflows", detail: "Business automation tailored to how your team works." },
      { label: "Compete & scale", detail: "Hackathons and a portal for submissions, judging, and rankings." },
    ],
    details: [
      { label: "From", value: "Cognisor AI" },
      { label: "Access", value: "Participant portal" },
      ...(event ? [{ label: "Event", value: event }] : []),
      { label: "Status", value: "Active" },
    ],
    primaryCta: { label: "Enter your portal", href: portalUrl("/signin") },
    secondaryHref: brandSite,
    secondaryLabel: "Visit cognisorai.com",
    showFollowCommunity: true,
  });

  const logo = getLogoAttachment();
  return {
    subject: "Welcome to Cognisor AI",
    html,
    text,
    attachments: logo ? [logo] : [],
  };
}

export function submissionEmail(input: {
  kind: "submission_created" | "submission_updated" | "admin_submission";
  title?: string;
  teamName?: string;
  hackathonName?: string;
}) {
  const event = input.hackathonName?.trim();
  const projectTitle = input.title?.trim() || "Untitled project";
  const team = input.teamName?.trim();

  const heading =
    input.kind === "submission_updated"
      ? "Submission updated"
      : input.kind === "admin_submission"
        ? "Submission attached"
        : "Submission received";

  const lead =
    input.kind === "submission_updated"
      ? "Your project was updated successfully on the Cognisor board."
      : input.kind === "admin_submission"
        ? "The Cognisor AI team created or attached a submission for you."
        : "Cognisor AI received your project submission.";

  const text = [
    heading,
    "",
    lead,
    event ? `Event: ${event}` : null,
    `Project: ${projectTitle}`,
    team ? `Team: ${team}` : null,
    "",
    portalUrl("/dashboard/participant"),
    "",
    "Follow Cognisor AI:",
    ...COGNISOR_SOCIALS.map((s) => `- ${s.label}: ${s.href}`),
    "",
    "Join the Creators Circuit community (powered by Cognisor AI):",
    CREATORS_CIRCUIT_SITE,
    `WhatsApp: ${CREATORS_CIRCUIT_WHATSAPP}`,
    "",
    "— The Cognisor AI team",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = layout({
    kicker: "Project update",
    title: heading,
    lead,
    preheader: `${heading}: ${projectTitle}`,
    bodyHtml: `<p class="t-body" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.body};text-align:left;">
        Review the details below, then continue in your dashboard — and stay connected with Cognisor AI and Creators Circuit.
      </p>`,
    details: [
      { label: "Project", value: projectTitle },
      ...(team ? [{ label: "Team", value: team }] : []),
      ...(event ? [{ label: "Event", value: event }] : []),
    ],
    primaryCta: { label: "Open dashboard", href: portalUrl("/dashboard/participant") },
    secondaryHref: brandSite,
    secondaryLabel: "Visit cognisorai.com",
    showFollowCommunity: true,
  });

  const logo = getLogoAttachment();
  return {
    subject: `${heading}: ${projectTitle}`,
    html,
    text,
    attachments: logo ? [logo] : [],
  };
}

export function participantDetailsNotifyEmail(input: {
  participantEmail: string;
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
}) {
  const event = input.hackathonName?.trim();
  const name = input.fullName?.trim() || "Unnamed participant";
  const email = input.participantEmail.trim();

  const detailPairs: Array<{ label: string; value: string }> = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    ...(event ? [{ label: "Event", value: event }] : []),
    ...(input.publicRole?.trim() ? [{ label: "Role", value: input.publicRole.trim() }] : []),
    ...(input.experienceLevel?.trim()
      ? [{ label: "Experience", value: input.experienceLevel.trim() }]
      : []),
    ...(input.organization?.trim()
      ? [{ label: "Organization", value: input.organization.trim() }]
      : []),
    ...(input.location?.trim() ? [{ label: "Location", value: input.location.trim() }] : []),
    ...(input.languages?.trim() ? [{ label: "Languages", value: input.languages.trim() }] : []),
    ...(input.skills?.trim() ? [{ label: "Skills", value: input.skills.trim() }] : []),
    ...(input.interests?.trim() ? [{ label: "Interests", value: input.interests.trim() }] : []),
    ...(input.lookingFor?.trim() ? [{ label: "Looking for", value: input.lookingFor.trim() }] : []),
    ...(input.bio?.trim() ? [{ label: "Bio", value: input.bio.trim() }] : []),
    ...(input.githubUsername?.trim()
      ? [{ label: "GitHub", value: input.githubUsername.trim() }]
      : []),
    ...(input.linkedinUrl?.trim() ? [{ label: "LinkedIn", value: input.linkedinUrl.trim() }] : []),
    ...(input.portfolioUrl?.trim()
      ? [{ label: "Portfolio", value: input.portfolioUrl.trim() }]
      : []),
    ...(input.xUrl?.trim() ? [{ label: "X", value: input.xUrl.trim() }] : []),
    ...(input.discordHandle?.trim()
      ? [{ label: "Discord", value: input.discordHandle.trim() }]
      : []),
  ];

  const text = [
    "New participant details submitted",
    "",
    ...detailPairs.map((row) => `${row.label}: ${row.value}`),
    "",
    portalUrl("/dashboard/admin"),
    "",
    "— Cognisor AI portal",
  ].join("\n");

  const html = layout({
    kicker: "Participant signup",
    title: "New participant details",
    lead: `${name} just completed their participant profile.`,
    preheader: `${name} submitted participant details${event ? ` for ${event}` : ""}.`,
    bodyHtml: `<p class="t-body" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.body};text-align:left;">
        Review the profile fields below in the admin portal if you need to follow up.
      </p>`,
    details: detailPairs,
    primaryCta: { label: "Open admin portal", href: portalUrl("/dashboard/admin") },
    secondaryHref: brandSite,
    secondaryLabel: "Visit cognisorai.com",
  });

  const logo = getLogoAttachment();
  return {
    subject: `New participant: ${name}${event ? ` · ${event}` : ""}`,
    html,
    text,
    attachments: logo ? [logo] : [],
  };
}

export function broadcastEmail(input: {
  subject: string;
  message: string;
  hackathonName?: string;
}) {
  const event = input.hackathonName?.trim();
  const subject = input.subject.trim() || "Update from Cognisor AI";
  const message = input.message.trim();
  const text = `${subject}\n\n${message}\n\n— Cognisor AI${event ? ` · ${event}` : ""}\n${brandSite}`;

  const html = layout({
    kicker: event || "Broadcast",
    title: subject,
    preheader: subject,
    bodyHtml: `<p class="t-body" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.75;color:${C.body};text-align:left;">
        ${nl2br(message)}
      </p>`,
    primaryCta: { label: "Open portal", href: portalUrl("/signin") },
    secondaryHref: brandSite,
    secondaryLabel: "Visit cognisorai.com",
  });

  const logo = getLogoAttachment();
  return {
    subject,
    html,
    text,
    attachments: logo ? [logo] : [],
  };
}

export function htmlWithHttpLogo(html: string) {
  return html.replaceAll(`cid:${LOGO_CID}`, logoHttpUrl());
}
