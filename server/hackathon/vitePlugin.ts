import type { Plugin } from "vite";
import { handleAiHackathonRequest } from "./handler";

async function readJsonBody(req: import("http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? (JSON.parse(raw) as unknown) : {};
}

export function aiHackathonApiPlugin(): Plugin {
  return {
    name: "ai-hackathon-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/hackathon-ai") return next();
        try {
          const result = await handleAiHackathonRequest({
            method: req.method,
            authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : undefined,
            body: req.method === "POST" ? await readJsonBody(req) : {},
          });
          res.statusCode = result.ok ? 200 : result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.ok ? { draft: result.draft } : { error: result.error }));
        } catch (error: unknown) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "AI event setup failed." }));
        }
      });
    },
  };
}
