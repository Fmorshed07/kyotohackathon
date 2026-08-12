import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";
import PreviousHackathonsLivePreview from "@/components/PreviousHackathonsLivePreview";
import {
  fetchPublishedHackathons,
  getHostedHackathonUrl,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { PORTAL_HACKATHONS, type PortalHackathon } from "@/lib/hackathons";
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
  PortalHackathon["id"],
  Omit<HackathonBoard, keyof PortalHackathon>
> = {
  "impact-kyoto": {
    organizer: "Cognisor",
    organizerInitials: "CK",
    categories: ["Agentic AI", "Public services", "Healthcare", "Education"],
    tags: ["#Agents", "#LangGraph", "#Japan", "#Impact"],
    builders: 48,
    prize: "Portal live",
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
    prize: "Coming soon",
    format: "In-person",
  },
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

const boards: HackathonBoard[] = PORTAL_HACKATHONS.map((hackathon) => ({
  ...hackathon,
  ...BOARD_META[hackathon.id],
}));

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
  const [publishedEvents, setPublishedEvents] = useState<HostedHackathon[]>([]);

  useEffect(() => {
    let isCurrent = true;
    void fetchPublishedHackathons(getFirestoreDb())
      .then((events) => {
        if (isCurrent) setPublishedEvents(events);
      })
      .catch(() => {
        if (isCurrent) setPublishedEvents([]);
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
    () => Array.from(new Set([
      ...boards.map((board) => getCityFromLocation(board.location)),
      ...publishedEvents.map((event) => getCityFromLocation(event.location)),
    ])).sort((left, right) => left.localeCompare(right)),
    [publishedEvents],
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
      return 0;
    });
  }, [selectedCategories, selectedCities, sortMode]);

  const filteredPublishedEvents = useMemo(
    () => selectedCities.length === 0
      ? publishedEvents
      : publishedEvents.filter((event) => selectedCities.includes(getCityFromLocation(event.location))),
    [publishedEvents, selectedCities],
  );

  const resultCount = filteredBoards.length + filteredPublishedEvents.length;
  const hasActiveFilters = selectedCategories.length > 0 || selectedCities.length > 0;

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Default";

  return (
    <section id="hackathons" className="relative px-6 py-16 md:py-24">
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
            Browse every Cognisor Impact event — filter by track, sort the board, and open the live
            portal when you are ready to build.
          </p>
        </motion.div>

        {publishedEvents.length > 0 ? (
          <section className="mt-10" aria-labelledby="published-events-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Live organiser hubs
                </p>
                <h2 id="published-events-heading" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                  Unique event experiences
                </h2>
              </div>
              <p className="font-body text-sm text-muted-foreground">
                Each hub carries its own look, schedule, and registration path.
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPublishedEvents.map((event, index) => {
                const accent = event.accentColor || "#00A3FF";
                const hero = event.bannerImageUrl || event.coverImageUrl;
                return (
                  <motion.article
                    key={event.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-[var(--surface-elevated)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/25"
                    style={{
                      ["--primary" as string]: undefined,
                      boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 25%, transparent), var(--surface-elevated)`,
                    }}
                  >
                    <div className="relative h-44 overflow-hidden bg-[#0a0c10]">
                      {hero ? (
                        <img
                          src={hero}
                          alt=""
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `radial-gradient(ellipse at top right, ${accent}55, transparent 55%), linear-gradient(160deg, #0b1018, #050608)`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                        {event.logoUrl ? (
                          <img
                            src={event.logoUrl}
                            alt=""
                            className="h-9 w-9 rounded-md border border-white/20 object-cover shadow-lg"
                          />
                        ) : null}
                        <span
                          className="rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur"
                          style={{
                            borderColor: `${accent}66`,
                            backgroundColor: `${accent}22`,
                            color: accent,
                          }}
                        >
                          {event.status === "active" ? "Live now" : event.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      {event.organizerName ? (
                        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {event.organizerName}
                        </p>
                      ) : (
                        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {event.hostEventId ? "Hosted event" : event.createdManually ? "Organiser-built" : "AI-assisted"}
                        </p>
                      )}
                      <h3
                        className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground"
                        style={
                          event.fontPreset
                            ? ({
                                fontFamily:
                                  event.fontPreset === "editorial"
                                    ? '"Fraunces", Georgia, serif'
                                    : event.fontPreset === "signal"
                                      ? '"Syne", system-ui, sans-serif'
                                      : event.fontPreset === "atelier"
                                        ? '"Instrument Serif", Georgia, serif'
                                        : undefined,
                              } as CSSProperties)
                            : undefined
                        }
                      >
                        {event.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 font-body text-sm leading-relaxed text-muted-foreground">
                        {event.tagline || event.theme || event.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-body text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" style={{ color: accent }} />
                          {event.eventDate}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" style={{ color: accent }} />
                          {event.location}
                        </span>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <Link
                          to={getHostedHackathonUrl(event.id)}
                          className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 font-display text-xs font-semibold tracking-wide transition-colors"
                          style={{
                            border: `1px solid ${accent}80`,
                            backgroundColor: `${accent}22`,
                            color: accent,
                          }}
                        >
                          Open event hub
                        </Link>
                        {event.lumaUrl ? (
                          <a
                            href={event.lumaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-body text-xs font-semibold hover:underline"
                            style={{ color: accent }}
                          >
                            Register
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
            {filteredPublishedEvents.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-white/15 bg-card/40 px-5 py-4 text-sm text-muted-foreground">No published event hubs match the selected city.</p> : null}
          </section>
        ) : null}

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
              {resultCount}{" "}
              <span className="text-base font-medium text-muted-foreground">{hasActiveFilters ? "matching events" : "Hackathons"}</span>
            </p>
            {hasActiveFilters ? <p className="mt-1 font-body text-xs text-muted-foreground">of {boards.length + publishedEvents.length} total events</p> : null}

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
              {filteredBoards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 px-6 py-10 text-center">
                  <p className="font-body text-sm text-muted-foreground">
                    No hackathons match these categories.
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
                            {board.categories[0]}
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
                        {board.status === "active" ? (
                          <Link
                            to="/signin"
                            className="inline-flex items-center justify-center rounded-xl border border-primary/50 bg-primary/15 px-3 py-2 text-center font-display text-xs font-semibold tracking-wide text-primary transition-colors hover:bg-primary/25"
                          >
                            Open board
                          </Link>
                        ) : (
                          <span className="text-center font-body text-[11px] text-muted-foreground/80">
                            In portal
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-16">
          <PreviousHackathonsLivePreview eventIds={["impact-tokyo"]} />
        </div>
      </div>
    </section>
  );
};

export default HackathonsSection;
