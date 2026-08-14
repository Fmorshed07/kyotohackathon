import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, MapPin } from "lucide-react";
import PreviousHackathonsLivePreview from "@/components/PreviousHackathonsLivePreview";
import {
  fetchPortalHackathonCatalog,
  fetchPublishedHackathons,
  getHostedHackathonUrl,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { PORTAL_HACKATHONS, type PortalHackathon } from "@/lib/hackathons";
import { HackathonSubscribeForm } from "@/components/hackathons/HackathonSubscribeForm";
import { cn } from "@/lib/utils";

type BoardCategory =
  | "Agentic AI"
  | "Climate"
  | "Healthcare"
  | "Education"
  | "Urban"
  | "Public services"
  | "Global Good";

type SortMode = "default" | "live-first" | "upcoming-first" | "builders";

type HackathonBoard = PortalHackathon & {
  organizer: string;
  organizerInitials: string;
  categories: BoardCategory[];
  tags: string[];
  builders: number;
  prize: string;
  format: string;
  hubUrl: string;
  isHosted: boolean;
};

const CATEGORIES: BoardCategory[] = [
  "Agentic AI",
  "Climate",
  "Healthcare",
  "Education",
  "Urban",
  "Public services",
  "Global Good",
];

const BOARD_META: Record<
  string,
  Omit<HackathonBoard, keyof PortalHackathon | "hubUrl" | "isHosted">
> = {
  "impact-kyoto": {
    organizer: "Cognisor",
    organizerInitials: "CK",
    categories: ["Agentic AI", "Public services", "Healthcare", "Education"],
    tags: ["#Agents", "#LangGraph", "#Japan", "#Impact"],
    builders: 48,
    prize: "Completed",
    format: "Hybrid",
  },
  "impact-tokyo": {
    organizer: "Cognisor",
    organizerInitials: "CT",
    categories: ["Global Good", "Climate", "Healthcare", "Education"],
    tags: ["#Climate", "#Health", "#Education", "#AI"],
    builders: 62,
    prize: "Completed",
    format: "In-person",
  },
  "impact-dhaka": {
    organizer: "Cognisor",
    organizerInitials: "CD",
    categories: ["Urban", "Public services", "Climate"],
    tags: ["#Mobility", "#City", "#PublicAI", "#Sprint"],
    builders: 36,
    prize: "Completed",
    format: "In-person",
  },
};

const portalIds = new Set(PORTAL_HACKATHONS.map((entry) => entry.id));

const statusPrize = (status: PortalHackathon["status"]) =>
  status === "past" ? "Completed" : status === "active" ? "Portal live" : "Coming soon";

const defaultBoardMeta = (
  hackathon: PortalHackathon,
): Omit<HackathonBoard, keyof PortalHackathon | "hubUrl" | "isHosted"> => {
  const initials =
    hackathon.shortName
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "EV";
  return {
    organizer: "Cognisor",
    organizerInitials: initials,
    categories: ["Agentic AI"],
    tags: [`#${hackathon.shortName.replace(/\s+/g, "")}`],
    builders: 24,
    prize: statusPrize(hackathon.status),
    format: "See event",
  };
};

const toBoard = (
  hackathon: PortalHackathon,
  hosted?: HostedHackathon | null,
): HackathonBoard => {
  const base = BOARD_META[hackathon.id] ?? defaultBoardMeta(hackathon);
  const isHosted = Boolean(
    hosted &&
      !portalIds.has(hackathon.id) &&
      (hosted.hostEventId || hosted.createdManually || hosted.aiGenerated),
  );
  const initials =
    hosted?.organizerName
      ?.split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || base.organizerInitials;

  return {
    ...hackathon,
    ...base,
    status: hackathon.status,
    name: hackathon.name,
    eventDate: hackathon.eventDate,
    location: hackathon.location,
    theme: hackathon.theme || hosted?.tagline || hosted?.summary || base.prize,
    organizer: hosted?.organizerName?.trim() || (isHosted ? "Community host" : base.organizer),
    organizerInitials: initials,
    format: hosted?.format?.trim() || base.format,
    prize: statusPrize(hackathon.status),
    hubUrl: getHostedHackathonUrl(hackathon.id),
    isHosted,
  };
};

const sortByLifecycle = (left: PortalHackathon, right: PortalHackathon) => {
  const rank = { active: 0, upcoming: 1, past: 2 } as const;
  const byStatus = rank[left.status] - rank[right.status];
  if (byStatus !== 0) return byStatus;
  return left.name.localeCompare(right.name);
};

const statusLabel: Record<PortalHackathon["status"], string> = {
  active: "Live",
  upcoming: "Upcoming",
  past: "Closed",
};

const statusDot: Record<PortalHackathon["status"], string> = {
  active: "bg-primary shadow-[0_0_8px_hsl(199_100%_50%_/_0.7)]",
  upcoming: "bg-cyan/70",
  past: "bg-white/35",
};

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "live-first", label: "Live first" },
  { value: "upcoming-first", label: "Upcoming first" },
  { value: "builders", label: "Most builders" },
];

const getCityFromLocation = (location: string) => {
  const normalized = location.trim();
  if (!normalized) return "To be confirmed";
  if (/\b(online|virtual|remote)\b/i.test(normalized)) return "Online";
  return normalized.split(",")[0]?.trim() || normalized;
};

const HackathonsSection = () => {
  const [selectedCategories, setSelectedCategories] = useState<BoardCategory[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [boards, setBoards] = useState<HackathonBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    const db = getFirestoreDb();

    void Promise.all([
      fetchPortalHackathonCatalog(db).catch(() => [] as PortalHackathon[]),
      fetchPublishedHackathons(db).catch(() => [] as HostedHackathon[]),
    ]).then(([catalog, events]) => {
      if (!isCurrent) return;
      const hostedById = new Map(events.map((event) => [event.id, event]));
      // Prefer Firestore catalog; if both fail, show static Impact editions so the page isn't blank.
      const source = catalog.length > 0 ? catalog : PORTAL_HACKATHONS;
      const nextBoards = [...source]
        .sort(sortByLifecycle)
        .map((entry) => toBoard(entry, hostedById.get(entry.id) ?? null));
      setBoards(nextBoards);
      setIsLoading(false);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const toggleCategory = (category: BoardCategory) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category],
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities((current) =>
      current.includes(city)
        ? current.filter((entry) => entry !== city)
        : [...current, city],
    );
  };

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(boards.map((board) => getCityFromLocation(board.location)))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [boards],
  );

  const filteredBoards = useMemo(() => {
    let filtered =
      selectedCategories.length === 0
        ? boards
        : boards.filter((board) =>
            board.categories.some((category) => selectedCategories.includes(category)),
          );

    if (selectedCities.length > 0) {
      filtered = filtered.filter((board) =>
        selectedCities.includes(getCityFromLocation(board.location)),
      );
    }

    const statusRank: Record<PortalHackathon["status"], number> = {
      active: 0,
      upcoming: 1,
      past: 2,
    };

    return [...filtered].sort((a, b) => {
      if (sortMode === "builders") return b.builders - a.builders;
      if (sortMode === "live-first") return statusRank[a.status] - statusRank[b.status];
      if (sortMode === "upcoming-first") {
        const upcomingRank = { upcoming: 0, active: 1, past: 2 } as const;
        return upcomingRank[a.status] - upcomingRank[b.status];
      }
      // Default: live → upcoming → past
      return statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name);
    });
  }, [boards, selectedCategories, selectedCities, sortMode]);

  const resultCount = filteredBoards.length;
  const liveCount = boards.filter((board) => board.status === "active").length;
  const hasActiveFilters = selectedCategories.length > 0 || selectedCities.length > 0;

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Default";

  return (
    <section id="hackathons" className="relative px-4 py-14 sm:px-6 md:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 horizon-flare opacity-40" />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 18% 18%, hsl(199 100% 50% / 0.1), transparent 55%), radial-gradient(ellipse 40% 35% at 88% 72%, hsl(185 100% 50% / 0.06), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Hackathon boards
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Hackathons
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-muted-foreground sm:text-lg">
            Live hosted events and Impact editions in one board — filter by track, sort by status,
            and open the event hub when you are ready to build.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <motion.aside
            className="h-fit rounded-2xl border border-white/[0.08] bg-card/70 p-5 backdrop-blur-md"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <p className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Total
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
              {isLoading ? "…" : resultCount}{" "}
              <span className="text-base font-medium text-muted-foreground">
                {hasActiveFilters ? "matching events" : "Hackathons"}
              </span>
            </p>
            {hasActiveFilters ? (
              <p className="mt-1 font-body text-xs text-muted-foreground">
                of {boards.length} total events
              </p>
            ) : liveCount > 0 ? (
              <p className="mt-1 font-body text-xs text-primary">
                {liveCount} live now
              </p>
            ) : null}

            <div className="my-5 h-px bg-white/[0.08]" />

            <p className="font-display text-sm font-semibold text-foreground">Category</p>
            <ul className="mt-3 space-y-2.5">
              {CATEGORIES.map((category) => {
                const checked = selectedCategories.includes(category);
                return (
                  <li key={category}>
                    <label className="group flex cursor-pointer items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/25 bg-transparent group-hover:border-primary/60",
                        )}
                        aria-hidden
                      >
                        {checked && (
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                            <path
                              d="M2.5 6.2 4.8 8.5 9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleCategory(category)}
                      />
                      <span
                        className={cn(
                          "font-body text-sm transition-colors",
                          checked
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {category}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="my-5 h-px bg-white/[0.08]" />

            <p className="font-display text-sm font-semibold text-foreground">City</p>
            <ul className="mt-3 space-y-2.5">
              {cityOptions.map((city) => {
                const checked = selectedCities.includes(city);
                return (
                  <li key={city}>
                    <label className="group flex cursor-pointer items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/25 bg-transparent group-hover:border-primary/60",
                        )}
                        aria-hidden
                      >
                        {checked && (
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                            <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleCity(city)} />
                      <span className={cn("font-body text-sm transition-colors", checked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                        {city}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedCities([]);
                }}
                className="mt-4 font-body text-xs text-primary transition-opacity hover:opacity-80"
              >
                Clear filters
              </button>
            )}
          </motion.aside>

          <div className="min-w-0">
            <motion.div
              className="mb-4 flex items-center justify-end"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-card/80 px-3.5 py-2 font-body text-sm text-foreground backdrop-blur-md transition-colors hover:border-primary/40"
                  aria-expanded={sortOpen}
                  aria-haspopup="listbox"
                >
                  {sortLabel}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform",
                      sortOpen && "rotate-180",
                    )}
                  />
                </button>
                {sortOpen && (
                  <ul
                    role="listbox"
                    className="absolute right-0 z-20 mt-2 min-w-[10.5rem] overflow-hidden rounded-xl border border-white/[0.1] bg-popover/95 py-1 shadow-[var(--surface-elevated)] backdrop-blur-xl"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={sortMode === option.value}
                          className={cn(
                            "w-full px-3.5 py-2 text-left font-body text-sm transition-colors",
                            sortMode === option.value
                              ? "bg-primary/15 text-primary"
                              : "text-foreground/85 hover:bg-white/[0.05]",
                          )}
                          onClick={() => {
                            setSortMode(option.value);
                            setSortOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 px-6 py-10 text-center">
                  <p className="font-body text-sm text-muted-foreground">Loading live events…</p>
                </div>
              ) : filteredBoards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 px-6 py-10 text-center">
                  <p className="font-body text-sm text-muted-foreground">
                    No hackathons match these filters.
                  </p>
                </div>
              ) : (
                filteredBoards.map((board, index) => (
                  <motion.article
                    key={board.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-card/75 backdrop-blur-md transition-colors",
                      board.status === "active"
                        ? "border-primary/35 hover:border-primary/55"
                        : "border-white/[0.08] hover:border-primary/35",
                    )}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12 + index * 0.06 }}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-10 top-0 h-px opacity-50"
                      style={{ background: "var(--flare)" }}
                      aria-hidden
                    />

                    <div className="flex flex-col sm:flex-row">
                      <div className="flex shrink-0 flex-row items-center gap-3 px-5 py-5 sm:w-[7.5rem] sm:flex-col sm:justify-center sm:gap-2 sm:border-r sm:border-white/[0.06] sm:px-4">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full border font-display text-sm font-semibold",
                            board.status === "active"
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-white/15 bg-white/[0.04] text-foreground/80",
                          )}
                          aria-hidden
                        >
                          {board.organizerInitials}
                        </div>
                        <div className="sm:text-center">
                          <p className="font-body text-sm font-medium text-foreground">
                            {board.organizer}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-0.5 font-body text-[11px] text-muted-foreground">
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full", statusDot[board.status])}
                            />
                            {statusLabel[board.status]}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-5 py-5">
                        <div>
                          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-body text-[11px] text-muted-foreground">
                            {board.isHosted ? "Hosted event" : board.categories[0]}
                          </span>
                          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                            {board.name}
                          </h2>
                          <p className="mt-1 font-body text-sm text-muted-foreground">{board.theme}</p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {board.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/[0.08] bg-secondary/60 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <p className="inline-flex items-center gap-1.5 font-body text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary/80" />
                            {board.location}
                            <span className="text-white/20">·</span>
                            {board.eventDate}
                            <span className="text-white/20">·</span>
                            {board.format}
                          </p>

                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2" aria-hidden>
                              {Array.from({ length: 3 }).map((_, avatarIndex) => (
                                <span
                                  key={avatarIndex}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-background bg-gradient-to-br from-primary/40 to-cyan/30 text-[9px] font-semibold text-foreground"
                                  style={{ opacity: 1 - avatarIndex * 0.15 }}
                                >
                                  {String.fromCharCode(65 + avatarIndex)}
                                </span>
                              ))}
                            </div>
                            <span className="font-body text-xs text-muted-foreground">
                              {board.builders} Builders
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-stretch justify-center gap-3 border-t border-white/[0.06] bg-white/[0.03] px-5 py-5 sm:w-[9.5rem] sm:border-l sm:border-t-0 sm:px-4">
                        <p className="text-center font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                          {board.prize}
                        </p>
                        {board.status === "active" || board.status === "upcoming" || board.isHosted ? (
                          <Link
                            to={board.hubUrl}
                            className="inline-flex items-center justify-center rounded-xl border border-primary/50 bg-primary/15 px-3 py-2 text-center font-display text-xs font-semibold tracking-wide text-primary transition-colors hover:bg-primary/25"
                          >
                            {board.status === "active" ? "Open hub" : "View event"}
                          </Link>
                        ) : (
                          <Link
                            to={board.hubUrl}
                            className="text-center font-body text-[11px] text-muted-foreground/80 transition-colors hover:text-primary"
                          >
                            Event page
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-primary/25 bg-card/70 px-5 py-6 sm:px-7">
          <p className="font-display text-lg font-semibold text-foreground">Subscribe for more hackathons</p>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Get an email when new events open. No account needed.
          </p>
          <div className="mt-4 max-w-xl">
            <HackathonSubscribeForm source="hackathons-page" compact />
          </div>
        </div>

        <div className="mt-16">
          <PreviousHackathonsLivePreview />
        </div>
      </div>
    </section>
  );
};

export default HackathonsSection;
