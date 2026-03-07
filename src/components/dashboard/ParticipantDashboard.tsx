import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { Submission } from "@/types/portal";

const ensureAbsoluteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getGoogleDriveFileId = (url: string) => {
  const filePathMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (filePathMatch?.[1]) return filePathMatch[1];

  const openParamMatch = url.match(/[?&]id=([^&]+)/i);
  if (openParamMatch?.[1]) return openParamMatch[1];

  return null;
};

const toPdfPreviewUrl = (url: string) => {
  const normalized = ensureAbsoluteUrl(url);
  if (!normalized) return "";

  const driveFileId = getGoogleDriveFileId(normalized);
  if (driveFileId) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }

  if (/dropbox\.com/i.test(normalized)) {
    return normalized.replace(/[?&]dl=\d/i, "").replace(/\?$/, "") +
      (normalized.includes("?") ? "&raw=1" : "?raw=1");
  }

  return normalized;
};

export type ParticipantDashboardProps = {
  participantForm: {
    title: string;
    shortDescription: string;
    projectUrl: string;
    submissionPdfUrl: string;
    demoVideoUrl: string;
    teamName: string;
    memberNames: string;
  };
  setParticipantForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      shortDescription: string;
      projectUrl: string;
      submissionPdfUrl: string;
      demoVideoUrl: string;
      teamName: string;
      memberNames: string;
    }>
  >;
  participantSubmissions: Submission[];
  activeSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
  participantSubmission: Submission | null;
  submissionMessage: string | null;
  isSubmittingProject: boolean;
  onSave: () => Promise<void>;
};

export function ParticipantDashboard({
  participantForm,
  setParticipantForm,
  participantSubmissions,
  activeSubmissionId,
  onSelectSubmission,
  submissionMessage,
  isSubmittingProject,
  onSave,
}: ParticipantDashboardProps) {
  const normalizedPdfUrl = ensureAbsoluteUrl(participantForm.submissionPdfUrl);
  const pdfPreviewUrl = toPdfPreviewUrl(participantForm.submissionPdfUrl);

  return (
    <div className="space-y-8" id="overview">
      <section className={`${sectionClass} p-4 sm:p-6`} aria-label="Participant overview">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xs uppercase tracking-[0.16em] text-foreground sm:text-sm sm:tracking-[0.28em]">
              Submission overview
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep your project details up to date before judging starts.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:gap-4">
            <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {participantForm.title.trim() ? "1" : "0"}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Project title</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {participantForm.projectUrl.trim() ? "1" : "0"}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Project link</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {participantForm.submissionPdfUrl.trim() && participantForm.demoVideoUrl.trim() ? "100%" : "50%"}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Media ready</p>
            </div>
          </div>
        </div>
        {participantSubmissions.length > 1 && activeSubmissionId ? (
          <div className="mt-5 border-t border-border/40 pt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Edit your submission
            </p>
            <Select value={activeSubmissionId} onValueChange={onSelectSubmission}>
              <SelectTrigger className="max-w-lg">
                <SelectValue placeholder="Select submission" />
              </SelectTrigger>
              <SelectContent>
                {participantSubmissions.map((submission) => (
                  <SelectItem key={submission.id} value={submission.id}>
                    {submission.title?.trim() || `Untitled submission (${submission.id.slice(0, 8)})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </section>

      {/* Overview / Project details */}
      <section
        className={`${sectionClass} p-4 sm:p-6`}
        id="my-project"
        aria-labelledby="project-details-heading"
      >
        <div className="mb-6 border-b border-border/40 pb-4">
          <h2
            id="project-details-heading"
            className="font-display text-xs uppercase tracking-[0.16em] text-foreground sm:text-sm sm:tracking-[0.28em]"
          >
            Project details
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Title, link, and short description.
          </p>
        </div>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Project Title
              </label>
              <Input
                value={participantForm.title}
                onChange={(e) =>
                  setParticipantForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Your project name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Project URL
              </label>
              <Input
                value={participantForm.projectUrl}
                onChange={(e) =>
                  setParticipantForm((prev) => ({ ...prev, projectUrl: e.target.value }))
                }
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Short Description
            </label>
              <Textarea
              value={participantForm.shortDescription}
              onChange={(e) =>
                setParticipantForm((prev) => ({ ...prev, shortDescription: e.target.value }))
              }
              placeholder="Describe your project in a few sentences."
              rows={4}
            />
          </div>
        </div>
      </section>

      {/* Team details */}
      <section
        className={`${sectionClass} p-4 sm:p-6`}
        aria-labelledby="team-details-heading"
      >
        <div className="mb-6 border-b border-border/40 pb-4">
          <h2
            id="team-details-heading"
            className="font-display text-xs uppercase tracking-[0.16em] text-foreground sm:text-sm sm:tracking-[0.28em]"
          >
            Team details
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your team name and all member names.
          </p>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Team Name
            </label>
            <Input
              value={participantForm.teamName}
              onChange={(e) =>
                setParticipantForm((prev) => ({ ...prev, teamName: e.target.value }))
              }
              placeholder="Your team name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Member Names
            </label>
            <Textarea
              value={participantForm.memberNames}
              onChange={(e) =>
                setParticipantForm((prev) => ({ ...prev, memberNames: e.target.value }))
              }
              placeholder="List all members, one per line."
              rows={4}
            />
          </div>
        </div>
      </section>

      {/* Links & media */}
      <section
        className={`${sectionClass} p-4 sm:p-6`}
        aria-labelledby="links-media-heading"
      >
        <div className="mb-6 border-b border-border/40 pb-4">
          <h2
            id="links-media-heading"
            className="font-display text-xs uppercase tracking-[0.16em] text-foreground sm:text-sm sm:tracking-[0.28em]"
          >
            Links & media
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF and demo video URLs; previews appear below.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Submission PDF URL
            </label>
              <Input
              value={participantForm.submissionPdfUrl}
              onChange={(e) =>
                setParticipantForm((prev) => ({ ...prev, submissionPdfUrl: e.target.value }))
              }
              placeholder="Link to your PDF (Drive, Notion, etc.)"
            />
            {participantForm.submissionPdfUrl && (
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <p className="mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  PDF Preview
                </p>
                <div className="aspect-[4/3] max-h-48 overflow-hidden rounded-md border border-border/40 bg-background/60">
                  <iframe
                    title="Submission PDF preview"
                    src={pdfPreviewUrl}
                    className="h-full w-full"
                  />
                </div>
                {normalizedPdfUrl && (
                  <a
                    href={normalizedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-[0.7rem] text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Open PDF in new tab
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Demo Video URL
            </label>
              <Input
              value={participantForm.demoVideoUrl}
              onChange={(e) =>
                setParticipantForm((prev) => ({ ...prev, demoVideoUrl: e.target.value }))
              }
              placeholder="https://youtu.be/..."
            />
            {participantForm.demoVideoUrl && (
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <p className="mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Video Preview
                </p>
                <div className="aspect-video max-h-48 overflow-hidden rounded-md border border-border/40 bg-background/60">
                  <iframe
                    title="Demo video preview"
                    src={participantForm.demoVideoUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Save submission */}
      <section className={`${sectionClass} p-4 sm:p-6`} aria-labelledby="submit-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="submit-heading"
              className="font-display text-xs uppercase tracking-[0.16em] text-foreground sm:text-sm sm:tracking-[0.28em]"
            >
              Save submission
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You can update until organisers lock changes. Ensure all links are accessible.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {submissionMessage && (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                {submissionMessage}
              </p>
            )}
            <Button
              onClick={onSave}
              disabled={isSubmittingProject}
              className="w-full uppercase tracking-[0.12em] sm:w-auto sm:tracking-[0.24em]"
            >
              {isSubmittingProject ? "Saving..." : "Save Submission"}
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
