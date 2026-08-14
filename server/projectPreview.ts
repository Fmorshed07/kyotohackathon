const DEFAULT_SITE_NAME = "Global Impact Hackathons";
const DEFAULT_DESCRIPTION =
  "Explore practical technology projects from the Global Impact Hackathons community.";

export type ProjectPreview = {
  id: string;
  title: string;
  description: string;
  image: string;
  teamName?: string;
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

export type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
};

export type ProjectPreviewMetadata = {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  structuredData: Record<string, unknown>;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeHttpUrl(value: unknown) {
  const candidate = cleanText(value, 2_000);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function projectImageFallback(origin: string) {
  return `${origin.replace(/\/$/, "")}/h1.png`;
}

function firestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.integerValue === "string") return Number(value.integerValue);
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if ("nullValue" in value) return null;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(firestoreValue);
  if (value.mapValue) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, field]) => [key, firestoreValue(field)]),
    );
  }
  return null;
}

function documentData(document: FirestoreDocument) {
  return Object.fromEntries(
    Object.entries(document.fields ?? {}).map(([key, value]) => [key, firestoreValue(value)]),
  );
}

function youtubeThumbnail(value: unknown) {
  const url = safeHttpUrl(value);
  if (!url) return "";
  const match = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i,
  );
  return match?.[1] ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : "";
}

/** Converts the explicitly-public Firestore document into safe social-preview fields. */
export function projectPreviewFromFirestore(
  id: string,
  document: FirestoreDocument,
  origin: string,
): ProjectPreview | null {
  const data = documentData(document);
  if (data.public_preview_consent === false) return null;

  const title = cleanText(data.title, 110) || "Hackathon project";
  const teamName = cleanText(data.team_name, 80);
  const description =
    cleanText(data.short_description, 220) ||
    (teamName ? `${title} is a project by ${teamName}.` : DEFAULT_DESCRIPTION);
  const galleryImages = Array.isArray(data.gallery_urls) ? data.gallery_urls : [];
  const image =
    safeHttpUrl(data.cover_url) ||
    galleryImages.map(safeHttpUrl).find(Boolean) ||
    youtubeThumbnail(data.demo_video_url) ||
    projectImageFallback(origin);

  return { id, title, description, image, ...(teamName ? { teamName } : {}) };
}

export function buildProjectPreviewMetadata(
  project: ProjectPreview | null,
  projectUrl: string,
  fallbackImage: string,
): ProjectPreviewMetadata {
  if (!project) {
    const title = `${DEFAULT_SITE_NAME} | Cognisor AI`;
    return {
      title,
      description: DEFAULT_DESCRIPTION,
      image: fallbackImage,
      url: projectUrl,
      siteName: DEFAULT_SITE_NAME,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: DEFAULT_SITE_NAME,
        url: projectUrl,
        description: DEFAULT_DESCRIPTION,
      },
    };
  }

  const title = `${project.title} | ${DEFAULT_SITE_NAME}`;
  return {
    title,
    description: project.description,
    image: project.image,
    url: projectUrl,
    siteName: DEFAULT_SITE_NAME,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: project.title,
      description: project.description,
      url: projectUrl,
      image: project.image,
      applicationCategory: "Hackathon project",
      ...(project.teamName ? { author: { "@type": "Organization", name: project.teamName } } : {}),
      isPartOf: {
        "@type": "WebSite",
        name: DEFAULT_SITE_NAME,
      },
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertMeta(html: string, attribute: "name" | "property", key: string, content: string) {
  const pattern = new RegExp(
    `<meta\\b[^>]*\\b${attribute}=["']${escapeRegex(key)}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}\n    ${tag}`);
}

function upsertCanonical(html: string, href: string) {
  const pattern = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}\n    ${tag}`);
}

/** Adds crawler-visible, project-specific metadata while preserving the Vite application shell. */
export function renderProjectPreviewHtml(template: string, metadata: ProjectPreviewMetadata) {
  let html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  html = upsertMeta(html, "name", "description", metadata.description);
  html = upsertMeta(html, "property", "og:title", metadata.title);
  html = upsertMeta(html, "property", "og:description", metadata.description);
  html = upsertMeta(html, "property", "og:type", "website");
  html = upsertMeta(html, "property", "og:site_name", metadata.siteName);
  html = upsertMeta(html, "property", "og:url", metadata.url);
  html = upsertMeta(html, "property", "og:image", metadata.image);
  html = upsertMeta(html, "property", "og:image:alt", metadata.title);
  html = upsertMeta(html, "name", "twitter:card", "summary_large_image");
  html = upsertMeta(html, "name", "twitter:title", metadata.title);
  html = upsertMeta(html, "name", "twitter:description", metadata.description);
  html = upsertMeta(html, "name", "twitter:image", metadata.image);
  html = upsertCanonical(html, metadata.url);

  const jsonLd = JSON.stringify(metadata.structuredData).replace(/</g, "\\u003c");
  const structuredData = `<script id="project-preview-jsonld" type="application/ld+json">${jsonLd}</script>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `    ${structuredData}\n  </head>`);
  return html;
}

export function renderProjectPreviewFallback(metadata: ProjectPreviewMetadata) {
  const jsonLd = JSON.stringify(metadata.structuredData).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(metadata.title)}</title>
<meta name="description" content="${escapeHtml(metadata.description)}" />
<meta property="og:title" content="${escapeHtml(metadata.title)}" />
<meta property="og:description" content="${escapeHtml(metadata.description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${escapeHtml(metadata.siteName)}" />
<meta property="og:url" content="${escapeHtml(metadata.url)}" />
<meta property="og:image" content="${escapeHtml(metadata.image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
<meta name="twitter:image" content="${escapeHtml(metadata.image)}" />
<link rel="canonical" href="${escapeHtml(metadata.url)}" />
<script type="application/ld+json">${jsonLd}</script></head>
<body><main><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.description)}</p><p><a href="/projects">Explore all projects</a></p></main></body></html>`;
}

export function publicProjectId(value: unknown) {
  const id = cleanText(value, 256);
  return id && !/[\u0000/]/.test(id) ? id : "";
}

export function publicProjectImageFallback(origin: string) {
  return projectImageFallback(origin);
}
