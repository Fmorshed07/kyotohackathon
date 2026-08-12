import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ensureAuthPersistence } from "./lib/firebaseClient";
import "./index.css";

void ensureAuthPersistence();

createRoot(document.getElementById("root")!).render(<App />);
