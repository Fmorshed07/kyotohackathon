import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { emailApiPlugin } from "./server/email/vitePlugin";
import { aiHackathonApiPlugin } from "./server/hackathon/vitePlugin";

const SMTP_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "EMAIL_FROM_NAME",
  "FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_PROJECT_ID",
  "OPENAI_API_KEY",
  "OPENAI_HACKATHON_MODEL",
] as const;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Prefer .env.local SMTP settings for the local /api/email middleware.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of SMTP_ENV_KEYS) {
    if (env[key] != null && env[key] !== "") {
      process.env[key] = env[key];
    }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    console.info(
      `[email] Using SMTP ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}`,
    );
  } else {
    console.warn("[email] SMTP not configured — emails will be logged only.");
  }

  if (process.env.OPENAI_API_KEY) {
    console.info(
      `[hackathon-ai] OpenAI configured (model: ${process.env.OPENAI_HACKATHON_MODEL || "gpt-5.6-luna"})`,
    );
  } else {
    console.warn("[hackathon-ai] OPENAI_API_KEY missing — AI event builder will return 503.");
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: true,
      },
    },
    plugins: [react(), emailApiPlugin(), aiHackathonApiPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
