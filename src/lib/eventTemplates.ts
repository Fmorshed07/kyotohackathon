import type { HostEventBriefForm } from "@/lib/hostEventBriefForm";
import type { EventFontPreset, EventLayoutStyle } from "@/lib/eventBranding";

export type EventTemplateCategory =
  | "Ideathon"
  | "Hackathon"
  | "Sprint"
  | "Demo"
  | "Summit"
  | "Studio";

export type EventTemplate = {
  id: string;
  name: string;
  blurb: string;
  category: EventTemplateCategory;
  accentColor: string;
  fontPreset: EventFontPreset;
  layoutStyle: EventLayoutStyle;
  /** Short visual cue for the gallery card gradient. */
  mood: string;
  apply: () => HostEventBriefForm;
};

const base = (
  partial: Omit<HostEventBriefForm, "coverImageUrl" | "bannerImageUrl" | "logoUrl" | "galleryUrls" | "guests" | "rulebookUrl"> &
    Partial<Pick<HostEventBriefForm, "coverImageUrl" | "bannerImageUrl" | "logoUrl" | "galleryUrls" | "guests" | "rulebookUrl">>,
): HostEventBriefForm => ({
  coverImageUrl: "",
  bannerImageUrl: "",
  logoUrl: "",
  galleryUrls: [],
  guests: [],
  rulebookUrl: "",
  ...partial,
});

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "ai-ideathon",
    name: "AI Ideathon",
    blurb: "Three-day online ideathon with workshops, mentorship, and a clear problem-first arc.",
    category: "Ideathon",
    accentColor: "#00A3FF",
    fontPreset: "signal",
    layoutStyle: "stage",
    mood: "from-sky-500/40 via-cyan-400/10 to-transparent",
    apply: () =>
      base({
        name: "AI Ideathon 2026",
        tagline: "Build AI Solutions That Solve Real World Problems",
        description:
          "Have an idea that could solve a real problem?\n\nJoin AI Ideathon 2026, a three-day online AI hackathon where students, developers, designers, founders, entrepreneurs, and AI enthusiasts come together to turn ideas into working AI powered solutions.\n\nAcross three days, participants will learn from industry experts, join practical workshops, receive mentorship, build rapidly, and present their solutions to industry judges.\n\nWhether you are exploring AI for the first time or already building products, this hackathon gives you the structure, guidance, tools, and exposure to move from an idea to a real prototype.\n\nFor international participants, register at https://www.cognisorai.com/events/hackathon",
        theme: "AI for Real World Impact",
        format: "Online · 3 days",
        eligibility: "Open to participants worldwide",
        teamSize: "Solo or teams of 1–4 members",
        prize:
          "More than USD 10,000 in prizes and credits — Champion: USD 5,000 ai& credits + ¥12,000; First Runner Up: USD 3,000 ai& credits + ¥8,000; Second Runner Up: USD 2,000 ai& credits + ¥5,000; plus Open Design awards up to USD 1,200",
        registrationUrl: "https://luma.com/e56k7x3v",
        highlightNote:
          "Regular registration has officially closed. Limited slots are now available through late registration.",
        focusAreas:
          "Education, Healthcare, Finance, Agriculture, Accessibility, Sustainability, Tourism, Smart Cities, Social Impact, Climate Technology",
        schedule: [
          {
            time: "Aug 13 · Webinar",
            title: "Building with AI in 2026: Inside Japan’s AI Startup Ecosystem",
            description:
              "Explore Japan’s AI landscape, startup stories, and practical advice for launching AI products.",
          },
          {
            time: "Aug 13 · Workshop",
            title: "From Problem to Product: Building AI Solutions People Actually Need",
            description:
              "Identify meaningful problems, validate ideas, define users, and leave with an MVP roadmap.",
          },
          {
            time: "Aug 13 · Fireside Chat",
            title: "Why Strong Startups Stall in Japan and What Actually Earns Trust Here",
            description:
              "What founders need to understand about trust, relationships, and business culture in Japan.",
          },
          {
            time: "Aug 13 · Webinar",
            title: "Bangladesh Startup Ecosystem: Is it Now the Right Time to Fundraise?",
            description:
              "Fundraising readiness, investor expectations, and how founders can position for growth.",
          },
          {
            time: "Aug 14 · Workshop",
            title: "Vibe Design: Turning Ideas into Products with Open Design",
            description:
              "Rapidly design and prototype AI products with Open Design for demos and presentations.",
          },
          {
            time: "Aug 14 · Workshop",
            title: "Beyond the Demo: Turning Hackathon Projects into Real AI Products",
            description:
              "Move past the demo — validate needs, strengthen product direction, and plan what comes next.",
          },
          {
            time: "Aug 15 · Webinar",
            title: "From Pitch to Funding: How Founders Win Investors",
            description:
              "Structure a compelling pitch, demonstrate value, and answer judges’ questions with confidence.",
          },
        ],
        organizerName: "Cognisor AI Lab",
        accentColor: "#00A3FF",
        fontPreset: "signal",
        layoutStyle: "stage",
        startAt: "2026-08-13T00:00",
        endAt: "2026-08-15T23:59",
        location: "Online",
        capacity: "200",
      }),
  },
  {
    id: "weekend-sprint",
    name: "Weekend Build Sprint",
    blurb: "48-hour high-energy sprint with checkpoints, mentors, and a Sunday showcase.",
    category: "Sprint",
    accentColor: "#FF6A3D",
    fontPreset: "signal",
    layoutStyle: "signal",
    mood: "from-orange-500/45 via-rose-500/10 to-transparent",
    apply: () =>
      base({
        name: "Weekend Build Sprint",
        tagline: "Ship something real before Monday",
        description:
          "A focused 48-hour build weekend for makers who want momentum.\n\nKick off Friday evening, build through Saturday with mentor checkpoints, and demo on Sunday afternoon.\n\nBring a half-formed idea or form a team on the spot.",
        theme: "Ship fast · learn faster",
        format: "Hybrid · 48 hours",
        eligibility: "Builders, designers, and PMs 16+",
        teamSize: "Teams of 2–5 preferred",
        prize: "Swag, mentor office hours, and a featured write-up",
        registrationUrl: "",
        highlightNote: "Bring your laptop. Food and workspace details are shared after registration.",
        focusAreas: "Prototyping, Product craft, DX tools, Community products, Internal tooling",
        schedule: [
          {
            time: "Fri 18:00",
            title: "Kickoff & team formation",
            description: "Problem framing, teammate matching, and sprint goals.",
          },
          {
            time: "Sat 11:00",
            title: "Mentor checkpoint",
            description: "15-minute reviews to unstick scope and architecture choices.",
          },
          {
            time: "Sat 20:00",
            title: "Night build",
            description: "Open floor, music optional, mentors on call.",
          },
          {
            time: "Sun 15:00",
            title: "Demo day",
            description: "3-minute demos + peer voting.",
          },
        ],
        organizerName: "",
        accentColor: "#FF6A3D",
        fontPreset: "signal",
        layoutStyle: "signal",
        startAt: "",
        endAt: "",
        location: "Hybrid",
        capacity: "80",
      }),
  },
  {
    id: "climate-lab",
    name: "Climate Impact Lab",
    blurb: "Editorial, research-led format for climate, energy, and planetary health builds.",
    category: "Hackathon",
    accentColor: "#2DD4A8",
    fontPreset: "atelier",
    layoutStyle: "folio",
    mood: "from-emerald-400/40 via-teal-500/10 to-transparent",
    apply: () =>
      base({
        name: "Climate Impact Lab",
        tagline: "Prototype tools for a livable planet",
        description:
          "A week-long lab for climate, energy, and ecological problem-solvers.\n\nWork with domain mentors, open datasets, and a judging rubric weighted toward measurable impact.\n\nFinal demos should show a credible path from prototype to field use.",
        theme: "Climate · Energy · Resilience",
        format: "Hybrid · 7 days",
        eligibility: "Open to interdisciplinary teams worldwide",
        teamSize: "Teams of 2–6",
        prize: "Pilot funding pathway + mentor network introductions",
        registrationUrl: "",
        highlightNote: "Dataset pack and partner briefs are released after kickoff.",
        focusAreas: "Energy, Agriculture, Water, Biodiversity, Adaptation, Carbon accounting",
        schedule: [
          {
            time: "Mon",
            title: "Briefing & datasets",
            description: "Partner problem statements and open data walkthrough.",
          },
          {
            time: "Wed",
            title: "Mentor clinics",
            description: "Climate science, policy, and product clinic hours.",
          },
          {
            time: "Fri",
            title: "Working demos",
            description: "Soft reviews before final polish.",
          },
          {
            time: "Sun",
            title: "Impact showcase",
            description: "Public demos judged on feasibility and impact.",
          },
        ],
        organizerName: "",
        accentColor: "#2DD4A8",
        fontPreset: "atelier",
        layoutStyle: "folio",
        startAt: "",
        endAt: "",
        location: "Hybrid",
        capacity: "120",
      }),
  },
  {
    id: "campus-demo",
    name: "Campus Demo Day",
    blurb: "Magazine-style campus showcase for student projects, clubs, and research labs.",
    category: "Demo",
    accentColor: "#E8B84A",
    fontPreset: "editorial",
    layoutStyle: "folio",
    mood: "from-amber-400/40 via-yellow-500/10 to-transparent",
    apply: () =>
      base({
        name: "Campus Demo Day",
        tagline: "Student builders, on stage",
        description:
          "A one-day campus showcase for clubs, research labs, and student startups.\n\nShort demos, poster corners, and recruiter walkthroughs — designed to feel like a publication come to life.\n\nIdeal for universities and student communities.",
        theme: "Campus innovation",
        format: "In person · 1 day",
        eligibility: "Current students and recent graduates",
        teamSize: "Solo presenters or teams of up to 5",
        prize: "Audience choice awards + internship intros",
        registrationUrl: "",
        highlightNote: "Poster boards and AV are provided. Bring a 3-minute demo.",
        focusAreas: "Student startups, Research demos, Club projects, Open source",
        schedule: [
          {
            time: "10:00",
            title: "Doors & gallery open",
            description: "Poster setup and informal networking.",
          },
          {
            time: "11:30",
            title: "Demo block A",
            description: "Back-to-back stage demos.",
          },
          {
            time: "14:00",
            title: "Demo block B",
            description: "Second wave + recruiter corridor.",
          },
          {
            time: "16:30",
            title: "Awards",
            description: "Audience choice and faculty picks.",
          },
        ],
        organizerName: "",
        accentColor: "#E8B84A",
        fontPreset: "editorial",
        layoutStyle: "folio",
        startAt: "",
        endAt: "",
        location: "Campus hall",
        capacity: "150",
      }),
  },
  {
    id: "founders-pitch",
    name: "Founders Pitch Night",
    blurb: "Stage-led evening for early founders — sharp pitches, investor Q&A, and community votes.",
    category: "Summit",
    accentColor: "#8B7CFF",
    fontPreset: "horizon",
    layoutStyle: "stage",
    mood: "from-violet-500/45 via-indigo-400/10 to-transparent",
    apply: () =>
      base({
        name: "Founders Pitch Night",
        tagline: "Five minutes. One story. Real feedback.",
        description:
          "An evening built for early-stage founders who need crisp storytelling practice.\n\nEach team gets a timed pitch, investor-style questions, and community feedback cards.\n\nCinematic stage layout — brand-first, distraction-light.",
        theme: "Founder storytelling",
        format: "In person · Evening",
        eligibility: "Pre-seed and seed founders",
        teamSize: "1–3 presenters per startup",
        prize: "Office hours with operators + community spotlight",
        registrationUrl: "",
        highlightNote: "Pitch deck deadline is 48 hours before showtime.",
        focusAreas: "AI products, Climate tech, Fintech, Health, Creator tools",
        schedule: [
          {
            time: "18:30",
            title: "Doors & networking",
            description: "Light bites and founder mingling.",
          },
          {
            time: "19:15",
            title: "Pitch block",
            description: "Timed pitches with Q&A.",
          },
          {
            time: "21:00",
            title: "Community vote & close",
            description: "Audience choice and informal afterchat.",
          },
        ],
        organizerName: "",
        accentColor: "#8B7CFF",
        fontPreset: "horizon",
        layoutStyle: "stage",
        startAt: "",
        endAt: "",
        location: "Venue TBA",
        capacity: "100",
      }),
  },
  {
    id: "design-ai-studio",
    name: "Design × AI Studio",
    blurb: "Warm atelier format for designers and multimodal builders exploring AI craft.",
    category: "Studio",
    accentColor: "#F472B6",
    fontPreset: "atelier",
    layoutStyle: "folio",
    mood: "from-pink-400/40 via-fuchsia-500/10 to-transparent",
    apply: () =>
      base({
        name: "Design × AI Studio",
        tagline: "Craft interfaces, systems, and stories with AI",
        description:
          "A studio weekend for designers, creative technologists, and multimodal builders.\n\nCritique circles, tool demos, and a closing exhibition — less leaderboard, more craft.\n\nBring Figma, code, or both.",
        theme: "Design systems · Multimodal AI",
        format: "Hybrid · Weekend",
        eligibility: "Designers, creatives, and builders of all levels",
        teamSize: "Solo or pairs",
        prize: "Exhibition feature + critique from guest designers",
        registrationUrl: "",
        highlightNote: "Optional materials kit list is shared after signup.",
        focusAreas: "UX, Generative craft, Design systems, Brand, Prototyping",
        schedule: [
          {
            time: "Sat AM",
            title: "Studio kickoff",
            description: "Prompts, constraints, and tool demos.",
          },
          {
            time: "Sat PM",
            title: "Critique circles",
            description: "Small-group feedback on work-in-progress.",
          },
          {
            time: "Sun",
            title: "Exhibition",
            description: "Walls, screens, and short artist talks.",
          },
        ],
        organizerName: "",
        accentColor: "#F472B6",
        fontPreset: "atelier",
        layoutStyle: "folio",
        startAt: "",
        endAt: "",
        location: "Studio / Online",
        capacity: "60",
      }),
  },
  {
    id: "civic-marathon",
    name: "Civic Tech Marathon",
    blurb: "Dense signal-board marathon for public services, cities, and open government builds.",
    category: "Hackathon",
    accentColor: "#00A3FF",
    fontPreset: "horizon",
    layoutStyle: "signal",
    mood: "from-cyan-400/40 via-blue-500/10 to-transparent",
    apply: () =>
      base({
        name: "Civic Tech Marathon",
        tagline: "Public problems. Working prototypes.",
        description:
          "A multi-day civic tech marathon pairing builders with city and NGO briefs.\n\nExpect open data, policy mentors, and a judging rubric that rewards usability for real residents.\n\nSignal layout keeps programme and requirements easy to scan.",
        theme: "Public services · Cities · Open data",
        format: "Hybrid · 4 days",
        eligibility: "Open to civic builders and community organisers",
        teamSize: "Teams of 3–6",
        prize: "Pilot conversations with partner agencies",
        registrationUrl: "",
        highlightNote: "Partner briefs are confidential until kickoff under NDA-light terms.",
        focusAreas: "Mobility, Housing, Permitting, Accessibility, Emergency response",
        schedule: [
          {
            time: "Day 0",
            title: "Briefings",
            description: "Agency partners present live constraints.",
          },
          {
            time: "Days 1–2",
            title: "Build + clinic hours",
            description: "Policy and UX clinics twice daily.",
          },
          {
            time: "Day 3",
            title: "Public demos",
            description: "Resident-facing walkthroughs and judging.",
          },
        ],
        organizerName: "",
        accentColor: "#00A3FF",
        fontPreset: "horizon",
        layoutStyle: "signal",
        startAt: "",
        endAt: "",
        location: "City hub / Online",
        capacity: "140",
      }),
  },
  {
    id: "women-ai-summit",
    name: "Women in AI Summit",
    blurb: "Editorial summit template — talks, panels, and a builder track with a stage hero.",
    category: "Summit",
    accentColor: "#8B7CFF",
    fontPreset: "editorial",
    layoutStyle: "stage",
    mood: "from-violet-400/45 via-purple-500/10 to-transparent",
    apply: () =>
      base({
        name: "Women in AI Summit",
        tagline: "Leaders, builders, and the next chapter of AI",
        description:
          "A one-day summit celebrating women and non-binary leaders across AI research, product, and community.\n\nKeynotes, panels, and a parallel builder track — designed to feel like a living magazine.\n\nInclusive by default; allies welcome.",
        theme: "Leadership · Research · Community",
        format: "Hybrid · 1 day",
        eligibility: "Open registration · priority for women and non-binary attendees",
        teamSize: "Individual attendance · optional builder teams",
        prize: "Scholarships and mentorship matches",
        registrationUrl: "",
        highlightNote: "Captioning and accessibility options are available on request.",
        focusAreas: "Research, Product leadership, Safety, Education, Entrepreneurship",
        schedule: [
          {
            time: "09:30",
            title: "Opening keynote",
            description: "Field notes from the frontier of applied AI.",
          },
          {
            time: "11:00",
            title: "Panels",
            description: "Product, research, and community tracks.",
          },
          {
            time: "14:00",
            title: "Builder labs",
            description: "Hands-on sessions in parallel rooms.",
          },
          {
            time: "17:00",
            title: "Closing circle",
            description: "Commitments, mentorship matching, and toast.",
          },
        ],
        organizerName: "",
        accentColor: "#8B7CFF",
        fontPreset: "editorial",
        layoutStyle: "stage",
        startAt: "",
        endAt: "",
        location: "Hybrid",
        capacity: "250",
      }),
  },
];

export const EVENT_TEMPLATE_CATEGORIES: Array<EventTemplateCategory | "All"> = [
  "All",
  "Ideathon",
  "Hackathon",
  "Sprint",
  "Demo",
  "Summit",
  "Studio",
];

export function getEventTemplate(id: string) {
  return EVENT_TEMPLATES.find((template) => template.id === id) ?? null;
}
