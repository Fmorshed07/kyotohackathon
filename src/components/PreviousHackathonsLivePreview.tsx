import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

export type PreviousHackathon = {
  id: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  when: string;
  whenNote: string;
  where: string;
  whereNote: string;
  focus: string;
  focusNote: string;
  previewUrl: string;
  siteLabel: string;
};

export const previousHackathons: PreviousHackathon[] = [
  {
    id: "impact-tokyo",
    eyebrow: "Global-impact AI hackathon · In-person in Tokyo",
    title: "IMPACT TOKYO 2026",
    titleAccent: "AI for Global Good",
    description:
      "Builders, designers, and changemakers in Tokyo for an impact-first AI hackathon — real problems, deployable solutions.",
    when: "7th March 2026",
    whenNote: "Full-day hackathon with focused building and live demos.",
    where: "Antler Head Office, Tokyo",
    whereNote:
      "A founder-first space in the heart of Tokyo, designed for building ambitious products.",
    focus: "AI for Global Good",
    focusNote:
      "Climate, education, healthcare, inequality, and other high-impact problem spaces.",
    previewUrl: "https://tokyohacackathon.vercel.app/",
    siteLabel: "tokyohacackathon.vercel.app",
  },
  {
    id: "impact-dhaka",
    eyebrow: "Urban AI hackathon · In-person in Dhaka",
    title: "Impact Dhaka 2026",
    titleAccent: "AI for Urban Transformation",
    description:
      "A high-energy, 6-hour sprint for builders and strategists on real Dhaka urban challenges. Presented by Cognisor AI.",
    when: "Date TBA",
    whenNote:
      "6-hour physical hackathon — schedule and timing on the event site.",
    where: "Dhaka",
    whereNote: "Exact venue announced on Luma and the Impact Dhaka site.",
    focus: "AI for Urban Transformation",
    focusNote:
      "Mobility, environment, public services, and smart-city themes.",
    previewUrl: "https://impactdhaka.vercel.app/",
    siteLabel: "impactdhaka.vercel.app",
  },
];

const detailFields = [
  { key: "when" as const, label: "When", noteKey: "whenNote" as const },
  { key: "where" as const, label: "Where", noteKey: "whereNote" as const },
  { key: "focus" as const, label: "Focus", noteKey: "focusNote" as const },
];

const HackathonLivePreviewCard = ({
  hackathon,
  index,
  isVisible,
}: {
  hackathon: PreviousHackathon;
  index: number;
  isVisible: boolean;
}) => (
  <motion.article
    className="poster-card text-left"
    initial={{ opacity: 1, y: 20 }}
    animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 1, y: 20 }}
    transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
  >
    <div className="border-b border-white/10 p-5 md:p-6">
      <p className="font-display text-xs tracking-[0.25em] text-secondary">
        {hackathon.eyebrow}
      </p>
      <h3 className="mt-2 font-display text-xl font-bold tracking-wide md:text-2xl">
        <span className="text-gradient-impact glow-impact">{hackathon.title}</span>
        {hackathon.titleAccent && (
          <>
            <span className="mx-2 text-white/30">·</span>
            <span className="text-gradient-sunset">{hackathon.titleAccent}</span>
          </>
        )}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">
        {hackathon.description}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {detailFields.map(({ key, label, noteKey }) => (
          <div key={key} className="poster-detail-tile">
            <p className="text-[0.65rem] uppercase tracking-[0.25em] text-primary/80">
              {label}
            </p>
            <p className="mt-1.5 font-display text-sm font-semibold text-foreground">
              {hackathon[key]}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {hackathon[noteKey]}
            </p>
          </div>
        ))}
      </div>

      <a
        href={hackathon.previewUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-poster-cta mt-5 inline-flex items-center gap-2 px-6 py-2.5 text-[0.65rem]"
      >
        View full hackathon website
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>

    <div className="bg-[hsl(248_45%_8%_/_0.6)] p-4 md:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-xs tracking-[0.2em] text-foreground">
          <span className="text-gradient-japanese">{hackathon.siteLabel}</span>
          <span className="text-white/50"> — live preview</span>
        </p>
        <a
          href={hackathon.previewUrl}
          target="_blank"
          rel="noreferrer"
          className="poster-pill inline-flex w-fit items-center gap-2 px-4 py-1.5 text-[0.6rem] text-primary"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>

      <div className="poster-preview-frame hackathon-live-preview">
        <div className="poster-preview-chrome">
          <span className="h-2 w-2 rounded-full bg-accent/90" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-secondary/90" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-primary/90" aria-hidden />
          <span className="ml-2 truncate font-mono text-[0.65rem] text-primary/70">
            {hackathon.siteLabel}
          </span>
        </div>
        <iframe
          title={`${hackathon.title} live website preview`}
          src={hackathon.previewUrl}
          className="h-[min(55vh,520px)] w-full bg-[#1A1B4B]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  </motion.article>
);

type PreviousHackathonsLivePreviewProps = {
  isVisible?: boolean;
};

const PreviousHackathonsLivePreview = ({
  isVisible = true,
}: PreviousHackathonsLivePreviewProps) => (
  <div id="previous-hackathons" className="relative mb-20 scroll-mt-24 text-left">
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
      <img
        src="/banner.png"
        alt=""
        className="h-full w-full object-cover opacity-[0.1]"
      />
      <div className="absolute inset-0 poster-section-bg opacity-90" />
    </div>

    <div className="relative rounded-3xl border border-white/10 p-6 md:p-8">
      <span className="poster-pill text-[0.6rem] tracking-[0.35em] text-primary">
        PAST EVENTS
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl lg:text-4xl">
        <span className="text-gradient-impact glow-impact">Previous hackathons</span>
        <span className="text-gradient-sunset"> — live preview</span>
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
        Scroll through each official event site below, or open the full website in a
        new tab.
      </p>

      <div className="mt-10 space-y-12">
        {previousHackathons.map((hackathon, index) => (
          <HackathonLivePreviewCard
            key={hackathon.id}
            hackathon={hackathon}
            index={index}
            isVisible={isVisible}
          />
        ))}
      </div>
    </div>

    <div
      className="mx-auto mt-16 h-px max-w-md bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      aria-hidden
    />
  </div>
);

export default PreviousHackathonsLivePreview;
