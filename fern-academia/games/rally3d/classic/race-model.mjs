const TAU = 2 * Math.PI;
export const BOOST_COST = 38;
export const MAX_STEP = 1 / 40;

const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (n, limit) => ((n % limit) + limit) % limit;
export const angleDelta = (a, b) => wrap(a - b + Math.PI, TAU) - Math.PI;

const ROUTES = [
  {
    id: 'moss', title: { th: 'ทางวนริมมอส', en: 'Moss Hollow' },
    details: { th: 'โค้งกว้าง · 2 รอบ', en: 'Wide turns · 2 laps' },
    theme: 'moss', accent: '#b6ef8a', width: 105, laps: 2, speed: 212,
    points: [[0, 393], [-423, 389], [-615, 222], [-518, -72], [-312, -287], [-63, -364], [185, -257], [490, -309], [662, -70], [564, 222], [330, 371]],
    pads: [[.17, -.49], [.33, .47], [.56, -.49], [.81, .5]],
    rivals: [183, 201, 226],
  },
  {
    id: 'lantern', title: { th: 'ป่าโคมไฟ', en: 'Lantern Grove' },
    details: { th: 'โค้งต่อเนื่อง · 2 รอบ', en: 'Linked bends · 2 laps' },
    theme: 'lantern', accent: '#ffcd80', width: 92, laps: 2, speed: 220,
    points: [[0, 430], [-461, 454], [-628, 253], [-642, -77], [-490, -352], [-245, -402], [-100, -157], [78, -94], [214, -297], [517, -327], [658, -48], [489, 172], [565, 362], [346, 480]],
    pads: [[.15, .48], [.36, -.51], [.55, .51], [.68, -.5], [.89, .5]],
    rivals: [192, 226, 240],
  },
  {
    id: 'river', title: { th: 'คุ้งแม่น้ำ', en: 'Silverwater Bend' },
    details: { th: 'ทางแคบ · 3 รอบ', en: 'Narrow road · 3 laps' },
    theme: 'river', accent: '#a4e8df', width: 84, laps: 3, speed: 229,
    points: [[0, 445], [-369, 383], [-598, 250], [-720, -59], [-563, -281], [-294, -211], [-136, -275], [15, -467], [247, -497], [467, -329], [648, -239], [701, -10], [522, 237], [318, 473]],
    pads: [[.10, -.49], [.33, .46], [.49, -.45], [.73, .52], [.92, -.52]],
    rivals: [205, 233, 248],
  },
];

function curveCoordinate(a, b, c, d, t) {
  const square = t * t;
  return (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * square + (3 * b - a - 3 * c + d) * square * t) / 2;
}

function makeCircuit(route) {
  const points = [];
  const controls = route.points;
  const count = controls.length;
  const resolution = 32;
  let length = 0;
  for (let index = 0; index < count; index += 1) {
    const a = controls[wrap(index - 1, count)];
    const b = controls[index];
    const c = controls[wrap(index + 1, count)];
    const d = controls[wrap(index + 2, count)];
    for (let tick = 0; tick < resolution; tick += 1) {
      const t = tick / resolution;
      const x = curveCoordinate(a[0], b[0], c[0], d[0], t);
      const y = curveCoordinate(a[1], b[1], c[1], d[1], t);
      const last = points.at(-1);
      if (last) length += Math.hypot(x - last.x, y - last.y);
      points.push({ x, y, length });
    }
  }
  const first = points[0];
  const last = points.at(-1);
  length += Math.hypot(first.x - last.x, first.y - last.y);
  for (let index = 0; index < points.length; index += 1) {
    const before = points[wrap(index - 1, points.length)];
    const after = points[wrap(index + 1, points.length)];
    points[index].angle = Math.atan2(after.y - before.y, after.x - before.x);
  }
  return {
    ...route, points: [...points, { ...first, length }], length,
    pads: route.pads.map(([fraction, lane]) => ({ distance: fraction * length, lane: lane * route.width })),
  };
}

export const CIRCUITS = ROUTES.map(makeCircuit);

export function sample(circuit, distance, lane = 0) {
  const target = wrap(distance, circuit.length);
  const points = circuit.points;
  let low = 0;
  let high = points.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (points[middle].length <= target) low = middle;
    else high = middle;
  }
  const point = points[low];
  const next = points[high];
  const progress = (target - point.length) / (next.length - point.length);
  const angle = point.angle + angleDelta(next.angle, point.angle) * progress;
  return {
    angle,
    x: lerp(point.x, next.x, progress) - Math.sin(angle) * lane,
    y: lerp(point.y, next.y, progress) + Math.cos(angle) * lane,
  };
}

export function createRace(circuit, mode = 'free') {
  const startLanes = [-.57, .54, -.16];
  return {
    circuit, mode, elapsed: 0, distance: 0, lane: 0, sideSpeed: 0, speed: 0,
    charge: 26, boost: 0, boostCount: 0, slide: 0, brake: 0, drafted: false, finishAt: null,
    rivalCars: circuit.rivals.map((pace, index) => ({
      index, pace, distance: 23 + index * 31, speed: 0, lane: startLanes[index] * circuit.width, finishAt: null,
    })),
    padHits: new Set(), padFlash: 0, pitIndex: 0, pit: false, pitCorrect: 0, events: [],
  };
}

function finishTime(previous, current, finish, elapsed, delta) {
  return elapsed + delta * clamp((finish - previous) / (current - previous), 0, 1);
}

export function position(run) {
  const earlier = run.rivalCars.filter((rival) => {
    if (run.finishAt !== null) return rival.finishAt !== null && rival.finishAt < run.finishAt;
    return rival.distance > run.distance;
  });
  return earlier.length + 1;
}

export function raceResult(run) {
  const rank = position(run);
  const duration = run.finishAt ?? run.elapsed;
  const target = run.circuit.length * run.circuit.laps / run.circuit.speed;
  const score = Math.max(0, Math.round(200 + (4 - rank) * 260 + (target - duration) * 10 + run.padHits.size * 20));
  return { rank, duration, score, win: rank <= 3, circuit: run.circuit.id, boosts: run.boostCount, pads: run.padHits.size, correct: run.pitCorrect };
}

function boost(run, duration, detail) {
  run.boost = duration;
  run.boostCount += 1;
  run.events.push(detail);
}

function spreadKarts(run, dt) {
  const karts = [run, ...run.rivalCars];
  for (let a = 0; a < karts.length - 1; a += 1) {
    const first = karts[a];
    if (first.finishAt !== null) continue;
    for (let b = a + 1; b < karts.length; b += 1) {
      const second = karts[b];
      const forwardGap = Math.abs(first.distance - second.distance);
      if (forwardGap >= 54 || second.finishAt !== null) continue;
      const gap = first.lane - second.lane;
      const sideClearance = 42 * Math.sqrt(1 - (forwardGap / 54) ** 2);
      if (Math.abs(gap) >= sideClearance) continue;
      const separation = (sideClearance - Math.abs(gap)) * Math.min(1, dt * 19);
      const side = gap >= 0 ? 1 : -1;
      const firstWeight = a === 0 ? .24 : .5;
      first.lane = clamp(first.lane + separation * side * firstWeight, -run.circuit.width - 25, run.circuit.width + 25);
      second.lane = clamp(second.lane - separation * side * (1 - firstWeight), -run.circuit.width + 14, run.circuit.width - 14);
    }
  }
}

export function resolvePit(run, correct) {
  if (!run.pit || run.finishAt !== null) return;
  run.pit = false;
  if (correct === true) {
    run.pitCorrect += 1;
    run.charge = Math.min(100, run.charge + 18);
    boost(run, 2.7, 'answer-boost');
  }
}

export function stepRace(run, input, delta) {
  run.events.length = 0;
  if (run.finishAt !== null || run.pit || !Number.isFinite(delta) || delta <= 0) return;
  const dt = Math.min(MAX_STEP, delta);
  const { circuit } = run;
  const finish = circuit.length * circuit.laps;
  const steer = clamp(input.steer || 0, -1, 1);
  const prev = run.distance;
  const lastLap = Math.floor(prev / circuit.length);
  const turn = angleDelta(sample(circuit, prev + 45).angle, sample(circuit, prev - 45).angle);

  run.padFlash = Math.max(0, run.padFlash - dt);
  run.boost = Math.max(0, run.boost - dt);
  if (input.turbo && run.charge >= BOOST_COST && run.boost === 0) {
    run.charge -= BOOST_COST;
    boost(run, 1.85, 'turbo');
  }

  const targetSide = steer * (run.boost > 0 ? 143 : 123) - turn * run.speed * .72;
  const centered = steer === 0 ? run.lane * 1.6 : run.lane * .13;
  run.sideSpeed += (targetSide - centered - run.sideSpeed) * Math.min(1, dt * 6.7);
  run.lane = clamp(run.lane + run.sideSpeed * dt, -circuit.width - 25, circuit.width + 25);

  const offRoad = clamp((Math.abs(run.lane) - circuit.width + 13) / 32, 0, 1);
  const slide = Math.abs(steer) > .4 && Math.abs(run.sideSpeed) > 40 && run.speed > 100 && offRoad < .3;
  run.slide += ((slide ? 1 : 0) - run.slide) * Math.min(1, dt * 7);
  run.brake += (offRoad - run.brake) * Math.min(1, dt * 7);
  run.drafted = run.rivalCars.some((rival) => rival.distance - prev > 22 && rival.distance - prev < 115 && Math.abs(rival.lane - run.lane) < 30);
  if (run.boost === 0) run.charge = Math.min(100, run.charge + dt * (2.45 + 11.5 * run.slide + (run.drafted ? 13 : 0)));

  const cornerSpeed = 1 - Math.min(.125, Math.abs(turn) * .29);
  const bestSpeed = circuit.speed * cornerSpeed * (1 - offRoad * .58) + (run.boost > 0 ? 92 : 0);
  run.speed += (bestSpeed - run.speed) * Math.min(1, dt * (run.boost > 0 ? 4.5 : 3.6));
  run.distance += run.speed * dt;

  for (const [index, pad] of circuit.pads.entries()) {
    const crossing = lastLap * circuit.length + pad.distance;
    const occurrence = lastLap * circuit.pads.length + index;
    if (prev < crossing && run.distance >= crossing && Math.abs(run.lane - pad.lane) < 34 && !run.padHits.has(occurrence)) {
      run.padHits.add(occurrence);
      run.padFlash = .75;
      run.charge = Math.min(100, run.charge + 26);
      run.events.push('pad');
    }
  }

  for (const rival of run.rivalCars) {
    if (rival.finishAt !== null) continue;
    const ahead = rival.distance;
    const opposingLane = (.49 * Math.sin(ahead / 345 + rival.index * 2.4) + .13 * Math.cos(ahead / 217 + rival.index)) * circuit.width;
    rival.lane += (opposingLane - rival.lane) * dt * 1.5;
    const rivalCurve = angleDelta(sample(circuit, ahead + 44).angle, sample(circuit, ahead - 44).angle);
    const pace = rival.pace * (1 - Math.min(.138, Math.abs(rivalCurve) * .24)) + Math.sin(ahead / 110 + rival.index) * 6.5;
    rival.speed += (pace - rival.speed) * Math.min(1, dt * 2.9);
    rival.distance += rival.speed * dt;
    if (rival.distance >= finish) rival.finishAt = finishTime(ahead, rival.distance, finish, run.elapsed, dt);
  }
  spreadKarts(run, dt);

  if (run.distance >= finish) {
    run.finishAt = finishTime(prev, run.distance, finish, run.elapsed, dt);
    run.elapsed = run.finishAt;
    run.distance = finish;
    run.events.push('finish');
    return;
  }

  run.elapsed += dt;
  if (Math.floor(run.distance / circuit.length) > lastLap) run.events.push('lap');
  if (run.mode !== 'study' || run.pitIndex >= 2) return;
  const checkpoint = (run.pitIndex === 0 ? .43 : 1.37) * circuit.length;
  if (prev < checkpoint && run.distance >= checkpoint) {
    run.pitIndex += 1;
    run.pit = true;
    run.events.push('pit');
  }
}
