import { ELEVENLABS_SUBMISSIONS } from "@/data/elevenLabsSubmissions";
import { ELEVENLABS_MEETUP_ID } from "@/lib/elevenLabsMeetup";
import { getProjectFeedVideo } from "@/lib/projectFeedMedia";
import type { Submission } from "@/types/portal";

/** Display-only projects have no portal account or persisted social activity. */
export type PublicShowcaseSubmission = Submission & {
  showcase?: {
    source: "elevenlabs";
    previewStatus?: "unavailable";
    previewNote?: string;
    additionalLinks: { label: string; url: string; note?: string }[];
    toolsUsed: string;
  };
};

export const ELEVENLABS_GALLERY_SUBMISSIONS: PublicShowcaseSubmission[] = ELEVENLABS_SUBMISSIONS.map((project) => {
  const video = getProjectFeedVideo(project.videoUrl);
  // This entry credits AI tools as teammates; retain the credits without counting them as people.
  const toolCredits = project.id === "elevenlabs-tokyo-8" ? project.additionalTeamMembers : [];
  const members = [
    ...project.participantName.split(/\s+[+&]\s+/),
    ...(toolCredits.length ? [] : project.additionalTeamMembers),
  ];
  return {
    id: project.id,
    user_id: "",
    hackathon_id: ELEVENLABS_MEETUP_ID,
    title: project.title,
    team_name: project.participantName,
    member_name_list: members,
    short_description: project.description,
    demo_video_url: video ? project.videoUrl : null,
    project_url: video ? null : project.videoUrl,
    submission_pdf_url: null,
    public_preview_consent: true,
    // The curated source has no publication timestamp. Do not invent one from the event date.
    created_at: null,
    judge_score: null,
    judge_notes: null,
    showcase: {
      source: "elevenlabs",
      previewStatus: project.previewStatus,
      previewNote: project.previewNote,
      additionalLinks: project.additionalLinks.map((link) => ({ ...link })),
      toolsUsed: [project.toolsUsed, ...(toolCredits.length ? [`Additional credits: ${toolCredits.join(", ")}`] : [])].join(" · "),
    },
  };
});

/** Prefer a real published record if an imported project is later registered in the portal. */
export function mergePublicShowcaseProjects(remote: Submission[], hiddenIds: readonly string[] = []): PublicShowcaseSubmission[] {
  const projects = new Map(ELEVENLABS_GALLERY_SUBMISSIONS.map((project) => [project.id, project]));
  for (const project of remote) projects.set(project.id, project);
  // An explicit opt-out in the catalog also removes its bundled fallback.
  for (const id of hiddenIds) projects.delete(id);
  return [...projects.values()];
}
