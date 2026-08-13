import { Button } from "@/components/ui/button";
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
import { ClipboardList, PlusCircle, Trash2 } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { AdminSubmissionRow, AdminUser, NewSubmissionInput } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";

type AdminSubmissionsPanelProps = {
  selectedHackathon: PortalHackathon;
  participants: AdminUser[];
  submissions: AdminSubmissionRow[];
  isLoading: boolean;
  isCreatingSubmission: boolean;
  deletingSubmissionId: string | null;
  newSubmission: NewSubmissionInput;
  onNewSubmissionChange: (value: NewSubmissionInput) => void;
  onCreateSubmission: (payload: NewSubmissionInput) => Promise<void>;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
};

export function AdminSubmissionsPanel({
  selectedHackathon,
  participants,
  submissions,
  isLoading,
  isCreatingSubmission,
  deletingSubmissionId,
  newSubmission,
  onNewSubmissionChange,
  onCreateSubmission,
  onDeleteSubmission,
}: AdminSubmissionsPanelProps) {
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
            Manage submissions for {selectedHackathon.name}. Judge marks are shown in a separate section.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <p className="dash-eyebrow inline-flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Add submission
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

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading submissions…</p>
        ) : submissions.length === 0 ? (
          <p className="dash-empty">
            No participant submissions yet for {selectedHackathon.name}.
          </p>
        ) : (
          <div className="dash-table-scroll rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                  <TableHead className="dash-table-head w-[180px]">Participant</TableHead>
                  <TableHead className="dash-table-head w-[240px]">Team</TableHead>
                  <TableHead className="dash-table-head w-[220px]">Project</TableHead>
                  <TableHead className="dash-table-head">Links</TableHead>
                  <TableHead className="dash-table-head w-[90px] text-right">Avg</TableHead>
                  <TableHead className="dash-table-head w-[100px] text-right">Judges</TableHead>
                  <TableHead className="dash-table-head w-[110px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
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
                        size="sm"
                        variant="destructive"
                        className="h-8 px-3 text-[0.65rem] uppercase tracking-[0.2em]"
                        disabled={deletingSubmissionId === submission.id}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
