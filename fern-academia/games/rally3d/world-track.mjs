import { ChunkMesh, box, flatDisc, mix, rgb, tint, tube, blend, unit } from "./world-geometry.mjs";

const UP = [0, 1, 0];
const white = rgb("f1eee0");

export function roadPoint(course, s, offset, lift = 0) {
  const f = course.frame(s);
  return [f.x + f.rx * offset, f.y + Math.tan(f.bank || 0) * offset + lift, f.z + f.rz * offset];
}

function ribbon(mesh, course, start, end, from, to, lift, color) {
  const normal = f => {
    const bank = Math.tan(f.bank || 0), dy = f.dy || 0;
    return unit([dy * f.rz - f.dz * bank, f.dz * f.rx - f.dx * f.rz, f.dx * bank - dy * f.rx]);
  };
  const before = normal(course.frame(start));
  const after = normal(course.frame(end));
  mesh.quad(roadPoint(course,start,from,lift),roadPoint(course,end,from,lift),roadPoint(course,end,to,lift),
    roadPoint(course,start,to,lift),color,undefined,undefined,[before,after,after,before]);
}

function wall(mesh, course, start, end, offset, top, bottom, color, flip) {
  const points = [roadPoint(course, start, offset, top), roadPoint(course, end, offset, top),
    roadPoint(course, end, offset, bottom), roadPoint(course, start, offset, bottom)];
  mesh.quad(...(flip ? points.reverse() : points), color);
}

export function inBridge(course, s) {
  const normalized = ((s % course.length) + course.length) % course.length / course.length;
  if (course.bridges) return course.bridges.some(([start,end]) => normalized >= start && normalized <= end);
  if (course.id === "river") return normalized > .365 && normalized < .445 || normalized > .718 && normalized < .78;
  if (course.id === "moss") return normalized > .551 && normalized < .585;
  if ((course.theme || course.id) === "lantern") return normalized > .478 && normalized < .533;
  return false;
}

function trackStructure(road, hard, glow, course, p, random) {
  const width = course.halfWidth;
  const count = Math.ceil(course.length / 3.45);
  const segment = course.length / count;
  for (let i = 0; i < count; i++) {
    const start = i * segment;
    const end = (i + 1) * segment;
    const band = .996 + .008 * Math.sin(i * .73) + random() * .007;
    const onBridge = inBridge(course, start);
    const paving = onBridge ? p.bridge : p.road;
    const strip = onBridge ? 1 : .77;
    if (onBridge) ribbon(road, course, start, end, -width, width, 0, tint(paving,band));
    else {
      ribbon(road, course, start, end, -width, -width*strip, 0, tint(paving,band*.97));
      ribbon(road, course, start, end, -width*strip, width*strip, 0, tint(paving,band));
      ribbon(road, course, start, end, width*strip, width, 0, tint(paving,band*.97));
    }
    for (const side of [-1, 1]) {
      const edge = side * width;
      const outside = side * (width + (onBridge ? .95 : 1.68));
      const min = Math.min(edge, outside);
      const max = Math.max(edge, outside);
      const bright = i % 4 < 2 ? p.curbLight : p.curbDark;
      ribbon(hard, course, start, end, min, max, -.08, tint(p.shoulder, band));
      ribbon(hard, course, start, end, edge - .23, edge + .23, .043, bright);
      wall(hard, course, start, end, outside, -.08, onBridge ? -1.07 : -.85, tint(p.shoulder, .7), side < 0);
      const stripe = side * (width - .56);
      ribbon(hard, course, start, end, stripe - .051, stripe + .051, .017, p.margin);
      if (onBridge) {
        const guard = side * (width + .80);
        ribbon(hard, course, start, end, guard - .13, guard + .13, 1.11, p.rail);
        wall(hard, course, start, end, guard, 1.11, .87, p.rail, side < 0);
        if (i % 2 === 0) {
          const f = course.frame(start);
          box(hard, roadPoint(course, start, guard, .47), [.27, 1.08, .34], p.rail, Math.atan2(f.dx, f.dz));
          box(glow, roadPoint(course, start, guard, 1.12), [.15, .071, .18], p.archGlow, Math.atan2(f.dx, f.dz));
        }
      }
    }
    if (onBridge && i % 6 === 0) {
      const f = course.frame(start);
      const yaw = Math.atan2(f.dx, f.dz);
      const pileLength = (course.theme || course.id) === "lantern" ? 14 : 10;
      box(hard, roadPoint(course, start, 0, -.65), [width * 2 + .9, 1.16, .71], tint(p.rail, .71), yaw);
      for (const side of [-1, 1]) {
        box(hard, roadPoint(course, start, side * (width - 1.60), -pileLength / 2), [1.32, pileLength, 1.15], tint(p.shoulder, .70), yaw);
      }
    }
    if (onBridge && i % 2 === 0) {
      ribbon(hard, course, start, start + .16, -width + .34, width - .34, .022, tint(p.bridge, .72));
    }
  }
  // Broken centre guides echo the route's seams without reading like a motorway.
  for (let s = 23; s < course.length - 12; s += 14) {
    if (inBridge(course, s)) continue;
    for (const side of [-1, 1]) {
      const from = side * width * .22;
      ribbon(hard, course, s, s + 2.35, from - .065, from + .065, .027, p.center);
    }
  }
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 12; column++) {
      const widthPerTile = width / 6;
      ribbon(hard, course, row * .60 - .60, row * .60, column * widthPerTile - width,
        (column + 1) * widthPerTile - width, .033, (row + column) % 2 ? p.curbDark : white);
    }
  }
  for (let s = -5; s > -23; s -= 5.3) {
    for (const x of [-width * .38, width * .38]) {
      ribbon(hard, course, s, s + .23, x - .52, x + .52, .021, p.margin);
    }
  }
}

function boostPads(deck, glow, course, p) {
  for (const pad of course.pads || []) {
    const halfLength = pad.halfLength || 3.3;
    const halfWidth = pad.halfWidth || 1.35;
    const from = pad.offset - halfWidth;
    const to = pad.offset + halfWidth;
    const a = pad.s - halfLength;
    const b = pad.s + halfLength;
    ribbon(deck, course, a, b, from, to, .035, p.pad);
    for (const side of [from, to]) {
      ribbon(glow, course, a, b, side - .08, side + .08, .061, p.padGlow);
    }
    for (let s = a + .60; s < b - .55; s += 1.6) {
      const pt = (t, x) => roadPoint(course, s + t, pad.offset + x * halfWidth, .065);
      glow.quad(pt(.04, -.8), pt(.31, -.8), pt(.86, 0), pt(.53, 0), p.padGlow, UP);
      glow.quad(pt(.53, 0), pt(.86, 0), pt(.31, .8), pt(.04, .8), p.padGlow, UP);
    }
  }
}

const letters = {
  A: ["01110", "11011", "11011", "11111", "11011", "11011", "11011"],
  B: ["11110", "11011", "11011", "11110", "11011", "11011", "11110"],
  D: ["11110", "11011", "11011", "11011", "11011", "11011", "11110"],
  E: ["11111", "11000", "11000", "11110", "11000", "11000", "11111"],
  F: ["11111", "11000", "11000", "11110", "11000", "11000", "11000"],
  G: ["01111", "11000", "11000", "11011", "11011", "11011", "01111"],
  H: ["11011", "11011", "11011", "11111", "11011", "11011", "11011"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  L: ["11000", "11000", "11000", "11000", "11000", "11000", "11111"],
  M: ["10001", "11011", "11111", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  O: ["01110", "11011", "11011", "11011", "11011", "11011", "01110"],
  R: ["11110", "11011", "11011", "11110", "11100", "11010", "11011"],
  S: ["01111", "11000", "11000", "01110", "00011", "00011", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  V: ["11011", "11011", "11011", "11011", "11011", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
};

function signText(mesh, label, point, y, z, unit, color) {
  const origin = -(label.length * 6 - 1) * unit / 2;
  for (let i = 0; i < label.length; i++) {
    const glyph = letters[label[i]];
    if (!glyph) continue;
    for (let r = 0; r < glyph.length; r++) {
      const row = glyph[r];
      for (let col = 0; col < row.length;) {
        if (row[col] === "0") { col++; continue; }
        let end = col + 1;
        while (row[end] === "1") end++;
        const x0 = origin + (i * 6 + col) * unit;
        const x1 = origin + (i * 6 + end) * unit;
        const y1 = y + (3.5 - r) * unit;
        const y0 = y1 - unit * 1.01;
        mesh.quad(point(x0, y0, z), point(x0, y1, z), point(x1, y1, z), point(x1, y0, z), color);
        col = end;
      }
    }
  }
}

function gate(opaque, glow, course, p, s) {
  const f = course.frame(s);
  const yaw = Math.atan2(f.dx, f.dz);
  const p0 = (x, y, along = 0) => [f.x + x * f.rx + f.dx * along, f.y + y, f.z + x * f.rz + f.dz * along];
  const span = course.halfWidth + 1.07;
  const height = (course.theme || course.id) === "lantern" ? 9.25 : 8.65;

  for (const side of [-1, 1]) {
    const x = side * span;
    box(opaque, p0(x, -.20), [3.35, 1.3, 3.32], tint(p.arch, .71), yaw);
    box(opaque, p0(x, 3.6), [1.31, 8.1, 1.67], p.arch, yaw + side * .05);
    box(opaque, p0(x - side * .62, 4.25, -.86), [.26, 6.76, .18], tint(p.arch, 1.29), yaw);
    box(glow, p0(x - side * .60, 4.5, -.974), [.071, 6.29, .041], p.archGlow, yaw);
    for (const y of [.76, 2.63, 6.72, 7.8]) {
      box(opaque, p0(x, y), [1.84, .28, 2.06], p.archTrim, yaw);
    }
    tube(opaque, p0(x - side * .24, 7.6), p0(x - side * .75, height + 1.10), 1.17, .35, p.arch, 7);
    tube(glow, p0(x - side * .76, height + .78), p0(x - side * .92, height + 2.40), .29, .02, p.archGlow, 6);
    for (const [xDelta, level] of [[.75, .33], [.54, 1.03], [.41, 1.7]]) {
      box(opaque, p0(x - side * xDelta, height - level), [3.25 + level, .38, 1.89], tint(p.arch, mix(1.07, .76, level / 2)), yaw);
    }
    const wing = side * (span + .88);
    tube(opaque, p0(wing, 6.70, -.21), p0(wing + side * 3.02, 9.62, -.78), .65, .09, p.archTrim, 5, .72);
    tube(glow, p0(wing + side * 2.45, 9.10, -.61), p0(wing + side * 3.11, 9.70, -.79), .133, .028, p.archGlow, 5);
  }

  box(opaque, p0(0, height - .20), [span * 2.18, 2.02, 1.14], p.arch, yaw);
  box(opaque, p0(0, height - .22, -.60), [span * 1.56, 1.58, .15], tint(p.arch, .55), yaw);
  for (const y of [height - 1.11, height + .75]) {
    box(opaque, p0(0, y), [span * 2.22, .16, 1.38], p.archTrim, yaw);
    box(glow, p0(0, y - .06, -.725), [span * 1.98, .065, .051], p.archGlow, yaw);
  }

  signText(glow, p.sign, p0, height - .16, -.689, Math.min(.25, (span * 1.42) / (p.sign.length * 6)), white);
  const crown = p0(0, height + .7, -.14);
  const center = p0(0, height + 2.41, -.51);
  tube(opaque, crown, center, .93, .47, p.archTrim, 8, .68);
  tube(glow, p0(0, height + 1.1, -.43), p0(0, height + 3.13, -.58), .21, .04, p.archGlow, 7, .62);
  for (const side of [-1, 1]) {
    tube(opaque, p0(side * .22, height + .84, -.45), p0(side * 2.04, height + 2.19, -.55), .52, .03, p.archTrim, 6, .67);
  }
}

function pickupBases(hard, glow, course, p) {
  return (course.pickups || []).map((pickup, index) => {
    const base = roadPoint(course, pickup.s, pickup.offset, .069);
    flatDisc(hard, base, .56, .57, p.pad, 8);
    flatDisc(glow, [base[0], base[1] + .014, base[2]], .18, .18, p.archGlow, 8);
    return { x: base[0], y: base[1] + .9, z: base[2], s: pickup.s, offset: pickup.offset, index };
  });
}

function turnSigns(hard, glow, course, p) {
  let last = -36;
  const spacing = 3.2;
  const count = Math.ceil(course.length / spacing);
  for (let i = 9; i < count - 9; i++) {
    const s = i * spacing;
    const f = course.frame(s);
    if (s - last < 30 || inBridge(course, s)) continue;
    const future = course.frame(s + 9);
    const turn = Math.atan2(f.dz * future.dx - f.dx * future.dz, f.dx * future.dx + f.dz * future.dz);
    if (Math.abs(turn) < .14) continue;
    last = s;
    const direction = turn > 0 ? 1 : -1;
    const side = -direction;
    const x = side * (course.halfWidth + 1.19);
    const yaw = Math.atan2(f.dx, f.dz);
    const center = roadPoint(course, s + 1, x, 1.44);
    box(hard, roadPoint(course, s + 1, x, .38), [.164, 1.2, .22], p.rail, yaw);
    box(hard, center, [1.80, .78, .23], p.arch, yaw);
    const pt = (xx, yy) => [
      center[0] + f.rx * xx - f.dx * .131,
      center[1] + yy,
      center[2] + f.rz * xx - f.dz * .131,
    ];
    for (const start of [-.49, .05]) {
      const inner = start + .35;
      const x0 = start * direction;
      const x1 = inner * direction;
      const x2 = (inner - .18) * direction;
      glow.quad(pt(x0, -.18), pt(x2, -.18), pt(x1, 0), pt(x2, 0), p.archGlow);
      glow.quad(pt(x2, 0), pt(x1, 0), pt(x2, .18), pt(x0, .18), p.archGlow);
    }
  }
}

export function warningMarks(course) {
  const paints = [];
  for (const trap of course.hazards || []) {
    const sweeping = trap.kind === "sweeper";
    const span = sweeping ? course.halfWidth - .66 : Math.min(course.halfWidth - .29, trap.halfWidth + .27);
    const center = sweeping ? 0 : trap.offset;
    const limit = course.halfWidth - .35;
    const count = sweeping ? 10 : 3;
    for (let i=0;i<count;i++) {
      const offset = Math.max(-limit,center - span + 2*span*i/count);
      const end = Math.min(limit,offset + span * 1.2 / count);
      if(end <= offset + .05) continue;
      const s = trap.s-trap.halfLength-(trap.kind==="hurdle"?1.55:.56);
      const a = roadPoint(course,s,offset,.036);
      const b = roadPoint(course,s+.47,offset,.036);
      const c = roadPoint(course,s+.71,end,.036);
      const d = roadPoint(course,s+.24,end,.036);
      paints.push({points:[a,b,c,d],where:s,lit:i%2===0,sweeping});
    }
  }
  return paints;
}

export function buildTrack(course, palette, random) {
  const road = new ChunkMesh({ surface: "road", roughness: .83 });
  const hard = new ChunkMesh({ roughness: .61 });
  const glow = new ChunkMesh({ emissive: .72, roughness: .39 });
  trackStructure(road, hard, glow, course, palette, random);
  boostPads(hard, glow, course, palette);
  for (const at of [9.5, ...(course.sectors || []).slice(1).map(sector => sector.fraction * course.length)]) {
    gate(hard, glow, course, palette, at);
  }
  turnSigns(hard, glow, course, palette);
  for(const {points,lit,sweeping} of warningMarks(course)){
    hard.quad(...points, lit ? rgb(sweeping?"f5bc60":"c9a669") : rgb("3b4242"), UP);
  }
  const pickupPositions = pickupBases(hard, glow, course, palette);
  return { meshes: [...road.finish(), ...hard.finish(), ...glow.finish()], pickupPositions };
}
