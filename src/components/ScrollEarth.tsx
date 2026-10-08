import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createEarthScene, type EarthScene } from "@/lib/earthScene";

interface ScrollEarthProps {
  running: boolean;
  progress: MutableRefObject<number>;
  reduced: boolean;
}

/** A local, deterministic fallback keeps the Earth visible without WebGL. */
function EarthFallback() {
  return (
    <svg className="scroll-earth__fallback" viewBox="0 0 800 800" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="earth-fallback-ocean" cx="40%" cy="30%" r="75%">
          <stop stopColor="#09385a" />
          <stop offset="0.8" stopColor="#041626" />
          <stop offset="1" stopColor="#047abb" />
        </radialGradient>
        <radialGradient id="earth-fallback-halo">
          <stop offset="0.75" stopColor="#018ad8" stopOpacity="0" />
          <stop offset="0.83" stopColor="#018ad8" stopOpacity="0.2" />
          <stop offset="1" stopColor="#018ad8" stopOpacity="0" />
        </radialGradient>
        <pattern id="earth-fallback-dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" fill="#49caff" />
        </pattern>
        <clipPath id="earth-fallback-clip"><circle cx="400" cy="400" r="275" /></clipPath>
      </defs>
      <circle cx="400" cy="400" r="334" fill="url(#earth-fallback-halo)" />
      <circle cx="400" cy="400" r="275" fill="url(#earth-fallback-ocean)" stroke="#32bdff" strokeOpacity="0.8" />
      <g clipPath="url(#earth-fallback-clip)" stroke="#2387b8" strokeOpacity="0.2">
        {[65, 140, 210].map((radius) => <ellipse key={radius} cx="400" cy="400" rx={radius} ry="275" />)}
        {[-180, -90, 0, 90, 180].map((offset) => <ellipse key={offset} cx="400" cy={400 + offset} rx={Math.sqrt(275 ** 2 - offset ** 2)} ry="40" />)}
        <path d="M152 242L184 219 228 231 247 208 287 215 303 190 355 170 394 186 419 174 453 189 484 185 514 208 555 200 592 226 616 246 605 269 642 278 646 314 612 324 593 353 561 343 536 360 518 393 494 420 478 394 461 368 437 362 429 332 409 322 380 341 351 325 325 348 308 338 296 302 269 299 250 268 230 271 206 254 184 269Z M304 342L342 348 369 363 392 402 383 440 361 475 343 524 320 543 303 514 297 470 279 438 266 403 282 369Z M527 480L550 466 580 478 600 470 624 489 639 530 614 552 576 548 559 531 537 538 519 511Z M536 391L548 411 563 425 557 446 543 433 536 417Z M593 335L604 326 611 342 602 363 592 375 586 365Z" fill="url(#earth-fallback-dots)" stroke="#26b4f4" strokeOpacity="0.35" />
      </g>
      <ellipse cx="400" cy="400" rx="337" ry="125" transform="rotate(-27 400 400)" stroke="#209bdb" strokeOpacity="0.4" />
      <ellipse cx="400" cy="400" rx="355" ry="125" transform="rotate(34 400 400)" stroke="#209bdb" strokeOpacity="0.2" strokeDasharray="3 7" />
      <path d="M592 348Q512 125 350 293M592 348Q653 394 586 502M592 348Q477 227 441 370" stroke="#6edbff" strokeOpacity="0.6" />
      <circle cx="592" cy="348" r="4" fill="#a9edff" />
      <circle cx="592" cy="348" r="12" stroke="#39b8f0" strokeOpacity="0.6" />
    </svg>
  );
}

export default function ScrollEarth({ running, progress, reduced }: ScrollEarthProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<EarthScene | null>(null);
  const liveOptions = useRef({ running, reduced, progress });
  liveOptions.current = { running, reduced, progress };
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const renderer = createEarthScene(canvas.current, {
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
    };
  }, []);

  useEffect(() => { scene.current?.refresh(); }, [running, reduced]);

  return (
    <div className="scroll-earth" aria-hidden="true" data-renderer={available ? "webgl" : "fallback"} data-motion={reduced ? "reduced" : running ? "playing" : "paused"}>
      <canvas ref={canvas} className="scroll-earth__canvas" style={{ display: available ? "block" : "none", width: "100%", height: "100%" }} />
      {!available && <EarthFallback />}
    </div>
  );
}
