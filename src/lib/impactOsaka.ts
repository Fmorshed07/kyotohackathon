import type { HostedHackathon } from "@/lib/aiHackathons";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";

export const IMPACT_OSAKA_ID = "impact-osaka-2026";
export const IMPACT_OSAKA_SOURCE_URL = "https://luma.com/jnwil7tv";

export const IMPACT_OSAKA_TRACKS = [
  { id: "ai-video", name: "AI video for real-world impact" },
] as const;

export const getSubmissionTracks = (eventId: string) =>
  eventId === IMPACT_OSAKA_ID ? IMPACT_OSAKA_TRACKS : [];

export const getSubmissionTrackLabel = (eventId: string, trackId?: string | null) =>
  getSubmissionTracks(eventId).find((track) => track.id === trackId)?.name ?? trackId ?? "";

// Luma publishes these five criteria without numeric weights. Equal 20-point
// weights are platform defaults, editable by organisers; never replace a saved rubric.
export const IMPACT_OSAKA_DEFAULT_CRITERIA: JudgingCriterion[] = [
  { id: "problem_relevance", title: "Problem Relevance", weight: 20, questions: ["Who in Osaka or Kansai would benefit, and why does this problem matter?"] },
  { id: "innovation", title: "Innovation", weight: 20, questions: ["What makes the proposed solution distinctive?"] },
  { id: "elevenlabs_integration", title: "ElevenLabs Integration", weight: 20, questions: ["What does the ElevenLabs API contribute to the finished project?"] },
  { id: "video_execution", title: "Video Execution & Storytelling", weight: 20, questions: ["How clearly does the video explain the idea and persuade its audience?"] },
  { id: "impact_scalability", title: "Real-World Impact & Scalability", weight: 20, questions: ["How could the solution help Osaka, then reach other communities in Japan and abroad?"] },
];

/** Updated Luma main description checked 18 October 2026 JST.
 * The selected format follows the updated main description over older two-track copy.
 */
export const IMPACT_OSAKA: HostedHackathon = {
  id: IMPACT_OSAKA_ID,
  name: "Impact Osaka 2026 Hackathon",
  shortName: "Impact Osaka",
  eventDate: "Sunday, 18 October 2026 · 17:00–21:00 JST",
  startAt: "2026-10-18T08:00:00.000Z",
  endAt: "2026-10-18T12:00:00.000Z",
  endAtMs: Date.parse("2026-10-18T12:00:00.000Z"),
  timezone: "Asia/Tokyo",
  location: "Online via Discord · Osaka, Japan",
  theme: "AI Video for Real-World Impact",
  status: "upcoming",
  tagline: "Start with Osaka. Show what your idea could change.",
  summary: "A global online creative challenge alongside Global Startup Expo 2026. Use the ElevenLabs API to make a video about an Osaka or Kansai problem and a solution that could grow across Japan and beyond.",
  sourceDescription: [
    "### One shared challenge\nEveryone enters the same AI-video challenge. The four subject areas are inspiration: healthcare, industry, connected cities and sustainability. Other Osaka-focused ideas are welcome.",
    "### Your entry\nShare a titled video, ideally 60–120 seconds, with a local problem statement and an explanation of its wider impact. Meaningful use of the ElevenLabs API is required; other creative tools are welcome.",
    "### Evaluation\nJudges consider relevance, originality, ElevenLabs integration, video communication and practical impact.",
    "### Awards\nPrizes include three-month ElevenLabs Pro and Scale subscriptions. Final award categories will be announced by the organisers.",
    "### Joining\nParticipate online from anywhere. Register on Luma for Discord access. First-time participants are welcome.",
  ].join("\n\n"),
  format: "Online hackathon · one AI-video challenge",
  eligibility: "Open to students, developers, researchers, founders, designers, creators and first-time participants.",
  teamSize: "Individuals and teams · maximum size not specified",
  prize: "3-month ElevenLabs Pro and Scale plans · final award categories announced by the organisers",
  requirements: [
    "Register on the official Luma event and obtain the host's joining instructions.",
    "Enter the shared AI-video challenge with a project title and accessible final video (60–120 seconds recommended).",
    "Explain the Osaka or Kansai problem, your proposed solution and who benefits.",
    "Use the ElevenLabs API meaningfully and describe how it contributes to the project.",
    "Show how the idea could expand across Japan and internationally.",
  ],
  schedule: [
    { time: "17:00–17:30 JST", title: "Opening & briefing", description: "Meet the community and hear the challenge." },
    { time: "17:30–18:00 JST", title: "ElevenLabs talk", description: "Explore creative uses of the platform." },
    { time: "18:00–19:30 JST", title: "Build & submit", description: "Create your video and share the project." },
    { time: "19:30–20:30 JST", title: "Showcase & judging", description: "Watch the entries and meet their creators." },
    { time: "20:30–21:00 JST", title: "Awards & closing", description: "Celebrate the projects and wrap up." },
  ],
  judgingCriteriaNames: IMPACT_OSAKA_DEFAULT_CRITERIA.map((criterion) => criterion.title),
  focusAreas: ["Healthcare & longevity", "AI, robotics & industry", "Mobility & accessibility", "Energy & infrastructure"],
  rulebookUrl: "",
  coverImageUrl: "/events/impact-osaka-2026/cover.jpg",
  bannerImageUrl: "/events/impact-osaka-2026/banner.png",
  galleryUrls: [],
  guests: [],
  organizerName: "Cognisor AI Lab",
  logoUrl: "/app.png",
  organizerLinks: [
    { name: "Cognisor AI", url: "https://www.cognisorai.com" },
    { name: "TIU Impact Next", url: "https://www.tiuimpactnext.com" },
    { name: "Creators Circuit", url: "https://www.creatorscircuit.tech" },
    { name: "Peer Portal", url: "https://www.peerportal.app" },
    { name: "ElevenLabs", url: "https://elevenlabs.io" },
  ],
  lumaUrl: IMPACT_OSAKA_SOURCE_URL,
  sourceUrl: IMPACT_OSAKA_SOURCE_URL,
  sourceImportedAt: "2026-10-17T16:24:18.000Z",
  sourceLifecycleAutomatic: true,
  registrationStatus: "open",
  registrationNote: "Register on Luma for Discord access and the latest joining instructions.",
  ticketPriceLabel: "Free",
  registrationQuestions: [
    { label: "Full name", required: true },
  ],
  published: true,
  createdAt: "2026-10-16T19:01:09.000Z",
  createdBy: "luma-public-import",
  aiGenerated: false,
  createdManually: true,
  accentColor: "#60A5FA",
  fontPreset: "horizon",
  layoutStyle: "stage",
};
