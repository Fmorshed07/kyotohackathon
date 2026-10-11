import { createLandGeometry, createOrbits, createRoutes, type EarthOptions, type EarthScene } from "@/lib/earthScene";
import { getJapanCamera, projectEarthLocation, TOKYO, type JapanCamera } from "@/lib/japanCamera";

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

interface Projection {
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
}

function projector(camera: JapanCamera) {
  const yawCos = Math.cos(camera.yaw);
  const yawSin = Math.sin(camera.yaw);
  const tiltCos = Math.cos(camera.tilt);
  const tiltSin = Math.sin(camera.tilt);
  return (x: number, y: number, z: number): Projection => {
    const rotatedX = yawCos * x + yawSin * z;
    const rotatedZ = -yawSin * x + yawCos * z;
    const rotatedY = tiltCos * y - tiltSin * rotatedZ;
    const depth = tiltSin * y + tiltCos * rotatedZ;
    return { x: rotatedX, y: rotatedY, z: depth,
      screenX: camera.centerX + rotatedX * camera.radius,
      screenY: camera.centerY - rotatedY * camera.radius };
  };
}

// Routes and orbits may rise above the surface. Hide their far side behind the ocean.
function visible(point: Projection) {
  const distance = point.x * point.x + point.y * point.y;
  return distance >= 1 || point.z >= Math.sqrt(Math.max(0, 1 - distance)) - 0.014;
}

function createGrid() {
  const data: number[] = [];
  const point = (longitude: number, latitude: number) => {
    const lon = longitude * Math.PI / 180;
    const lat = latitude * Math.PI / 180;
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon), 1];
  };
  for (let latitude = -75; latitude <= 75; latitude += 15) {
    for (let longitude = -180; longitude < 180; longitude += 2) {
      data.push(...point(longitude, latitude), ...point(longitude + 2, latitude));
    }
  }
  for (let longitude = -180; longitude < 180; longitude += 15) {
    for (let latitude = -90; latitude < 90; latitude += 2) {
      data.push(...point(longitude, latitude), ...point(longitude, latitude + 2));
    }
  }
  return new Float32Array(data);
}

/** The same geographic scene remains interactive when the browser cannot start WebGL. */
export function createEarthCanvasScene(canvas: HTMLCanvasElement, options: EarthOptions): EarthScene | null {
  let context: CanvasRenderingContext2D | null;
  try { context = canvas.getContext("2d", { alpha: true }); } catch { return null; }
  if (!context) return null;
  const ctx = context;
  const geometry = createLandGeometry();
  const routes = createRoutes();
  const orbits = createOrbits();
  const grid = createGrid();
  let seed = 7321;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const stars = Array.from({ length: 180 }, () => ({ x: random(), y: random(), size: 0.3 + random() * 0.6, alpha: 0.08 + random() * 0.22 }));
  const stage = canvas.closest<HTMLElement>(".journey-stage");
  const journey = canvas.closest<HTMLElement>(".globe-journey");
  let width = 1;
  let height = 1;
  let dpr = 1;
  let frame = 0;
  let disposed = false;
  let elapsed = 0;
  let previousTime = 0;
  let lastPaint = 0;
  let smoothedProgress = clamp(options.progress());
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  const paint = (camera: JapanCamera) => {
    const { centerX, centerY, radius, approach, alignment } = camera;
    const project = projector(camera);
    const mobile = width < 760;
    const globalConnections = 1 - clamp(approach * 2.5);
    const localDetail = clamp((approach - 0.05) / 0.45);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    for (const star of stars) {
      ctx.fillStyle = `rgba(109,184,255,${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * width + pointer.x * 2, star.y * height + pointer.y * 2, star.size, 0, TAU);
      ctx.fill();
    }

    const atmosphere = ctx.createRadialGradient(centerX, centerY, radius * 0.96, centerX, centerY, radius * 1.12);
    atmosphere.addColorStop(0, "rgba(6,142,255,0)");
    atmosphere.addColorStop(0.25, "rgba(6,142,255,0.35)");
    atmosphere.addColorStop(0.5, "rgba(6,142,255,0.08)");
    atmosphere.addColorStop(1, "rgba(6,142,255,0)");
    ctx.fillStyle = atmosphere;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.12, 0, TAU);
    ctx.fill();
    const ocean = ctx.createRadialGradient(centerX - radius * 0.35, centerY - radius * 0.38, radius * 0.08, centerX, centerY, radius * 1.08);
    ocean.addColorStop(0, "#061c3a");
    ocean.addColorStop(0.7, "#031229");
    ocean.addColorStop(0.94, "#052d4d");
    ocean.addColorStop(1, "#075e86");
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(48,176,255,0.72)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const lines = (data: Float32Array, color: string, opacity: number, lineWidth = 0.65) => {
      if (opacity <= 0) return;
      ctx.beginPath();
      for (let index = 0; index < data.length; index += 8) {
        const from = project(data[index], data[index + 1], data[index + 2]);
        const to = project(data[index + 4], data[index + 5], data[index + 6]);
        const midpoint = project((data[index] + data[index + 4]) / 2,
          (data[index + 1] + data[index + 5]) / 2, (data[index + 2] + data[index + 6]) / 2);
        if (!visible(midpoint)) continue;
        ctx.moveTo(from.screenX, from.screenY);
        ctx.lineTo(to.screenX, to.screenY);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    lines(grid, "#17629a", 0.25);
    lines(orbits, "#237bc1", 0.28 * (1 - alignment));
    lines(geometry.coastline, "#198ac9", mix(0.46, 0.7, approach), 0.6);

    const land = (data: Float32Array, opacity: number, size: number) => {
      if (opacity <= 0) return;
      // Batch dots by shade instead of issuing thousands of individual fills.
      const groups = Array.from({ length: 8 }, () => [] as number[]);
      for (let index = 0; index < data.length; index += 4) {
        const point = project(data[index], data[index + 1], data[index + 2]);
        if (point.z < 0 || point.screenX < -size || point.screenX > width + size || point.screenY < -size || point.screenY > height + size) continue;
        const shade = Math.min(7, Math.floor((data[index + 3] * 0.38 + point.z * 0.62) * 8));
        groups[shade].push(point.screenX, point.screenY, size * (0.78 + 0.22 * point.z) / 2);
      }
      groups.forEach((points, shade) => {
        if (!points.length) return;
        ctx.beginPath();
        for (let index = 0; index < points.length; index += 3) {
          ctx.moveTo(points[index] + points[index + 2], points[index + 1]);
          ctx.arc(points[index], points[index + 1], points[index + 2], 0, TAU);
        }
        ctx.fillStyle = `rgb(${Math.round(12 + shade * 7)},${Math.round(111 + shade * 13)},255)`;
        ctx.globalAlpha = opacity * (0.4 + shade * 0.065);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    land(geometry.land, 1 - approach * 0.48, mobile ? 1.55 : 1.95);
    land(geometry.detail, localDetail * 0.86, mobile ? 1.35 : 1.7);
    lines(routes.arcs, "#65caff", globalConnections * 0.38, 0.7);

    const pin = (x: number, y: number, z: number, phase: number, size: number, opacity: number) => {
      if (opacity <= 0) return;
      const point = project(x, y, z);
      if (!visible(point)) return;
      const radius = size / 2;
      const halo = ctx.createRadialGradient(point.screenX, point.screenY, 0, point.screenX, point.screenY, radius);
      halo.addColorStop(0, "rgba(210,246,255,1)");
      halo.addColorStop(0.12, "rgba(131,218,255,0.9)");
      halo.addColorStop(0.3, "rgba(29,166,255,0.32)");
      halo.addColorStop(1, "rgba(29,166,255,0)");
      ctx.fillStyle = halo;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(point.screenX, point.screenY, radius, 0, TAU);
      ctx.fill();
      const pulse = (elapsed * 0.12 + phase) % 1;
      ctx.strokeStyle = "#59c7ff";
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = opacity * (1 - pulse) * 0.55;
      ctx.beginPath();
      ctx.arc(point.screenX, point.screenY, radius * (0.18 + pulse * 0.72), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    for (let index = 0; index < routes.cities.length; index += 4) {
      pin(routes.cities[index], routes.cities[index + 1], routes.cities[index + 2], routes.cities[index + 3], 21, globalConnections);
    }
    pin(routes.tokyoPin[0], routes.tokyoPin[1], routes.tokyoPin[2], 0, mix(21, 35, approach), 0.9);
    routes.travelers.forEach((path, index) => {
      const position = ((elapsed * 0.045 + index * 0.17) % 1) * (path.length - 1);
      const start = Math.floor(position);
      const end = Math.min(start + 1, path.length - 1);
      pin(mix(path[start][0], path[end][0], position - start), mix(path[start][1], path[end][1], position - start),
        mix(path[start][2], path[end][2], position - start), index / path.length, 9, globalConnections * 0.8);
    });
    const tokyo = projectEarthLocation(camera, TOKYO.longitude, TOKYO.latitude);
    stage?.style.setProperty("--tokyo-x", `${tokyo.x.toFixed(2)}px`);
    stage?.style.setProperty("--tokyo-y", `${tokyo.y.toFixed(2)}px`);
    stage?.style.setProperty("--japan-approach", approach.toFixed(4));
    stage?.style.setProperty("--location-opacity", (tokyo.visible ? clamp((smoothedProgress - 0.32) / 0.13) : 0).toFixed(4));
    canvas.dataset.rotation = camera.yaw.toFixed(3);
    canvas.dataset.progress = smoothedProgress.toFixed(3);
    canvas.dataset.camera = approach > 0.96 ? "japan" : approach > 0.05 ? "approach" : alignment > 0.05 ? "orient" : "world";
    canvas.dataset.zoom = (radius / Math.min(width, height)).toFixed(3);
  };

  const render = (timestamp: number) => {
    frame = 0;
    if (disposed) return;
    const reduced = options.reduced();
    const running = options.running() && !reduced;
    // The CPU renderer is capped at 30 fps; paused navigation still paints immediately.
    if (running && lastPaint && timestamp - lastPaint < 1000 / 30) {
      frame = requestAnimationFrame(render);
      return;
    }
    const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.1) : 0;
    previousTime = timestamp;
    lastPaint = timestamp;
    if (running) elapsed += delta;
    const progress = reduced ? 0 : clamp(options.progress());
    smoothedProgress = running ? mix(smoothedProgress, progress, delta ? 1 - Math.exp(-delta * 8) : 0) : progress;
    pointer.x = mix(pointer.x, reduced ? 0 : pointer.targetX, 0.1);
    pointer.y = mix(pointer.y, reduced ? 0 : pointer.targetY, 0.1);
    paint(getJapanCamera({ width, height, progress: smoothedProgress, elapsed, pointerX: pointer.x, pointerY: pointer.y, reduced }));
    if (running) frame = requestAnimationFrame(render);
  };
  const refresh = () => {
    if (!frame && !disposed) {
      previousTime = 0;
      lastPaint = 0;
      frame = requestAnimationFrame(render);
    }
  };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    refresh();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || options.reduced() || !options.running()) return;
    const rect = canvas.getBoundingClientRect();
    pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / width * 2 - 1));
    pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / height * 2 - 1));
  };
  const resetPointer = () => { pointer.targetX = 0; pointer.targetY = 0; };
  const onScroll = () => { if (options.running()) refresh(); };
  const onJourneyChange = () => { if (!options.running() && !options.reduced()) refresh(); };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerout", resetPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  journey?.addEventListener("globejourneychange", onJourneyChange);
  resize();
  return {
    refresh,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", resetPointer);
      window.removeEventListener("scroll", onScroll);
      journey?.removeEventListener("globejourneychange", onJourneyChange);
    },
  };
}
