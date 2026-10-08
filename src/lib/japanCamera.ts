export interface JapanCamera {
  centerX: number;
  centerY: number;
  radius: number;
  yaw: number;
  tilt: number;
  alignment: number;
  approach: number;
}

interface JapanCameraOptions {
  width: number;
  height: number;
  progress: number;
  elapsed?: number;
  pointerX?: number;
  pointerY?: number;
  reduced?: boolean;
}

export const KYOTO = { longitude: 135.7681, latitude: 35.0116 };
export const TOKYO = { longitude: 139.6917, latitude: 35.6895 };
const radians = (degrees: number) => degrees * Math.PI / 180;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
// Zero first and second derivatives let the turn settle naturally into the approach.
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

function rotateLocation(longitude: number, latitude: number, yaw: number, tilt: number) {
  const lat = radians(latitude);
  const lon = radians(longitude) + yaw;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  return { x, y: Math.cos(tilt) * y - Math.sin(tilt) * z, z: Math.sin(tilt) * y + Math.cos(tilt) * z };
}

export function projectEarthLocation(camera: JapanCamera, longitude: number, latitude: number) {
  const point = rotateLocation(longitude, latitude, camera.yaw, camera.tilt);
  return { x: camera.centerX + point.x * camera.radius, y: camera.centerY - point.y * camera.radius, visible: point.z > 0 };
}

/** One reversible camera journey: a world view, a deliberate turn, then arrival in Japan. */
export function getJapanCamera({ width, height, progress, elapsed = 0, pointerX = 0, pointerY = 0, reduced = false }: JapanCameraOptions): JapanCamera {
  const mobile = width < 760;
  const p = reduced ? 0 : clamp(progress);
  const alignment = ease((p - 0.06) / 0.4);
  const approach = ease((p - 0.27) / 0.65);
  // Bounded drift cannot take Japan out of frame, even if the page is left open.
  const drift = reduced ? 0 : Math.sin(elapsed * 0.14) * 0.04;
  const sway = reduced ? 0 : Math.sin(elapsed * 0.11) * 0.006;
  const parallax = reduced ? 0 : 1 - approach * 0.94;
  const yaw = mix(radians(-102), -radians(TOKYO.longitude), alignment) + (drift + pointerX * 0.016) * parallax;
  const tilt = mix(radians(12), radians(TOKYO.latitude), alignment) + (sway + pointerY * 0.009) * parallax;
  const openingRadius = mobile ? Math.min(width * 0.94, height * 0.53) : Math.min(width * 0.52, height * 0.67);
  const arrivalRadius = mobile ? Math.min(width * 2.2, height * 1.4) : Math.min(width * 1.75, height * 2.55);
  // Exponential dolly maintains a steady perceived zoom rather than accelerating near arrival.
  const radius = openingRadius * Math.pow(arrivalRadius / openingRadius, approach);
  let centerX = width * mix(mobile ? 0.55 : 0.72, mobile ? 0.5 : 0.67, alignment);
  let centerY = height * mix(mobile ? 0.73 : 0.66, mobile ? 0.69 : 0.65, alignment);
  const tokyo = rotateLocation(TOKYO.longitude, TOKYO.latitude, yaw, tilt);
  // Once aligned, Tokyo is the stable anchor for both the dolly and subtle pointer movement.
  centerX -= tokyo.x * radius * alignment;
  centerY += tokyo.y * radius * alignment;
  return { centerX, centerY, radius, yaw, tilt, alignment, approach };
}
