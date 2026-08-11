import type { Plugin } from "vite";
import { handleEmailRequest } from "./handler";

async function readJsonBody(req: import("http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as unknown;
}

export function emailApiPlugin(): Plugin {
  return {
    name: "participant-email-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/email") {
          next();
          return;
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const body = req.method === "POST" ? await readJsonBody(req) : {};
          const result = await handleEmailRequest({
            method: req.method,
            authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : undefined,
            body,
          });

          if (!result.ok) {
            res.statusCode = result.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: result.error }));
            return;
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error: unknown) {
          const message =
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message)
              : "Failed to send email.";
          console.error("[vite:/api/email]", error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
