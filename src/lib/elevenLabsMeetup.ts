import type { HostedHackathon } from "@/lib/aiHackathons";
import type { HackathonStatus } from "@/lib/hackathons";

export const ELEVENLABS_MEETUP_ID = "elevenlabs-meetup-tokyo-2026";
export const ELEVENLABS_MEETUP_SOURCE_URL = "https://luma.com/1phsvlq5";

/**
 * Public Luma event and __NEXT_DATA__ metadata, checked 9 October 2026 (JST).
 * This listing is available without Firebase. A persisted organiser listing for
 * the same id takes precedence. Registration remains with the official host.
 */
export const ELEVENLABS_MEETUP: HostedHackathon = {
  id: ELEVENLABS_MEETUP_ID,
  name: "ElevenLabs Meetup Tokyo: Build with ElevenCreative",
  shortName: "ElevenLabs Tokyo",
  eventDate: "Friday, 9 October 2026 · 18:00–22:00 JST",
  startAt: "2026-10-09T09:00:00Z",
  endAt: "2026-10-09T13:00:00Z",
  timezone: "Asia/Tokyo",
  location: "Mercari, Inc., Roppongi Hills Mori Tower, 6-chōme-10-1 Roppongi, Minato City, Tokyo 106-6118, Japan",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=35.6605491%2C139.7289367&query_place_id=ChIJqyOoCXeLGGARCeelbwEiSLY",
  theme: "Career & Hiring in Japan",
  status: "upcoming",
  summary: "Explore the latest ElevenLabs tools in Tokyo, try a live ElevenCreative demonstration, then spend 60 minutes creating a 40–60 second video about a career or hiring challenge in Japan. Share your work with the community, compete for ElevenLabs plan prizes, and meet other creators and builders.",
  sourceDescription: [
    "A practical Tokyo community meetup introduces recent ElevenLabs developments and examples of what people create with its tools. An ElevenCreative demonstration shows how voice, audio, music, images and video can work together. Participants then have one hour to experiment and present their own work.",
    "The challenge addresses career and hiring issues in Japan. Make a video lasting 40 seconds to one minute with Eleven Creative. Possible topics include job searches, interviews, recruiting, career growth, international talent, communication, language differences, cultural barriers and the future of work. Enter alone or in a team of up to three. Communicate one clear problem, message, idea or solution; a finished business or software product is not required.",
    "The session explores speech generation, voice design, sound effects, AI music, image and video workflows, and combining those capabilities through ElevenCreative. New users are welcome alongside creators, developers, AI builders, students, designers, startup builders, existing ElevenLabs users and anyone interested in creative AI.",
    "The top team receives three months of ElevenLabs Scale Tier, and the runner-up receives three months of ElevenLabs Pro Tier. All participants receive access to the ElevenLabs Creative Plan; the source does not specify how long that access lasts. Judges consider the idea, execution, creativity, connection to the challenge and use of ElevenLabs technology. Numeric judging weights are not published.",
    "Attendees can leave with a clearer understanding of the platform, practical experience, their own creative experiment, ideas inspired by other projects, and new connections in Tokyo's AI community.",
    "Presented by Cognisor AI Lab and organised with Cognisor, Creators Circuit and ElevenLabs. The public host list includes cognisor. ai, Mir Farhan Morshed, Irfan Faisal, Eleven Creative and peer portal. Mercari provides cooperation. Its company introduction describes its mission of circulating value through services including the Mercari marketplace and Merpay.",
    "Standard admission is free. At the time this information was imported, the event was full and the waitlist was open. Register or join the waitlist on Luma for current availability and host updates. Luma requests a full name and institution or company; LinkedIn and Instagram profiles are optional.",
  ].join("\n\n"),
  format: "In-person community meetup · 60-minute creative video challenge",
  eligibility: "Creators, developers, AI builders, students, designers, startup builders and anyone curious about ElevenLabs. No ElevenLabs expertise required.",
  teamSize: "Solo or teams of up to 3",
  prize: "Winner: 3 months of ElevenLabs Scale Tier. Runner-up: 3 months of ElevenLabs Pro Tier. All participants: access to the ElevenLabs Creative Plan.",
  requirements: [
    "Choose a career or hiring challenge in Japan.",
    "Use Eleven Creative to make a video lasting 40 seconds to 1 minute.",
    "Enter solo or in a team of no more than 3 people.",
    "Explain a clear problem, idea, message or solution in your video.",
    "Build during the 60-minute challenge and present your work at the showcase.",
    "Register or join the waitlist through the official Luma page.",
  ],
  schedule: [
    { time: "18:00–18:30 JST", title: "Doors Open & Check-in", description: "Arrive and check in at Mercari." },
    { time: "18:30–19:00 JST", title: "Opening & Partner Spotlight", description: "Meet the partners and explore ElevenLabs updates and ElevenCreative." },
    { time: "19:00–20:00 JST", title: "Creative Build Challenge", description: "60 minutes to create your video about career and hiring challenges in Japan." },
    { time: "20:00–20:45 JST", title: "Project Showcase & Final Judging", description: "Present your video to the community and judges." },
    { time: "20:45–21:00 JST", title: "Awards & Winner Reveal", description: "The winner and runner-up receive ElevenLabs plan prizes." },
    { time: "21:00–21:30 JST", title: "Food, Networking & Connections", description: "Connect with other creators, developers, students and AI builders." },
    { time: "21:30–22:00 JST", title: "Closing & Final Wrap-up", description: "Close the meetup and wrap up the evening." },
  ],
  judgingCriteriaNames: ["Quality of the idea", "Execution", "Creativity", "Relevance to the challenge", "Use of ElevenLabs technology"],
  focusAreas: ["AI voice & text to speech", "Voice design", "Audio & sound effects", "AI music", "Image & video workflows", "ElevenCreative"],
  rulebookUrl: "",
  coverImageUrl: "https://images.lumacdn.com/uploads/h1/abdba94a-f1ee-4979-a96e-b539ab370e63.png",
  bannerImageUrl: "https://images.lumacdn.com/event-social/e7/f08d8432-5e5d-45ba-853d-10e418413362.png",
  galleryUrls: [],
  guests: [],
  organizerName: "Cognisor AI Lab",
  logoUrl: "https://images.lumacdn.com/uploads/jy/19bd26b4-1b84-4026-b664-366ec51c0844.png",
  organizerLinks: [
    { name: "Cognisor", url: "https://www.cognisorai.com", imageUrl: "https://images.lumacdn.com/uploads/ym/59d11731-72a0-46c2-a418-ca69b659f9e6.png" },
    { name: "Creators Circuit", url: "https://www.creatorscircuit.tech", imageUrl: "https://images.lumacdn.com/uploads/31/e2bd179f-3a31-4242-ace2-f12aa64eb5ac.jpg" },
    { name: "ElevenLabs", url: "https://elevenlabs.io", imageUrl: "https://images.lumacdn.com/uploads/s9/6d98a0c2-643e-4db0-8096-f359f4b410e4.png" },
  ],
  hostProfiles: [
    { name: "cognisor. ai", url: "https://luma.com/user/usr-k6FrKDtjWXf67Fg", imageUrl: "https://images.lumacdn.com/avatars/nh/2edbfd2b-0fe8-4e94-b8e3-8360b0c84e99.png" },
    { name: "Mir Farhan Morshed", url: "https://luma.com/user/usr-GZWDFRioPNO1QdF", imageUrl: "https://images.lumacdn.com/avatars/6x/a0416b99-dbd5-404a-a2e3-cdb682188d66" },
    { name: "Irfan Faisal", url: "https://luma.com/user/irfan69", imageUrl: "https://images.lumacdn.com/uploads/rg/7d23c839-41e8-4115-9754-4b85b4a259df.jpg" },
    { name: "Eleven Creative", url: "https://luma.com/user/ElevenCreative", imageUrl: "https://images.lumacdn.com/avatars/3v/590cba30-0727-44f1-ab92-5a3c9b39fef9.png" },
    { name: "peer portal", url: "https://luma.com/user/peerportal", imageUrl: "https://images.lumacdn.com/uploads/6v/dec0ff73-1bc0-4cb7-8ca4-649a3b3caa09.jpg" },
  ],
  cooperationNote: "Cooperation / 協力: 株式会社メルカリ (Mercari)",
  cooperationImageUrl: "https://images.lumacdn.com/editor-images/jr/c116dfa5-1b5e-4112-9e4e-171ce393645a.png",
  lumaUrl: ELEVENLABS_MEETUP_SOURCE_URL,
  sourceUrl: ELEVENLABS_MEETUP_SOURCE_URL,
  sourceImportedAt: "2026-10-08T15:32:16Z",
  sourceLifecycleAutomatic: true,
  registrationStatus: "waitlist",
  registrationNote: "Event full. Join the waitlist on Luma; the host will notify you if a place becomes available.",
  ticketPriceLabel: "Free",
  registrationQuestions: [
    { label: "Full name", required: true },
    { label: "Institution / company", required: true },
    { label: "LinkedIn profile", required: false },
    { label: "Instagram profile", required: false },
  ],
  published: true,
  createdAt: "2026-10-08T15:32:16Z",
  createdBy: "luma-public-import",
  aiGenerated: false,
  createdManually: true,
  accentColor: "#E67E45",
  fontPreset: "horizon",
  layoutStyle: "stage",
  tagline: "Explore ElevenLabs. Create with ElevenCreative. Share your work.",
};

export function getBundledEventStatus(startAt: string, endAt: string, now = new Date()): HackathonStatus {
  if (now.getTime() >= new Date(endAt).getTime()) return "past";
  return now.getTime() >= new Date(startAt).getTime() ? "active" : "upcoming";
}

export function getBundledHackathon(id: string, now = new Date()): HostedHackathon | null {
  if (id !== ELEVENLABS_MEETUP_ID) return null;
  const status = getBundledEventStatus(ELEVENLABS_MEETUP.startAt!, ELEVENLABS_MEETUP.endAt!, now);
  return { ...ELEVENLABS_MEETUP, status, submissionMode: status === "past" ? "closed" : "open" };
}

export function getBundledHackathons(now = new Date()): HostedHackathon[] {
  return [getBundledHackathon(ELEVENLABS_MEETUP_ID, now)!];
}

/** Cloud rows win, including an explicit unpublished override. */
export function mergeBundledHackathons(events: HostedHackathon[], now = new Date()): HostedHackathon[] {
  const byId = new Map(getBundledHackathons(now).map((event) => [event.id, event]));
  for (const event of events) {
    byId.set(event.id, { ...byId.get(event.id), ...event });
  }
  return [...byId.values()];
}
