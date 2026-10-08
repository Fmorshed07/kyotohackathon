/** Reproducible, read-only upstream asset sync. No credentials or backend writes. */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// Pass the installed sharp entry point to keep this optional sync out of app dependencies.
if (!process.argv[2]) throw new Error("Usage: node scripts/sync-community-assets.mjs <sharp module path>");
const sharp = (await import(pathToFileURL(process.argv[2]).href)).default;

const root = new URL("../", import.meta.url);
const logos = new URL("public/partners/cognisor-network/", root);
const data = new URL("src/data/", root);
await mkdir(logos, { recursive: true });
await mkdir(data, { recursive: true });

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}

// All 51 unique URLs were verified in Cognisor's Sponsors & Partners section.
for (let start = 1; start <= 51; start += 6) {
  await Promise.all(Array.from({ length: Math.min(6, 52 - start) }, async (_, offset) => {
    const id = start + offset;
    const response = await download(`https://www.cognisorai.com/partners/Logos/${id}.png`);
    if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Invalid logo ${id}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) throw new Error(`Logo ${id} exceeds asset limit`);
    await sharp(bytes).trim({ threshold: 10 }).resize({ width: 480, height: 180, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toFile(fileURLToPath(new URL(`${id}.webp`, logos)));
    console.log(`Partner ${id}: ${bytes.length} bytes`);
  }));
}

// Natural Earth 1:50m, public domain. Projection matches projectJapanPoint().
const source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const geo = await (await download(source)).json();
const japan = geo.features.find(feature => feature.properties.ADM0_A3 === "JPN");
if (japan?.geometry.type !== "MultiPolygon") throw new Error("Japan geometry not found");
const paths = japan.geometry.coordinates.map(polygon => polygon.map(ring => ring.map(([lon, lat], index) =>
  `${index ? "L" : "M"}${((lon - 122) * 25).toFixed(2)},${((46 - lat) * 25).toFixed(2)}`,
).join(" ") + "Z").join(" "));
await writeFile(new URL("japan-map.json", data), JSON.stringify({ source, license: "Public domain — Natural Earth", paths }));
console.log(`Japan map: ${paths.length} islands; ${fileURLToPath(data)}`);
