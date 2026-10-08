/** Public past calendar and event pages checked on 2026-10-09. No private venue data. */
export const LUMA_CALENDAR_URL = "https://luma.com/cognisorailabs?period=past";
export const LUMA_ARCHIVE_CHECKED_AT = "2026-10-09";

export type LumaArchiveEntry = {
  slug: string;
  portalIds?: string[];
  name: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location: string;
  format: string;
  organizerName: string;
  coverImageUrl: string;
  summary: string;
};

export const LUMA_CALENDAR_ARCHIVE: LumaArchiveEntry[] = [
  {
    slug: "sorwsk0c",
    name: "Future of Work in AI Era : Build You Career In Japan.",
    startAt: "2026-09-24T09:00:00.000Z", endAt: "2026-09-24T11:00:00.000Z", timezone: "Asia/Tokyo",
    location: "CIC Tokyo, Tokyo, Japan", format: "Meetup · In person", organizerName: "Cognisor AI Lab",
    coverImageUrl: "https://images.lumacdn.com/uploads/9j/0520f8dd-2d14-472f-bd0f-e19ff2548f95.png",
    summary: "A conversation about AI, hiring, and building a career in Japan, alongside the launch of PeerPortal.",
  },
  {
    slug: "nextai-u4ix",
    name: "「ai& × Shipaton」ワークショップ 〜AIを駆使して爆速でアプリをShipしよう〜",
    startAt: "2026-09-04T09:00:00.000Z", endAt: "2026-09-04T12:00:00.000Z", timezone: "Asia/Tokyo",
    location: "WisSquare GLOXIA ginza, Tokyo, Japan", format: "Workshop · In person", organizerName: "Next AI Leaders",
    coverImageUrl: "https://images.lumacdn.com/uploads/20/c5859c39-16d9-40b0-b158-a1a718a07d7c.png",
    summary: "A hands-on development sprint using AI tools to move an app from prototype toward publishing for Shipaton.",
  },
  {
    slug: "e56k7x3v", portalIds: ["ai-ideathon-2026-q9pxii"], name: "AI Ideathon 2026",
    startAt: "2026-08-13T05:00:00.000Z", endAt: "2026-08-15T11:00:00.000Z", timezone: "Asia/Tokyo",
    location: "Online", format: "Hackathon · Online", organizerName: "Cognisor AI Lab",
    coverImageUrl: "https://images.lumacdn.com/uploads/tu/f7ebc24a-a4fd-4098-884d-1a69ab8fccb4.png",
    summary: "Three days of workshops, mentorship, and prototyping AI solutions for real-world problems.",
  },
  {
    slug: "v8fcjqic", name: "MERGE 2026 - AI駆動開発 × Design",
    startAt: "2026-08-08T01:00:00.000Z", endAt: "2026-08-08T11:00:00.000Z", timezone: "Asia/Tokyo",
    location: "住友不動産西新宿ビル, Tokyo, Japan", format: "Conference · Hybrid", organizerName: "Next AI Leaders",
    coverImageUrl: "https://images.lumacdn.com/uploads/cu/c7c4a8d4-5878-4ed3-aaa3-8e49cc11191f.jpg",
    summary: "A gathering exploring where AI-driven development, human-centred design, and new product creation meet.",
  },
  {
    slug: "vxkrxn7e", name: "AI Designathon @ MERGE 2026",
    startAt: "2026-07-25T01:00:00.000Z", endAt: "2026-08-07T20:00:00.000Z", timezone: "Asia/Tokyo",
    location: "Online", format: "Hackathon · Online", organizerName: "Next AI Leaders",
    coverImageUrl: "https://images.lumacdn.com/uploads/uz/c4b704b9-def2-4f2a-84d2-85c2a9d064c8.png",
    summary: "An AI-native product challenge connected to MERGE 2026, spanning product builds, agents, and design engineering.",
  },
  {
    slug: "cmevass2", portalIds: ["impact-kyoto"],
    name: "【IVS Official Side Event】Impact Kyoto Hackathon 2026 (インパクト京都ハッカソン2026) : Agentic AI for Japan's Future",
    startAt: "2026-07-04T03:00:00.000Z", endAt: "2026-07-04T08:00:00.000Z", timezone: "Asia/Tokyo",
    location: "Kyoto, Japan · Venue shared with registered guests", format: "Hackathon · In person", organizerName: "Cognisor",
    coverImageUrl: "https://images.lumacdn.com/uploads/1r/efffc1a8-3485-4243-a7a6-a71b0afb8410.png",
    summary: "An IVS side-event buildathon bringing together builders to create practical agentic AI solutions for Japan’s future.",
  },
  {
    slug: "mfebap7l", name: "The Customer Value Sprint",
    startAt: "2026-04-17T08:00:00.000Z", endAt: "2026-04-17T10:00:00.000Z", timezone: "Asia/Tokyo",
    location: "Hosei University, Shin-Imoaraizaka Building, Tokyo, Japan", format: "Workshop · In person", organizerName: "Cognisor · Yume Towhida · Clay Wong",
    coverImageUrl: "https://images.lumacdn.com/event-covers/r0/1af484d9-5666-4277-af81-abce61925ebc.png",
    summary: "A problem-first sprint for innovators: practise customer discovery and validate an idea before building it.",
  },
  {
    slug: "cnged4tc", portalIds: ["impact-dhaka"], name: "Impact Dhaka",
    startAt: "2026-04-10T03:00:00.000Z", endAt: "2026-04-10T13:00:00.000Z", timezone: "Asia/Dhaka",
    location: "ECE Building, BUET, Dhaka, Bangladesh", format: "Hackathon · In person", organizerName: "Cognisor",
    coverImageUrl: "https://images.lumacdn.com/event-covers/da/f39e47a5-6b0a-43b0-ac61-15b312dfeceb.png",
    summary: "An AI hackathon focused on urban transformation, from mobility and infrastructure to public services.",
  },
  {
    slug: "2f3omvqa", portalIds: ["impact-tokyo"], name: "Impact Tokyo Hackathon 2026: AI for Global Good",
    startAt: "2026-03-07T02:30:00.000Z", endAt: "2026-03-07T12:00:00.000Z", timezone: "Asia/Tokyo",
    location: "Antler in Japan, Tokyo, Japan", format: "Hackathon · In person", organizerName: "Cognisor",
    coverImageUrl: "https://images.lumacdn.com/event-covers/4b/fbbaedc0-0ba0-4b8c-a9b1-be50d36e75c8.png",
    summary: "A purpose-led buildathon for AI, automation, and human-centred solutions to societal challenges.",
  },
  {
    slug: "dk5gq8b1", name: "Co-Creating Scalable Social Impact: AI, Open Innovation & Impact Capital in Japan",
    startAt: "2026-03-05T11:00:00.000Z", endAt: "2026-03-05T12:00:00.000Z", timezone: "Asia/Tokyo",
    location: "CIC Tokyo, Tokyo, Japan", format: "Meetup · In person", organizerName: "Cognisor",
    coverImageUrl: "https://images.lumacdn.com/event-covers/qi/baa8562d-d101-40b4-b3e2-103c081445e1.jpg",
    summary: "A discussion on aligning AI, cross-sector collaboration, and impact capital to create sustainable change in Japan.",
  },
];
