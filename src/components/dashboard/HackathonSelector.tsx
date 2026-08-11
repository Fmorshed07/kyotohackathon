import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import kyotoHero from "@/assets/kyoto-hero.jpg";
import kyotoSkyline from "@/assets/kyoto-skyline.jpg";
import kyotoAbstract from "@/assets/kyoto-abstract.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PORTAL_HACKATHONS,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";

type HackathonSelectorProps = {
  selectedHackathonId: HackathonId;
  onSelect: (hackathonId: HackathonId) => void;
  hackathons?: PortalHackathon[];
  compact?: boolean;
};

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

const hackathonVisuals: Record<HackathonId, string> = {
  "impact-kyoto": kyotoHero,
  "impact-tokyo": kyotoSkyline,
  "impact-dhaka": kyotoAbstract,
};

export function HackathonSelector({
  selectedHackathonId,
  onSelect,
  hackathons = PORTAL_HACKATHONS,
  compact = false,
}: HackathonSelectorProps) {
  const selected = hackathons.find((hackathon) => hackathon.id === selectedHackathonId);

  return (
    <div className={compact ? "w-full min-w-0" : "w-full max-w-xl"}>
      <Select value={selectedHackathonId} onValueChange={(value) => onSelect(value as HackathonId)}>
        <SelectTrigger
          className={
            compact
              ? "h-auto min-h-11 w-full border-border bg-card py-2.5 text-base sm:min-h-12 sm:text-lg"
              : "h-auto min-h-[4.5rem] w-full border-border bg-card py-3 text-base sm:text-lg"
          }
        >
          <SelectValue placeholder="Choose hackathon">
            {selected ? (
              <div className="flex min-w-0 flex-col items-start gap-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-semibold text-foreground sm:text-lg">
                    {selected.name}
                  </span>
                  <Badge variant={statusVariant[selected.status]} className="text-xs uppercase sm:text-sm">
                    {statusLabel[selected.status]}
                  </Badge>
                </div>
                {!compact ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {selected.eventDate} · {selected.location}
                  </span>
                ) : null}
              </div>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[min(70vh,420px)]">
          {hackathons.map((hackathon) => (
            <SelectItem key={hackathon.id} value={hackathon.id} className="py-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{hackathon.name}</span>
                  <Badge variant={statusVariant[hackathon.status]} className="text-[0.6rem] uppercase">
                    {statusLabel[hackathon.status]}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {hackathon.eventDate} · {hackathon.location}
                </span>
                <span className="text-xs text-muted-foreground">{hackathon.theme}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type HackathonContextBannerProps = {
  hackathon: PortalHackathon;
  role: "admin" | "judge" | "participant";
  publicSiteUrl?: string;
};

const roleEyebrow: Record<HackathonContextBannerProps["role"], string> = {
  admin: "Managing hackathon",
  judge: "Judging hackathon",
  participant: "Participating in",
};

export function HackathonContextBanner({
  hackathon,
  role,
  publicSiteUrl,
}: HackathonContextBannerProps) {
  const visual = hackathonVisuals[hackathon.id] ?? kyotoAbstract;

  return (
    <div className="dash-event-card relative overflow-hidden rounded-lg border border-white/[0.08] bg-card">
      <div className="absolute inset-0 opacity-55">
        <img
          src={visual}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(0_0%_0%/0.94)_0%,hsl(0_0%_0%/0.78)_44%,hsl(0_0%_0%/0.42)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(0_0%_0%/0.82)_100%)]" />
      <div className="relative grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:p-6">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <p className="dash-eyebrow">{roleEyebrow[role]}</p>
            <Badge variant={statusVariant[hackathon.status]} className="text-[0.65rem] uppercase">
              {statusLabel[hackathon.status]}
            </Badge>
          </div>
          <h2 className="max-w-3xl font-display text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl md:text-4xl">
            {hackathon.name}
          </h2>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {hackathon.theme}
          </p>
          {publicSiteUrl ? (
            <a
              href={publicSiteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-primary underline-offset-4 hover:underline"
            >
              Open event site
            </a>
          ) : null}
        </div>
        <div className="grid content-start gap-2 text-sm text-muted-foreground md:min-w-48 md:text-right">
          <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
            <p className="inline-flex items-center gap-2 md:justify-end">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
              {hackathon.eventDate}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
            <p className="inline-flex items-center gap-2 md:justify-end">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {hackathon.location}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
