/** Logo assets observed in the Partners & Sponsors section of cognisorai.com.
 * Numbered variants are preserved; this is not a list of unique organisations. */
const labels = [
  "Tokyo International University — Impact Next", "Tokyo International University — Impact Next (alternate)",
  "IEEE BUET Student Branch", "Ujjibon", "Bangladesh University of Engineering and Technology",
  "Cognisor AI", "Cognisor AI (alternate)", "Takeoff Tokyo", "Netlink AI", "Cognisor AI symbol",
  "IOAK Community Hub & Learning Labo", "DMZ Japan", "Nagase", "Advantage Austria", "Shibuya Startup Support",
  "Musubi Tech", "IVS", "Alchemist Japan", "Creators Circuit", "Gusto Development", "Qwen", "Alibaba Cloud",
  "n8n", "Antler", "Lovable", "TEDx InnovationU", "Venture Café Tokyo", "Brainbox", "Open Design",
  "Sleepytiger", "Cotti Coffee", "Media ICU", "Vibe Coders Tokyo", "Poland-Japan Foundation", "OpenFor.co",
  "Summys Ventures", "Founder Institute Japan", "Partner featured by Cognisor — logo 38", "MeltingHack",
  "Build Club", "Co-capital VC", "Waveland", "Temple University Japan Computer Science Society", "ElevenLabs",
  "Tokyo Design", "TIU alumni emblem", "Partner featured by Cognisor — logo 47", "Partner featured by Cognisor — logo 48",
  "SusHi Tech Tokyo", "Open Design (alternate)", "ai&",
] as const;
const darkArtwork = new Set([2, 4, 6, 8, 9, 15, 25, 26, 27, 31, 38, 39, 45]);
export const COMMUNITY_PARTNERS = labels.map((name, index) => ({
  id: index + 1, name, image: `/partners/cognisor-network/${index + 1}.webp`,
  darkArtwork: darkArtwork.has(index + 1),
  source: `https://www.cognisorai.com/partners/Logos/${index + 1}.png`,
}));

export type FeaturedCommunityBrand = {
  id: string | number;
  name: string;
  image: string;
  darkArtwork: boolean;
  source: string;
  artworkClass?: string;
  category?: "Technology";
  /** Native alpha artwork needs no background-blending workaround. */
  transparentArtwork?: boolean;
  /** Official black-backed community artwork rendered as a native SVG mask. */
  monochromeMask?: { width: number; height: number; viewBox: string };
};

const featuredArtwork: Record<number, Partial<FeaturedCommunityBrand>> = {
  18: { image: "/partners/featured/alchemist.svg", source: "https://www.alchemistaccelerator.com/japan", artworkClass: "alchemist" },
  24: { image: "/partners/featured/antler.svg", source: "https://www.antler.co/" },
  44: { image: "/partners/featured/elevenlabs.svg", source: "https://elevenlabs.io/brand" },
  21: { image: "/partners/featured/qwen.svg", source: "https://commons.wikimedia.org/wiki/File:Qwen_Logo.svg", artworkClass: "qwen" },
  22: { image: "/partners/featured/alibaba-cloud.svg", source: "https://www.alibabacloud.com/", artworkClass: "alibaba" },
  19: {
    image: "/partners/featured/creators-circuit.png", source: "https://www.creatorscircuit.tech/",
    monochromeMask: { width: 1080, height: 1080, viewBox: "40 270 1000 480" },
  },
  1: {
    image: "/partners/featured/tiu-impact-next.png", source: "https://www.tiuimpactnext.com/",
    monochromeMask: { width: 1000, height: 500, viewBox: "50 150 910 180" },
  },
  25: { image: "/partners/featured/lovable.svg", source: "https://lovable.dev/brand", artworkClass: "lovable" },
};

// Preserve the complete source directory; curate the moving wall independently.
function featuredPartner(id: number): FeaturedCommunityBrand {
  const partner = COMMUNITY_PARTNERS.find(item => item.id === id);
  if (!partner) throw new Error(`Missing featured community partner: ${id}`);
  return { ...partner, darkArtwork: true, transparentArtwork: true, ...featuredArtwork[id] };
}

export const FEATURED_BRAND_ROWS: FeaturedCommunityBrand[][] = [
  [featuredPartner(18), featuredPartner(24), featuredPartner(44), featuredPartner(21), featuredPartner(22)],
  [featuredPartner(19), featuredPartner(1), featuredPartner(25), {
    id: "openai", name: "OpenAI", image: "/partners/featured/openai-wordmark.svg",
    darkArtwork: true, transparentArtwork: true, artworkClass: "openai", category: "Technology",
    source: "https://openai.com/brand/",
  }],
];
