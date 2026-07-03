import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export function HackathonSelector({
  selectedHackathonId,
  onSelect,
  compact = false,
}: HackathonSelectorProps) {
  const selected = PORTAL_HACKATHONS.find((hackathon) => hackathon.id === selectedHackathonId);

  return (
    <div className={compact ? "w-full min-w-0" : "w-full max-w-xl"}>
      <Select value={selectedHackathonId} onValueChange={(value) => onSelect(value as HackathonId)}>
        <SelectTrigger
          className={
            compact
              ? "h-auto min-h-10 w-full border-border/60 bg-card/80 py-2"
              : "h-auto min-h-[4.5rem] w-full border-primary/30 bg-gradient-to-r from-primary/10 via-card/90 to-secondary/10 py-3"
          }
        >
          <SelectValue placeholder="Choose hackathon">
            {selected ? (
              <div className="flex min-w-0 flex-col items-start gap-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {selected.name}
                  </span>
                  <Badge variant={statusVariant[selected.status]} className="text-[0.6rem] uppercase">
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
          {PORTAL_HACKATHONS.map((hackathon) => (
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
  role: "admin" | "judge";
};

export function HackathonContextBanner({ hackathon, role }: HackathonContextBannerProps) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card/90 to-secondary/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
              {role === "admin" ? "Managing hackathon" : "Judging hackathon"}
            </p>
            <Badge variant={statusVariant[hackathon.status]} className="text-[0.6rem] uppercase">
              {statusLabel[hackathon.status]}
            </Badge>
          </div>
          <h2 className="font-display text-xl font-semibold tracking-wide text-foreground sm:text-2xl">
            {hackathon.name}
          </h2>
          <p className="text-sm text-muted-foreground">{hackathon.theme}</p>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:text-right">
          <p className="inline-flex items-center gap-2 sm:justify-end">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            {hackathon.eventDate}
          </p>
          <p className="inline-flex items-center gap-2 sm:justify-end">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {hackathon.location}
          </p>
        </div>
      </div>
    </div>
  );
}
