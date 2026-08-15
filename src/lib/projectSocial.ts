import { deleteDoc, doc, setDoc, type Firestore } from "firebase/firestore";
import type { Submission } from "@/types/portal";

const PRIVATE_JUDGING_KEYS = [
  "judge_score",
  "judge_notes",
  "judge_scores",
  "judge_notes_by_judge",
  "judge_criteria_scores",
  "judge_criteria_scores_by_judge",
  "final_shortlisted",
  "final_shortlisted_at",
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

/** Opens YouTube demos as normal watch pages, never as no-cookie embed pages. */
export function youtubeWatchUrl(url: string | null | undefined) {
  const normalized = normalizeHttpUrl(url);
  const videoId = youtubeVideoId(normalized);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : normalized;
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

export function buildProjectShareText(input: {
  title: string;
  teamName?: string | null;
  description?: string | null;
}) {
  const title = input.title.trim() || "this hackathon project";
  const team = input.teamName?.trim();
  const description = input.description?.replace(/\s+/g, " ").trim().slice(0, 160);
  const headline = team ? `Check out ${title} by ${team}` : `Check out ${title}`;
  return description
    ? `${headline}\n\n${description}\n\nExplore it on Global Impact Hackathons.`
    : `${headline} on Global Impact Hackathons.`;
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
      href: `https://www.linkedin.com/feed/?shareActive=true&shareUrl=${url}`,
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

export type PublicProjectWriteSource = Pick<
  Submission,
  | "user_id"
  | "hackathon_id"
  | "title"
  | "short_description"
  | "project_url"
  | "submission_pdf_url"
  | "demo_video_url"
  | "cover_url"
  | "gallery_urls"
  | "team_name"
  | "member_names"
  | "member_name_list"
  | "team_members"
  | "member_user_ids"
  | "team_leader_id"
  | "owner_name"
  | "owner_email"
  | "created_at"
  | "updated_at"
>;

/** Gallery/board copy. Never includes judge scores or notes. */
export function buildPublicProjectWritePayload(
  submission: PublicProjectWriteSource,
  updatedAt: string,
): Record<string, unknown> {
  const ownerId = submission.user_id;
  return {
    owner_id: ownerId,
    user_id: ownerId,
    hackathon_id: submission.hackathon_id ?? null,
    title: submission.title,
    short_description: submission.short_description,
    project_url: submission.project_url,
    submission_pdf_url: submission.submission_pdf_url,
    demo_video_url: submission.demo_video_url,
    cover_url: submission.cover_url ?? null,
    gallery_urls: submission.gallery_urls ?? [],
    team_name: submission.team_name ?? null,
    member_names: submission.member_names ?? null,
    member_name_list: submission.member_name_list ?? [],
    team_members: submission.team_members ?? [],
    member_user_ids: submission.member_user_ids ?? [],
    team_leader_id: submission.team_leader_id ?? ownerId,
    owner_name: submission.owner_name ?? null,
    owner_email: submission.owner_email ?? null,
    created_at: submission.created_at,
    updated_at: updatedAt,
    public_preview_consent: true,
  };
}

export async function setSubmissionPublicPreview(
  db: Firestore,
  submission: Submission,
  makePublic: boolean,
  updatedAt = new Date().toISOString(),
) {
  const submissionRef = doc(db, "submissions", submission.id);
  const publicRef = doc(db, "public_projects", submission.id);

  if (makePublic) {
    await setDoc(
      submissionRef,
      { public_preview_consent: true, updated_at: updatedAt },
      { merge: true },
    );
    await setDoc(publicRef, buildPublicProjectWritePayload(submission, updatedAt), { merge: true });
  } else {
    await setDoc(
      submissionRef,
      { public_preview_consent: false, updated_at: updatedAt },
      { merge: true },
    );
    await deleteDoc(publicRef).catch(() => undefined);
  }

  return updatedAt;
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
