import landSource from "@/data/earth-land.json?raw";
import { getJapanCamera, projectEarthLocation, TOKYO } from "@/lib/japanCamera";

type Vec3 = [number, number, number];
type Coordinate = [number, number];
type LandPolygon = Coordinate[][];
interface LandFeature {
  geometry: { type: string; coordinates: LandPolygon | LandPolygon[] };
}

interface EarthOptions {
  progress: () => number;
  running: () => boolean;
  reduced: () => boolean;
  onUnavailable: () => void;
}

export interface EarthScene {
  refresh: () => void;
  dispose: () => void;
}

const TAU = Math.PI * 2;
const radians = (angle: number) => angle * Math.PI / 180;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Longitude zero points toward the camera before applying the globe rotation. */
const geographic = (longitude: number, latitude: number, radius = 1): Vec3 => {
  const longitudeRadians = radians(longitude);
  const latitudeRadians = radians(latitude);
  return [
    radius * Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
    radius * Math.sin(latitudeRadians),
    radius * Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
  ];
};

function insideRing(longitude: number, latitude: number, ring: Coordinate[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if ((a[1] > latitude) !== (b[1] > latitude) && longitude <
      (b[0] - a[0]) * (latitude - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// Geometry is shared by React strict-mode mounts and reused when the viewport changes.
let cachedGeometry: { land: Float32Array; detail: Float32Array; coastline: Float32Array } | undefined;
function createLandGeometry() {
  if (cachedGeometry) return cachedGeometry;
  const polygons = (JSON.parse(landSource) as { features: LandFeature[] }).features.flatMap((feature) =>
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates as LandPolygon]
      : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates as LandPolygon[] : [],
  ).map((rings) => {
    const longitudes = rings[0].map((point) => point[0]);
    const latitudes = rings[0].map((point) => point[1]);
    return { rings, west: Math.min(...longitudes), east: Math.max(...longitudes),
      south: Math.min(...latitudes), north: Math.max(...latitudes) };
  });
  const land: number[] = [];
  const detail: number[] = [];
  const coastline: number[] = [];
  const onLand = (longitude: number, latitude: number) => polygons.some(({ rings, west, east, south, north }) =>
    longitude >= west && longitude <= east && latitude >= south && latitude <= north &&
    insideRing(longitude, latitude, rings[0]) && !rings.slice(1).some((ring) => insideRing(longitude, latitude, ring)),
  );
  const japanIslands = polygons.filter(({ west, east, south, north }) =>
    west >= 128 && east <= 147 && south >= 29 && north <= 46.5,
  );
  const count = 46000;
  // A Fibonacci lattice keeps the particle density even at the poles.
  for (let index = 0; index < count; index++) {
    const latitude = Math.asin(1 - 2 * (index + 0.5) / count) * 180 / Math.PI;
    const longitude = ((index * 137.50776405) % 360) - 180;
    if (latitude < -64) continue;
    if (onLand(longitude, latitude)) land.push(...geographic(longitude, latitude, 1.0015), (index * 0.6180339) % 1);
  }
  // Local detail fades in during the approach; the opening remains a light global point cloud.
  // A staggered lattice resolves Honshu, Kyushu, Shikoku and Hokkaido at the arrival scale.
  let row = 0;
  for (let latitude = 27.5; latitude < 47.5; latitude += 0.12, row++) {
    const spacing = 0.12 / Math.cos(radians(latitude));
    for (let longitude = 124 + (row % 2) * spacing / 2; longitude < 148; longitude += spacing) {
      if (japanIslands.some(({ rings, west, east, south, north }) => longitude >= west && longitude <= east && latitude >= south && latitude <= north &&
        insideRing(longitude, latitude, rings[0]) && !rings.slice(1).some((ring) => insideRing(longitude, latitude, ring)))) {
        detail.push(...geographic(longitude, latitude, 1.0015), (detail.length * 0.6180339) % 1);
      }
    }
  }
  for (const { rings } of polygons) {
    for (const ring of rings) {
      for (let index = 1; index < ring.length; index++) {
        if (ring[index][1] < -64 || Math.abs(ring[index][0] - ring[index - 1][0]) > 180) continue;
        coastline.push(...geographic(...ring[index - 1], 1.002), 1,
          ...geographic(...ring[index], 1.002), 1);
      }
    }
  }
  cachedGeometry = { land: new Float32Array(land), detail: new Float32Array(detail), coastline: new Float32Array(coastline) };
  return cachedGeometry;
}

const common = `
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_yaw;
uniform float u_tilt;
uniform float u_dpr;
uniform highp float u_time;
vec3 rotateEarth(vec3 p) {
  float c = cos(u_yaw), s = sin(u_yaw);
  p = vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
  c=cos(u_tilt); s=sin(u_tilt);
  return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);
}
vec4 projectEarth(vec3 p) {
  vec2 screen = u_center + vec2(p.x,-p.y)*u_radius;
  return vec4(screen.x/u_resolution.x*2.0-1.0,1.0-screen.y/u_resolution.y*2.0,0.0,1.0);
}
`;

const sphereVertex = `
attribute vec2 a_position;
void main() { gl_Position=vec4(a_position,0.0,1.0); }
`;

const sphereFragment = `
precision highp float;
${common}
void main() {
  vec2 center=vec2(u_center.x,u_resolution.y-u_center.y);
  vec2 p=(gl_FragCoord.xy/u_dpr-center)/u_radius;
  float distanceToCenter=length(p);
  if(distanceToCenter>1.3) discard;
  float outer=max(0.0,distanceToCenter-1.0);
  vec3 cyan=vec3(0.025,0.56,1.0);
  if(distanceToCenter>1.0) {
    float glow=exp(-outer*33.0)*0.48+exp(-outer*12.0)*0.055;
    gl_FragColor=vec4(cyan,glow*(1.0-smoothstep(1.12,1.3,distanceToCenter)));
    return;
  }
  float z=sqrt(max(0.0,1.0-dot(p,p)));
  vec3 normal=vec3(p,z);
  float light=max(dot(normal,normalize(vec3(-0.45,0.55,1.0))),0.0);
  vec3 color=mix(vec3(0.004,0.023,0.071),vec3(0.012,0.076,0.17),light);
  float edge=pow(1.0-z,4.5);
  color+=cyan*edge*0.53;
  float c=cos(u_tilt),s=sin(u_tilt);
  vec3 world=vec3(normal.x,c*normal.y+s*normal.z,-s*normal.y+c*normal.z);
  c=cos(u_yaw); s=sin(u_yaw);
  world=vec3(c*world.x-s*world.z,world.y,s*world.x+c*world.z);
  float latitude=asin(clamp(world.y,-1.0,1.0));
  float longitude=atan(world.x,world.z);
  float longitudeLine=1.0-smoothstep(0.0,0.026,abs(sin(longitude*12.0)));
  float latitudeLine=1.0-smoothstep(0.0,0.022,abs(sin(latitude*12.0)));
  float grid=max(longitudeLine,latitudeLine)*(0.018+0.055*z);
  color+=vec3(0.025,0.45,0.88)*grid;
  color+=vec3(0.05,0.62,1.0)*(1.0-smoothstep(0.0,0.0025,abs(distanceToCenter-0.998)))*0.9;
  gl_FragColor=vec4(color,1.0);
}
`;

const surfaceVertex = `
attribute vec4 a_position;
${common}
uniform float u_size;
varying highp vec3 v_position;
varying mediump float v_seed;
void main() {
  v_position=rotateEarth(a_position.xyz);
  v_seed=a_position.w;
  gl_Position=projectEarth(v_position);
  gl_PointSize=u_size*u_dpr*(0.78+0.22*max(v_position.z,0.0));
}
`;

const landFragment = `
precision mediump float;
uniform highp float u_time;
uniform float u_opacity;
varying highp vec3 v_position;
varying mediump float v_seed;
void main() {
  if(v_position.z<0.0) discard;
  float dotRadius=length(gl_PointCoord-vec2(0.5));
  float alpha=1.0-smoothstep(0.18,0.5,dotRadius);
  float light=0.55+0.45*max(v_position.z,0.0);
  vec3 color=mix(vec3(0.03,0.38,0.91),vec3(0.23,0.84,1.0),v_seed*0.62+max(v_position.z,0.0)*0.38);
  gl_FragColor=vec4(color,alpha*light*(0.66+v_seed*0.34)*u_opacity);
}
`;

const lineFragment = `
precision mediump float;
uniform vec4 u_color;
varying highp vec3 v_position;
varying mediump float v_seed;
void main() {
  float surface=sqrt(max(0.0,1.0-dot(v_position.xy,v_position.xy)));
  if(dot(v_position.xy,v_position.xy)<1.0 && v_position.z<surface-0.014) discard;
  gl_FragColor=vec4(u_color.rgb,u_color.a*(0.45+0.55*clamp(v_position.z+0.5,0.0,1.0))*v_seed);
}
`;

const cityFragment = `
precision mediump float;
uniform highp float u_time;
uniform float u_opacity;
varying highp vec3 v_position;
varying mediump float v_seed;
void main() {
  float surface=sqrt(max(0.0,1.0-dot(v_position.xy,v_position.xy)));
  if(dot(v_position.xy,v_position.xy)<1.0 && v_position.z<surface-0.014) discard;
  float r=length(gl_PointCoord-vec2(0.5));
  float center=1.0-smoothstep(0.025,0.1,r);
  float halo=exp(-r*9.0)*0.55;
  float pulse=fract(u_time*0.12+v_seed);
  float ring=(1.0-smoothstep(0.008,0.025,abs(r-pulse*0.45)))*(1.0-pulse)*0.6;
  gl_FragColor=vec4(mix(vec3(0.04,0.58,1.0),vec3(0.75,0.96,1.0),center),max(center,max(halo,ring))*u_opacity);
}
`;

const starsVertex = `
attribute vec4 a_position;
uniform float u_dpr;
uniform vec2 u_pointer;
varying mediump float v_alpha;
void main() {
  gl_Position=vec4(a_position.xy+u_pointer*a_position.z*0.006,0.0,1.0);
  gl_PointSize=(0.6+a_position.z*1.8)*u_dpr;
  v_alpha=a_position.w;
}
`;

const starsFragment = `
precision mediump float;
varying mediump float v_alpha;
void main() {
  float alpha=(1.0-smoothstep(0.0,0.5,length(gl_PointCoord-vec2(0.5))))*v_alpha;
  gl_FragColor=vec4(0.43,0.72,1.0,alpha);
}
`;

function randomGenerator() {
  let seed = 7321;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createRoutes() {
  const locations: Coordinate[] = [[TOKYO.longitude, TOKYO.latitude], [-122.42, 37.77],
    [103.82, 1.35], [-0.12, 51.51], [13.41, 52.52], [77.21, 28.61], [151.21, -33.87], [-74.01, 40.71]];
  const arcs: number[] = [];
  const travelers: Vec3[][] = [];
  for (let destination = 1; destination < locations.length; destination++) {
    const from = geographic(...locations[destination]);
    const to = geographic(...locations[0]);
    const angle = Math.acos(clamp(from.reduce((total, value, index) => total + value * to[index], 0), -1, 1));
    const path: Vec3[] = [];
    const elevation = Math.max(0.012, angle * 0.13);
    for (let step = 0; step <= 90; step++) {
      const t = step / 90;
      const a = Math.sin((1 - t) * angle) / Math.sin(angle);
      const b = Math.sin(t * angle) / Math.sin(angle);
      const radius = 1.008 + Math.sin(t * Math.PI) * elevation;
      const point = from.map((value, index) => (value * a + to[index] * b) * radius) as Vec3;
      path.push(point);
      if (step > 0) arcs.push(...path[step - 1], 0.9, ...point, 0.9);
    }
    travelers.push(path);
  }
  const cities = new Float32Array(locations.slice(1).flatMap((location, index) => [...geographic(...location, 1.014), index / locations.length]));
  const tokyoPin = new Float32Array([...geographic(TOKYO.longitude, TOKYO.latitude, 1.0025), 0]);
  return { arcs: new Float32Array(arcs), tokyoPin, cities, travelers };
}

function createOrbits() {
  const lines: number[] = [];
  for (let orbit = 0; orbit < 2; orbit++) {
    const angle = orbit === 0 ? 0.52 : -0.84;
    const radius = orbit === 0 ? 1.19 : 1.34;
    const point = (t: number): Vec3 => [Math.cos(t) * radius,
      Math.sin(t) * Math.sin(angle) * radius, Math.sin(t) * Math.cos(angle) * radius];
    for (let step = 0; step < 360; step++) {
      if (orbit === 1 && step % 6 > 3) continue;
      lines.push(...point(step / 360 * TAU), 1, ...point((step + 1) / 360 * TAU), 1);
    }
  }
  return new Float32Array(lines);
}

export function createEarthScene(canvas: HTMLCanvasElement, options: EarthOptions): EarthScene | null {
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power", depth: false, stencil: false });
  } catch {
    return null;
  }
  if (!gl) return null;
  const context = gl;
  const programs: WebGLProgram[] = [];
  const buffers: WebGLBuffer[] = [];
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = context.createShader(type);
    if (!shader) throw new Error("Could not allocate an Earth shader");
    shaders.push(shader);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) throw new Error("Could not compile an Earth shader");
    return shader;
  };
  const program = (vertex: string, fragment: string) => {
    const result = context.createProgram();
    if (!result) throw new Error("Could not allocate an Earth program");
    programs.push(result);
    context.attachShader(result, compile(context.VERTEX_SHADER, vertex));
    context.attachShader(result, compile(context.FRAGMENT_SHADER, fragment));
    context.linkProgram(result);
    if (!context.getProgramParameter(result, context.LINK_STATUS)) throw new Error("Could not link an Earth program");
    return result;
  };
  const buffer = (data: Float32Array, dynamic = false) => {
    const result = context.createBuffer();
    if (!result) throw new Error("Could not allocate an Earth buffer");
    buffers.push(result);
    context.bindBuffer(context.ARRAY_BUFFER, result);
    context.bufferData(context.ARRAY_BUFFER, data, dynamic ? context.DYNAMIC_DRAW : context.STATIC_DRAW);
    return { buffer: result, count: data.length / 4 };
  };
  const release = () => {
    buffers.forEach((value) => context.deleteBuffer(value));
    programs.forEach((value) => context.deleteProgram(value));
    shaders.forEach((value) => context.deleteShader(value));
  };

  try {
    const sphereProgram = program(sphereVertex, sphereFragment);
    const landProgram = program(surfaceVertex, landFragment);
    const lineProgram = program(surfaceVertex, lineFragment);
    const cityProgram = program(surfaceVertex, cityFragment);
    const skyProgram = program(starsVertex, starsFragment);
    const geometry = createLandGeometry();
    const routes = createRoutes();
    const land = buffer(geometry.land);
    const detail = buffer(geometry.detail);
    const coastline = buffer(geometry.coastline);
    const arcs = buffer(routes.arcs);
    const cities = buffer(routes.cities);
    const tokyoPin = buffer(routes.tokyoPin);
    const orbits = buffer(createOrbits());
    const quad = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
    const random = randomGenerator();
    const starData = new Float32Array(Array.from({ length: 360 }, () =>
      [random() * 2 - 1, random() * 2 - 1, random(), 0.1 + random() * 0.38]).flat());
    const stars = buffer(starData);
    const travelerData = new Float32Array(routes.travelers.length * 4);
    const travelers = buffer(travelerData, true);
    const uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const uniform = (selected: WebGLProgram, name: string) => {
      let cache = uniformCache.get(selected);
      if (!cache) { cache = new Map(); uniformCache.set(selected, cache); }
      if (!cache.has(name)) cache.set(name, context.getUniformLocation(selected, name));
      return cache.get(name) ?? null;
    };
    const attributes = new Map(programs.map((selected) => [selected, context.getAttribLocation(selected, "a_position")]));
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let disposed = false;
    let lost = false;
    let elapsed = 0;
    let previousTime = 0;
    let smoothedProgress = clamp(options.progress());
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let lastDiagnostic = 0;
    const stage = canvas.closest<HTMLElement>(".journey-stage");
    const journey = canvas.closest<HTMLElement>(".globe-journey");
    context.enable(context.BLEND);
    context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
    context.clearColor(0, 0, 0, 0);

    const render = (timestamp: number) => {
      frame = 0;
      if (disposed || lost) return;
      const reduced = options.reduced();
      const running = options.running() && !reduced;
      const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.05) : 0;
      previousTime = timestamp;
      if (running) elapsed += delta;
      const progress = reduced ? 0 : clamp(options.progress());
      smoothedProgress = running ? mix(smoothedProgress, progress, 1 - Math.exp(-delta * 8)) : progress;
      pointer.x = mix(pointer.x, reduced ? 0 : pointer.targetX, 0.05);
      pointer.y = mix(pointer.y, reduced ? 0 : pointer.targetY, 0.05);
      const mobile = width < 760;
      const camera = getJapanCamera({ width, height, progress: smoothedProgress, elapsed,
        pointerX: pointer.x, pointerY: pointer.y, reduced });
      const { centerX, centerY, radius, yaw, tilt, approach, alignment } = camera;
      const globalConnections = 1 - clamp(approach * 2.5);
      const localDetail = clamp((approach - 0.05) / 0.45);
      context.clear(context.COLOR_BUFFER_BIT);

      const select = (selected: WebGLProgram, data: { buffer: WebGLBuffer; count: number }, size = 4) => {
        context.useProgram(selected);
        context.bindBuffer(context.ARRAY_BUFFER, data.buffer);
        const attribute = attributes.get(selected)!;
        context.enableVertexAttribArray(attribute);
        context.vertexAttribPointer(attribute, size, context.FLOAT, false, 0, 0);
        context.uniform2f(uniform(selected, "u_resolution"), width, height);
        context.uniform2f(uniform(selected, "u_center"), centerX, centerY);
        context.uniform1f(uniform(selected, "u_radius"), radius);
        context.uniform1f(uniform(selected, "u_yaw"), yaw);
        context.uniform1f(uniform(selected, "u_tilt"), tilt);
        context.uniform1f(uniform(selected, "u_dpr"), dpr);
        context.uniform1f(uniform(selected, "u_time"), elapsed);
      };
      select(skyProgram, stars);
      context.uniform2f(uniform(skyProgram, "u_pointer"), pointer.x, pointer.y);
      context.drawArrays(context.POINTS, 0, stars.count);
      select(sphereProgram, quad, 2);
      context.drawArrays(context.TRIANGLES, 0, 6);
      select(lineProgram, orbits);
      context.uniform4f(uniform(lineProgram, "u_color"), 0.04, 0.42, 0.86, 0.18 * (1 - alignment));
      context.drawArrays(context.LINES, 0, orbits.count);
      select(lineProgram, coastline);
      context.uniform4f(uniform(lineProgram, "u_color"), 0.08, 0.63, 0.96, mix(0.32, 0.68, approach));
      context.drawArrays(context.LINES, 0, coastline.count);
      select(landProgram, land);
      context.uniform1f(uniform(landProgram, "u_size"), mobile ? 1.55 : 1.95);
      context.uniform1f(uniform(landProgram, "u_opacity"), 1 - approach * 0.48);
      context.drawArrays(context.POINTS, 0, land.count);
      select(landProgram, detail);
      context.uniform1f(uniform(landProgram, "u_size"), mobile ? 1.35 : 1.7);
      context.uniform1f(uniform(landProgram, "u_opacity"), localDetail * 0.86);
      context.drawArrays(context.POINTS, 0, detail.count);
      select(lineProgram, arcs);
      context.uniform4f(uniform(lineProgram, "u_color"), 0.16, 0.67, 1.0, 0.38 * globalConnections);
      context.drawArrays(context.LINES, 0, arcs.count);
      select(cityProgram, cities);
      context.uniform1f(uniform(cityProgram, "u_size"), 21);
      context.uniform1f(uniform(cityProgram, "u_opacity"), globalConnections);
      context.drawArrays(context.POINTS, 0, cities.count);
      select(cityProgram, tokyoPin);
      context.uniform1f(uniform(cityProgram, "u_size"), mix(21, 35, approach));
      context.uniform1f(uniform(cityProgram, "u_opacity"), 0.9);
      context.drawArrays(context.POINTS, 0, tokyoPin.count);
      routes.travelers.forEach((path, index) => {
        const position = ((elapsed * 0.045 + index * 0.17) % 1) * (path.length - 1);
        const start = Math.floor(position);
        const end = Math.min(start + 1, path.length - 1);
        for (let axis = 0; axis < 3; axis++) travelerData[index * 4 + axis] = mix(path[start][axis], path[end][axis], position - start);
        travelerData[index * 4 + 3] = index / routes.travelers.length;
      });
      context.bindBuffer(context.ARRAY_BUFFER, travelers.buffer);
      context.bufferSubData(context.ARRAY_BUFFER, 0, travelerData);
      select(cityProgram, travelers);
      context.uniform1f(uniform(cityProgram, "u_size"), 9);
      context.uniform1f(uniform(cityProgram, "u_opacity"), globalConnections * 0.8);
      context.drawArrays(context.POINTS, 0, travelers.count);
      const tokyo = projectEarthLocation(camera, TOKYO.longitude, TOKYO.latitude);
      stage?.style.setProperty("--tokyo-x", `${tokyo.x.toFixed(2)}px`);
      stage?.style.setProperty("--tokyo-y", `${tokyo.y.toFixed(2)}px`);
      stage?.style.setProperty("--japan-approach", approach.toFixed(4));
      stage?.style.setProperty("--location-opacity", (tokyo.visible ? clamp((smoothedProgress - 0.32) / 0.13) : 0).toFixed(4));
      if (timestamp - lastDiagnostic > 150) {
        canvas.dataset.rotation = yaw.toFixed(3);
        canvas.dataset.progress = smoothedProgress.toFixed(3);
        canvas.dataset.camera = approach > 0.96 ? "japan" : approach > 0.05 ? "approach" : alignment > 0.05 ? "orient" : "world";
        canvas.dataset.zoom = (radius / Math.min(width, height)).toFixed(3);
        lastDiagnostic = timestamp;
      }
      if (running) frame = requestAnimationFrame(render);
    };

    const refresh = () => {
      if (!frame && !disposed && !lost) {
        previousTime = 0;
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
      context.viewport(0, 0, canvas.width, canvas.height);
      refresh();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || options.reduced() || !options.running()) return;
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = clamp((event.clientX - rect.left) / width * 2 - 1, -1, 1);
      pointer.targetY = clamp((event.clientY - rect.top) / height * 2 - 1, -1, 1);
    };
    const resetPointer = () => { pointer.targetX = 0; pointer.targetY = 0; };
    const onScroll = () => {
      // The journey hook resumes rendering when this section comes back into view.
      if (options.running()) refresh();
    };
    const onJourneyChange = () => {
      // Pausing stops ambient animation, but scrolling still paints the requested still view.
      if (!options.running() && !options.reduced()) refresh();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      frame = 0;
      options.onUnavailable();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", resetPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    journey?.addEventListener("globejourneychange", onJourneyChange);
    canvas.addEventListener("webglcontextlost", contextLost);
    resize();
    return {
      refresh,
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerout", resetPointer);
        window.removeEventListener("scroll", onScroll);
        journey?.removeEventListener("globejourneychange", onJourneyChange);
        canvas.removeEventListener("webglcontextlost", contextLost);
        release();
      },
    };
  } catch {
    release();
    return null;
  }
}
