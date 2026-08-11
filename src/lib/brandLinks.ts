/** Cognisor AI + Creators Circuit public links (site, socials, community). */

export const COGNISOR_SITE = "https://www.cognisorai.com";
export const CREATORS_CIRCUIT_SITE = "https://creatorscircuit.tech";
export const CREATORS_CIRCUIT_COMMUNITY = "https://creatorscircuit.tech/community";
export const CREATORS_CIRCUIT_WHATSAPP = "https://chat.whatsapp.com/JoXFxmOSKoBHylXouvd560";

export type BrandLink = {
  id: string;
  label: string;
  href: string;
  shortLabel?: string;
};

/** Follow Cognisor AI on every channel listed on cognisorai.com */
export const COGNISOR_SOCIALS: BrandLink[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    shortLabel: "LinkedIn",
    href: "https://www.linkedin.com/company/cognisor-ai/",
  },
  {
    id: "instagram",
    label: "Instagram",
    shortLabel: "Instagram",
    href: "https://www.instagram.com/cognisor.ai/",
  },
  {
    id: "x",
    label: "X (Twitter)",
    shortLabel: "X",
    href: "https://twitter.com/cognisor",
  },
  {
    id: "github",
    label: "GitHub",
    shortLabel: "GitHub",
    href: "https://github.com/cognisor",
  },
  {
    id: "website",
    label: "Website",
    shortLabel: "Web",
    href: COGNISOR_SITE,
  },
];

/** Creators Circuit — Cognisor-powered community */
export const CREATORS_CIRCUIT_LINKS: BrandLink[] = [
  {
    id: "circuit-home",
    label: "Creators Circuit",
    href: CREATORS_CIRCUIT_SITE,
  },
  {
    id: "circuit-community",
    label: "Community hub",
    href: CREATORS_CIRCUIT_COMMUNITY,
  },
  {
    id: "circuit-whatsapp",
    label: "WhatsApp group",
    href: CREATORS_CIRCUIT_WHATSAPP,
  },
];
