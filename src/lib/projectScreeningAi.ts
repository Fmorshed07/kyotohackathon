import { getFirebaseAuth } from "@/lib/firebaseClient";
import {
  parseAiScreeningEvaluations,
  type ProjectConceptInput,
  type ProjectScreeningResult,
} from "@/lib/projectScreening";

const CHUNK_SIZE = 8;
const CONCEPT_CHAR_LIMIT = 1400;

export type AiProjectScreenConcept = {
  id: string;
  title: string;
  concept: string;
  source: ProjectConceptInput["source"];
  teamName: string | null;
  artifacts: string[];
};

export const toAiProjectScreenConcept = (item: ProjectConceptInput): AiProjectScreenConcept => ({
  id: item.id,
  title: item.title,
  concept: item.concept.slice(0, CONCEPT_CHAR_LIMIT),
  source: item.source,
  teamName: item.teamName,
  artifacts: [
    item.projectUrl ? "project url" : "",
    item.submissionPdfUrl ? "deck/pdf" : "",
    item.demoVideoUrl ? "demo video" : "",
  ].filter(Boolean),
});

async function requestAiProjectScreenChunk(input: {
  theme: string;
  eventName: string;
  concepts: AiProjectScreenConcept[];
}): Promise<Record<string, Partial<ProjectScreeningResult>>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("You must be signed in to run AI project screening.");
  const token = await user.getIdToken();
  const response = await fetch("/api/project-screening-ai", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as {
    evaluations?: unknown;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Could not run AI project screening.");
  }
  return parseAiScreeningEvaluations({ evaluations: data.evaluations ?? data });
}

export async function requestAiProjectScreens(input: {
  theme: string;
  eventName: string;
  concepts: AiProjectScreenConcept[];
}): Promise<Record<string, Partial<ProjectScreeningResult>>> {
  const merged: Record<string, Partial<ProjectScreeningResult>> = {};
  for (let index = 0; index < input.concepts.length; index += CHUNK_SIZE) {
    const chunk = input.concepts.slice(index, index + CHUNK_SIZE);
    const result = await requestAiProjectScreenChunk({
      theme: input.theme,
      eventName: input.eventName,
      concepts: chunk,
    });
    Object.assign(merged, result);
  }
  return merged;
}
