import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  MapPin,
  Rocket,
  UserRound,
  Users,
  Crown,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { FollowCommunityPanel } from "@/components/dashboard/FollowCommunityPanel";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import { GalleryUploadField, ImageUploadField } from "@/components/dashboard/ImageUploadField";
import { getPeopleProfileCompleteness } from "@/components/dashboard/PeopleProfileSection";
import { SubmissionSearchInput } from "@/components/dashboard/SubmissionSearchInput";
import { submissionMatchesSearch } from "@/lib/submissionSearch";
import { buildTeamRoster } from "@/lib/teamRoster";
import { formatSubmissionDateTime } from "@/lib/datetime";
import {
  getEventBoardPath,
  getHackathonSubmissionMode,
  getSubmissionLockCopy,
  type HackathonId,
  type ParticipantHackathonSummary,
  type PortalHackathon,
} from "@/lib/hackathons";
import type { Submission, TeamMemberRecord, UserProfile } from "@/types/portal";

const statusLabel: Record<PortalHackathon["status"], string> = {
  active: "Active",
  upcoming: "Upcoming",
  past: "Past",
};

const statusVariant: Record<
  PortalHackathon["status"],
  "default" | "secondary" | "outline"
> = {
  active: "default",
  upcoming: "secondary",
  past: "outline",
};

const ensureAbsoluteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YOU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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

export type ParticipantFormState = {
  title: string;
  shortDescription: string;
  projectUrl: string;
  submissionPdfUrl: string;
  demoVideoUrl: string;
  allowPublicPreview: boolean;
  /** Project cover shown on boards / public gallery */
  projectCoverUrl: string;
  /** Extra project screenshots for boards / public gallery */
  projectGalleryUrls: string[];
  teamName: string;
  memberNames: string;
  fullName: string;
  avatarUrl: string;
  /** Wide profile banner above the people profile card */
  coverUrl: string;
  /** Extra photos for the participant / guest profile gallery */
  galleryUrls: string[];
  headline: string;
  bio: string;
  publicRole: string;
  experienceLevel: string;
  organization: string;
  location: string;
  timezone: string;
  languages: string;
  lookingFor: string;
  githubUsername: string;
  githubProfileUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  xUrl: string;
  discordHandle: string;
  skills: string;
  interests: string;
};

export type ParticipantDashboardProps = {
  selectedHackathon: PortalHackathon;
  hackathonSummaries: ParticipantHackathonSummary[];
  /** Open events the participant can still join (excludes past + already enrolled). */
  joinableHackathons?: PortalHackathon[];
  publicSiteUrl?: string;
  isLoadingWorkspace?: boolean;
  isReadOnly?: boolean;
  isJoiningHackathon?: boolean;
  onSelectHackathon: (hackathonId: HackathonId) => void;
  onJoinHackathon?: (hackathonId: HackathonId) => Promise<void>;
  participantForm: ParticipantFormState;
  setParticipantForm: React.Dispatch<React.SetStateAction<ParticipantFormState>>;
  participantSubmissions: Submission[];
  activeSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
  participantSubmission: Submission | null;
  submissionMessage: string | null;
  autosaveStatus?: string | null;
  isSubmittingProject: boolean;
  onUploadProjectImage?: (file: File, kind: "cover" | "gallery") => Promise<string>;
  onSave: () => Promise<void>;
  currentUserId?: string;
  currentUserEmail?: string;
  linkedTeamMembers?: TeamMemberRecord[];
  teamOwner?: { user_id: string; name: string; email: string; profile?: UserProfile | null } | null;
  teamLeaderId?: string | null;
  memberProfiles?: Record<string, UserProfile | null | undefined>;
};

export function ParticipantDashboard({
  selectedHackathon,
  hackathonSummaries,
  joinableHackathons = [],
  publicSiteUrl,
  isLoadingWorkspace = false,
  isReadOnly = false,
  isJoiningHackathon = false,
  onSelectHackathon,
  onJoinHackathon,
  participantForm,
  setParticipantForm,
  participantSubmissions,
  activeSubmissionId,
  onSelectSubmission,
  submissionMessage,
  autosaveStatus = null,
  isSubmittingProject,
  onUploadProjectImage,
  onSave,
  currentUserId = "",
  currentUserEmail = "",
  linkedTeamMembers = [],
  teamOwner = null,
  teamLeaderId = null,
  memberProfiles = {},
}: ParticipantDashboardProps) {
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const submissionMode = getHackathonSubmissionMode(selectedHackathon);
  const lockCopy = isReadOnly ? getSubmissionLockCopy(submissionMode) : null;
  const normalizedPdfUrl = ensureAbsoluteUrl(participantForm.submissionPdfUrl);
  const pdfPreviewUrl = toPdfPreviewUrl(participantForm.submissionPdfUrl);
  const profileCompleteness = getPeopleProfileCompleteness(participantForm);
  const displayName = participantForm.fullName.trim() || "Your name";
  const displayRole =
    participantForm.headline.trim() ||
    participantForm.publicRole.trim() ||
    "Add a short headline";
  const filteredParticipantSubmissions = useMemo(() => {
    if (!submissionSearchQuery.trim()) return participantSubmissions;
    return participantSubmissions.filter((submission) =>
      submissionMatchesSearch(submissionSearchQuery, submission)
    );
  }, [participantSubmissions, submissionSearchQuery]);
  const activeSubmission =
    participantSubmissions.find((submission) => submission.id === activeSubmissionId) ??
    participantSubmissions[0] ??
    null;
  const submittedAtLabel = formatSubmissionDateTime(activeSubmission?.created_at);
  const lastSavedAtLabel = formatSubmissionDateTime(activeSubmission?.updated_at);
  const teamRoster = useMemo(
    () =>
      buildTeamRoster({
        owner: teamOwner ?? {
          user_id: currentUserId,
          name: participantForm.fullName || currentUserEmail.split("@")[0] || "You",
          email: currentUserEmail,
        },
        linkedMembers: linkedTeamMembers,
        teamLeaderId,
        currentUserId,
        profiles: memberProfiles,
      }),
    [
      currentUserEmail,
      currentUserId,
      linkedTeamMembers,
      memberProfiles,
      participantForm.fullName,
      teamLeaderId,
      teamOwner,
    ]
  );
  const teamLeader = teamRoster.find((entry) => entry.isLeader) ?? teamRoster[0];

  return (
    <div className="space-y-8" id="overview">
      <HackathonContextBanner
        hackathon={selectedHackathon}
        role="participant"
        publicSiteUrl={publicSiteUrl}
      />

      <section
        className={`${sectionClass}`}
        id="my-hackathons"
        aria-labelledby="my-hackathons-heading"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip" aria-hidden>
              <LayoutGrid className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Your events</p>
              <h2 id="my-hackathons-heading" className="dash-title">
                My hackathons
              </h2>
              <p className="dash-subtitle">
                Switch between events you joined and open each hackathon board.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={getEventBoardPath(selectedHackathon.id)}>
              Open board
              <ExternalLink className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoadingWorkspace ? (
          <p className="text-sm text-muted-foreground">Loading your hackathons...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hackathonSummaries.map((summary) => {
              const isSelected = summary.hackathon.id === selectedHackathon.id;
              return (
                <div
                  key={summary.hackathon.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? "border-primary/40 bg-primary/10"
                      : "border-white/10 bg-background/40 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {summary.hackathon.name}
                    </h3>
                    <Badge
                      variant={statusVariant[summary.hackathon.status]}
                      className="text-[0.6rem] uppercase"
                    >
                      {statusLabel[summary.hackathon.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{summary.hackathon.theme}</p>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {summary.hackathon.eventDate}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {summary.hackathon.location}
                    </p>
                    <p>
                      {summary.submissionCount > 0
                        ? `${summary.submissionCount} submission${summary.submissionCount === 1 ? "" : "s"}`
                        : "Registered · no submission yet"}
                      {summary.latestTitle ? ` · ${summary.latestTitle}` : ""}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => onSelectHackathon(summary.hackathon.id)}
                    >
                      {isSelected ? "Working here" : "Open workspace"}
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={getEventBoardPath(summary.hackathon.id)}>
                        Event board
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {joinableHackathons.length > 0 && onJoinHackathon ? (
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="dash-eyebrow mb-2">Join another open event</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Past editions stay hidden. Pick an active or upcoming hackathon to enroll.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {joinableHackathons.map((hackathon) => (
                <div
                  key={hackathon.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-background/30 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-semibold text-foreground">
                        {hackathon.shortName}
                      </p>
                      <Badge
                        variant={statusVariant[hackathon.status]}
                        className="text-[0.6rem] uppercase"
                      >
                        {statusLabel[hackathon.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {hackathon.location} · {hackathon.eventDate}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isJoiningHackathon}
                    onClick={() => void onJoinHackathon(hackathon.id)}
                  >
                    {isJoiningHackathon ? "Joining…" : "Join"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${sectionClass}`} aria-label="Participant overview">
        <div className="dash-stack-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip" aria-hidden>
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">{selectedHackathon.shortName} overview</p>
              <h2 className="dash-title">Submission overview</h2>
              <p className="dash-subtitle">
                {lockCopy ?? "Keep your project details up to date before judging starts."}
              </p>
              {submittedAtLabel ? (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  Submitted {submittedAtLabel}
                  {lastSavedAtLabel && lastSavedAtLabel !== submittedAtLabel
                    ? ` · Last saved ${lastSavedAtLabel}`
                    : ""}
                </p>
              ) : null}
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
                {profileCompleteness}%
              </p>
              <p className="dash-stat-label">Profile ready</p>
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
                      {formatSubmissionDateTime(submission.created_at)
                        ? ` · ${formatSubmissionDateTime(submission.created_at)}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
      </section>

      <section
        className={`${sectionClass}`}
        id="my-profile"
        aria-labelledby="profile-details-heading"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip" aria-hidden>
              <UserRound className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Creator profile</p>
              <h2 id="profile-details-heading" className="dash-title">
                People profile
              </h2>
              <p className="dash-subtitle">
                Photo, bio, and links live on your dedicated profile page.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/dashboard/participant/profile">Edit profile</Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background/40 to-background/10">
          <div className="relative h-28 w-full bg-gradient-to-r from-primary/25 via-background/40 to-community/20 sm:h-32">
            {participantForm.coverUrl ? (
              <img
                src={participantForm.coverUrl}
                alt={`${displayName} cover banner`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-16 w-16 rounded-2xl border border-white/15">
                {participantForm.avatarUrl ? (
                  <AvatarImage
                    src={participantForm.avatarUrl}
                    alt={`${displayName} profile photo`}
                    className="rounded-2xl object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-background/70 text-sm font-semibold tracking-[0.12em] text-primary">
                  {getInitials(participantForm.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{displayRole}</p>
              </div>
            </div>
            <div className="w-full shrink-0 sm:max-w-[180px]">
              <p className="dash-eyebrow">Profile ready</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {profileCompleteness}%
              </p>
              <div className="mt-2">
                <div className="dash-progress-track">
                  <div className="dash-progress-fill" style={{ width: `${profileCompleteness}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
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
            <p className="dash-subtitle">Title, team name, link, and short description.</p>
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
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">
                Team name
              </label>
              <Input
                value={participantForm.teamName}
                onChange={(e) =>
                  setParticipantForm((prev) => ({ ...prev, teamName: e.target.value }))
                }
                placeholder="Your name, or a team name"
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Solo builders can name themselves too. This shows on the board and gallery.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="dash-field-label">
                Project URL
              </label>
              <Input
                value={participantForm.projectUrl}
                onChange={(e) =>
                  setParticipantForm((prev) => ({ ...prev, projectUrl: e.target.value }))
                }
                placeholder="https://github.com/..."
                disabled={isReadOnly}
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
              disabled={isReadOnly}
            />
          </div>
        </div>
      </section>

      {/* Team summary */}
      <section
        className={`${sectionClass}`}
        id="my-team"
        aria-labelledby="team-details-heading"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Team</p>
              <h2 id="team-details-heading" className="dash-title">
                My team
              </h2>
              <p className="dash-subtitle">
                Solo is fine. Name yourself here or on the team page, then invite others if you
                want.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/dashboard/participant/team">Manage team</Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background/40 to-background/10 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="dash-eyebrow">Team name</p>
              <p className="mt-1 truncate font-display text-lg font-semibold text-foreground">
                {participantForm.teamName.trim() || "Name your team (solo is fine)"}
              </p>
              <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-200" />
                  Leader: {teamLeader?.name?.trim() || displayName}
                </span>
                {teamRoster.length <= 1 ? (
                  <Badge variant="secondary">Solo</Badge>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex -space-x-2">
                {teamRoster.slice(0, 5).map((entry) => (
                  <Avatar
                    key={entry.user_id}
                    className="h-10 w-10 rounded-full border-2 border-background"
                  >
                    {entry.profile?.avatarUrl?.trim() ? (
                      <AvatarImage
                        src={entry.profile.avatarUrl.trim()}
                        alt={entry.name}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">
                      {getInitials(entry.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {teamRoster.length}
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {teamRoster.length === 1 ? "member" : "members"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/dashboard/participant/team">
                Open team workspace
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/participant/team#find-teammates">Find teammates</Link>
            </Button>
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
            <p className="dash-eyebrow">Step 2</p>
            <h2 id="links-media-heading" className="dash-title">
              Links & media
            </h2>
            <p className="dash-subtitle">
              Project cover, gallery shots, PDF, and demo video for boards and the public gallery.
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-5 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
          <div>
            <p className="dash-eyebrow">Project visuals</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a cover and screenshots. These appear on hackathon boards when you opt in below.
            </p>
          </div>
          {onUploadProjectImage ? (
            <>
              <ImageUploadField
                label="Project cover"
                value={participantForm.projectCoverUrl}
                onChange={(projectCoverUrl) =>
                  setParticipantForm((prev) => ({ ...prev, projectCoverUrl }))
                }
                onUpload={(file) => onUploadProjectImage(file, "cover")}
                hint="Recommended 1600×900 · used on boards and gallery cards"
                disabled={isReadOnly || isSubmittingProject}
              />
              <GalleryUploadField
                label="Project gallery"
                value={participantForm.projectGalleryUrls}
                onChange={(projectGalleryUrls) =>
                  setParticipantForm((prev) => ({ ...prev, projectGalleryUrls }))
                }
                onUpload={(file) => onUploadProjectImage(file, "gallery")}
                hint="Screenshots, demos, or team photos · up to 12"
                disabled={isReadOnly || isSubmittingProject}
                maxItems={12}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in again to upload project images.</p>
          )}
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
        <label className="mt-6 flex cursor-pointer gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:border-primary/45">
          <input
            type="checkbox"
            checked={participantForm.allowPublicPreview}
            onChange={(event) => setParticipantForm((prev) => ({ ...prev, allowPublicPreview: event.target.checked }))}
            className="mt-0.5 h-4 w-4 accent-primary"
            disabled={isReadOnly}
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">Show this project on hackathon boards and the public Projects & demos gallery</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Only opt-in projects are visible on boards and the public gallery. You can remove permission at any time by saving this form again.</span>
          </span>
        </label>
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
                {lockCopy ?? "You can update until organisers pause or close submissions. Ensure all links are accessible."}
              </p>
              {submittedAtLabel ? (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  Submitted {submittedAtLabel}
                  {lastSavedAtLabel && lastSavedAtLabel !== submittedAtLabel
                    ? ` · Last saved ${lastSavedAtLabel}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {submissionMessage && (
              <p className="dash-message">
                {submissionMessage}
              </p>
            )}
            {!submissionMessage && autosaveStatus && (
              <p className="text-xs text-muted-foreground">{autosaveStatus}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="lg">
                <Link to={getEventBoardPath(selectedHackathon.id)}>
                  Open {selectedHackathon.shortName} board
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                onClick={onSave}
                disabled={isSubmittingProject || isReadOnly}
                size="lg"
                className="w-full uppercase tracking-[0.12em] sm:w-auto sm:tracking-[0.18em]"
              >
                <Rocket className="h-4 w-4" />
                {isSubmittingProject ? "Saving..." : isReadOnly ? "Locked" : "Save Submission"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {(submissionMessage?.toLowerCase().includes("success") || Boolean(activeSubmissionId)) && (
        <div className={sectionClass}>
          <FollowCommunityPanel highlight={submissionMessage?.toLowerCase().includes("success")} />
        </div>
      )}

    </div>
  );
}
