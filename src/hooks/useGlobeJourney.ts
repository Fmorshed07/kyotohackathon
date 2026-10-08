import { useEffect, useRef, useState } from "react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const fade = (value: number, from: number, to: number) => {
  const position = clamp((value - from) / (to - from));
  return position * position * (3 - 2 * position);
};

export function useGlobeJourney({ reduced, paused }: { reduced: boolean; paused: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    let previousTime = 0;
    let target = progressRef.current;
    let dirty = true;
    let listening = false;
    let pageVisible = document.visibilityState !== "hidden";
    const initialBounds = section.getBoundingClientRect();
    let intersecting = initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;
    const panels = ["intro", "connect", "begin"].map((chapter) => ({
      chapter,
      element: section.querySelector<HTMLElement>(`.journey-copy.journey-${chapter}`),
    }));
    let accessibleChapter = "";

    const write = (value: number) => {
      const progress = reduced ? 0 : clamp(value);
      const chapterIn = fade(progress, 0.22, 0.38);
      const chapterOut = fade(progress, 0.64, 0.8);
      const intro = 1 - chapterIn;
      const outro = chapterOut;
      const chapter = progress < 0.3 ? "intro" : progress < 0.72 ? "connect" : "begin";
      const movement = !reduced && !paused;
      const progressChanged = progressRef.current !== progress;
      progressRef.current = progress;
      section.style.setProperty("--journey-progress", progress.toFixed(5));
      section.style.setProperty("--intro-opacity", intro.toFixed(4));
      section.style.setProperty("--intro-y", `${movement ? (-progress * 100).toFixed(2) : 0}px`);
      section.style.setProperty("--chapter-opacity", (chapterIn * (1 - chapterOut)).toFixed(4));
      section.style.setProperty("--chapter-y", `${movement ? ((1 - chapterIn) * 44 - chapterOut * 60).toFixed(2) : 0}px`);
      section.style.setProperty("--outro-opacity", outro.toFixed(4));
      section.style.setProperty("--outro-y", `${movement ? ((1 - outro) * 48).toFixed(2) : 0}px`);
      section.dataset.chapter = chapter;
      if (accessibleChapter !== chapter) {
        accessibleChapter = chapter;
        for (const panel of panels) {
          const hidden = panel.chapter !== chapter;
          panel.element?.setAttribute("aria-hidden", String(hidden));
          panel.element?.toggleAttribute("inert", hidden);
        }
      }
      if (progressChanged) {
        section.dispatchEvent(new CustomEvent("globejourneychange", { detail: { progress }, bubbles: true }));
      }
    };

    const measure = () => {
      const bounds = section.getBoundingClientRect();
      const distance = bounds.height - window.innerHeight;
      return reduced || distance <= 0 ? 0 : clamp(-bounds.top / distance);
    };

    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };

    const tick = (time: number) => {
      frame = 0;
      if (!pageVisible || !intersecting || reduced) return;
      if (dirty) {
        target = measure();
        dirty = false;
      }
      const delta = previousTime ? Math.min(time - previousTime, 64) : 16.67;
      previousTime = time;
      const next = paused ? target : progressRef.current + (target - progressRef.current) * (1 - Math.exp(-delta / 90));
      const settled = Math.abs(target - next) < 0.0001;
      write(settled ? target : next);
      if (!settled) frame = requestAnimationFrame(tick);
      else previousTime = 0;
    };

    const schedule = () => {
      dirty = true;
      if (!frame && pageVisible && intersecting && !reduced) frame = requestAnimationFrame(tick);
    };

    const syncActivity = () => {
      const active = pageVisible && intersecting && !reduced;
      setRunning(active && !paused);
      if (active && !listening) {
        listening = true;
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        window.addEventListener("hashchange", schedule);
        // Read the restored/hash position immediately when returning to the scene.
        target = measure();
        write(target);
        schedule();
      } else if (!active && listening) {
        listening = false;
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        window.removeEventListener("hashchange", schedule);
        stopFrame();
      }
    };

    const onVisibilityChange = () => {
      pageVisible = document.visibilityState !== "hidden";
      syncActivity();
    };

    // Set every variable before waiting for IntersectionObserver's first delivery.
    write(measure());
    syncActivity();
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
        intersecting = entry.isIntersecting;
        syncActivity();
      }, { threshold: 0 })
      : null;
    observer?.observe(section);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopFrame();
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [paused, reduced]);

  return { sectionRef, progressRef, running };
}
