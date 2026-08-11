import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { PORTAL_HACKATHONS, SITE_HACKATHON_ID } from "@/lib/hackathons";
import { cn } from "@/lib/utils";

type HeroLine = {
  lead: string;
  trail: string;
};

const HERO_LINES: HeroLine[] = [
  { lead: "Hackathons", trail: "that scale." },
  { lead: "Builders", trail: "beyond the horizon." },
  { lead: "Agents", trail: "racing to ship." },
  { lead: "Ideas", trail: "built to travel." },
  { lead: "Judging", trail: "with clear signal." },
  { lead: "Impact", trail: "that compounds." },
];

type TypePhase =
  | "typing-lead"
  | "bridge"
  | "typing-trail"
  | "holding"
  | "scramble"
  | "deleting"
  | "gap";

const HOLD_MS = 2400;
const BRIDGE_MS = 220;
const LINE_GAP_MS = 360;
const SCRAMBLE_TICKS = 7;
const SCRAMBLE_MS = 38;
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789░▒▓<>/\\|·✦";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function jitter(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function typeDelay(char: string, lane: "lead" | "trail") {
  if (char === "." || char === "!") return jitter(140, 200);
  if (char === " " || char === ",") return jitter(70, 115);
  if (lane === "lead") return jitter(38, 72);
  return jitter(26, 58);
}

function deleteDelay(remaining: number) {
  // Accelerate as more characters disappear
  const rush = Math.min(18, remaining);
  return Math.max(10, 34 - rush + jitter(0, 8));
}

function scrambleText(source: string) {
  return source
    .split("")
    .map((ch) => (ch === " " || ch === "." ? ch : GLYPHS[jitter(0, GLYPHS.length - 1)]))
    .join("");
}

function HeroCaret({
  tone,
  visible,
  striking,
}: {
  tone: "lead" | "trail";
  visible: boolean;
  striking: boolean;
}) {
  return (
    <span
      className={cn(
        "hero-caret ml-1.5 inline-block translate-y-[0.08em] rounded-[2px] align-baseline",
        tone === "lead"
          ? "h-[0.84em] w-[0.085em] bg-primary shadow-[0_0_18px_hsl(199_100%_50%/0.9)]"
          : "h-[0.8em] w-[0.08em] bg-white/90 shadow-[0_0_14px_rgba(255,255,255,0.5)]",
        visible ? "opacity-100" : "opacity-0",
        striking && "hero-caret-strike",
        !striking && visible && "hero-caret-blink",
      )}
      aria-hidden
    />
  );
}

function TypedChars({
  text,
  className,
  inkKey,
}: {
  text: string;
  className?: string;
  inkKey: string;
}) {
  if (!text) return null;
  const head = text.slice(0, -1);
  const tip = text.slice(-1);

  return (
    <span className={className}>
      {head}
      <span key={`${inkKey}-${text.length}`} className="hero-char-ink inline-block">
        {tip}
      </span>
    </span>
  );
}

function HeroTypingHeadline({ active }: { active: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [leadText, setLeadText] = useState("");
  const [trailText, setTrailText] = useState("");
  const [displayTrail, setDisplayTrail] = useState("");
  const [phase, setPhase] = useState<TypePhase>("typing-lead");
  const [striking, setStriking] = useState(false);
  const [scrambleTick, setScrambleTick] = useState(0);
  const strikeTimer = useRef<number | undefined>(undefined);

  const line = HERO_LINES[lineIndex] ?? HERO_LINES[0];
  const isTyping = phase === "typing-lead" || phase === "typing-trail";
  const isBusy = isTyping || phase === "scramble" || phase === "deleting";

  const pulseStrike = () => {
    setStriking(true);
    window.clearTimeout(strikeTimer.current);
    strikeTimer.current = window.setTimeout(() => setStriking(false), 90);
  };

  useEffect(() => {
    if (!active || reducedMotion) {
      setLeadText(HERO_LINES[0].lead);
      setTrailText(HERO_LINES[0].trail);
      setDisplayTrail(HERO_LINES[0].trail);
      setPhase("holding");
      return;
    }
    return () => window.clearTimeout(strikeTimer.current);
  }, [active, reducedMotion]);

  useEffect(() => {
    if (!active || reducedMotion) return;

    let timer: number;

    if (phase === "typing-lead") {
      if (leadText.length < line.lead.length) {
        const next = line.lead[leadText.length] ?? "";
        timer = window.setTimeout(() => {
          pulseStrike();
          setLeadText(line.lead.slice(0, leadText.length + 1));
        }, typeDelay(next, "lead"));
      } else {
        timer = window.setTimeout(() => setPhase("bridge"), BRIDGE_MS);
      }
    } else if (phase === "bridge") {
      timer = window.setTimeout(() => setPhase("typing-trail"), BRIDGE_MS);
    } else if (phase === "typing-trail") {
      if (trailText.length < line.trail.length) {
        const next = line.trail[trailText.length] ?? "";
        timer = window.setTimeout(() => {
          pulseStrike();
          const nextTrail = line.trail.slice(0, trailText.length + 1);
          setTrailText(nextTrail);
          setDisplayTrail(nextTrail);
        }, typeDelay(next, "trail"));
      } else {
        timer = window.setTimeout(() => setPhase("holding"), 40);
      }
    } else if (phase === "holding") {
      timer = window.setTimeout(() => {
        setScrambleTick(0);
        setPhase("scramble");
      }, HOLD_MS);
    } else if (phase === "scramble") {
      if (scrambleTick < SCRAMBLE_TICKS) {
        timer = window.setTimeout(() => {
          setDisplayTrail(scrambleText(trailText || line.trail));
          setScrambleTick((tick) => tick + 1);
          pulseStrike();
        }, SCRAMBLE_MS + scrambleTick * 4);
      } else {
        timer = window.setTimeout(() => {
          setDisplayTrail(trailText);
          setPhase("deleting");
        }, 60);
      }
    } else if (phase === "deleting") {
      if (trailText.length > 0) {
        timer = window.setTimeout(() => {
          pulseStrike();
          const next = trailText.slice(0, -1);
          setTrailText(next);
          setDisplayTrail(next);
        }, deleteDelay(trailText.length));
      } else if (leadText.length > 0) {
        timer = window.setTimeout(() => {
          pulseStrike();
          setLeadText((t) => t.slice(0, -1));
        }, deleteDelay(leadText.length) + 4);
      } else {
        timer = window.setTimeout(() => setPhase("gap"), 40);
      }
    } else if (phase === "gap") {
      timer = window.setTimeout(() => {
        setLineIndex((i) => (i + 1) % HERO_LINES.length);
        setPhase("typing-lead");
      }, LINE_GAP_MS);
    }

    return () => window.clearTimeout(timer);
  }, [
    active,
    reducedMotion,
    phase,
    leadText,
    trailText,
    scrambleTick,
    line.lead,
    line.trail,
  ]);

  const showLeadCaret =
    phase === "typing-lead" ||
    phase === "bridge" ||
    phase === "gap" ||
    (phase === "deleting" && trailText.length === 0);
  const showTrailCaret =
    phase === "typing-trail" ||
    phase === "holding" ||
    phase === "scramble" ||
    (phase === "deleting" && trailText.length > 0);

  return (
    <h1
      className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl lg:text-8xl"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">
        {line.lead} {line.trail}
      </span>
      <span className="block min-h-[1.05em]" aria-hidden>
        <span className="text-gradient-cyan">{leadText}</span>
        <HeroCaret tone="lead" visible={showLeadCaret} striking={striking && showLeadCaret && isBusy} />
      </span>
      <span
        className={cn(
          "mt-1 block min-h-[1.05em] font-medium text-white/88 transition-opacity duration-150",
          phase === "scramble" && "text-primary/80",
        )}
        aria-hidden
      >
        {phase === "scramble" ? (
          <span className="hero-scramble tracking-[-0.03em]">{displayTrail}</span>
        ) : (
          <TypedChars text={displayTrail} inkKey={`trail-${lineIndex}`} />
        )}
        <HeroCaret tone="trail" visible={showTrailCaret} striking={striking && showTrailCaret && isBusy} />
      </span>
    </h1>
  );
}

const HeroSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const active = PORTAL_HACKATHONS.find((h) => h.id === SITE_HACKATHON_ID) ?? PORTAL_HACKATHONS[0];

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <div ref={ref} className="absolute inset-0" aria-hidden />

      {/* Full-bleed horizon — dominant visual plane */}
      <div className="absolute inset-0">
        <motion.img
          src="/cognisor-horizon.png"
          alt=""
          className="h-full w-full object-cover object-center"
          initial={{ scale: 1.08, opacity: 0.55 }}
          animate={isVisible ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="starfield absolute inset-0 opacity-35 mix-blend-screen" />
      </div>

      {/* Horizon flare — intentional motion */}
      <motion.div
        className="horizon-flare animate-flare-pulse pointer-events-none absolute left-1/2 top-[38%] z-[5] w-[min(92vw,780px)] -translate-x-1/2"
        initial={{ opacity: 0, scaleX: 0.35 }}
        animate={isVisible ? { opacity: 1, scaleX: 1 } : {}}
        transition={{ duration: 1.3, delay: 0.3 }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-end px-6 pb-28 pt-28 md:justify-center md:pb-24 md:pt-24 lg:px-8">
        <motion.p
          className="font-display text-sm font-medium uppercase tracking-[0.38em] text-white md:text-[15px]"
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75 }}
        >
          Cognisor
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroTypingHeadline active={isVisible} />
        </motion.div>

        <motion.p
          className="mt-6 max-w-lg text-balance font-body text-[17px] font-medium leading-relaxed tracking-[-0.01em] text-white/65 sm:text-lg"
          initial={{ opacity: 0, y: 14 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.2 }}
        >
          The Cognisor platform for running AI hackathons — submissions, judging, and rankings
          in one dark console.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          initial={{ opacity: 0, y: 18 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.3 }}
        >
          <Link
            to="/signin"
            className="btn-poster-cta inline-flex min-w-[190px] items-center justify-center gap-2"
          >
            Enter portal
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/hackathons"
            className="inline-flex min-w-[190px] items-center justify-center rounded-md border border-white/18 bg-black/40 px-6 py-3.5 font-display text-sm font-medium tracking-[0.1em] text-white backdrop-blur-md transition-colors hover:border-primary/45 hover:bg-black/60"
          >
            Browse events
          </Link>
          <a
            href="#host"
            className="inline-flex min-w-[190px] items-center justify-center rounded-md border border-white/18 bg-black/40 px-6 py-3.5 font-display text-sm font-medium tracking-[0.1em] text-white backdrop-blur-md transition-colors hover:border-primary/45 hover:bg-black/60"
          >
            Host an event
          </a>
        </motion.div>

        <motion.p
          className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          Live ·{" "}
          <Link to="/hackathons" className="text-primary/90 underline-offset-4 hover:underline">
            {active.name}
          </Link>
        </motion.p>
      </div>
    </section>
  );
};

export default HeroSection;
