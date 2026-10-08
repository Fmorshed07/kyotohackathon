import { useId } from "react";
import { ExternalLink, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PEER_PORTAL_URL = "https://www.peerportal.app/";

export default function PeerPortalLivePreview({ className }: { className?: string }) {
  const headingId = useId();
  const fallbackId = useId();
  return (
    <article id="peer-portal-preview" aria-labelledby={headingId} className={cn("w-full min-w-0 overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_65%)] bg-card/70 text-left shadow-[var(--surface-elevated)]", className)}>
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7 lg:p-8">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Explore the platform</p>
          <h3 id={headingId} className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Peer Portal <span className="text-muted-foreground">— live website</span></h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Explore Peer Portal below, or open the full website to start your journey.</p>
          <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 font-mono text-xs text-primary"><Globe2 className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">www.peerportal.app</span></p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3 sm:items-end">
          <Button asChild className="w-full gap-2 sm:w-auto">
            <a href={PEER_PORTAL_URL} target="_blank" rel="noopener noreferrer">Open live preview <ExternalLink className="h-4 w-4" aria-hidden /></a>
          </Button>
          <span className="text-xs text-muted-foreground">Opens Peer Portal in a new tab</span>
        </div>
      </div>
      <div className="min-w-0 px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="poster-preview-frame">
          <div className="poster-preview-chrome">
            <span className="h-2 w-2 rounded-full bg-white/40" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-white/25" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-primary/90" aria-hidden />
            <span className="ml-2 truncate font-mono text-xs text-primary/70">peerportal.app</span>
          </div>
          <iframe
            title="Peer Portal live website preview"
            src={PEER_PORTAL_URL}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            aria-describedby={fallbackId}
            className="block h-[520px] w-full border-0 bg-background sm:h-[620px] lg:h-[680px]"
          />
        </div>
        <p id={fallbackId} className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
          If the preview is unavailable, open the full website in a new tab.
        </p>
      </div>
    </article>
  );
}
