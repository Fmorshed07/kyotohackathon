import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GoogleTranslate from "@/components/GoogleTranslate";

const widgetSelector = "#google_translate_element";
const scriptSelector = 'script[src*="translate.google.com/translate_a/element.js"]';

function installGoogleWidget() {
  const initialize = vi.fn(function (_options: unknown, elementId: string) {
    document.getElementById(elementId)?.appendChild(document.createElement("select"));
  });
  window.google = { translate: { TranslateElement: initialize } };
  return initialize;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
  document.cookie = "googtrans=;path=/;max-age=0";
  document.querySelectorAll(`${widgetSelector}, ${scriptSelector}`).forEach(element => element.remove());
  delete window.google;
  delete window.googleTranslateElementInit;
});

describe("Google Translate language controls", () => {
  it("keeps explicit English active without loading Google, even when an old Japanese cookie remains", () => {
    window.localStorage.setItem("cognisor-language", "en");
    document.cookie = "googtrans=/en/ja;path=/";

    render(<><GoogleTranslate /><GoogleTranslate /></>);

    expect(document.querySelector(scriptSelector)).not.toBeInTheDocument();
    expect(document.querySelector(widgetSelector)).not.toBeInTheDocument();
    expect(document.cookie).not.toContain("googtrans=");
    for (const button of screen.getAllByRole("button", { name: "EN" })) {
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button.closest('[translate="no"]')).toHaveClass("notranslate");
    }
    for (const button of screen.getAllByRole("button", { name: "日本語" })) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("shares one body-owned widget across desktop, mobile, and remounted language controls", async () => {
    window.localStorage.setItem("cognisor-language", "ja");
    expect(document.cookie).not.toContain("googtrans=");
    const initialize = installGoogleWidget();
    let view: ReturnType<typeof render>;

    await act(async () => {
      view = render(<><GoogleTranslate /><GoogleTranslate /></>);
    });

    expect(document.cookie).toContain("googtrans=/en/ja");
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(widgetSelector)).toHaveLength(1);
    const widget = document.querySelector(widgetSelector);
    expect(widget?.parentElement).toBe(document.body);
    expect(view.container.contains(widget)).toBe(false);

    view.unmount();
    expect(widget).toBeInTheDocument();
    await act(async () => {
      render(<GoogleTranslate />);
    });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(widgetSelector)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "日本語" })).toHaveAttribute("aria-pressed", "true");
  });

  it("initializes after a delayed Google callback without duplicate downloads or widgets", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem("cognisor-language", "ja");
    render(<><GoogleTranslate /><GoogleTranslate /></>);

    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
    expect(document.querySelector(widgetSelector)).not.toBeInTheDocument();
    expect(window.googleTranslateElementInit).toBeTypeOf("function");

    act(() => vi.advanceTimersByTime(15_000));
    const initialize = installGoogleWidget();
    await act(async () => {
      window.googleTranslateElementInit!();
    });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(widgetSelector)).toHaveLength(1);
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
  });
});
