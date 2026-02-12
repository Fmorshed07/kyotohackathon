import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    __googleTranslateReady?: boolean;
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
const PAGE_LANGUAGE = "en";

const setTranslateCookie = (value: string) => {
  const hostname = window.location.hostname;
  const maxAge = "max-age=86400"; // 1 day
  document.cookie = `googtrans=${value};path=/;${maxAge}`;
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname.includes(".")) {
    document.cookie = `googtrans=${value};path=/;${maxAge};domain=.${hostname}`;
  }
};

const initTranslateElement = () => {
  if (!window.google?.translate?.TranslateElement) {
    return;
  }

  const container = document.getElementById(ELEMENT_ID);
  if (container && container.childNodes.length > 0) {
    return;
  }

  new window.google.translate.TranslateElement(
    {
      pageLanguage: PAGE_LANGUAGE,
      includedLanguages: "en,ja",
      autoDisplay: false,
    },
    ELEMENT_ID,
  );
};

const GoogleTranslate = () => {
  useEffect(() => {
    const runInit = () => {
      if (window.google?.translate?.TranslateElement) {
        initTranslateElement();
        return true;
      }
      return false;
    };

    if (runInit()) return;

    const scriptEl = document.getElementById(SCRIPT_ID) || document.querySelector('script[src*="translate.google.com"]');
    if (scriptEl) {
      const id = setInterval(runInit, 80);
      const stop = () => clearInterval(id);
      setTimeout(stop, 8000);
      return () => stop();
    }

    window.googleTranslateElementInit = () => {
      window.__googleTranslateReady = true;
      runInit();
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onload = () => {
      const id = setInterval(runInit, 80);
      setTimeout(() => clearInterval(id), 5000);
    };
    document.body.appendChild(script);
  }, []);

  const [isJapanese, setIsJapanese] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    setIsJapanese(document.cookie.includes("googtrans=/en/ja"));
  }, []);

  const handleLanguageChange = useCallback((lang: "en" | "ja") => {
    const target = lang === "ja" ? "/en/ja" : "/en/en";
    setTranslateCookie(target);
    // Short delay so cookie is committed before reload
    setTimeout(() => window.location.reload(), 80);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        id={ELEMENT_ID}
        className="absolute left-[-9999px] w-px h-px overflow-hidden"
        aria-hidden="true"
      />
      <button
        type="button"
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
