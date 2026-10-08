import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** React mounts after the browser's initial fragment scroll on document navigation. */
export function useHomeSectionAnchor() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); }
    catch { return; }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);
}
