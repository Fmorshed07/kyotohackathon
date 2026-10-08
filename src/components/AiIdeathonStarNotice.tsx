import { useState } from "react";
import { ArrowRight, Star, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "cognisor_ai_ideathon_star_notice_dismissed";

const isPublicVotingRoute = (pathname: string) =>
  pathname === "/" ||
  pathname === "/hackathons" ||
  pathname.startsWith("/events/") ||
  pathname === "/projects" ||
  pathname.startsWith("/projects/");

export function AiIdeathonStarNotice() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed || !isPublicVotingRoute(location.pathname)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private browsing or storage restrictions should not block dismissal.
    }
  };

  return (
    <aside
      aria-label="AI Ideathon 2026 community voting"
      aria-live="polite"
      className="fixed bottom-3 left-3 right-3 z-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:left-auto sm:right-5 sm:w-[350px]"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss voting notification"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-4">
        <p className="pr-8 text-xs text-muted-foreground">AI Ideathon 2026 · Community vote</p>
        <h2 className="mt-2 pr-5 font-display text-base font-medium text-foreground">
          Help choose the best project
        </h2>
        <Button asChild variant="ghost" size="sm" className="mt-2 h-auto min-h-10 w-full justify-between px-0 text-primary hover:bg-transparent">
          <Link to="/projects?spotlight=ai-ideathon-2026" onClick={dismiss}>
            <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 fill-current" /> Star the best project</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">No account required.</p>
      </div>
    </aside>
  );
}
