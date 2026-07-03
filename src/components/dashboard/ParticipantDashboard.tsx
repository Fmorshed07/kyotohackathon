import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, LayoutDashboard, Link2, Rocket, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { SubmissionSearchInput } from "@/components/dashboard/SubmissionSearchInput";
import { submissionMatchesSearch } from "@/lib/submissionSearch";
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
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const normalizedPdfUrl = ensureAbsoluteUrl(participantForm.submissionPdfUrl);
  const pdfPreviewUrl = toPdfPreviewUrl(participantForm.submissionPdfUrl);
  const filteredParticipantSubmissions = useMemo(() => {
    if (!submissionSearchQuery.trim()) return participantSubmissions;
    return participantSubmissions.filter((submission) =>
      submissionMatchesSearch(submissionSearchQuery, submission)
    );
  }, [participantSubmissions, submissionSearchQuery]);

  return (
    <div className="space-y-8" id="overview">
      <section className={`${sectionClass}`} aria-label="Participant overview">
        <div className="dash-stack-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip" aria-hidden>
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Overview</p>
              <h2 className="dash-title">Submission overview</h2>
              <p className="dash-subtitle">
                Keep your project details up to date before judging starts.
              </p>
            </div>
          </div>
          <div className="dash-stat-grid grid w-full gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:gap-4">
            <div className="dash-stat-tile dash-stat-tile--highlight">
              <p className="dash-stat-value">
                {participantForm.title.trim() ? "1" : "0"}
              </p>
              <p className="dash-stat-label">Project title</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">
                {participantForm.projectUrl.trim() ? "1" : "0"}
              </p>
              <p className="dash-stat-label">Project link</p>
            </div>
            <div className="dash-stat-tile sm:col-span-1 col-span-2">
              <p className="dash-stat-value">
                {participantForm.submissionPdfUrl.trim() && participantForm.demoVideoUrl.trim() ? "100%" : "50%"}
              </p>
              <p className="dash-stat-label">Media ready</p>
            </div>
          </div>
        </div>
        {participantSubmissions.length > 1 && activeSubmissionId ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="dash-eyebrow mb-2">
              Edit your submission
            </p>
            <SubmissionSearchInput
              value={submissionSearchQuery}
              onChange={setSubmissionSearchQuery}
              placeholder="Search your submissions..."
              className="mb-3 max-w-lg"
            />
            {filteredParticipantSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions match your search.</p>
            ) : (
              <Select value={activeSubmissionId} onValueChange={onSelectSubmission}>
                <SelectTrigger className="max-w-lg">
                  <SelectValue placeholder="Select submission" />
                </SelectTrigger>
                <SelectContent>
                  {filteredParticipantSubmissions.map((submission) => (
                    <SelectItem key={submission.id} value={submission.id}>
                      {submission.title?.trim() || `Untitled submission (${submission.id.slice(0, 8)})`}
                      {submission.team_name?.trim() ? ` — ${submission.team_name.trim()}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
      </section>

      {/* Overview / Project details */}
      <section
        className={`${sectionClass}`}
        id="my-project"
        aria-labelledby="project-details-heading"
      >
        <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip" aria-hidden>
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Step 1</p>
            <h2 id="project-details-heading" className="dash-title">
              Project details
            </h2>
            <p className="dash-subtitle">Title, link, and short description.</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="dash-field-label">
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
              <label className="dash-field-label">
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
            <label className="dash-field-label">
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
        className={`${sectionClass}`}
        aria-labelledby="team-details-heading"
      >
        <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Step 2</p>
            <h2 id="team-details-heading" className="dash-title">
              Team details
            </h2>
            <p className="dash-subtitle">Add your team name and all member names.</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="dash-field-label">
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
            <label className="dash-field-label">
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
        className={`${sectionClass}`}
        aria-labelledby="links-media-heading"
      >
        <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
            <Link2 className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Step 3</p>
            <h2 id="links-media-heading" className="dash-title">
              Links & media
            </h2>
            <p className="dash-subtitle">PDF and demo video URLs; previews appear below.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="dash-field-label">
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
              <div className="mt-3 rounded-xl border border-white/10 bg-muted/25 p-3">
                <p className="dash-eyebrow mb-2">
                  PDF Preview
                </p>
                <div className="aspect-[4/3] max-h-48 overflow-hidden rounded-lg border border-white/10 bg-background/60">
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
            <label className="dash-field-label">
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
              <div className="mt-3 rounded-xl border border-white/10 bg-muted/25 p-3">
                <p className="dash-eyebrow mb-2">
                  Video Preview
                </p>
                <div className="aspect-video max-h-48 overflow-hidden rounded-lg border border-white/10 bg-background/60">
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
      <section className={`${sectionClass}`} aria-labelledby="submit-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="dash-icon-chip" aria-hidden>
              <Rocket className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Final step</p>
              <h2 id="submit-heading" className="dash-title">
                Save submission
              </h2>
              <p className="dash-subtitle">
                You can update until organisers lock changes. Ensure all links are accessible.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {submissionMessage && (
              <p className="dash-message">
                {submissionMessage}
              </p>
            )}
            <Button
              onClick={onSave}
              disabled={isSubmittingProject}
              size="lg"
              className="w-full uppercase tracking-[0.12em] sm:w-auto sm:tracking-[0.18em]"
            >
              <Rocket className="h-4 w-4" />
              {isSubmittingProject ? "Saving..." : "Save Submission"}
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
