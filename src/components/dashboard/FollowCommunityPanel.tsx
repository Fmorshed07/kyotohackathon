import { ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COGNISOR_SITE,
  COGNISOR_SOCIALS,
  CREATORS_CIRCUIT_COMMUNITY,
  CREATORS_CIRCUIT_SITE,
  CREATORS_CIRCUIT_WHATSAPP,
} from "@/lib/brandLinks";
import { cn } from "@/lib/utils";

type FollowCommunityPanelProps = {
  className?: string;
  /** Emphasize after a successful project submission */
  highlight?: boolean;
};

export function FollowCommunityPanel({ className, highlight = false }: FollowCommunityPanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-black/30 p-5 md:p-6",
        highlight && "border-primary/35 bg-primary/[0.06]",
        className,
      )}
      aria-labelledby="follow-community-heading"
    >
      <div className="flex items-start gap-3">
        <span className="dash-icon-chip" aria-hidden>
          <Users className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="dash-eyebrow">Next step</p>
          <h2 id="follow-community-heading" className="dash-title">
            Stay connected
          </h2>
          <p className="dash-subtitle mt-1 max-w-2xl">
            Follow Cognisor AI on{" "}
            <a
              href={COGNISOR_SITE}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              www.cognisorai.com
            </a>
            , then join{" "}
            <a
              href={CREATORS_CIRCUIT_SITE}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Creators Circuit
            </a>{" "}
            — the community for creators, builders, and founders.
          </p>

          <div className="mt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Follow Cognisor AI
            </p>
            <div className="flex flex-wrap gap-2">
              {COGNISOR_SOCIALS.map((social) => (
                <Button key={social.id} asChild variant="outline" size="sm" className="h-8">
                  <a href={social.href} target="_blank" rel="noreferrer">
                    {social.label}
                    <ExternalLink className="ml-1.5 h-3 w-3 opacity-70" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/90">
              Creators Circuit
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Find your people at{" "}
              <span className="text-foreground">creatorscircuit.tech</span> — events, collaborators,
              and a global builder network powered by Cognisor AI.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="uppercase tracking-[0.1em]">
                <a href={CREATORS_CIRCUIT_SITE} target="_blank" rel="noreferrer">
                  Join Creators Circuit
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={CREATORS_CIRCUIT_COMMUNITY} target="_blank" rel="noreferrer">
                  Community hub
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={CREATORS_CIRCUIT_WHATSAPP} target="_blank" rel="noreferrer">
                  WhatsApp group
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
