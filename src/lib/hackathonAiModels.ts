/** Allowed OpenAI models for the AI event builder (server-validated). */

export type HackathonAiModelOption = {
  id: string;
  label: string;
  hint: string;
  tier: "frontier" | "balanced" | "fast";
};

/** Latest OpenAI Chat Completions models available to this project. */
export const HACKATHON_AI_MODELS: HackathonAiModelOption[] = [
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    hint: "Frontier — best quality for complex briefs",
    tier: "frontier",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    hint: "Balanced intelligence and cost",
    tier: "balanced",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    hint: "Fast & cost-efficient (recommended default)",
    tier: "fast",
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    hint: "Previous frontier generation",
    tier: "frontier",
  },
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    hint: "Higher-quality GPT-5.5 variant",
    tier: "frontier",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    hint: "Strong general-purpose GPT-5.4",
    tier: "balanced",
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    hint: "Faster GPT-5.4 for lighter briefs",
    tier: "fast",
  },
  {
    id: "gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    hint: "Lowest-cost GPT-5.4",
    tier: "fast",
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    hint: "Stable GPT-5.2",
    tier: "balanced",
  },
  {
    id: "gpt-5.1",
    label: "GPT-5.1",
    hint: "GPT-5.1 baseline",
    tier: "balanced",
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 Mini",
    hint: "Compact GPT-5",
    tier: "fast",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    hint: "Excellent instruction following",
    tier: "balanced",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    hint: "Fast GPT-4.1",
    tier: "fast",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    hint: "Previous-gen multimodal flagship",
    tier: "balanced",
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    hint: "Inexpensive GPT-4o",
    tier: "fast",
  },
];

export const DEFAULT_HACKATHON_AI_MODEL = "gpt-5.6-luna";

const ALLOWED_IDS = new Set(HACKATHON_AI_MODELS.map((model) => model.id));

export function isAllowedHackathonAiModel(model: string): boolean {
  return ALLOWED_IDS.has(model);
}

export function resolveHackathonAiModel(preferred?: string | null): string {
  const candidate = preferred?.trim() || "";
  if (candidate && isAllowedHackathonAiModel(candidate)) return candidate;

  const fromEnv =
    (typeof process !== "undefined" && process.env.OPENAI_HACKATHON_MODEL?.trim()) || "";
  if (fromEnv && isAllowedHackathonAiModel(fromEnv)) return fromEnv;

  return DEFAULT_HACKATHON_AI_MODEL;
}
