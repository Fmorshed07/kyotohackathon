import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Mail, Search, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { downloadCsv } from "@/lib/submissionCsv";
import {
  buildNewsletterCsv,
  type NewsletterSubscriber,
} from "@/lib/hackathonSubscribe";

export function AdminNewsletterPanel({
  subscribers,
  isLoading,
}: {
  subscribers: NewsletterSubscriber[];
  isLoading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [revealedEmail, setRevealedEmail] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return subscribers.filter((item) => `${item.email} ${item.source.replace(/-/g, " ")}`.toLowerCase().includes(search));
  }, [query, subscribers]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSubscribers = filtered.slice(currentPage * 8, (currentPage + 1) * 8);
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setRevealedEmail(null);
  };
  const projectStarEmails = subscribers.filter((item) => /project star/i.test(item.source)).length;
  const directSubscribers = subscribers.length - projectStarEmails;
  const last7Days = subscribers.filter((item) => {
    const created = Date.parse(item.createdAt);
    return Number.isFinite(created) && created >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;

  const copyEmails = async () => {
    const emails = subscribers.map((item) => item.email).join("\n");
    try {
      await navigator.clipboard.writeText(emails);
      toast("Copied newsletter emails");
    } catch {
      toast.error("Could not copy emails.");
    }
  };

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="newsletter">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip" aria-hidden>
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Newsletter</p>
            <h2 className="dash-title">Subscribers</h2>
            <p className="dash-subtitle">
              Search subscribers and reveal a contact when you need it.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyEmails()} disabled={subscribers.length === 0}>
            Copy emails
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={subscribers.length === 0}
            onClick={() => downloadCsv("cognisor-newsletter.csv", buildNewsletterCsv(subscribers))}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Download CSV
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total emails", value: subscribers.length, icon: Users },
            { label: "From project stars", value: projectStarEmails, icon: Star },
            { label: "New this week", value: last7Days, icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
        {subscribers.length > 0 ? (
          <div className="relative mb-4 max-w-lg">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search newsletter subscribers"
              placeholder="Search by email or source…"
              className="pl-9"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                changePage(0);
              }}
            />
          </div>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading newsletter emails...</p>
        ) : subscribers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No newsletter emails yet.</p>
        ) : filtered.length === 0 ? (
          <p className="dash-empty">No subscribers match your search.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSubscribers.map((item, index) => (
                  <TableRow key={item.email}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all">
                          {revealedEmail === item.email ? item.email : `${item.email.charAt(0)}•••@•••`}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
                          aria-label={`${revealedEmail === item.email ? "Hide" : "Reveal"} email for subscriber ${currentPage * 8 + index + 1}`}
                          aria-pressed={revealedEmail === item.email}
                          onClick={() => setRevealedEmail(revealedEmail === item.email ? null : item.email)}
                        >
                          {revealedEmail === item.email ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {revealedEmail === item.email ? "Hide" : "Reveal"}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {item.source.replace(/-/g, " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!isLoading && filtered.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Showing {currentPage * 8 + 1}–{Math.min((currentPage + 1) * 8, filtered.length)} of {filtered.length} subscribers
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" aria-label="Previous subscribers" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">{currentPage + 1} / {pageCount}</span>
              <Button type="button" variant="outline" size="sm" aria-label="Next subscribers" disabled={currentPage + 1 >= pageCount} onClick={() => changePage(currentPage + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          {subscribers.length} email{subscribers.length === 1 ? "" : "s"} · {directSubscribers} newsletter signup{directSubscribers === 1 ? "" : "s"}
        </p>
      </div>
    </section>
  );
}
