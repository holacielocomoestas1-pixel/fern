import { angleDelta, sample } from './race-model.mjs';

const THEMES = {
  moss: { ground: '#163d30', leaves: ['#48774a', '#5b8750', '#6a9858'], shrubs: ['#27563e', '#326445', '#365d41'], flower: '#d9e5a0', asphalt: '#233d35', strip: '#4c6452', trim: '#a7ba7c', water: '#244d44', glow: '#c8ee94' },
  lantern: { ground: '#383923', leaves: ['#68703a', '#797a42', '#8c7944'], shrubs: ['#535636', '#62613a', '#565031'], flower: '#e9b577', asphalt: '#3a3e2e', strip: '#65654d', trim: '#c4a672', water: '#4a4c30', glow: '#ffc880' },
  river: { ground: '#16423f', leaves: ['#44786c', '#548678', '#679984'], shrubs: ['#2a5651', '#316461', '#3b6b5c'], flower: '#a6ddd5', asphalt: '#27413f', strip: '#526c63', trim: '#8cb9a9', water: '#1c5c5f', glow: '#93e3d9' },
};

const RIVALS = [
  { body: '#dfa75c', light: '#f6c57a', dark: '#886144', pilot: '#4a2e28' },
  { body: '#a9bfed', light: '#d1dcff', dark: '#565e99', pilot: '#2a3c68' },
  { body: '#e69a90', light: '#fbc0b2', dark: '#9b534d', pilot: '#663543' },
];
const PLAYER = { body: '#b3dc91', light: '#e2f7b8', dark: '#557548', pilot: '#c59360' };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function seedGenerator(text) {
  let state = [...text].reduce((value, character) => (Math.imul(value, 31) + character.codePointAt(0)) >>> 0, 2166136261);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function linePath(points) {
  const path = new Path2D();
  const first = points[0];
  path.moveTo(first.x, first.y);
  for (const point of points.slice(1)) path.lineTo(point.x, point.y);
  path.closePath();
  return path;
}

export function createScene(circuit) {
  const palette = THEMES[circuit.theme];
  const random = seedGenerator(circuit.id);
  const foliage = [];
  const texture = [];
  const bounds = {
    x1: Math.min(...circuit.points.map((p) => p.x)), x2: Math.max(...circuit.points.map((p) => p.x)),
    y1: Math.min(...circuit.points.map((p) => p.y)), y2: Math.max(...circuit.points.map((p) => p.y)),
  };
  const references = circuit.points.filter((_point, index) => index % 4 === 0);
  for (let x = bounds.x1 - 465; x <= bounds.x2 + 465; x += 56) {
    for (let y = bounds.y1 - 465; y <= bounds.y2 + 465; y += 51) {
      const px = x + random() * 57;
      const py = y + random() * 53;
      const distance = Math.min(...references.map((point) => Math.hypot(px - point.x, py - point.y)));
      if (distance < circuit.width + 15) continue;
      texture.push({ x: px, y: py, size: 2.5 + random() * 9, type: Math.floor(random() * 4), angle: random() * Math.PI });
      if (distance > circuit.width + 35 && random() < .51) {
        if (circuit.theme === 'river' && (px / 400) ** 2 + ((py + 65 - px * .13) / 75) ** 2 < 1.42) continue;
        foliage.push({ x: px, y: py, size: 13 + random() * 23, tone: Math.floor(random() * 3), angle: random() * 6.28 });
      }
    }
  }
  const marginPoints = circuit.points.filter((_point, index) => index % 3 === 0);
  const side = (width) => marginPoints.map((point) => ({
    x: point.x - Math.sin(point.angle) * width,
    y: point.y + Math.cos(point.angle) * width,
  }));
  return {
    circuit, palette, bounds, texture, foliage, center: linePath(circuit.points),
    sides: [linePath(side(-circuit.width + 15)), linePath(side(circuit.width - 15))],
    lamps: Array.from({ length: Math.floor(circuit.length / 184) }, (_unused, index) => {
      const lane = (index % 2 ? 1 : -1) * (circuit.width + 11);
      return sample(circuit, circuit.length * (index + .45) / Math.floor(circuit.length / 184), lane);
    }),
  };
}

function oval(ctx, x, y, a, b, color, angle = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, a, b, angle, 0, Math.PI * 2);
  ctx.fill();
}

function rounded(ctx, x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function landscaping(ctx, scene, visible) {
  const { palette, circuit } = scene;
  if (circuit.theme === 'river') {
    oval(ctx, 0, -65, 420, 95, '#285652', .13);
    oval(ctx, 0, -68, 402, 75, palette.water, .13);
    oval(ctx, -140, -83, 120, 30, '#24686b', .15);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8cc7bd4d';
    for (let row = 0; row < 4; row += 1) {
      ctx.beginPath();
      ctx.ellipse(row * 36 - 30, row * 12 - 74, 107 + row * 20, 14 + row * 2, .13, .16, Math.PI - .2);
      ctx.stroke();
    }
  } else if (circuit.theme === 'lantern') {
    oval(ctx, 0, 145, 313, 120, '#515632', .08);
    oval(ctx, -35, 160, 196, 63, '#454c2f', .18);
  } else {
    oval(ctx, 106, 74, 321, 189, '#204d3b', -.18);
    oval(ctx, 81, 56, 274, 143, '#2c5942', -.18);
  }
  for (const item of scene.texture) {
    if (!visible(item.x, item.y, 16)) continue;
    if (item.type === 0) {
      oval(ctx, item.x, item.y, item.size, item.size * .25, palette.shrubs[2], item.angle);
      oval(ctx, item.x + 4, item.y - 3, 1.7, 1.9, palette.flower);
    } else if (item.type === 1) {
      oval(ctx, item.x, item.y, item.size * .7, item.size * .25, palette.leaves[0], item.angle);
      oval(ctx, item.x + 3, item.y - 3, item.size * .55, item.size * .22, palette.leaves[1], item.angle - 1.5);
    } else {
      oval(ctx, item.x, item.y, item.size, item.size * .61, palette.shrubs[item.type - 2], item.angle);
    }
  }
}

function tree(ctx, item, palette) {
  const { x, y, size, angle, tone } = item;
  oval(ctx, x + 8, y + 11, size * 1.1, size * .82, '#071b16a0', angle);
  oval(ctx, x + 2, y + 4, size * 1.02, size * .86, palette.shrubs[tone], angle);
  oval(ctx, x - 4, y - 4, size * .84, size * .7, palette.leaves[tone], angle);
  oval(ctx, x - size * .25, y - size * .24, size * .38, size * .25, '#e8eac322', angle);
  oval(ctx, x + size * .16, y + size * .28, size * .44, size * .34, palette.shrubs[tone], angle);
}

function course(ctx, scene) {
  const { center, sides, circuit, palette } = scene;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  const edge = circuit.width * 2;
  ctx.lineWidth = edge + 24;
  ctx.strokeStyle = '#0b2019ac';
  ctx.stroke(center);
  ctx.lineWidth = edge + 13;
  ctx.strokeStyle = palette.shrubs[1];
  ctx.stroke(center);
  ctx.lineWidth = edge + 4;
  ctx.strokeStyle = palette.trim;
  ctx.stroke(center);
  ctx.lineWidth = edge;
  ctx.strokeStyle = palette.asphalt;
  ctx.stroke(center);
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.strip;
  for (const path of sides) ctx.stroke(path);
  ctx.strokeStyle = '#e1edcc44';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 25]);
  ctx.stroke(center);
  ctx.setLineDash([]);
}

function gates(ctx, scene, run, visible, time) {
  const { circuit, palette } = scene;
  const start = sample(circuit, 0);
  if (visible(start.x, start.y, circuit.width + 45)) {
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(start.angle);
    const columns = 12;
    const tile = (circuit.width - 10) * 2 / columns;
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        ctx.fillStyle = (row + column) % 2 === 0 ? palette.trim : palette.strip;
        ctx.fillRect((row - 1) * 7, column * tile - circuit.width + 10, 7, tile + .5);
      }
    }
    ctx.restore();
  }
  const lap = Math.floor(run.distance / circuit.length);
  for (const [index, pad] of circuit.pads.entries()) {
    const spot = sample(circuit, pad.distance, pad.lane);
    if (!visible(spot.x, spot.y, 73)) continue;
    const spent = run.padHits.has(lap * circuit.pads.length + index);
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.angle + Math.PI / 2);
    rounded(ctx, -30, -26, 60, 54, 10, spent ? '#13382e' : '#193b30');
    rounded(ctx, -28, -24, 56, 50, 9, spent ? palette.strip : palette.glow);
    rounded(ctx, -24, -20, 48, 42, 7, spent ? palette.asphalt : palette.ground);
    ctx.strokeStyle = spent ? palette.strip : palette.glow;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let arrow = 0; arrow < 2; arrow += 1) {
      const offset = spent ? 0 : Math.sin(time * 5.5 + arrow) * 1.7;
      const y = arrow * 13 + offset;
      ctx.beginPath();
      ctx.moveTo(-13, y + 1);
      ctx.lineTo(0, y - 8);
      ctx.lineTo(13, y + 1);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const marker of scene.lamps) {
    if (!visible(marker.x, marker.y, 44)) continue;
    const glow = .7 + Math.sin(time * 2 + marker.x) * .07;
    oval(ctx, marker.x + 2, marker.y + 3, 8, 6, '#101b16a0');
    if (circuit.theme === 'lantern') oval(ctx, marker.x, marker.y, 17, 14, '#fac47528');
    ctx.globalAlpha = glow;
    oval(ctx, marker.x, marker.y, 5, 5, palette.glow);
    ctx.globalAlpha = 1;
  }
}

function car(ctx, pose, hues, player, state, time) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle + Math.PI / 2 + (player ? state.sideSpeed * .0012 : 0));
  oval(ctx, 1, 9, 28, 31, '#061a14aa');
  if (player && state.boost > 0) {
    const flame = 8 + Math.sin(time * 46) * 5;
    oval(ctx, -10, 32, 5, 11 + flame, '#c2ec8dbb');
    oval(ctx, 10, 32, 5, 11 + flame, '#c2ec8dbb');
    oval(ctx, 0, 28, 7, 10 + flame, '#fdcf78d9');
  } else if (player && (state.slide > .2 || state.brake > .2)) {
    const drift = Math.max(state.slide, state.brake);
    for (let i = 0; i < 4; i += 1) {
      const wiggle = Math.cos(time * 8 + i * 2.3) * 6;
      ctx.globalAlpha = .25 * drift;
      oval(ctx, Math.sign(state.sideSpeed) * 22 + wiggle, 22 + i * 7, 4 + i * 1.7, 2 + i, hues.light, i);
    }
    ctx.globalAlpha = 1;
  }
  for (const x of [-23, 12]) {
    rounded(ctx, x, -24, 11, 17, 4, '#122023');
    rounded(ctx, x - 1, 10, 13, 19, 4, '#111c21');
    rounded(ctx, x + 3, 12, 3, 14, 1.5, '#344141');
  }
  rounded(ctx, -19, -30, 38, 61, 13, hues.dark);
  rounded(ctx, -17, -29, 34, 55, 12, hues.body);
  rounded(ctx, -13, -27, 26, 16, 7, hues.light);
  rounded(ctx, -12, -10, 24, 28, 8, '#33473e');
  if (player) {
    oval(ctx, -10, -2, 5.7, 5, '#c19366');
    oval(ctx, 10, -2, 5.7, 5, '#c19366');
    oval(ctx, 0, 4, 13, 11, '#f2e5cb');
    oval(ctx, 0, 3, 11, 8, hues.pilot);
    oval(ctx, 0, 7, 9, 2.6, '#e2b281');
    oval(ctx, 0, -1, 4, 1.7, '#855333');
  } else {
    oval(ctx, 0, 3, 11, 10, hues.pilot);
    oval(ctx, 0, 1, 9, 5, hues.light);
  }
  rounded(ctx, -17, 21, 34, 7, 3, hues.light);
  rounded(ctx, -13, 26, 7, 4, 2, '#ec987e');
  rounded(ctx, 6, 26, 7, 4, 2, '#ec987e');
  if (player) {
    ctx.fillStyle = '#daefb5';
    ctx.beginPath();
    ctx.moveTo(-5, 47);
    ctx.lineTo(5, 47);
    ctx.lineTo(0, 41);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawRace(ctx, viewport, scene, run, camera, delta, staticMotion = false) {
  const { width, height, ratio } = viewport;
  if (width < 3 || height < 3) return;
  const viewTarget = sample(scene.circuit, run.distance - 5, run.lane * .29);
  const forward = sample(scene.circuit, run.distance + 25);
  const worldScale = clamp(Math.min(width, height) / 355, .8, 1.56);
  const targetScale = worldScale * (run.boost > 0 && !staticMotion ? .91 : 1);
  const lerpFactor = camera.ready ? 1 - Math.exp(-delta * 8) : 1;
  camera.ready = true;
  camera.x += (viewTarget.x - camera.x) * lerpFactor;
  camera.y += (viewTarget.y - camera.y) * lerpFactor;
  camera.angle += angleDelta(forward.angle, camera.angle) * lerpFactor;
  camera.scale += (targetScale - camera.scale) * lerpFactor;
  const radius = Math.hypot(width, height) * .78 / camera.scale;
  const visible = (x, y, padding) => Math.abs(x - camera.x) < radius + padding && Math.abs(y - camera.y) < radius + padding;
  const time = staticMotion ? 0 : run.elapsed;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = scene.palette.ground;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height * .71);
  ctx.rotate(-camera.angle - Math.PI / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);
  landscaping(ctx, scene, visible);
  course(ctx, scene);
  gates(ctx, scene, run, visible, time);
  for (const item of scene.foliage) {
    if (visible(item.x, item.y, item.size)) tree(ctx, item, scene.palette);
  }
  for (const rival of run.rivalCars) {
    const pose = sample(scene.circuit, rival.distance, rival.lane);
    if (visible(pose.x, pose.y, 33)) car(ctx, pose, RIVALS[rival.index], false, run, time);
  }
  car(ctx, sample(scene.circuit, run.distance, run.lane), PLAYER, true, run, time);
  ctx.restore();

  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, '#10291e89');
  vignette.addColorStop(.15, '#10291e14');
  vignette.addColorStop(.73, '#0b231b00');
  vignette.addColorStop(1, '#0617108f');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  if (run.boost > 0 && !staticMotion) {
    ctx.strokeStyle = '#e9ffca61';
    ctx.lineWidth = 1.4;
    for (let index = 0; index < 8; index += 1) {
      const phase = ((time * 225 + index * 79) % height) / height;
      const x = width / 2 + (index % 2 ? 1 : -1) * width * (.23 + index * .023 + phase * .10);
      const start = phase * height - 85;
      ctx.beginPath();
      ctx.moveTo(x, start);
      ctx.lineTo(x + (index % 2 ? 12 : -12), start + phase * 45 + 14);
      ctx.stroke();
    }
  }
}

export function drawMap(canvas, scene, marker) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const { bounds, center } = scene;
  const scale = Math.min((width - 20) / (bounds.x2 - bounds.x1), (height - 18) / (bounds.y2 - bounds.y1));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.translate((width - (bounds.x2 + bounds.x1) * scale) / 2, (height - (bounds.y2 + bounds.y1) * scale) / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = scene.palette.glow;
  ctx.lineWidth = 4 / scale;
  ctx.lineJoin = 'round';
  ctx.globalAlpha = .64;
  ctx.stroke(center);
  ctx.globalAlpha = 1;
  if (typeof marker === 'number') {
    const point = sample(scene.circuit, marker);
    oval(ctx, point.x, point.y, 5.5 / scale, 5.5 / scale, '#f7f0d9');
  }
}
