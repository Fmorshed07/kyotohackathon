export type SiteLanguage = "en" | "ja";

const LANGUAGE_KEY = "cognisor-language";

export function getSiteLanguage(): SiteLanguage {
  try {
    const preference = window.localStorage.getItem(LANGUAGE_KEY);
    if (preference === "en" || preference === "ja") return preference;
  } catch {
    // Translation cookies also work when browser storage is unavailable.
  }

  return document.cookie.split(";").some(cookie => {
    const [name, ...value] = cookie.trim().split("=");
    if (name !== "googtrans") return false;
    try {
      return /^\/(?:en|auto)\/ja$/.test(decodeURIComponent(value.join("=")));
    } catch {
      return false;
    }
  }) ? "ja" : "en";
}

export function clearTranslationCookies() {
  const domains = new Set([""]);
  const hostname = window.location.hostname;
  if (hostname.includes(".") && !/^\d+(?:\.\d+){3}$/.test(hostname) && !hostname.includes(":")) {
    const labels = hostname.split(".");
    for (let index = 0; index < labels.length - 1; index++) {
      const domain = labels.slice(index).join(".");
      domains.add(domain);
      domains.add(`.${domain}`);
    }
  }

  const paths = new Set(["/"]);
  const segments = window.location.pathname.split("/");
  for (let index = 1; index <= segments.length; index++) {
    const path = segments.slice(0, index).join("/") || "/";
    paths.add(path);
    paths.add(path.endsWith("/") ? path : `${path}/`);
  }

  // A root cookie cannot overwrite a stale parent-domain or page-path cookie.
  for (const domain of domains) {
    for (const path of paths) {
      document.cookie = `googtrans=; Path=${path}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

export function setSiteLanguage(language: SiteLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Fall back to the cookie when local storage is blocked.
  }

  clearTranslationCookies();
  if (language === "ja") {
    document.cookie = "googtrans=/en/ja; Path=/; Max-Age=86400; SameSite=Lax";
  }
}
