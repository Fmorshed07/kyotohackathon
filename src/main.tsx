import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App.tsx";
import { ensureAuthPersistence } from "./lib/firebaseClient";
import "./index.css";
import "./minimal-theme.css";

void ensureAuthPersistence();

createRoot(document.getElementById("root")!).render(<MotionConfig reducedMotion="never"><App /></MotionConfig>);
