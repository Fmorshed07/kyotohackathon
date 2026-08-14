import type { Submission } from "@/types/portal";

const PRIVATE_JUDGING_KEYS = [
  "judge_score",
  "judge_notes",
  "judge_scores",
  "judge_notes_by_judge",
  "judge_criteria_scores",
  "judge_criteria_scores_by_judge",
] as const;

export type PublicProjectLink = {
  id: "demo" | "project" | "document";
  label: string;
  href: string;
};

export type SocialShareTarget = {
  id: "x" | "linkedin" | "facebook" | "whatsapp" | "email";
  label: string;
  href: string;
};

export function normalizeHttpUrl(value: string | null | undefined) {
  if (!value?.trim()) return "";
  const candidate = value.trim().match(/^https?:\/\/.+/i) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function youtubeVideoId(url: string | null | undefined) {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return null;
  return (
    normalized.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i,
    )?.[1] ?? null
  );
}

const hostnameOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
};

export function projectLinkLabel(url: string) {
  const host = hostnameOf(url);
  if (host.includes("github.com")) return "GitHub";
  if (host.includes("gitlab.com")) return "GitLab";
  if (host.includes("huggingface.co")) return "Hugging Face";
  if (host.includes("devpost.com")) return "Devpost";
  if (host.endsWith("vercel.app") || host.includes("netlify.app") || host.includes("pages.dev")) {
    return "Live site";
  }
  return "Live project";
}

export function demoLinkLabel(url: string) {
  const host = hostnameOf(url);
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("vimeo.com")) return "Vimeo";
  if (host.includes("loom.com")) return "Loom";
  return "Demo video";
}

export function documentLinkLabel(url: string) {
  const host = hostnameOf(url);
  if (host.includes("drive.google.com") || host.includes("docs.google.com")) return "Google Drive";
  if (host.includes("dropbox.com")) return "Dropbox";
  if (/\.pdf($|\?)/i.test(url)) return "PDF";
  return "Document";
}

export function listPublicProjectLinks(submission: Pick<
  Submission,
  "demo_video_url" | "project_url" | "submission_pdf_url"
>): PublicProjectLink[] {
  const links: PublicProjectLink[] = [];
  const demo = normalizeHttpUrl(submission.demo_video_url);
  const project = normalizeHttpUrl(submission.project_url);
  const document = normalizeHttpUrl(submission.submission_pdf_url);
  if (demo) links.push({ id: "demo", label: demoLinkLabel(demo), href: demo });
  if (project) links.push({ id: "project", label: projectLinkLabel(project), href: project });
  if (document) links.push({ id: "document", label: documentLinkLabel(document), href: document });
  return links;
}

export function getPublicOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function buildProjectPermalink(projectId: string, origin = getPublicOrigin()) {
  const id = projectId.trim();
  if (!id) return origin ? `${origin}/projects` : "/projects";
  const path = `/projects/${encodeURIComponent(id)}`;
  return origin ? `${origin}${path}` : path;
}

export function buildProjectShareText(input: { title: string; teamName?: string | null }) {
  const title = input.title.trim() || "this hackathon project";
  const team = input.teamName?.trim();
  return team ? `Check out ${title} by ${team} on Cognisor` : `Check out ${title} on Cognisor`;
}

export function buildSocialShareTargets(input: {
  url: string;
  title: string;
  text: string;
}): SocialShareTarget[] {
  const url = encodeURIComponent(input.url);
  const title = encodeURIComponent(input.title);
  const text = encodeURIComponent(input.text);
  const whatsapp = encodeURIComponent(`${input.text}\n${input.url}`);
  return [
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${whatsapp}`,
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${title}&body=${whatsapp}`,
    },
  ];
}

export function stripPrivateJudgingFields<T extends Record<string, unknown>>(data: T): T {
  const next = { ...data };
  for (const key of PRIVATE_JUDGING_KEYS) {
    delete next[key];
  }
  return next;
}

export function toPublicGallerySubmission(
  id: string,
  data: Record<string, unknown>,
): Submission | null {
  if (data.public_preview_consent === false) return null;
  const clean = stripPrivateJudgingFields(data);
  return {
    ...(clean as Omit<Submission, "id">),
    id,
    user_id: String(clean.user_id ?? clean.owner_id ?? ""),
    title: typeof clean.title === "string" ? clean.title : null,
    short_description: typeof clean.short_description === "string" ? clean.short_description : null,
    project_url: typeof clean.project_url === "string" ? clean.project_url : null,
    submission_pdf_url: typeof clean.submission_pdf_url === "string" ? clean.submission_pdf_url : null,
    demo_video_url: typeof clean.demo_video_url === "string" ? clean.demo_video_url : null,
    created_at: typeof clean.created_at === "string" ? clean.created_at : null,
    judge_score: null,
    judge_notes: null,
    judge_scores: null,
    judge_notes_by_judge: null,
    judge_criteria_scores: null,
    judge_criteria_scores_by_judge: null,
    public_preview_consent: true,
  };
}
