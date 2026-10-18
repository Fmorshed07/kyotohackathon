import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { EventParticipant } from "@/lib/eventParticipants";

type JudgeParticipantRosterProps = {
  eventName: string;
  participants: readonly EventParticipant[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const PAGE_SIZE = 20;
const modeLabels: Record<EventParticipant["attendanceMode"], string> = {
  online: "Online", onsite: "On site", unspecified: "Not specified",
};

function participantName(value: string) {
  const name = value.trim();
  return name && !name.includes("@") ? name : "Participant";
}

export function JudgeParticipantRoster({ eventName, participants, isLoading = false, error = null, onRetry }: JudgeParticipantRosterProps) {
  const prefix = useId();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"all" | EventParticipant["attendanceMode"]>("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return participants.filter((participant) =>
      (mode === "all" || participant.attendanceMode === mode)
      && participantName(participant.displayName).toLocaleLowerCase().includes(needle),
    ).sort((left, right) => participantName(left.displayName).localeCompare(participantName(right.displayName)) || left.id.localeCompare(right.id));
  }, [participants, mode, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return <section id="participants" aria-labelledby={`${prefix}-heading`} className={`${sectionClass} scroll-mt-24`}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="dash-icon-chip" aria-hidden="true"><Users className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="dash-eyebrow">Event roster</p>
          <h2 id={`${prefix}-heading`} className="dash-title">Registered participants</h2>
          <p className="dash-subtitle">Approved registrations for {eventName}. Teams and submitted projects are listed separately.</p>
        </div>
      </div>
      {!isLoading && !error && <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">{participants.length} approved {participants.length === 1 ? "registration" : "registrations"}</p>}
    </div>
    {isLoading ? <p role="status" className="py-4 text-sm text-muted-foreground">Loading registered participants…</p> : error ? <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">{error}</p>
      {onRetry && <Button type="button" variant="outline" onClick={onRetry}>Retry participant roster</Button>}
    </div> : participants.length === 0 ? <p className="dash-empty">No approved registrations are available for this event yet.</p> : <>
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="space-y-1.5"><label htmlFor={`${prefix}-search`} className="text-sm font-medium">Search registered participants</label><Input id={`${prefix}-search`} placeholder="Search by name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
        <div className="space-y-1.5"><label htmlFor={`${prefix}-mode`} className="text-sm font-medium">Attendance</label><select id={`${prefix}-mode`} value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">All attendance modes</option><option value="online">Online</option><option value="onsite">On site</option><option value="unspecified">Not specified</option></select></div>
      </div>
      {filtered.length === 0 ? <p className="dash-empty">No registered participants match these filters.</p> : <>
        <ul aria-label="Registered participant list" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((participant) => <li key={participant.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
            <span className="min-w-0 break-words text-sm font-medium">{participantName(participant.displayName)}</span>
            <Badge variant="outline" className="shrink-0 text-[10px]">{modeLabels[participant.attendanceMode]}</Badge>
          </li>)}
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Showing {start + 1}–{start + visible.length} of {filtered.length} registered participants</p>
          {pageCount > 1 && <nav aria-label="Participant pages" className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous participants"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</Button>
            <span className="text-xs text-muted-foreground">{currentPage} / {pageCount}</span>
            <Button type="button" size="sm" variant="outline" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next participants">Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
          </nav>}
        </div>
      </>}
    </>}
  </section>;
}
