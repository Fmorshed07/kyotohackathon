import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Play,
  TicketCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewKey = "projects" | "events" | "tickets";

const previews: Array<{
  key: PreviewKey;
  label: string;
  title: string;
  description: string;
  action: string;
  href: string;
  icon: typeof FolderKanban;
}> = [
  {
    key: "projects",
    label: "Discover",
    title: "Projects & demos",
    description: "A public, participant-approved gallery for exploring demos, project sites, and documents.",
    action: "Browse projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    key: "events",
    label: "Publish",
    title: "Complete event hubs",
    description: "Turn every event into a clear public destination with a programme, rules, judging rubric, and joining path.",
    action: "Explore events",
    href: "/hackathons",
    icon: CalendarDays,
  },
  {
    key: "tickets",
    label: "Operate",
    title: "Tickets & live check-in",
    description: "Hosts issue QR tickets, manage attendees, and check people in from one organised workspace.",
    action: "Host an event",
    href: "/host/signin",
    icon: TicketCheck,
  },
];

function TypingText({ text, reduceMotion }: { text: string; reduceMotion: boolean | null }) {
  const [visibleText, setVisibleText] = useState(reduceMotion ? text : "");

  useEffect(() => {
    if (reduceMotion) {
      setVisibleText(text);
      return;
    }
    let index = 0;
    let timer: number | undefined;
    const typeNextCharacter = () => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index < text.length) {
        timer = window.setTimeout(typeNextCharacter, 42);
      } else {
        timer = window.setTimeout(() => {
          index = 0;
          setVisibleText("");
          timer = window.setTimeout(typeNextCharacter, 260);
        }, 2200);
      }
    };
    timer = window.setTimeout(typeNextCharacter, 260);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [reduceMotion, text]);

  return (
    <>
      <span>{visibleText}</span>
      {!reduceMotion ? (
        <motion.span
          className="ml-0.5 inline-block h-3 w-px bg-primary align-middle"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.85, repeat: Infinity }}
        />
      ) : null}
    </>
  );
}

function ProjectsPreview({ reduceMotion }: { reduceMotion: boolean | null }) {
  const cards = [
    { title: "Kintsugi AI", kind: "Demo", tint: "from-cyan/35 to-primary/10" },
    { title: "KyotoFlow", kind: "Project", tint: "from-violet-500/30 to-cyan/10" },
    { title: "Mori Grid", kind: "Case study", tint: "from-emerald-400/25 to-primary/10" },
  ];

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,hsl(var(--primary)/0.25),transparent_35%),radial-gradient(circle_at_88%_88%,hsl(185_100%_50%/0.16),transparent_35%)]" />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
        <div><p className="font-display text-sm font-semibold text-foreground">Explore projects</p><p className="mt-0.5 text-xs text-muted-foreground">Search · filter · preview</p></div>
        <div className="max-w-[56%] truncate rounded-lg border border-primary/20 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-primary">
          <TypingText text="search: agentic AI" reduceMotion={reduceMotion} />
        </div>
      </div>
      <motion.div className="relative mt-5 grid grid-cols-3 gap-3" animate={reduceMotion ? {} : { x: [0, -14, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}>
        {cards.map((card, index) => (
          <motion.article
            key={card.title}
            className="overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-xl"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, index === 1 ? -15 : -7, 0], scale: [1, 1.04, 1] }}
            transition={reduceMotion ? { delay: 0.12 + index * 0.12, duration: 0.45 } : { opacity: { delay: 0.12 + index * 0.12, duration: 0.45 }, y: { delay: 0.8 + index * 0.2, duration: 2.4 + index * 0.3, repeat: Infinity, ease: "easeInOut" }, scale: { delay: 0.8 + index * 0.2, duration: 2.4 + index * 0.3, repeat: Infinity, ease: "easeInOut" } }}
          >
            <div className={cn("relative aspect-[4/3] bg-gradient-to-br", card.tint)}>
              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-1 text-[9px] font-semibold text-white">{card.kind}</span>
              {index === 0 ? <motion.span className="absolute bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/50 bg-black/25 text-white" animate={reduceMotion ? {} : { scale: [1, 1.12, 1] }} transition={{ duration: 1.8, repeat: Infinity }}><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></motion.span> : <span className="absolute bottom-2 right-2 font-display text-3xl font-semibold text-white/25">0{index + 1}</span>}
            </div>
            <div className="p-2.5"><p className="truncate font-display text-xs font-semibold text-foreground">{card.title}</p><p className="mt-1 text-[10px] text-muted-foreground">Impact Kyoto</p></div>
          </motion.article>
        ))}
      </motion.div>
      <motion.div className="absolute bottom-5 left-6 right-6 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 backdrop-blur" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}><span className="text-xs text-primary">Preview a participant-approved demo</span><ArrowUpRight className="h-4 w-4 text-primary" /></motion.div>
    </div>
  );
}

function EventPreview({ reduceMotion }: { reduceMotion: boolean | null }) {
  const schedule = ["09:00 · Check-in", "10:00 · Opening", "16:30 · Live demos"];
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-7">
      <motion.div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl" animate={reduceMotion ? {} : { scale: [1, 1.18, 1], opacity: [0.45, 0.8, 0.45] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Live event hub</span><span className="text-xs text-muted-foreground">Hybrid · Kyoto</span></div><h3 className="mt-5 font-display text-3xl font-semibold tracking-tight text-foreground">Impact Kyoto<br /><span className="text-primary">2026</span></h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Everything a team needs before they build—collected in one shareable event page.</p></div>
      <div className="relative mt-4 min-h-5 font-mono text-xs text-primary"><TypingText text="Agentic AI for Japan's future" reduceMotion={reduceMotion} /></div>
      <div className="relative mt-4 space-y-3">{schedule.map((item, index) => <motion.div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-3" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.13 }}><motion.span className="h-2 w-2 rounded-full bg-primary" animate={reduceMotion || index !== 1 ? {} : { boxShadow: ["0 0 0 hsl(var(--primary)/0)", "0 0 12px hsl(var(--primary)/0.9)", "0 0 0 hsl(var(--primary)/0)"] }} transition={{ duration: 1.7, repeat: Infinity }} /><span className="text-sm text-foreground/90">{item}</span></motion.div>)}</div>
      <div className="relative mt-6 grid grid-cols-3 gap-2"><span className="rounded-lg bg-white/[0.05] p-2 text-center text-[10px] text-muted-foreground">Rules</span><span className="rounded-lg bg-white/[0.05] p-2 text-center text-[10px] text-muted-foreground">Judging</span><span className="rounded-lg bg-primary/15 p-2 text-center text-[10px] text-primary">Join</span></div>
    </div>
  );
}

function TicketPreview({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="relative flex min-h-[360px] h-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,hsl(216_38%_10%),hsl(220_48%_5%))] p-6">
      <motion.div className="absolute inset-0 opacity-35" animate={reduceMotion ? {} : { backgroundPosition: ["0% 0%", "100% 100%"] }} transition={{ duration: 9, repeat: Infinity, repeatType: "reverse" }} style={{ backgroundImage: "linear-gradient(115deg, transparent 30%, hsl(var(--primary)/0.25) 50%, transparent 70%)", backgroundSize: "200% 200%" }} />
      <motion.article className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-primary/35 bg-card/90 p-5 shadow-[0_0_50px_hsl(var(--primary)/0.18)]" initial={{ opacity: 0, rotate: -5, y: 20 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ duration: 0.55 }} whileHover={reduceMotion ? {} : { y: -5, rotate: 1 }}>
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Access pass</p><p className="mt-2 font-display text-lg font-semibold text-foreground">Impact Kyoto</p></div><TicketCheck className="h-6 w-6 text-primary" /></div>
        <div className="mt-6 flex items-center justify-between gap-5"><div className="relative grid h-28 w-28 grid-cols-5 gap-1 rounded-lg bg-white p-2">{Array.from({ length: 25 }).map((_, index) => <span key={index} className={cn("rounded-sm", [0, 1, 4, 5, 6, 9, 10, 12, 14, 15, 16, 18, 19, 20, 23, 24].includes(index) ? "bg-background" : "bg-primary/70")} />)}<motion.span className="absolute inset-x-0 h-px bg-primary shadow-[0_0_10px_hsl(var(--primary))]" animate={reduceMotion ? { top: "50%" } : { top: ["10%", "90%", "10%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} /></div><div className="space-y-2 text-right"><p className="text-xs font-semibold text-foreground">Mika Tanaka</p><p className="text-[11px] text-muted-foreground">Hybrid attendee</p><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"><CheckCircle2 className="h-3 w-3" />Ready</span></div></div>
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-muted-foreground"><span>QR check-in</span><span className="font-mono text-primary"><TypingText text="PASS-2048" reduceMotion={reduceMotion} /></span></div>
      </motion.article>
    </div>
  );
}

const FeaturePreviewSection = () => {
  const [activeKey, setActiveKey] = useState<PreviewKey>("projects");
  const reduceMotion = useReducedMotion();
  const active = previews.find((preview) => preview.key === activeKey) ?? previews[0];

  useEffect(() => {
    if (reduceMotion) return;
    const cycle = window.setInterval(() => {
      setActiveKey((current) =>
        current === "projects" ? "events" : current === "events" ? "tickets" : "projects",
      );
    }, 5200);
    return () => window.clearInterval(cycle);
  }, [reduceMotion]);

  return (
    <section id="features" className="relative overflow-hidden px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_10%,hsl(var(--primary)/0.12),transparent_70%)]" />
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-primary">One connected platform</p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">See the event experience before you join.</h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">Explore community projects, polished event pages, and operations built for an effortless day of building.</p>
            <div className="mt-8 space-y-2">{previews.map((preview) => { const Icon = preview.icon; const selected = activeKey === preview.key; return <button key={preview.key} type="button" onClick={() => setActiveKey(preview.key)} className={cn("group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all", selected ? "border-primary/40 bg-primary/10 shadow-[0_0_25px_hsl(var(--primary)/0.08)]" : "border-transparent hover:border-white/10 hover:bg-white/[0.03]")}><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", selected ? "border-primary/35 bg-primary/15 text-primary" : "border-white/10 bg-card text-muted-foreground")}><Icon className="h-4 w-4" /></span><span><span className={cn("block text-xs font-semibold uppercase tracking-[0.14em]", selected ? "text-primary" : "text-muted-foreground")}>{preview.label}</span><span className="mt-1 block font-display text-base font-semibold text-foreground">{preview.title}</span></span></button>; })}</div>
            <AnimatePresence mode="wait"><motion.div key={active.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mt-6"><p className="max-w-md text-sm leading-relaxed text-muted-foreground">{active.description}</p><Link to={active.href} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary/15 px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-primary transition-colors hover:bg-primary/25">{active.action}<ArrowUpRight className="h-4 w-4" /></Link></motion.div></AnimatePresence>
          </div>
          <AnimatePresence mode="wait"><motion.div key={active.key} initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -12 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>{active.key === "projects" ? <ProjectsPreview reduceMotion={reduceMotion} /> : active.key === "events" ? <EventPreview reduceMotion={reduceMotion} /> : <TicketPreview reduceMotion={reduceMotion} />}</motion.div></AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default FeaturePreviewSection;
