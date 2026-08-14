import type { Plugin } from "vite";
import { handleAiHackathonRequest } from "./handler";
import { handleProjectScreeningAiRequest } from "./screeningHandler";

async function readJsonBody(req: import("http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? (JSON.parse(raw) as unknown) : {};
}

function sendJson(res: import("http").ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function aiHackathonApiPlugin(): Plugin {
  return {
    name: "ai-hackathon-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/hackathon-ai" && path !== "/api/project-screening-ai") return next();
        try {
          const authorization =
            typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
          const body = req.method === "POST" ? await readJsonBody(req) : {};
          if (path === "/api/project-screening-ai") {
            const result = await handleProjectScreeningAiRequest({
              method: req.method,
              authorization,
              body,
            });
            sendJson(
              res,
              result.ok ? 200 : result.status,
              result.ok ? { evaluations: result.evaluations } : { error: result.error },
            );
            return;
          }
          const result = await handleAiHackathonRequest({
            method: req.method,
            authorization,
            body,
          });
          sendJson(res, result.ok ? 200 : result.status, result.ok ? { draft: result.draft } : { error: result.error });
        } catch (error: unknown) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : "AI request failed.",
          });
        }
      });
    },
  };
}
