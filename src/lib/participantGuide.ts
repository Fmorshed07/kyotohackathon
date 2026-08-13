/** Shared Resources & Guide content for participants (public page + dashboard). */

export type GuideStep = {
  id: string;
  title: string;
  description: string;
  tips: string[];
};

export type QuickLink = {
  id: string;
  label: string;
  href: string;
  description: string;
  external?: boolean;
};

export const PARTICIPANT_GUIDE_STEPS: GuideStep[] = [
  {
    id: "account",
    title: "Create your account",
    description:
      "Sign up with Google, finish onboarding, then open the participant portal. Your dashboard is the home base for every event you join.",
    tips: [
      "Use the same email you want judges and organizers to see.",
      "Complete onboarding before joining an event so your profile is ready.",
    ],
  },
  {
    id: "join",
    title: "Join a hackathon",
    description:
      "From My Hackathons, join an open event. Once registered, you get that event’s overview, submission form, and board access.",
    tips: [
      "Switch events with the hackathon switcher in the sidebar when you are in more than one.",
      "Past events stay view-only so you can revisit teams and submissions.",
    ],
  },
    {
      id: "profile",
      title: "Build your creator profile",
      description:
        "Add a photo, bio, role, and links on My Profile. A strong profile helps teammates find you and makes your projects look complete in the gallery.",
      tips: [
        "Aim for a high “Profile ready” score before submission day.",
        "Include GitHub, LinkedIn, or portfolio links judges can verify.",
      ],
    },
    {
      id: "team",
      title: "Build your team",
      description:
        "Open My Team to name the group, invite members with a link, pick a leader, and post if you still need teammates.",
      tips: [
        "Save a project first so you can generate a shareable invite link.",
        "Everyone on the roster can edit the same submission.",
      ],
    },
    {
      id: "project",
      title: "Submit your project",
      description:
        "Use the project form: details, then visuals. Save when everything looks right so judging can score the latest version.",
      tips: [
        "Team names and member lists should match who built the project.",
        "Add a demo video, project URL, PDF, cover, and gallery when you have them.",
      ],
    },
  {
    id: "boards",
    title: "Use event boards",
    description:
      "Open Boards from the sidebar to browse teams, see what others are building, and stay oriented during the event.",
    tips: [
      "Your board appears after you register for that hackathon.",
      "Use search on busy boards to find a team or project quickly.",
    ],
  },
  {
    id: "community",
    title: "Stay connected",
    description:
      "Join Discord for announcements and teammate matching. Browse Projects & demos to see what the community ships after each event.",
    tips: [
      "Turn on Discord notifications for your event channels.",
      "After the hackathon, polish your gallery entry so employers and peers can find it.",
    ],
  },
];

export const PARTICIPANT_QUICK_LINKS: QuickLink[] = [
  {
    id: "portal",
    label: "Participant portal",
    href: "/dashboard/participant",
    description: "Overview, submissions, and profile",
  },
  {
    id: "hackathons",
    label: "Hackathons",
    href: "/hackathons",
    description: "Browse and open live events",
  },
  {
    id: "projects",
    label: "Projects & demos",
    href: "/projects",
    description: "Public gallery of builds",
  },
  {
    id: "discord",
    label: "Discord",
    href: "https://discord.gg/cQEFjQDFm",
    description: "Community and announcements",
    external: true,
  },
];
