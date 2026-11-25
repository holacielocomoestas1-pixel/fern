import { avoidHazard, captureRadius, captureReach, equipDriver, nearby, padMargin, requestHop, trafficFeatures, updateGear } from './powers.mjs';
export { COURSES } from './courses.mjs';
export { POWER_INFO, beginPowerQuiz, resolvePowerQuiz, usePower, hazardOffset } from './powers.mjs';

const TAU = 2 * Math.PI;
const MAX_STEP = 1 / 60;
export const TURBO_COST = .45;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (value, length) => ((value % length) + length) % length;
const smooth = (value, target, dt, rate) => lerp(value, target, 1 - Math.exp(-rate * dt));

function seedRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function makeCar(id, s, offset) {
  return {
    id, s, offset, speed: 0, rank: 6, steer: 0, sideSpeed: 0, yawOffset: 0,
    roll: 0, boost: 0, drift: false, charge: 0, boostCharge: id === 0 ? .46 : 0,
    lap: 1, finishAt: null, boostingInput: false, friction: 0, contact: 0, airborne: 0,
    driftTime: 0, driftTier: 0, driftSign: 0, drafting: false,
    // Impact feel: stun cuts thrust after a hit; yawKick/rollKick are decaying
    // jolts added on top of the smoothed heading/roll so a hit shakes the kart.
    stun: 0, yawKick: 0, rollKick: 0,
  };
}

const GRIDS = [
  { s: -2.0, lane: -.37 }, { s: -2.0, lane: .37 },
  { s: -6.7, lane: -.37 }, { s: -6.7, lane: .37 },
  { s: -11.4, lane: .37 },
];
const AI_PACE = [.928, .956, .98, 1.007, 1.036];
const AI_PRO_PACE = [.985, 1.014, 1.032, 1.055, 1.075];

export function createRace(course, { mode = 'race', difficulty = 'rookie', laps = course.laps, seed = course.seed } = {}) {
  const raceMode = ['race', 'study', 'trial'].includes(mode) ? mode : 'race';
  const raceDifficulty = difficulty === 'pro' ? 'pro' : 'rookie';
  const lapCount = Number.isFinite(laps) ? clamp(Math.round(laps), 1, 5) : course.laps;
  const random = seedRandom(seed);
  const player = makeCar(0, raceMode === 'trial' ? -.4 : -11.4, raceMode === 'trial' ? 0 : -.37 * course.halfWidth);
  const rivals = raceMode === 'trial' ? [] : GRIDS.map(({ s, lane }, i) => {
    const index = GRIDS.length - 1 - i;
    const pace = (raceDifficulty === 'pro' ? AI_PRO_PACE : AI_PACE)[index] + (random() - .5) * .009;
    return { ...makeCar(i + 1, s, lane * course.halfWidth),
      pace, phase: random() * TAU, personalLane: lane, lastPad: '', lastPassSide: i % 2 ? 1 : -1,
    };
  });
  for (const car of [player, ...rivals]) equipDriver(car, seed);
  const run = {
    course, mode: raceMode, difficulty: raceDifficulty, laps: lapCount, racers: [player, ...rivals], player, time: 0,
    finished: false, events: [], studyPending: false, studyIndex: 0, correct: 0,
    lapTimes: [], lastLapAt: 0, padHits: 0, drifts: 0, turbos: 0, hits: 0,
    pickupHits: 0, collected: new Set(), collectedItems: new Set(),
    powerQuizPending: false, quizItem: null, itemsFound: 0, powerUses: 0, upgrades: 0, trapHits: 0,
  };
  updateRanks(run);
  return run;
}

export function pose(course, car) {
  const f = course.frame(car.s);
  return {
    id: car.id, x: f.x + f.rx * car.offset, y: f.y + Math.tan(f.bank) * car.offset + car.airborne,
    z: f.z + f.rz * car.offset, yaw: Math.atan2(f.dx, f.dz) + car.yawOffset,
    pitch: -Math.atan(f.dy), roll: f.bank + car.roll, steer: car.steer, speed: car.speed,
    boost: car.boost, drift: car.drift, charge: car.charge, airborne: car.airborne,
    shield: car.shield, magnet: car.magnet, grip: car.grip, pulse: car.pulse, spring: car.spring,
  };
}

const finishAt = (from, to, line, start, span) => start + span * clamp((line - from) / (to - from || 1), 0, 1);

function updateRanks(run) {
  const ranked = run.racers.slice().sort((a, b) => {
    if (a.finishAt !== null && b.finishAt !== null) return a.finishAt - b.finishAt || a.id - b.id;
    if (a.finishAt !== null) return -1;
    if (b.finishAt !== null) return 1;
    return b.s - a.s || (a.id === 0 ? 1 : b.id === 0 ? -1 : a.id - b.id);
  });
  ranked.forEach((car, i) => { car.rank = i + 1; });
}

function activate(run, car, seconds, source, tier = 1) {
  car.boost = Math.max(car.boost, seconds);
  if (car.id === 0) {
    run.turbos++;
    run.events.push({ type: 'boost', source, tier });
  }
}

function chargeTurbo(run, amount) {
  const previous = run.player.boostCharge;
  run.player.boostCharge = Math.min(1, previous + amount);
  if (previous < TURBO_COST && run.player.boostCharge >= TURBO_COST) {
    run.events.push({ type: 'charge', tier: 0 });
  }
}

function applyDrift(run, input, dt, steer, onRoad) {
  const car = run.player;
  const driveSign = Math.sign(steer);
  const canStart = input.drift && Math.abs(steer) > .23 && car.speed > 9.7 && onRoad;
  const canHold = car.drift && input.drift && onRoad && car.speed > 8.4;
  if (canStart && !car.drift) {
    car.drift = true;
    car.driftSign = driveSign;
    car.driftTime = 0;
    car.driftTier = 0;
    run.events.push({ type: 'drift', active: true });
  }
  if (car.drift && (canHold || canStart)) {
    const effort = .38 + .62 * Math.abs(steer);
    car.driftTime += dt * effort;
    car.charge = Math.min(1, car.driftTime / 1.52);
    const tier = car.driftTime >= 1.52 ? 3 : car.driftTime >= 1.02 ? 2 : car.driftTime >= .49 ? 1 : 0;
    if (tier > car.driftTier) {
      car.driftTier = tier;
      run.events.push({ type: 'charge', tier });
    }
    return;
  }
  if (!car.drift) return;
  if (car.driftTier && onRoad) {
    run.drifts++;
    // A drift pays in boost, not in charge: refunding both made turbo
    // near-permanent (audit: 82 turbos in one 170 s race, +767 m win).
    activate(run, car, [0, .92, 1.34, 1.72][car.driftTier], 'drift', car.driftTier);
  }
  run.events.push({ type: 'drift', active: false, tier: car.driftTier });
  car.drift = false;
  car.charge = 0;
  car.driftSign = 0;
  car.driftTier = 0;
}

// s follows the centre line. On a bend the inside tyre travels a shorter arc.
function advance(car, frame, dt) {
  const radiusScale = clamp(1 - frame.curve * car.offset, .82, 1.22);
  car.s += car.speed * dt / Math.hypot(radiusScale, frame.dy);
}

function drivePlayer(run, input, dt) {
  const car = run.player;
  const track = run.course;
  const width = track.halfWidth;
  requestHop(run, car, !!input.hop);
  updateGear(run, car, dt);
  const f = track.frame(car.s + 2.7);
  const steer = clamp(Number(input.steer) || 0, -1, 1);
  const onRoad = Math.abs(car.offset) < width + .16;
  const offroad = clamp((Math.abs(car.offset) - width + .46) / 1.83, 0, 1);
  const previousFriction = car.friction;
  car.friction = smooth(car.friction, offroad, dt, 9.2);
  if (previousFriction < .5 && car.friction >= .5) run.events.push({ type: 'offroad' });
  car.boost = Math.max(0, car.boost - dt);
  car.contact = Math.max(0, car.contact - dt);
  car.stun = Math.max(0, car.stun - dt);
  car.yawKick = smooth(car.yawKick, 0, dt, 5);
  car.rollKick = smooth(car.rollKick, 0, dt, 5);
  if (input.boost && !car.boostingInput && car.boostCharge >= TURBO_COST && car.speed > 5) {
    chargeTurbo(run, -TURBO_COST);
    activate(run, car, 2.08, 'manual', 2);
  }
  // Latch only once the kart is moving: holding turbo through the countdown
  // used to swallow the press, so it never fired at the start.
  car.boostingInput = !!input.boost && car.speed > 5;
  applyDrift(run, input, dt, steer, onRoad);

  const maxLateral = (car.drift ? 9.4 : 10.2) * (car.slick ? .49 : car.grip ? 1.08 : 1) * (car.gum ? .55 : 1) * (car.jumpY > .08 ? .72 : 1);
  const movement = clamp(car.speed / 14, .56, 1.1);
  const grip = Math.abs(steer) > .1 ? .40 : car.drift ? .56 : 1.40;
  const driftPush = car.drift ? car.driftSign * (.78 + Math.abs(f.curve) * 12) : 0;
  const outward = clamp(f.curve * car.speed * car.speed * .092, -2.1, 2.1);
  const skate = car.slick ? car.skidSide * 3.8 * Math.min(1, car.slick * 2) : 0;
  const desiredSide = steer * maxLateral * movement + driftPush + skate - outward - car.offset * grip;
  car.sideSpeed = smooth(car.sideSpeed, desiredSide, dt, car.drift ? 5.2 : 10.8);
  const cap = width + 2.1;
  car.offset = clamp(car.offset + car.sideSpeed * dt, -cap, cap);
  if (Math.abs(car.offset) >= cap && Math.sign(car.sideSpeed) === Math.sign(car.offset)) {
    // The verge is a wall now, not a cushion: bounce back in, scrub speed,
    // and report the bump once per hit.
    const impact = Math.abs(car.sideSpeed);
    const impactDir = Math.sign(car.sideSpeed) || 1;
    car.sideSpeed = -car.sideSpeed * .38;
    car.speed *= impact > 6 ? .94 : .97;
    if (impact > 4 && car.contact <= 0) {
      car.contact = .35;
      car.stun = Math.max(car.stun, .3);
      car.yawKick += impactDir * .16;
      car.rollKick += .12;
      run.events.push({ type: 'bump', strength: Math.min(1, impact / 12) });
    }
  }
  car.steer = smooth(car.steer, steer, dt, 14);
  const counter = car.drift ? car.driftSign * -.23 : 0;
  car.yawOffset = smooth(car.yawOffset, Math.atan2(car.sideSpeed, Math.max(9, car.speed)) * .62 + counter + skate * .048, dt, 7.5);
  car.roll = smooth(car.roll, -.085 * steer - .102 * (car.drift ? car.driftSign : 0), dt, 8);
  // Impact wobble: a decaying kick on top of the smoothed heading/roll, so a
  // hit visibly shakes the kart without permanently bending its heading.
  car.yawOffset += car.yawKick;
  car.roll += car.rollKick;

  const draft = run.racers.some(other =>
    other !== car && other.finishAt === null && other.s - car.s > 3.2 && other.s - car.s < 12.6 &&
    Math.abs(car.offset - other.offset) < 1.48);
  car.drafting = draft && onRoad;
  if (onRoad && car.boost <= 0) chargeTurbo(run, dt * (car.drafting ? .100 : .0175));

  // Tighter radii cost speed, and a committed slide holds a little more momentum.
  const cornerGrip = car.grip ? (car.gripLevel === 2 ? .38 : .67) : 1;
  const turnPenalty = Math.min(.25, Math.abs(f.curve) * (car.drift ? 2.4 : 4.6) * cornerGrip);
  const brake = clamp(Number(input.brake) || 0, 0, 1);
  const vergeFactor = 1 - car.friction * (car.grip ? .12 : .66);
  const impaired = car.stun > 0 ? .5 : car.gum > 0 ? .5 : car.slow > 0 ? .70 : car.slick > 0 ? .90 : 1;
  const thrust = car.boost > 0 ? 11.6 + (car.comet ? 2.1 : 0) : 0;
  const targetSpeed = (track.cruise * (1 - turnPenalty) - f.dy * 3.4 + (car.drafting ? 1 : 0) +
    thrust) * (1 - brake * .59) * vergeFactor * impaired;
  car.speed = smooth(car.speed, targetSpeed, dt, brake > .05 ? 5.8 : car.boost > 0 ? 5 : 2.72);
  advance(car, f, dt);

  const dip = f.dy - track.frame(car.s - 2.6).dy;
  const crestLift = Math.max(0, -dip - .033) * Math.min(.7, car.speed / 37);
  car.airborne = car.jumpY + crestLift;
}

function driveRival(run, car, dt) {
  if (car.finishAt !== null) return;
  const { course } = run;
  updateGear(run, car, dt);
  const f = course.frame(car.s + 5.3);
  const width = course.halfWidth;
  car.boost = Math.max(0, car.boost - dt);
  car.contact = Math.max(0, car.contact - dt);
  car.stun = Math.max(0, car.stun - dt);
  car.yawKick = smooth(car.yawKick, 0, dt, 5);
  car.rollKick = smooth(car.rollKick, 0, dt, 5);
  const turn = clamp(f.curve * 50, -.9, .9);
  const weave = Math.sin(car.s / 48 + car.phase) * .24 + Math.sin(car.s / 23 - car.phase) * .095;
  const nearAhead = run.racers.find(other => other !== car && other.finishAt === null &&
    other.s - car.s > 0 && other.s - car.s < 9.0 && Math.abs(other.offset - car.offset) < 2.1);
  let line = (turn * .31 + weave + car.personalLane * .38) * width;
  if (nearAhead) {
    if (Math.abs(nearAhead.offset - car.offset) > .47) car.lastPassSide = Math.sign(car.offset - nearAhead.offset);
    line = nearAhead.offset + car.lastPassSide * 2.25;
    if (Math.abs(line) > width * .78) line = nearAhead.offset - car.lastPassSide * 2.25;
  }
  if (run.difficulty === 'pro') {
    // Pro rivals defend: when the player is right behind them and lining up
    // a pass, they drift towards the player's line to block it.
    const behind = car.s - run.player.s;
    if (behind > 0 && behind < 9 && Math.abs(run.player.offset - car.offset) < 2.6) {
      line = clamp(line + clamp(run.player.offset - car.offset, -1, 1) * .55, -width * .8, width * .8);
    }
  }
  line = avoidHazard(run, car, line);
  const steer = clamp((line - car.offset) / 2.35, -1, 1);
  car.sideSpeed = smooth(car.sideSpeed, steer * (car.slick ? 3.5 : 7.1) + (car.slick ? car.skidSide * 2.4 : 0), dt, 5.1);
  car.offset = clamp(car.offset + car.sideSpeed * dt, -width + .5, width - .5);
  car.steer = smooth(car.steer, steer, dt, 7.1);
  car.drift = Math.abs(turn) > .63 && car.speed > 17 && Math.abs(car.steer) > .38;
  car.charge = car.drift ? .25 + Math.abs(turn) * .4 : 0;
  car.roll = smooth(car.roll, -.09 * steer, dt, 5.7);
  car.yawOffset = smooth(car.yawOffset, Math.atan2(car.sideSpeed, Math.max(9, car.speed)) * .66, dt, 5.8);
  car.yawOffset += car.yawKick;
  car.roll += car.rollKick;
  car.airborne = car.jumpY + Math.max(0, course.frame(car.s - 4).dy - f.dy - .043) * .32;

  // The AI follows similar corner rules to the player with small pacing variation.
  const penalty = Math.min(.25, Math.abs(f.curve) * (car.grip ? 2.25 : 4.3));
  const targetSpeed = (course.cruise * car.pace * (1 - penalty) +
    .46 * Math.sin(car.s / 28 + car.phase) - f.dy * 3.2 + (car.boost > 0 ? 7.9 : 0)) *
    (car.stun > 0 ? .55 : car.gum > 0 ? .55 : car.slow > 0 ? .70 : car.slick > 0 ? .90 : 1);
  // Rubber-banding: rivals far behind the player catch up, rivals far ahead
  // ease off. v8.1's ±.32 was too weak to matter (a 5 s stop cost only 2.7 s).
  const gap = run.player.s - car.s;
  const breathing = gap >= 0 ? Math.min(1.4, gap * .02) : Math.max(-.8, gap * .02);
  car.speed = smooth(car.speed, targetSpeed + breathing, dt, 2.53);
  advance(car, f, dt);
}

function spreadKarts(run, dt) {
  const { course, racers } = run;
  for (let i = 0; i < racers.length - 1; i++) {
    const a = racers[i];
    if (a.finishAt !== null) continue;
    for (let j = i + 1; j < racers.length; j++) {
      const b = racers[j];
      if (b.finishAt !== null || Math.abs(a.jumpY - b.jumpY) > 1.05) continue;
      const forward = wrap(a.s - b.s + course.length / 2, course.length) - course.length / 2;
      if (Math.abs(forward) >= 2.8) continue;
      const side = a.offset - b.offset;
      const minSide = 2.07 * Math.sqrt(1 - (forward / 2.8) ** 2);
      if (Math.abs(side) >= minSide) continue;
      const nudge = (minSide - Math.abs(side)) * clamp(dt * 16, 0, 1) * (side < 0 ? -1 : 1);
      a.offset = clamp(a.offset + nudge * (i === 0 ? .4 : .5), -course.halfWidth - 1.3, course.halfWidth + 1.3);
      b.offset = clamp(b.offset - nudge * (i === 0 ? .6 : .5), -course.halfWidth - .2, course.halfWidth + .2);
      if (i === 0 && a.contact <= 0 && (Math.abs(a.speed - b.speed) > 1.5 || Math.abs(a.sideSpeed) > 4.2)) {
        a.contact = .44;
        b.contact = Math.max(b.contact, .25);
        // A real hit now: clear speed loss plus a short stun that cuts thrust,
        // so a hit can cost a position instead of healing in half a second.
        // Rear-ends are different: the kart ahead gets shoved forward and the
        // rammer loses less — otherwise a slower rival becomes a wall the
        // player keeps hitting every half second at the start.
        const rearEnd = forward < 0 && a.speed > b.speed;
        if (rearEnd) {
          a.speed *= a.boost > 0 ? .92 : .86;
          b.speed = Math.min(b.speed * 1.05, run.course.cruise * 1.15);
          a.stun = Math.max(a.stun, .3);
          b.stun = Math.max(b.stun, .2);
        } else {
          a.speed *= a.boost > 0 ? .90 : .82;
          b.speed *= .93;
          a.stun = Math.max(a.stun, .45);
          b.stun = Math.max(b.stun, .3);
        }
        // Knockback: shove both karts apart sideways and jolt their heading,
        // so a hit reads instead of sliding through.
        const kick = (side < 0 ? -1 : 1) * (rearEnd ? 3.2 : 2.4);
        a.sideSpeed += kick;
        b.sideSpeed -= kick;
        a.yawOffset += (side < 0 ? -1 : 1) * .05;
        b.yawOffset -= (side < 0 ? -1 : 1) * .08;
        a.yawKick += (side < 0 ? -1 : 1) * .2;
        b.yawKick -= (side < 0 ? -1 : 1) * .16;
        a.rollKick += .14;
        b.rollKick += .1;
        run.hits++;
        run.events.push({ type: 'hit', rival: b.id, strength: Math.min(1, Math.abs(a.sideSpeed) / 8 + .3) });
      } else if (i === 0 && a.contact <= 0 && forward > 0 && b.speed > a.speed + .6) {
        // Rival rams from behind while overtaking: the player gets shoved
        // sideways and loses speed, the rival pays a little too.
        a.contact = .44;
        b.contact = Math.max(b.contact, .25);
        const shove = a.offset >= b.offset ? 1 : -1;
        a.speed *= .93;
        b.speed *= .97;
        a.sideSpeed += shove * 2.0;
        a.stun = Math.max(a.stun, .35);
        a.yawKick += shove * .18;
        a.rollKick += .12;
        run.hits++;
        run.events.push({ type: 'hit', rival: b.id, strength: .55 });
      }
    }
  }
}

function collect(run, car, prev) {
  const course = run.course;
  trafficFeatures(run, car, prev);
  const margin = padMargin(course);
  nearby(course, 'pads', prev - margin, car.s + margin, (pad, lap, pos) => {
    if (Math.abs(car.offset - pad.offset) > pad.halfWidth || car.jumpY > .36 ||
        car.s < pos - pad.halfLength || prev > pos + pad.halfLength) return;
    const key = lap * course.pads.length + pad.id;
    if (car.lastPad === key) return;
    car.lastPad = key;
    if (car.id === 0) {
      run.padHits++;
      run.events.push({ type: 'pad', id: pad.id, lap });
      chargeTurbo(run, .18);
    }
    activate(run, car, car.id === 0 ? 1.12 : .68, 'pad');
  });
  if (car.id !== 0) return;
  const reach = captureReach(car);
  const radius = car.magnet > 0 ? captureRadius(car) : 1.16;
  nearby(course, 'pickups', prev - 1.55, car.s + reach, (item, lap) => {
    if (Math.abs(car.offset - item.offset) > radius) return;
    const key = lap * course.pickups.length + item.id;
    if (run.collected.has(key)) return;
    run.collected.add(key);
    run.pickupHits++;
    chargeTurbo(run, item.special ? .31 : .12);
    run.events.push({ type: 'pickup', id: item.id, lap, special: item.special });
  });
}

function moveFrame(run, input, dt) {
  const { course, player, racers } = run;
  const previous = player.s;
  const finish = course.length * run.laps;
  drivePlayer(run, input, dt);
  collect(run, player, previous);
  for (let i = 1; i < racers.length; i++) {
    const rival = racers[i];
    const start = rival.s;
    driveRival(run, rival, dt);
    if (rival.finishAt !== null) continue;
    collect(run, rival, start);
    if (rival.s >= finish) {
      rival.finishAt = finishAt(start, rival.s, finish, run.time, dt);
      rival.s = finish;
    }
    rival.lap = Math.min(run.laps, Math.floor(Math.max(0, rival.s) / course.length) + 1);
  }
  spreadKarts(run, dt);

  const lapLine = player.lap * course.length;
  if (player.s >= lapLine) {
    const stamp = finishAt(previous, player.s, lapLine, run.time, dt);
    run.lapTimes.push(stamp - run.lastLapAt);
    run.lastLapAt = stamp;
    if (player.lap >= run.laps) {
      run.time = stamp;
      player.s = finish;
      player.finishAt = stamp;
      run.finished = true;
      updateRanks(run);
      run.events.push({ type: 'finish', result: resultFor(run) });
      return;
    }
    player.lap++;
    run.events.push({ type: 'lap', lap: player.lap, seconds: run.lapTimes.at(-1) });
  }
  run.time += dt;
  updateRanks(run);
  if (run.mode !== 'study' || run.studyIndex >= 2) return;
  const checkpoint = finish * [0.225, .68][run.studyIndex];
  if (previous < checkpoint && player.s >= checkpoint) {
    run.studyIndex++;
    run.studyPending = true;
    run.events.push({ type: 'study', index: run.studyIndex });
  }
}

export function stepRace(run, input = {}, delta = MAX_STEP) {
  if (run.finished || run.studyPending || run.powerQuizPending || !Number.isFinite(delta) || delta <= 0) return;
  let remaining = Math.min(.1, delta);
  while (remaining > 1e-7 && !run.finished && !run.studyPending && !run.powerQuizPending) {
    const dt = Math.min(remaining, MAX_STEP);
    moveFrame(run, input, dt);
    remaining -= dt;
  }
}

export function resolveStudy(run, correct) {
  if (run.mode !== 'study' || !run.studyPending || run.finished) return;
  run.studyPending = false;
  if (correct !== true) return;
  run.correct++;
  chargeTurbo(run, .28);
  activate(run, run.player, 2.45, 'study', 3);
}

export function perfectStart(run) {
  if (!run || run.finished) return false;
  run.player.boost = Math.max(run.player.boost, 1.4);
  run.events.push({ type: 'boost', source: 'start', tier: 2 });
  return true;
}

export function resultFor(run) {
  const position = run.player.rank;
  const duration = run.player.finishAt ?? run.time;
  const par = (run.course.length * run.laps) / (run.course.cruise * .958) + 2.4;
  const racePoints = run.mode === 'trial' ? 305 : (run.racers.length + 1 - position) * 165;
  const score = Math.max(0, Math.round(240 + racePoints + (par - duration) * 16 +
    run.drifts * 24 + run.padHits * 12 + run.pickupHits * 6 + run.correct * 12));
  return {
    position, rank: position, score, duration, win: run.mode === 'trial' ? duration <= par : position === 1,
    bestLap: run.lapTimes.length ? Math.min(...run.lapTimes) : null, laps: run.lapTimes.slice(),
    boosts: run.turbos, drifts: run.drifts, pads: run.padHits, pickups: run.pickupHits,
    hits: run.hits, correct: run.correct, circuit: run.course.id,
    traps: run.trapHits, items: run.itemsFound, powers: run.powerUses, upgrades: run.upgrades,
  };
}
