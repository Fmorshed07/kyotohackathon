import { useEffect, useRef, useState } from "react";

/** Full motion by default; explicit pause, viewport and tab visibility control playback. */
export function useAmbientMotion() {
  const ref = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(document.visibilityState !== "hidden");

  useEffect(() => {
    const syncVisibility = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", syncVisibility);
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 })
      : null;
    if (ref.current) observer?.observe(ref.current);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      observer?.disconnect();
    };
  }, []);

  return { ref, paused, setPaused, running: !paused && visible && pageVisible };
}
