import { useState } from "react";
import { ArrowRight, Sparkles, Star, X } from "lucide-react";
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
      className="fixed bottom-4 left-4 right-4 z-40 overflow-hidden rounded-2xl border border-primary/35 bg-[linear-gradient(145deg,hsl(215_35%_8%/0.98),hsl(205_45%_5%/0.98))] shadow-[0_24px_80px_-24px_hsl(199_100%_50%/0.55)] backdrop-blur-xl sm:left-auto sm:right-5 sm:w-[390px]"
    >
      <div className="h-px w-full bg-[var(--flare)] opacity-80" aria-hidden />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss voting notification"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5 pr-12">
        <div className="flex items-center gap-2 text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">Community vote · AI Ideathon 2026</p>
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-white">
          Help choose the best project
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Explore the AI Ideathon projects and give your stars to the idea you believe deserves to win. No account is required.
        </p>
        <Button asChild size="sm" className="mt-4 w-full justify-between">
          <Link to="/projects?spotlight=ai-ideathon-2026" onClick={dismiss}>
            <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 fill-current" /> Star the best project</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
