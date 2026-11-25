/** Small procedural mesh builder for the original Fern Rally kart models. */
const TAU = Math.PI * 2;
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mul = (a, value) => a.map(x => x * value);
const mag = v => Math.hypot(...v);

function unit(v, fallback = [0, 1, 0]) {
  const length = mag(v);
  return length > 1e-8 ? mul(v, 1 / length) : fallback;
}

export function rgb(hex) {
  const n = Number.parseInt(hex, 16);
  return [n >> 16, n >> 8 & 255, n & 255].map(channel => channel / 255);
}

export const tint = (color, factor) => color.map(channel => Math.min(1, Math.max(0, channel * factor)));
export const lerpColor = (a, b, t) => a.map((channel, i) => channel + (b[i] - channel) * t);

export class Mesh {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
  }

  tri(a, b, c) {
    const face = cross(sub(b.p, a.p), sub(c.p, a.p));
    if (dot(face, face) < 1e-16) return;
    if (dot(face, add(a.n, add(b.n, c.n))) < 0) [b, c] = [c, b];
    for (const { p, n, color } of [a, b, c]) {
      this.positions.push(...p);
      this.normals.push(...n);
      this.colors.push(...color);
    }
  }

  grid(rows, columns, sample) {
    let previous = Array.from({ length: columns + 1 }, (_, j) => sample(0, j / columns));
    for (let i = 1; i <= rows; i++) {
      const current = Array.from({ length: columns + 1 }, (_, j) => sample(i / rows, j / columns));
      for (let j = 0; j < columns; j++) {
        this.tri(previous[j], current[j], current[j + 1]);
        this.tri(previous[j], current[j + 1], previous[j + 1]);
      }
      previous = current;
    }
  }

  finish(emissive = 0, material = {}) {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      emissive,
      ...material,
    };
  }
}

function basis([pitch = 0, yaw = 0, roll = 0] = []) {
  const a = Math.cos(pitch), b = Math.sin(pitch);
  const c = Math.cos(yaw), d = Math.sin(yaw);
  const e = Math.cos(roll), f = Math.sin(roll);
  return ([x, y, z]) => {
    const xr = x * e - y * f;
    const yr = x * f + y * e;
    const yp = yr * a - z * b;
    const zp = yr * b + z * a;
    return [xr * c + zp * d, yp, -xr * d + zp * c];
  };
}

export function egg(mesh, origin, radii, color, options = {}) {
  const { rings = 7, slices = 12, rotation, sheen = .085, fiber = 0, shaping } = options;
  const transform = basis(rotation);
  mesh.grid(rings, slices, (u, v) => {
    const a = Math.PI * u;
    const b = TAU * v;
    const d = [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
    const organicY = Math.sin(a) * Math.sin(a);
    const ripple = fiber * organicY * (Math.sin(5 * b + 2.1 * a) + .3 * Math.cos(9 * b - 5 * a));
    const outline = shaping?.(d) || d;
    const p = add(origin, transform(outline.map((x, i) => x * radii[i] * (1 + ripple))));
    const n = transform(unit(outline.map((x, i) => x / radii[i])));
    const shade = 1 - sheen * (.5 - .5 * d[1]) + .022 * Math.sin(5 * b + 2 * a) * Math.sin(a);
    return { p, n, color: tint(color, shade + ripple * 3) };
  });
}

export function bevel(mesh, center, size, radius, color, rotation) {
  const transform = basis(rotation);
  const half = mul(size, .5);
  const r = Math.min(radius, ...half);
  for (let axis = 0; axis < 3; axis++) for (const side of [-1, 1]) {
    const tangent = (axis + 1) % 3;
    const bitangent = (axis + 2) % 3;
    const ticks = d => [-d, -d + r, d - r, d];
    const uTicks = ticks(half[tangent]);
    const vTicks = ticks(half[bitangent]);
    mesh.grid(3, 3, (u, v) => {
      const raw = [];
      raw[axis] = half[axis] * side;
      raw[tangent] = uTicks[Math.round(u * 3)];
      raw[bitangent] = vTicks[Math.round(v * 3)];
      const internal = raw.map((x, i) => Math.min(half[i] - r, Math.max(-half[i] + r, x)));
      const n = unit(sub(raw, internal));
      const p = add(center, transform(add(internal, mul(n, r))));
      return { p, n: transform(n), color: tint(color, .92 + .08 * (n[1] + 1) / 2) };
    });
  }
}

export function tube(mesh, points, widths, color, slices = 8) {
  mesh.grid(points.length - 1, slices, (u, v) => {
    const i = Math.round(u * (points.length - 1));
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const tangent = unit(sub(after, before));
    const ref = Math.abs(tangent[1]) > .91 ? [1, 0, 0] : [0, 1, 0];
    const a = unit(cross(tangent, ref));
    const b = cross(tangent, a);
    const angle = TAU * v;
    const n = add(mul(a, Math.cos(angle)), mul(b, Math.sin(angle)));
    const width = typeof widths === "number" ? widths : widths[i];
    return { p: add(points[i], mul(n, width)), n, color };
  });
}

export function ring(mesh, center, radius, thickness, color, axis = "z", segments = 16, slices = 7) {
  mesh.grid(segments, slices, (u, v) => {
    const a = TAU * u;
    const b = TAU * v;
    const r = radius + thickness * Math.cos(b);
    const pZ = [r * Math.cos(a), r * Math.sin(a), thickness * Math.sin(b)];
    const nZ = [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)];
    const adapt = ([x, y, z]) => axis === "x" ? [z, y, x] : axis === "y" ? [x, z, y] : [x, y, z];
    return { p: add(center, adapt(pZ)), n: adapt(nZ), color };
  });
}

export function shell(mesh, stations, colorAt, slices = 18) {
  const power = x => Math.sign(x) * Math.pow(Math.abs(x), .58);
  const sample = (i, a) => {
    const [z, width, middle, height] = stations[i];
    return [width * power(Math.cos(a)), middle + height * power(Math.sin(a)), z];
  };
  mesh.grid(stations.length - 1, slices, (u, v) => {
    const i = Math.round(u * (stations.length - 1));
    const a = TAU * v;
    const p = sample(i, a);
    const around = sub(sample(i, a + .003), sample(i, a - .003));
    const ahead = sub(sample(Math.min(i + 1, stations.length - 1), a), sample(Math.max(i - 1, 0), a));
    let n = unit(cross(around, ahead), [0, 0, i / stations.length > .5 ? 1 : -1]);
    if (i === 0 || i === stations.length - 1) n = unit(add(n, [0, 0, i === 0 ? -2 : 2]));
    return { p, n, color: colorAt(Math.sin(a), u, v) };
  });
}

export function latheWheel(mesh, profile, tire, rim, detail) {
  const slices = 28;
  mesh.grid(profile.length - 1, slices, (u, v) => {
    const i = Math.round(u * (profile.length - 1));
    const [x, r, metal] = profile[i];
    const [xm, rm] = profile[Math.max(0, i - 1)];
    const [xp, rp] = profile[Math.min(i + 1, profile.length - 1)];
    const [nx, nr] = unit([rp - rm, xm - xp, 0], [0, 1, 0]);
    const a = TAU * v;
    const radial = Math.cos(a);
    const elevated = Math.sin(a);
    const shoulder = Math.max(0, 1 - Math.abs(x) / .153);
    const tread = !metal && r > .31 ? (.0032 + shoulder * .0024) * Math.sin(a * 14 + x * 23.5) : 0;
    const profileX = (r + tread) * radial;
    const profileY = (r + tread) * elevated;
    const shade = metal ? tint(rim, .87 + .1 * Math.cos(5 * a) + .06 * Math.sin(3 * a)) :
      tint(tire, .89 + .16 * Math.sin(a * 14 + x * 23.5) * (.25 + .75 * shoulder));
    return { p: [x, profileX, profileY], n: [-nx, -nr * radial, -nr * elevated], color: metal === 2 ? detail : shade };
  });
}
