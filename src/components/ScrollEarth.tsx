import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createEarthScene, type EarthScene } from "@/lib/earthScene";
import { createEarthCanvasScene } from "@/lib/earthCanvasScene";

interface ScrollEarthProps {
  running: boolean;
  progress: MutableRefObject<number>;
  reduced: boolean;
}

/** Separate canvases let 2D rendering start even after a WebGL shader fails. */
function EarthFallback({ running, progress, reduced }: ScrollEarthProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<EarthScene | null>(null);
  const liveOptions = useRef({ running, progress, reduced });
  liveOptions.current = { running, progress, reduced };
  useEffect(() => {
    if (!canvas.current) return;
    const renderer = createEarthCanvasScene(canvas.current, {
      progress: () => liveOptions.current.progress.current,
      running: () => liveOptions.current.running,
      reduced: () => liveOptions.current.reduced,
      onUnavailable: () => {},
    });
    scene.current = renderer;
    return () => { renderer?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.refresh(); }, [running, reduced]);
  return <canvas ref={canvas} className="scroll-earth__canvas" data-renderer="canvas2d" style={{ width: "100%", height: "100%" }} />;
}

export default function ScrollEarth({ running, progress, reduced }: ScrollEarthProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<EarthScene | null>(null);
  const liveOptions = useRef({ running, reduced, progress });
  liveOptions.current = { running, reduced, progress };
  const [available, setAvailable] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canvas.current) return;
    const element = canvas.current;
    const restore = () => setAttempt(value => value + 1);
    element.addEventListener("webglcontextrestored", restore);
    const renderer = createEarthScene(element, {
      progress: () => liveOptions.current.progress.current,
      running: () => liveOptions.current.running,
      reduced: () => liveOptions.current.reduced,
      onUnavailable: () => setAvailable(false),
    });
    scene.current = renderer;
    setAvailable(Boolean(renderer));
    return () => {
      renderer?.dispose();
      scene.current = null;
      element.removeEventListener("webglcontextrestored", restore);
    };
  }, [attempt]);

  useEffect(() => { scene.current?.refresh(); }, [running, reduced]);

  return (
    <div className="scroll-earth" aria-hidden="true" data-renderer={available ? "webgl" : "canvas2d"} data-motion={reduced ? "reduced" : running ? "playing" : "paused"}>
      <canvas ref={canvas} className="scroll-earth__canvas" style={{ display: available ? "block" : "none", width: "100%", height: "100%" }} />
      {!available && <EarthFallback running={running} progress={progress} reduced={reduced} />}
    </div>
  );
}
