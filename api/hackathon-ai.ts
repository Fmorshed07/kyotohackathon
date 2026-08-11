import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleAiHackathonRequest } from "../server/hackathon/handler";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await handleAiHackathonRequest({
      method: req.method,
      authorization: req.headers.authorization,
      body: req.body,
    });
    return res.status(result.ok ? 200 : result.status).json(result.ok ? { draft: result.draft } : { error: result.error });
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI event setup failed." });
  }
}
