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
