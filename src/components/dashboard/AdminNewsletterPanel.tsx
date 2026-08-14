import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
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
            <h2 className="dash-title">Star & subscribe emails</h2>
            <p className="dash-subtitle">
              Public visitors leave an email to star a project or subscribe for more hackathons.
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
            Download CSV
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading newsletter emails...</p>
        ) : subscribers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No newsletter emails yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((item) => (
                  <TableRow key={item.email}>
                    <TableCell className="font-medium">{item.email}</TableCell>
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
        <p className="mt-3 text-xs text-muted-foreground">{subscribers.length} email{subscribers.length === 1 ? "" : "s"}</p>
      </div>
    </section>
  );
}
