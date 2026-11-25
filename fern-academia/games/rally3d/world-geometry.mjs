export const TAU = Math.PI * 2;
export const vec = (x, y, z) => [x, y, z];
export const add = ([x, y, z], [a, b, c]) => [x + a, y + b, z + c];
export const sub = ([x, y, z], [a, b, c]) => [x - a, y - b, z - c];
export const scale = ([x, y, z], s) => [x * s, y * s, z * s];
export const cross = ([x, y, z], [a, b, c]) => [y * c - z * b, z * a - x * c, x * b - y * a];
export const dot = ([x, y, z], [a, b, c]) => x * a + y * b + z * c;
export const length = value => Math.hypot(...value);
export const unit = value => scale(value, 1 / (length(value) || 1));
export const mix = (a, b, k) => a + (b - a) * k;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const blend = (a, b, k) => a.map((c, i) => mix(c, b[i], k));
export const tint = (color, amount) => color.map(c => clamp(c * amount, 0, 1));

export function rgb(hex) {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    .map(channel => channel / 255);
}

export function randomFor(seed = 17) {
  let state = seed | 0;
  return () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class Mesh {
  constructor(material = {}) {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.material = material;
  }
  vertex(position, normal, color) {
    this.positions.push(...position);
    this.normals.push(...normal);
    this.colors.push(...color);
  }
  triangle(a, b, c, color, override, samples) {
    const raw = cross(sub(b, a), sub(c, a));
    if (dot(raw, raw) < 0.00000000001) return;
    const n = override || unit(raw);
    this.vertex(a, n, samples?.[0] || color);
    this.vertex(b, n, samples?.[1] || color);
    this.vertex(c, n, samples?.[2] || color);
  }
  quad(a, b, c, d, color, normal, samples) {
    this.triangle(a, b, c, color, normal, samples);
    this.triangle(a, c, d, color, normal, samples && [samples[0], samples[2], samples[3]]);
  }
  toMesh() {
    return {
      ...this.material,
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
    };
  }
}

export function box(mesh, at, sizes, color, yaw = 0) {
  const [x, y, z] = scale(sizes, .5);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const p = (a, b, c) => [
    at[0] + a * cos + c * sin,
    at[1] + b,
    at[2] + c * cos - a * sin,
  ];
  const lower = [p(-x, -y, -z), p(x, -y, -z), p(x, -y, z), p(-x, -y, z)];
  const upper = [p(-x, y, -z), p(x, y, -z), p(x, y, z), p(-x, y, z)];
  mesh.quad(upper[0], upper[3], upper[2], upper[1], tint(color, 1.06));
  mesh.quad(lower[0], lower[1], lower[2], lower[3], tint(color, .79));
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    mesh.quad(lower[i], upper[i], upper[j], lower[j], color);
  }
}

export function tube(mesh, start, end, startRadius, endRadius, color, sides = 7, aspect = 1, profile = null) {
  const up = unit(sub(end, start));
  if (length(up) < .5) return;
  const probe = Math.abs(up[0]) < .92 ? [1, 0, 0] : [0, 0, 1];
  const right = unit(sub(probe, scale(up, dot(probe, up))));
  const forward = unit(cross(right, up));
  const rings = [start, end].map((center, layer) => Array.from({ length: sides }, (_, i) => {
    const angle = i * TAU / sides;
    const radius = (layer === 0 ? startRadius : endRadius) * (profile?.[i] ?? 1);
    return add(center, add(scale(right, Math.cos(angle) * radius), scale(forward, Math.sin(angle) * radius * aspect)));
  }));
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const faceColor = tint(color, 1 + .065 * Math.cos(i * 2));
    mesh.quad(rings[0][i], rings[1][i], rings[1][j], rings[0][j], faceColor);
    if (startRadius > .01) mesh.triangle(start, rings[0][i], rings[0][j], tint(color, .82));
    if (endRadius > .01) mesh.triangle(end, rings[1][j], rings[1][i], tint(color, 1.06));
  }
}

export function mound(mesh, center, radii, colors, random, sides = 8, lean = 0) {
  const [w, h, d] = radii;
  const rings = [[-.8, .42], [-.3, .92], [.24, 1], [.85, .55], [1, .12]];
  const rotation = random() * TAU;
  const sidesScale = Array.from({ length: sides }, () => mix(.84, 1.17, random()));
  const points = rings.map(([y, width], tier) => Array.from({ length: sides }, (_, i) => {
    const angle = i * TAU / sides + rotation + tier * .075;
    const radius = sidesScale[i] * width;
    return add(center, [
      Math.cos(angle) * w * radius + lean * y,
      h * y + (tier === 0 ? 0 : h * .08 * Math.cos(i * 2.3)),
      Math.sin(angle) * d * radius,
    ]);
  }));
  for (let tier = 0; tier < points.length - 1; tier++) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const color = tint(blend(colors[0], colors[1], (tier + 1) / (rings.length - 1)), mix(.89, 1.09, random()));
      mesh.quad(points[tier][i], points[tier + 1][i], points[tier + 1][j], points[tier][j], color);
    }
  }
  const peak = add(center, [lean, h * 1.085, 0]);
  for (let i = 0; i < sides; i++) mesh.triangle(peak, points.at(-1)[(i + 1) % sides], points.at(-1)[i], colors[1]);
}

export function flatDisc(mesh, [x, y, z], radiusX, radiusZ, color, sides = 12) {
  const point = angle => [x + Math.cos(angle) * radiusX, y, z + Math.sin(angle) * radiusZ];
  const center = [x, y, z];
  for (let i = 0; i < sides; i++) {
    mesh.triangle(center, point((i + 1) / sides * TAU), point(i / sides * TAU), color, [0, 1, 0]);
  }
}

// Static geometry lives in independently culled cells. Giant terrain and water
// triangles retain their actual bounds, including overhanging bridges and arches.
export class ChunkMesh {
  constructor(material, size = 112) {
    this.material = material;
    this.size = size;
    this.cells = new Map();
  }
  triangle(a, b, c, color, normal, samples) {
    const key = Math.floor((a[0]+b[0]+c[0])/(3*this.size)) + "," +
      Math.floor((a[2]+b[2]+c[2])/(3*this.size));
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Mesh(this.material);
      cell.extents = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      this.cells.set(key,cell);
    }
    const bounds = cell.extents;
    for (const point of [a,b,c]) for (let i=0;i<3;i++) {
      bounds[i] = Math.min(bounds[i],point[i]);
      bounds[i+3] = Math.max(bounds[i+3],point[i]);
    }
    cell.triangle(a,b,c,color,normal,samples);
  }
  quad(a,b,c,d,color,normal,samples) {
    this.triangle(a,b,c,color,normal,samples);
    this.triangle(a,c,d,color,normal,samples && [samples[0],samples[2],samples[3]]);
  }
  finish() {
    return Array.from(this.cells.values(), cell => {
      const mesh = cell.toMesh();
      const b = cell.extents;
      const mid = [0,1,2].map(i => (b[i]+b[i+3])*.5);
      mesh.bounds = {center:mid,radius:Math.hypot(mid[0]-b[0],mid[1]-b[1],mid[2]-b[2])};
      return mesh;
    }).filter(mesh => mesh.positions.length);
  }
}
