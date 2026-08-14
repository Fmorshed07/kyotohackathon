import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildProjectPreviewMetadata,
  type FirestoreDocument,
  projectPreviewFromFirestore,
  publicProjectId,
  publicProjectImageFallback,
  renderProjectPreviewFallback,
  renderProjectPreviewHtml,
} from "../server/projectPreview";

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID?.trim() || process.env.VITE_FIREBASE_PROJECT_ID?.trim() || "hackathon-tokyo";

function requestHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function requestOrigin(req: VercelRequest) {
  const forwardedHost = requestHeader(req.headers["x-forwarded-host"]).split(",")[0].trim();
  const host = forwardedHost || requestHeader(req.headers.host).trim();
  const validHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(host);
  const protocol = requestHeader(req.headers["x-forwarded-proto"]).split(",")[0].trim() === "http" ? "http" : "https";
  return validHost ? `${protocol}://${host}` : "https://impactkyoto.cognisorai.com";
}

async function fetchPublicProject(projectId: string, origin: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim() || process.env.VITE_FIREBASE_API_KEY?.trim();
  if (!apiKey || !projectId) return null;

  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/public_projects/${encodeURIComponent(projectId)}`,
  );
  endpoint.searchParams.set("key", apiKey);

  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return projectPreviewFromFirestore(projectId, (await response.json()) as FirestoreDocument, origin);
  } catch {
    return null;
  }
}

async function fetchViteShell(origin: string) {
  try {
    const response = await fetch(`${origin}/index.html`, { headers: { Accept: "text/html" } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).setHeader("Allow", "GET, HEAD").send("Method not allowed");
  }

  const origin = requestOrigin(req);
  const projectId = publicProjectId(req.query.projectId);
  const projectUrl = projectId ? `${origin}/projects/${encodeURIComponent(projectId)}` : `${origin}/projects`;
  const project = await fetchPublicProject(projectId, origin);
  const metadata = buildProjectPreviewMetadata(project, projectUrl, publicProjectImageFallback(origin));
  const template = await fetchViteShell(origin);
  const html = template
    ? renderProjectPreviewHtml(template, metadata)
    : renderProjectPreviewFallback(metadata);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).send(html);
}
