import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleLumaEventImportRequest } from "../server/luma/handler";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await handleLumaEventImportRequest({ method: req.method, authorization: req.headers.authorization, body: req.body });
  res.setHeader("Cache-Control", "no-store");
  return res.status(result.ok ? 200 : result.status).json(result.ok ? { event: result.event } : { error: result.error });
}
