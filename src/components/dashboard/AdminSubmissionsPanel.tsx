import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, ClipboardList, Download, Globe, GlobeLock, MapPin, PlusCircle, Star, Trash2 } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { AdminSubmissionRow, AdminUser, NewSubmissionInput } from "@/components/dashboard/AdminDashboard";
import {
  groupByHackathon,
  PORTAL_HACKATHONS,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import { formatSubmissionDate, formatSubmissionTime } from "@/lib/datetime";
import {
  buildSubmissionsCsv,
  downloadCsv,
  submissionsCsvFilename,
  type SubmissionCsvInput,
} from "@/lib/submissionCsv";

type AdminSubmissionsPanelProps = {
  selectedHackathon: PortalHackathon;
  hackathons?: PortalHackathon[];
  participants: AdminUser[];
  submissions: AdminSubmissionRow[];
  isLoading: boolean;
  isCreatingSubmission: boolean;
  deletingSubmissionId: string | null;
  publishingSubmissionId: string | null;
  shortlistingSubmissionId: string | null;
  newSubmission: NewSubmissionInput;
  onNewSubmissionChange: (value: NewSubmissionInput) => void;
  onCreateSubmission: (payload: NewSubmissionInput) => Promise<void>;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  onSetSubmissionPublic: (submissionId: string, makePublic: boolean) => Promise<void>;
  onSetFinalShortlisted: (submissionId: string, shortlisted: boolean) => Promise<void>;
};

function toCsvInputs(
  groups: Array<{ hackathon: PortalHackathon; items: AdminSubmissionRow[] }>,
): SubmissionCsvInput[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, eventName: group.hackathon.name })),
  );
}

function downloadSubmissionsCsv(
  label: string,
  groups: Array<{ hackathon: PortalHackathon; items: AdminSubmissionRow[] }>,
) {
  downloadCsv(submissionsCsvFilename(label), buildSubmissionsCsv(toCsvInputs(groups)));
}

function DownloadCsvButton({
  label,
  groups,
  className,
}: {
  label: string;
  groups: Array<{ hackathon: PortalHackathon; items: AdminSubmissionRow[] }>;
  className?: string;
}) {
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className ?? "h-9 px-3 text-[0.65rem] uppercase tracking-[0.2em]"}
      disabled={count === 0}
      onClick={() => downloadSubmissionsCsv(label, groups)}
    >
      <Download className="h-3.5 w-3.5" />
      Download CSV
    </Button>
  );
}

function SubmissionTable({
  submissions,
  deletingSubmissionId,
  publishingSubmissionId,
  shortlistingSubmissionId,
  onDeleteSubmission,
  onSetSubmissionPublic,
  onSetFinalShortlisted,
}: {
  submissions: AdminSubmissionRow[];
  deletingSubmissionId: string | null;
  publishingSubmissionId: string | null;
  shortlistingSubmissionId: string | null;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  onSetSubmissionPublic: (submissionId: string, makePublic: boolean) => Promise<void>;
  onSetFinalShortlisted: (submissionId: string, shortlisted: boolean) => Promise<void>;
}) {
  return (
    <div className="dash-table-scroll rounded-xl border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
            <TableHead className="dash-table-head w-[180px]">Participant</TableHead>
            <TableHead className="dash-table-head w-[240px]">Team</TableHead>
            <TableHead className="dash-table-head w-[220px]">Project</TableHead>
            <TableHead className="dash-table-head w-[150px]">Submitted</TableHead>
            <TableHead className="dash-table-head">Links</TableHead>
            <TableHead className="dash-table-head w-[90px] text-right">Avg</TableHead>
            <TableHead className="dash-table-head w-[100px] text-right">Judges</TableHead>
            <TableHead className="dash-table-head w-[145px] text-right">Final list</TableHead>
            <TableHead className="dash-table-head w-[150px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => {
            const isBusy =
              deletingSubmissionId === submission.id ||
              publishingSubmissionId === submission.id ||
              shortlistingSubmissionId === submission.id;
            return (
            <TableRow
              key={submission.id}
              className="border-white/5 transition-colors hover:bg-primary/5"
            >
              <TableCell className="align-top text-sm">{submission.participantEmail}</TableCell>
              <TableCell className="align-top">
                <p className="text-sm font-medium">
                  {submission.teamName?.trim() || "Unnamed team"}
                </p>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">
                  {submission.memberCount}{" "}
                  {submission.memberCount === 1 ? "member" : "members"}
                  {submission.teamLeaderName
                    ? ` · lead ${submission.teamLeaderName}`
                    : ""}
                </p>
                {submission.members.length > 0 ? (
                  <p className="mt-1 line-clamp-2 text-[0.7rem] text-muted-foreground">
                    {submission.members.map((member) => member.name).join(" · ")}
                    {submission.extraMemberNames.length > 0
                      ? ` · ${submission.extraMemberNames.join(" · ")}`
                      : ""}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="align-top">
                <p className="text-sm font-medium">{submission.title || "Untitled Project"}</p>
                <p className="mt-1 line-clamp-3 text-[0.7rem] text-muted-foreground">
                  {submission.shortDescription || "No description provided."}
                </p>
                <Badge
                  variant={submission.isPublic ? "default" : "outline"}
                  className="mt-2 text-[0.6rem] uppercase tracking-[0.12em]"
                >
                  {submission.isPublic ? "Public" : "Private"}
                </Badge>
                {submission.isFinalShortlisted ? (
                  <Badge className="ml-2 mt-2 border-amber-400/30 bg-amber-500/10 text-[0.6rem] uppercase tracking-[0.12em] text-amber-200 hover:bg-amber-500/10">
                    Finalist
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="align-top">
                {formatSubmissionDate(submission.createdAt) ? (
                  <>
                    <p className="text-sm font-medium tabular-nums">
                      {formatSubmissionDate(submission.createdAt)}
                    </p>
                    <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
                      {formatSubmissionTime(submission.createdAt)}
                    </p>
                    {submission.updatedAt &&
                    submission.updatedAt !== submission.createdAt &&
                    formatSubmissionTime(submission.updatedAt) ? (
                      <p className="mt-1 text-[0.65rem] text-muted-foreground">
                        Updated {formatSubmissionTime(submission.updatedAt)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </TableCell>
              <TableCell className="align-top">
                <div className="space-y-1 text-[0.7rem]">
                  {submission.projectUrl ? (
                    <a
                      href={submission.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-primary underline underline-offset-4 hover:no-underline"
                    >
                      Project URL
                    </a>
                  ) : null}
                  {submission.submissionPdfUrl ? (
                    <a
                      href={submission.submissionPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-primary underline underline-offset-4 hover:no-underline"
                    >
                      PDF
                    </a>
                  ) : null}
                  {submission.demoVideoUrl ? (
                    <a
                      href={submission.demoVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-primary underline underline-offset-4 hover:no-underline"
                    >
                      Demo video
                    </a>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="align-top text-right">
                <p className="font-mono text-sm font-bold tabular-nums text-primary">
                  {submission.averageScore != null ? submission.averageScore.toFixed(1) : "—"}
                </p>
              </TableCell>
              <TableCell className="align-top text-right">
                <p className="font-mono text-sm tabular-nums text-foreground">
                  {submission.scoredByCount}/{submission.judgeMarks.length}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">scored</p>
              </TableCell>
              <TableCell className="align-top text-right">
                <Button
                  type="button"
                  size="sm"
                  variant={submission.isFinalShortlisted ? "outline" : "default"}
                  className={
                    submission.isFinalShortlisted
                      ? "h-8 gap-1.5 border-amber-400/30 px-3 text-[0.65rem] uppercase tracking-[0.16em] text-amber-200"
                      : "h-8 gap-1.5 px-3 text-[0.65rem] uppercase tracking-[0.16em]"
                  }
                  disabled={isBusy}
                  aria-pressed={submission.isFinalShortlisted}
                  aria-label={
                    submission.isFinalShortlisted
                      ? `Remove ${submission.teamName || submission.title || "this team"} from final shortlist`
                      : `Add ${submission.teamName || submission.title || "this team"} to final shortlist`
                  }
                  onClick={() =>
                    void onSetFinalShortlisted(submission.id, !submission.isFinalShortlisted)
                  }
                >
                  <Star
                    className={submission.isFinalShortlisted ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5"}
                  />
                  {shortlistingSubmissionId === submission.id
                    ? "Saving…"
                    : submission.isFinalShortlisted
                      ? "Finalist"
                      : "Add finalist"}
                </Button>
              </TableCell>
              <TableCell className="align-top text-right">
                <div className="flex flex-col items-end gap-2">
                  <Button
                    size="sm"
                    variant={submission.isPublic ? "outline" : "default"}
                    className="h-8 px-3 text-[0.65rem] uppercase tracking-[0.2em]"
                    disabled={isBusy}
                    aria-label={
                      submission.isPublic
                        ? `Make ${submission.title || "this project"} private`
                        : `Make ${submission.title || "this project"} public`
                    }
                    onClick={async () => {
                      const makePublic = !submission.isPublic;
                      const confirmed = window.confirm(
                        makePublic
                          ? "Show this project on hackathon boards and the public gallery?"
                          : "Hide this project from boards and the public gallery?",
                      );
                      if (!confirmed) return;
                      await onSetSubmissionPublic(submission.id, makePublic);
                    }}
                  >
                    {submission.isPublic ? (
                      <GlobeLock className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    {publishingSubmissionId === submission.id
                      ? submission.isPublic
                        ? "Hiding..."
                        : "Publishing..."
                      : submission.isPublic
                        ? "Make private"
                        : "Make public"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 text-[0.65rem] uppercase tracking-[0.2em]"
                    disabled={isBusy}
                    onClick={async () => {
                      if (!window.confirm("Remove this submission? This cannot be undone.")) {
                        return;
                      }
                      await onDeleteSubmission(submission.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    {deletingSubmissionId === submission.id ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function AdminSubmissionsPanel({
  selectedHackathon,
  hackathons = PORTAL_HACKATHONS,
  participants,
  submissions,
  isLoading,
  isCreatingSubmission,
  deletingSubmissionId,
  publishingSubmissionId,
  shortlistingSubmissionId,
  newSubmission,
  onNewSubmissionChange,
  onCreateSubmission,
  onDeleteSubmission,
  onSetSubmissionPublic,
  onSetFinalShortlisted,
}: AdminSubmissionsPanelProps) {
  const [eventFilter, setEventFilter] = useState<HackathonId | "all">("all");

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7752/ingest/e37c9ea6-3a22-4110-a9e4-4334f1ef0ae2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'608977'},body:JSON.stringify({sessionId:'608977',runId:'post-fix',hypothesisId:'B',location:'AdminSubmissionsPanel.tsx:mount',message:'make-public props wired',data:{hasHandler:typeof onSetSubmissionPublic==='function',publishingSubmissionId,submissionCount:submissions.length,publicCount:submissions.filter((s)=>s.isPublic).length,missingIsPublic:submissions.filter((s)=>typeof s.isPublic!=='boolean').length},timestamp:Date.now()})}).catch(()=>{});
  }, [onSetSubmissionPublic, publishingSubmissionId, submissions]);
  // #endregion

  const eventGroups = useMemo(
    () =>
      groupByHackathon(submissions, hackathons, {
        selectedId: selectedHackathon.id,
      }),
    [hackathons, selectedHackathon.id, submissions],
  );

  const visibleGroups = useMemo(
    () =>
      eventFilter === "all"
        ? eventGroups
        : eventGroups.filter((group) => group.hackathon.id === eventFilter),
    [eventFilter, eventGroups],
  );

  const showEventFilter = eventGroups.length > 1 || hackathons.length > 1;

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="submission-marks">
      <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
        <span className="dash-icon-chip" aria-hidden>
          <ClipboardList className="h-4 w-4" />
        </span>
        <div>
          <p className="dash-eyebrow">Submissions</p>
          <h2 className="dash-title">Participant projects</h2>
          <p className="dash-subtitle">
            All submissions grouped by event. Hosts and admins can make a project public for boards and the gallery.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <p className="dash-eyebrow inline-flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Add submission · {selectedHackathon.shortName}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Select
              value={newSubmission.participantId}
              onValueChange={(value) =>
                onNewSubmissionChange({ ...newSubmission, participantId: value })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose participant" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newSubmission.title}
              onChange={(event) =>
                onNewSubmissionChange({ ...newSubmission, title: event.target.value })
              }
              placeholder="Project title"
            />
            <Input
              value={newSubmission.projectUrl}
              onChange={(event) =>
                onNewSubmissionChange({ ...newSubmission, projectUrl: event.target.value })
              }
              placeholder="Project URL (optional)"
            />
            <Input
              value={newSubmission.submissionPdfUrl}
              onChange={(event) =>
                onNewSubmissionChange({ ...newSubmission, submissionPdfUrl: event.target.value })
              }
              placeholder="PDF URL (optional)"
            />
            <Input
              value={newSubmission.demoVideoUrl}
              onChange={(event) =>
                onNewSubmissionChange({ ...newSubmission, demoVideoUrl: event.target.value })
              }
              placeholder="Demo video URL (optional)"
            />
            <Input
              value={newSubmission.shortDescription}
              onChange={(event) =>
                onNewSubmissionChange({ ...newSubmission, shortDescription: event.target.value })
              }
              placeholder="Short description (optional)"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              className="h-9 px-4 text-[0.7rem] uppercase tracking-[0.22em]"
              disabled={isCreatingSubmission || !newSubmission.participantId}
              onClick={async () => {
                await onCreateSubmission(newSubmission);
                onNewSubmissionChange({
                  participantId: "",
                  title: "",
                  shortDescription: "",
                  projectUrl: "",
                  submissionPdfUrl: "",
                  demoVideoUrl: "",
                });
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {isCreatingSubmission ? "Adding..." : "Add submission"}
            </Button>
          </div>
        </div>

        {showEventFilter ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {submissions.length} project{submissions.length === 1 ? "" : "s"} across{" "}
              {eventGroups.length} event{eventGroups.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={eventFilter}
                onValueChange={(value) => setEventFilter(value as HackathonId | "all")}
              >
                <SelectTrigger className="h-10 w-full max-w-xs">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {eventGroups.map((group) => (
                    <SelectItem key={group.hackathon.id} value={group.hackathon.id}>
                      {group.hackathon.name} ({group.items.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DownloadCsvButton
                label={
                  eventFilter === "all"
                    ? "all-events"
                    : visibleGroups[0]?.hackathon.name ?? "export"
                }
                groups={visibleGroups}
              />
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading submissions…</p>
        ) : submissions.length === 0 ? (
          <p className="dash-empty">
            No participant submissions yet for {selectedHackathon.name}.
          </p>
        ) : visibleGroups.length === 0 ? (
          <p className="dash-empty">No submissions for this event filter.</p>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <section
                key={group.hackathon.id}
                className="space-y-3"
                aria-labelledby={`submissions-${group.hackathon.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id={`submissions-${group.hackathon.id}`}
                        className="text-base font-semibold text-foreground"
                      >
                        {group.hackathon.name}
                      </h3>
                      <Badge variant="outline" className="text-[0.6rem] uppercase tracking-[0.12em]">
                        {group.hackathon.status}
                      </Badge>
                      {group.hackathon.id === selectedHackathon.id ? (
                        <Badge className="text-[0.6rem] uppercase tracking-[0.12em]">Current</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" aria-hidden />
                        {group.hackathon.eventDate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {group.hackathon.location}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DownloadCsvButton
                      label={group.hackathon.name}
                      groups={[group]}
                      className="h-8 px-3 text-[0.65rem] uppercase tracking-[0.2em]"
                    />
                    <Badge variant="secondary" className="uppercase tracking-[0.12em]">
                      {group.items.length} project{group.items.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
                <SubmissionTable
                  submissions={group.items}
                  deletingSubmissionId={deletingSubmissionId}
                  publishingSubmissionId={publishingSubmissionId}
                  shortlistingSubmissionId={shortlistingSubmissionId}
                  onDeleteSubmission={onDeleteSubmission}
                  onSetSubmissionPublic={onSetSubmissionPublic}
                  onSetFinalShortlisted={onSetFinalShortlisted}
                />
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
