import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleProjectScreeningAiRequest } from "../server/hackathon/screeningHandler";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await handleProjectScreeningAiRequest({
      method: req.method,
      authorization: req.headers.authorization,
      body: req.body,
    });
    return res
      .status(result.ok ? 200 : result.status)
      .json(result.ok ? { evaluations: result.evaluations } : { error: result.error });
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI project screening failed." });
  }
}
