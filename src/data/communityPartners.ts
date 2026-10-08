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
const darkBackgroundArtwork = new Set([2, 4, 6, 8, 9, 15, 25, 26, 27, 31, 38, 39, 45]);
export const COMMUNITY_PARTNERS = labels.map((name, index) => ({
  id: index + 1, name, image: `/partners/cognisor-network/${index + 1}.webp`,
  surface: darkBackgroundArtwork.has(index + 1) ? "dark" as const : "light" as const,
  source: `https://www.cognisorai.com/partners/Logos/${index + 1}.png`,
}));

export type FeaturedCommunityBrand = {
  id: string | number;
  name: string;
  image: string;
  source: string;
  artworkClass?: string;
  /** Contrast backing preserves the source's colors, including dark lettering. */
  surface?: "light" | "dark";
  /** Give standalone symbols a readable name, without a category badge. */
  showName?: boolean;
};

const featuredArtwork: Record<number, Partial<FeaturedCommunityBrand>> = {
  18: { artworkClass: "alchemist" },
  44: { image: "/partners/featured/elevenlabs.svg", source: "https://elevenlabs.io/brand", surface: undefined },
  21: { image: "/partners/featured/qwen.svg", source: "https://commons.wikimedia.org/wiki/File:Qwen_Logo.svg", artworkClass: "qwen", surface: undefined },
  22: { image: "/partners/featured/alibaba-cloud.svg", source: "https://www.alibabacloud.com/", artworkClass: "alibaba", surface: undefined },
  25: { image: "/partners/featured/lovable.svg", source: "https://lovable.dev/brand", artworkClass: "lovable", surface: undefined },
  49: { artworkClass: "sushi-tech" },
  51: { artworkClass: "ai-and" },
};

// Preserve the complete source directory; curate the moving wall independently.
function featuredPartner(id: number): FeaturedCommunityBrand {
  const partner = COMMUNITY_PARTNERS.find(item => item.id === id);
  if (!partner) throw new Error(`Missing featured community partner: ${id}`);
  return { ...partner, ...featuredArtwork[id] };
}

export const FEATURED_BRAND_ROWS: FeaturedCommunityBrand[][] = [
  [featuredPartner(49), featuredPartner(18), featuredPartner(24), featuredPartner(44), featuredPartner(21), featuredPartner(22)],
  [featuredPartner(51), featuredPartner(19), featuredPartner(1), featuredPartner(25), {
    id: "openai", name: "OpenAI", image: "/partners/featured/openai-blossom.svg",
    artworkClass: "openai", showName: true,
    source: "https://openai.com/brand/",
  }, {
    id: "codex", name: "Codex", image: "/partners/featured/codex-color.svg",
    artworkClass: "codex", showName: true,
    source: "https://asvg.app/icons/codex",
  }],
];
