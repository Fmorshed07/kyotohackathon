import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTranslationCookies, getSiteLanguage, setSiteLanguage } from "@/lib/siteLanguage";

const PAGE_URL = "https://impactkyoto.cognisorai.com/feed/event";
const PREFERENCE_KEY = "cognisor-language";
let browser: JSDOM;

beforeEach(() => {
  browser = new JSDOM("", { url: PAGE_URL });
  vi.stubGlobal("window", browser.window);
  vi.stubGlobal("document", browser.window.document);
  vi.stubGlobal("localStorage", browser.window.localStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  browser.window.close();
});

const translationCookies = () => browser.cookieJar.getCookiesSync(PAGE_URL)
  .filter(cookie => cookie.key === "googtrans");

const seedConflictingCookies = () => {
  document.cookie = "googtrans=/en/en;path=/";
  document.cookie = "googtrans=/en/ja;path=/;domain=.cognisorai.com";
  document.cookie = "googtrans=/en/ja;path=/feed";
  document.cookie = "googtrans=/auto/ja;path=/feed/;domain=.cognisorai.com";
  document.cookie = "googtrans=%2Fen%2Fja;path=/feed/event";
  document.cookie = "display-density=compact;path=/";
  document.cookie = "feed-view=projects;path=/feed;domain=.cognisorai.com";
};

describe("site language preference", () => {
  it("defaults to the original English page without a saved preference", () => {
    expect(getSiteLanguage()).toBe("en");
  });

  it.each(["/en/ja", "/auto/ja", "%2Fen%2Fja", "%2Fauto%2Fja"])(
    "recognizes a legacy Japanese translation cookie (%s)",
    value => {
      document.cookie = `googtrans=${value};path=/`;
      expect(getSiteLanguage()).toBe("ja");
    },
  );

  it.each(["en", "ja"] as const)("honors an explicit %s preference over conflicting cookies", language => {
    window.localStorage.setItem(PREFERENCE_KEY, language);
    document.cookie = `googtrans=/en/${language === "en" ? "ja" : "en"};path=/`;

    expect(getSiteLanguage()).toBe(language);
  });

  it("ignores unrelated cookie names and tolerates a malformed encoded translation value", () => {
    document.cookie = "other-googtrans=/en/ja;path=/";
    document.cookie = "googtrans=%invalid;path=/";

    expect(getSiteLanguage()).toBe("en");
  });

  it("clears visible host, parent-domain, and nested-path translation cookies while preserving other state", () => {
    seedConflictingCookies();
    window.localStorage.setItem(PREFERENCE_KEY, "ja");
    expect(translationCookies()).toHaveLength(5);

    clearTranslationCookies();
    clearTranslationCookies();

    expect(translationCookies()).toHaveLength(0);
    expect(document.cookie).toContain("display-density=compact");
    expect(document.cookie).toContain("feed-view=projects");
    expect(window.localStorage.getItem(PREFERENCE_KEY)).toBe("ja");
  });

  it("replaces conflicting cookies with one host-only root cookie when Japanese is selected", () => {
    seedConflictingCookies();

    setSiteLanguage("ja");

    expect(window.localStorage.getItem(PREFERENCE_KEY)).toBe("ja");
    expect(translationCookies()).toHaveLength(1);
    expect(translationCookies()[0]).toMatchObject({
      value: "/en/ja",
      domain: "impactkyoto.cognisorai.com",
      path: "/",
      hostOnly: true,
    });
    expect(document.cookie).toContain("display-density=compact");
    expect(document.cookie).toContain("feed-view=projects");
    expect(getSiteLanguage()).toBe("ja");
  });

  it("restores English by removing translation cookies instead of leaving an English translation target", () => {
    seedConflictingCookies();
    window.localStorage.setItem(PREFERENCE_KEY, "ja");

    setSiteLanguage("en");

    expect(window.localStorage.getItem(PREFERENCE_KEY)).toBe("en");
    expect(translationCookies()).toHaveLength(0);
    expect(document.cookie).toContain("display-density=compact");
    expect(document.cookie).toContain("feed-view=projects");
    expect(getSiteLanguage()).toBe("en");
  });

  it("still switches in both directions when browser storage access is denied", () => {
    const denied = () => { throw new DOMException("Storage access denied", "SecurityError"); };
    vi.spyOn(browser.window.Storage.prototype, "getItem").mockImplementation(denied);
    vi.spyOn(browser.window.Storage.prototype, "setItem").mockImplementation(denied);
    vi.spyOn(browser.window, "localStorage", "get").mockImplementation(denied);
    document.cookie = "googtrans=/auto/ja;path=/;domain=.cognisorai.com";

    expect(getSiteLanguage()).toBe("ja");
    expect(() => setSiteLanguage("en")).not.toThrow();
    expect(translationCookies()).toHaveLength(0);
    expect(getSiteLanguage()).toBe("en");
    expect(() => setSiteLanguage("ja")).not.toThrow();
    expect(getSiteLanguage()).toBe("ja");
    expect(translationCookies()).toHaveLength(1);
  });
});
