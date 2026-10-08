import { useCallback, useEffect, useState } from "react";
import { clearTranslationCookies, getSiteLanguage, setSiteLanguage, type SiteLanguage } from "@/lib/siteLanguage";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
          },
          elementId: string,
        ) => void;
      };
    };
  }
}

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";
let scriptReady: Promise<void> | undefined;

function loadTranslateScript(): Promise<void> {
  if (window.google?.translate?.TranslateElement) return Promise.resolve();
  if (scriptReady) return scriptReady;

  scriptReady = new Promise<void>((resolve, reject) => {
    const ready = () => {
      if (window.google?.translate?.TranslateElement) resolve();
    };
    window.googleTranslateElementInit = ready;

    const existingScript = document.getElementById(SCRIPT_ID)
      || document.querySelector('script[src*="translate.google.com/translate_a/element.js"]');
    const script = (existingScript || document.createElement("script")) as HTMLScriptElement;
    if (!existingScript) {
      script.id = SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
    }
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      scriptReady = undefined;
      reject(new Error("Google Translate could not load"));
    }, { once: true });
    if (!existingScript) document.body.appendChild(script);
  });

  return scriptReady;
}

function initTranslateElement() {
  if (getSiteLanguage() !== "ja" || !window.google?.translate?.TranslateElement) return;

  // Both header layouts share one widget, outside React's translated DOM.
  let container = document.getElementById(ELEMENT_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = ELEMENT_ID;
    container.className = "skiptranslate";
    container.setAttribute("aria-hidden", "true");
    container.style.display = "none";
    document.body.appendChild(container);
  }
  if (container.dataset.initialized === "true" || container.childNodes.length > 0) return;

  new window.google.translate.TranslateElement(
    { pageLanguage: "en", includedLanguages: "en,ja", autoDisplay: false },
    ELEMENT_ID,
  );
  container.dataset.initialized = "true";
}

const GoogleTranslate = () => {
  const [language] = useState(getSiteLanguage);
  const isJapanese = language === "ja";

  useEffect(() => {
    if (!isJapanese) {
      clearTranslationCookies();
      return;
    }
    // Restore the translation target if its one-day cookie expired before the preference.
    setSiteLanguage("ja");
    void loadTranslateScript().then(initTranslateElement).catch(() => {
      // The original page and language controls remain usable if Google is offline.
    });
  }, [isJapanese]);

  const handleLanguageChange = useCallback((lang: SiteLanguage) => {
    setSiteLanguage(lang);
    // Reload the original English DOM after clearing every translation cookie.
    window.location.reload();
  }, []);

  return (
    <div className="notranslate flex items-center gap-2" translate="no">
      <button
        type="button"
        lang="en"
        onClick={() => handleLanguageChange("en")}
        className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em] transition-colors ${
          isJapanese
            ? "border-border/60 text-foreground/60 hover:text-foreground/80"
            : "border-primary/40 text-primary/90"
        }`}
        aria-pressed={!isJapanese}
      >
        EN
      </button>
      <button
        type="button"
        lang="ja"
        onClick={() => handleLanguageChange("ja")}
        className={`rounded-full border px-3 py-1 text-[10px] tracking-[0.3em] transition-colors ${
          isJapanese
            ? "border-primary/40 text-primary/90"
            : "border-border/60 text-foreground/60 hover:text-foreground/80"
        }`}
        aria-pressed={isJapanese}
      >
        日本語
      </button>
    </div>
  );
};

export default GoogleTranslate;
