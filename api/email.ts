import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleEmailRequest } from "../server/email/handler";

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const result = await handleEmailRequest({
      method: req.method,
      authorization: req.headers.authorization,
      body: req.body,
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to send email.";
    console.error("[api/email]", error);
    return res.status(500).json({ error: message });
  }
}
