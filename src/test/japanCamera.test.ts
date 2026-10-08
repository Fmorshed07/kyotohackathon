import { describe, expect, it } from "vitest";
import { getJapanCamera, projectEarthLocation, TOKYO } from "@/lib/japanCamera";

describe("world-to-Tokyo camera", () => {
  it("keeps Tokyo visible while continuously approaching rather than spinning away", () => {
    let previousRadius = 0;
    for (let step = 0; step <= 100; step++) {
      const camera = getJapanCamera({ width: 1440, height: 900, progress: step / 100 });
      const tokyo = projectEarthLocation(camera, TOKYO.longitude, TOKYO.latitude);
      expect(camera.radius).toBeGreaterThanOrEqual(previousRadius);
      expect(tokyo.visible).toBe(true);
      expect(tokyo.x).toBeGreaterThan(0);
      expect(tokyo.x).toBeLessThan(1440);
      expect(tokyo.y).toBeGreaterThan(0);
      expect(tokyo.y).toBeLessThan(900);
      previousRadius = camera.radius;
    }
  });

  it.each([[1440, 900, 0.67, 0.65], [390, 844, 0.5, 0.69]])(
    "lands Tokyo at the intended composition for a %d×%d viewport",
    (width, height, x, y) => {
      const camera = getJapanCamera({ width, height, progress: 1, elapsed: 70, pointerX: 1, pointerY: -1 });
      const tokyo = projectEarthLocation(camera, TOKYO.longitude, TOKYO.latitude);
      const sapporo = projectEarthLocation(camera, 141.3545, 43.0618);
      expect(tokyo.x).toBeCloseTo(width * x, 6);
      expect(tokyo.y).toBeCloseTo(height * y, 6);
      expect(sapporo.x).toBeGreaterThan(tokyo.x);
      expect(sapporo.y).toBeLessThan(tokyo.y);
      expect(tokyo.x).toBeLessThan(width);
      expect(camera.approach).toBe(1);
    },
  );

  it("bounds ambient motion instead of accumulating full rotations over time", () => {
    const reference = getJapanCamera({ width: 1440, height: 900, progress: 0 });
    for (const elapsed of [10, 300, 3600, 86400, 1000000]) {
      const camera = getJapanCamera({ width: 1440, height: 900, progress: 0, elapsed });
      expect(Math.abs(camera.yaw - reference.yaw)).toBeLessThanOrEqual(0.04);
      expect(Math.abs(camera.tilt - reference.tilt)).toBeLessThanOrEqual(0.006);
    }
  });

  it("preserves a stable opening view for reduced motion regardless of scrolling", () => {
    const initial = getJapanCamera({ width: 1440, height: 900, progress: 0, reduced: true });
    const scrolled = getJapanCamera({ width: 1440, height: 900, progress: 1, elapsed: 600, pointerX: 1, pointerY: 1, reduced: true });
    expect(scrolled).toEqual(initial);
  });

  it("reverses the same camera path without history or discontinuities", () => {
    const forward = Array.from({ length: 101 }, (_, index) => getJapanCamera({ width: 1440, height: 900, progress: index / 100 }));
    [...forward].reverse().forEach((camera, index) => {
      expect(getJapanCamera({ width: 1440, height: 900, progress: (100 - index) / 100 })).toEqual(camera);
    });
    for (let index = 1; index < forward.length; index++) {
      expect(Math.abs(forward[index].radius - forward[index - 1].radius)).toBeLessThan(65);
      expect(Math.abs(forward[index].yaw - forward[index - 1].yaw)).toBeLessThan(0.035);
    }
  });
});
