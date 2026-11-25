const label = (en, th) => ({ en, th });
const power = (en, th, icon, detail, enhanced) => ({ en, th, icon, detail, enhanced });

// Durations and distances in the simulation are seconds and metres.
export const POWER_INFO = Object.freeze({
  shield: power('Amber Guard', 'เกราะอำพัน', '◈',
    label('Blocks the next trap or rival pulse for 14 s.', 'ป้องกันกับดักหรือคลื่นคู่แข่งหนึ่งครั้งภายใน 14 วินาที'),
    label('Two shields last up to 22 s.', 'ป้องกันได้สองครั้งภายใน 22 วินาที')),
  comet: power('Comet Drive', 'แรงส่งดาวหาง', '✧',
    label('Accelerate above racing speed for 3.2 s.', 'เร่งความเร็วต่อเนื่อง 3.2 วินาที'),
    label('A stronger launch and 5.8 s of thrust.', 'ออกตัวแรงขึ้นและเร่งต่อเนื่อง 5.8 วินาที')),
  magnet: power('Flux Magnet', 'แม่เหล็กดูดพลัง', '∩',
    label('Pull nearby crystals and the next power box to your kart for 6 s.', 'ดูดคริสตัลใกล้เคียงและกล่องพลังถัดไปนาน 6 วินาที'),
    label('Full-width pull for 11 s, reaching farther ahead.', 'ดูดได้เต็มความกว้างถนนนาน 11 วินาทีและไกลขึ้น')),
  pulse: power('Echo Ring', 'วงคลื่นสะท้อน', '◎',
    label('A pulse slows rivals within 22 m.', 'ปล่อยคลื่นชะลอคู่แข่งในระยะ 22 เมตร'),
    label('Reaches 39 m and slows rivals for longer.', 'รัศมีกว้างขึ้นเป็น 39 เมตรและชะลอได้นานขึ้น')),
  grip: power('Trail Claw', 'กรงเล็บยึดเกาะ', '✣',
    label('Hold speed on the verge and grip through slicks for 7 s.', 'เกาะไหล่ทางและผ่านพื้นลื่นได้นาน 7 วินาที'),
    label('Stronger corner grip and 12 s of coverage.', 'ยึดเกาะโค้งแน่นขึ้นและมีผลนาน 12 วินาที')),
  spring: power('Sky Spring', 'สปริงทะยาน', '↟',
    label('Vault over obstacles and gain a short landing boost.', 'กระโดดข้ามสิ่งกีดขวางและเร่งสั้น ๆ เมื่อลงพื้น'),
    label('Jump higher and get a longer landing boost.', 'กระโดดสูงขึ้นและเร่งตอนลงพื้นได้นานขึ้น')),
});
const kinds = Object.keys(POWER_INFO);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (n, span) => ((n % span) + span) % span;
const emit = (run, car, event) => { if (car.id === 0) run.events.push(event); };

export function equipDriver(car, seed) {
  Object.assign(car, {
    power: null, powerDeck: [], lastKind: '', powerSeed: ((seed >>> 0) ^ Math.imul(car.id + 1, 0x45d9f3b)) >>> 0 || 1,
    itemRows: new Set(), lastHazard: -1, aiUseAt: Infinity, aiUseBy: Infinity,
    shield: 0, guards: 0, magnet: 0, magnetLevel: 0, pulse: 0, pulseLock: 0,
    grip: 0, gripLevel: 0, spring: 0, comet: 0, slick: 0, skidSide: 0, slow: 0,
    jumpY: 0, jumpV: 0, landingBoost: 0, hopCooldown: 0, hopInput: false,
  });
  return car;
}

function random(car) {
  let s = car.powerSeed;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  car.powerSeed = s >>> 0;
  return car.powerSeed / 4294967296;
}

function drawKind(car) {
  const deck = car.powerDeck;
  if (!deck.length) {
    deck.push(...kinds);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random(car) * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck.at(-1) === car.lastKind) [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
  }
  car.lastKind = deck.pop();
  return car.lastKind;
}

export function beginPowerQuiz(run) {
  const held = run.player.power;
  if (run.finished || run.mode === 'trial' || run.studyPending || run.powerQuizPending ||
      !held || held.level !== 1 || held.quizOffered) return false;
  held.quizOffered = true;
  run.powerQuizPending = true;
  run.quizItem = held;
  return true;
}

export function resolvePowerQuiz(run, answer) {
  if (!run.powerQuizPending) return false;
  const held = run.quizItem;
  run.powerQuizPending = false;
  run.quizItem = null;
  if (!held || held !== run.player.power) return false;
  if (answer === true) {
    held.level = 2;
    run.upgrades++;
    run.events.push({ type: 'powerUpgrade', kind: held.kind, level: held.level });
  }
  run.events.push({ type: 'powerQuizEnd', kind: held.kind, level: held.level, correct: answer === true, skipped: answer == null });
  return true;
}

// Shared by collision detection, the warning paint and both visual backends.
export function hazardOffset(course, hazard, time) {
  if (hazard.kind !== 'sweeper') return hazard.offset;
  const travel = Math.max(0, course.halfWidth - hazard.halfWidth - 1.15);
  const angle = time * (.88 + (hazard.id % 3) * .13) + hazard.phase;
  return clamp(hazard.offset * .36 + travel * .78 * Math.sin(angle), -travel, travel);
}

function absorb(run, car, source) {
  if (car.shield <= 0 || car.guards === 0) return false;
  car.guards--;
  if (!car.guards) car.shield = 0;
  emit(run, car, { type: 'guard', kind: source, remaining: car.guards });
  return true;
}

function leap(run, car, velocity, landingBoost = 0) {
  if (car.hopCooldown > 0 || car.jumpY > .02) return false;
  car.jumpV = velocity;
  car.hopCooldown = .96 + (velocity > 8 ? .18 : 0);
  car.landingBoost = landingBoost;
  emit(run, car, { type: 'hop', power: landingBoost > 0 });
  return true;
}

export function requestHop(run, car, pressed) {
  if (pressed && !car.hopInput && car.speed > 4) leap(run, car, 7.3);
  car.hopInput = !!pressed;
}

function pulseDistance(run, caster, car) {
  const span = run.course.length;
  const along = wrap(car.s - caster.s + span / 2, span) - span / 2;
  return Math.hypot(along, car.offset - caster.offset);
}

function ring(run, caster, level) {
  const radius = level === 2 ? 39 : 22;
  for (const car of run.racers) {
    if (car === caster || car.finishAt !== null || car.pulseLock > 0 || pulseDistance(run, caster, car) > radius) continue;
    car.pulseLock = 4.2;
    if (absorb(run, car, 'pulse')) continue;
    car.slow = Math.max(car.slow, level === 2 ? 1.8 : 1.05);
    car.speed *= level === 2 ? .78 : .86;
    emit(run, car, { type: 'hazard', kind: 'pulse', blocked: false, rival: caster.id });
  }
}

function cast(run, car) {
  const held = car.power;
  if (!held || car.finishAt !== null) return false;
  const { kind, level } = held;
  const enhanced = level === 2;
  switch (kind) {
    case 'shield':
      car.guards = enhanced ? 2 : 1;
      car.shield = enhanced ? 22 : 14;
      break;
    case 'comet':
      car.comet = enhanced ? 5.8 : 3.2;
      car.boost = Math.max(car.boost, car.comet);
      car.speed = Math.max(car.speed, run.course.cruise * (enhanced ? 1.23 : 1.07));
      if (!car.id) run.turbos++;
      break;
    case 'magnet':
      car.magnet = enhanced ? 11 : 6;
      car.magnetLevel = level;
      break;
    case 'pulse':
      car.pulse = enhanced ? .95 : .63;
      ring(run, car, level);
      break;
    case 'grip':
      car.grip = enhanced ? 12 : 7;
      car.gripLevel = level;
      car.slick = 0;
      break;
    case 'spring': {
      const v = enhanced ? 11.2 : 9.3;
      // Surface height remains continuous if the player uses the spring during a manual hop.
      car.jumpV = Math.max(car.jumpV, v);
      car.hopCooldown = 1.3;
      car.landingBoost = enhanced ? 2.8 : 1.3;
      car.spring = enhanced ? 1.4 : 1.1;
      emit(run, car, { type: 'hop', power: true });
      break;
    }
    default: return false;
  }
  car.power = null;
  car.aiUseAt = Infinity;
  car.aiUseBy = Infinity;
  emit(run, car, { type: 'powerUse', kind, level });
  if (!car.id) run.powerUses++;
  return true;
}

export function usePower(run) {
  if (run.finished || run.powerQuizPending || run.studyPending || run.mode === 'trial') return false;
  return cast(run, run.player);
}

function proOpportunity(run, car) {
  const kind = car.power.kind;
  const speed = Math.max(7, car.speed);
  const course = run.course;
  if (kind === 'pulse') {
    return run.racers.some(rival => rival !== car && rival.finishAt === null && !rival.pulseLock &&
      !rival.guards && pulseDistance(run, car, rival) < 20);
  }
  if (kind === 'magnet') {
    let useful = false;
    nearby(course, 'items', car.s + 11, car.s + speed * 5.5, (item, lap, position) => {
      const row = lap * course.items.length + (item.group ?? item.id);
      if (position >= course.length * run.laps || car.itemRows.has(row)) return;
      useful = true;
      return false;
    });
    return useful && !car.magnet;
  }
  let upcoming;
  nearby(course, 'hazards', car.s + 2, car.s + Math.max(20, speed * 1.6), (h, lap, position) => {
    const distance = position - car.s;
    const lane = hazardOffset(course, h, run.time + distance / speed);
    if (Math.abs(car.offset - lane) > h.halfWidth + 1.3) return;
    upcoming = { kind: h.kind, eta: distance / speed };
    return false;
  });
  switch (kind) {
    case 'shield': return !car.guards && !!upcoming;
    case 'grip': return !car.grip && (car.slick > 0 || upcoming?.kind === 'slick' || Math.abs(course.frame(car.s + 12).curve) > .027);
    case 'spring': return !!upcoming && !car.jumpY && upcoming.eta >= .23 && upcoming.eta <= .59;
    case 'comet': return car.speed > 12 && car.boost < .3 && !car.slow && !upcoming;
    default: return false;
  }
}

export function updateGear(run, car, dt) {
  for (const timer of timers) car[timer] = Math.max(0, car[timer] - dt);
  if (car.shield === 0) car.guards = 0;
  if (car.jumpV !== 0 || car.jumpY > 0) {
    const g = 22.5;
    car.jumpY += car.jumpV * dt - .5 * g * dt * dt;
    car.jumpV -= g * dt;
    if (car.jumpY <= 0) {
      car.jumpY = 0;
      car.jumpV = 0;
      if (car.landingBoost > 0) {
        car.boost = Math.max(car.boost, car.landingBoost);
        if (!car.id) run.turbos++;
      }
      emit(run, car, { type: 'land', boosted: car.landingBoost > 0 });
      car.landingBoost = 0;
      car.spring = 0;
    }
  }
  if (car.id && car.power && run.time >= car.aiUseAt) {
    if (run.difficulty !== 'pro' || run.time >= car.aiUseBy || proOpportunity(run, car)) cast(run, car);
    else car.aiUseAt = Math.min(car.aiUseBy, run.time + .12);
  }
}
const timers = ['shield', 'magnet', 'pulse', 'pulseLock', 'grip', 'spring', 'comet', 'slick', 'slow', 'hopCooldown'];

export function captureRadius(car) {
  return car.magnet <= 0 ? 1.46 : car.magnetLevel === 2 ? 14 : 5.6;
}
export function captureReach(car) {
  return car.magnet <= 0 ? 1.55 : car.magnetLevel === 2 ? 12 : 7;
}

const indexes = new WeakMap();
function trackIndex(course) {
  if (indexes.has(course)) return indexes.get(course);
  const ordered = list => [...(list || [])].sort((a, b) => a.s - b.s);
  const value = { items: ordered(course.items), hazards: ordered(course.hazards),
    pickups: ordered(course.pickups), pads: ordered(course.pads),
    hazardMargin: Math.max(6, ...(course.hazards || []).map(h => h.halfLength + .8)),
    padMargin: Math.max(4, ...(course.pads || []).map(p => p.halfLength)) };
  indexes.set(course, value);
  return value;
}

function lowerBound(list, value) {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].s < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function nearby(course, name, from, to, visit) {
  const list = trackIndex(course)[name];
  if (!list.length || to < 0) return;
  const { length } = course;
  const startLap = Math.max(0, Math.floor(from / length));
  const endLap = Math.floor(to / length);
  for (let lap = startLap; lap <= endLap; lap++) {
    const origin = lap * length;
    const limit = to - origin;
    for (let i = lowerBound(list, from - origin); i < list.length && list[i].s <= limit; i++) {
      if (visit(list[i], lap, origin + list[i].s) === false) return;
    }
  }
}

export function padMargin(course) {
  return trackIndex(course).padMargin;
}

function obstacle(run, car, h, lap, position, prev) {
  if (car.s < position - h.halfLength - .42 || prev > position + h.halfLength + .42) return;
  const key = lap * run.course.hazards.length + h.id;
  if (car.lastHazard === key) return;
  const offset = hazardOffset(run.course, h, run.time);
  if (Math.abs(car.offset - offset) > h.halfWidth + .64) return;
  const clearance = h.kind === 'slick' ? .18 : h.kind === 'hurdle' ? .67 : h.kind === 'slalom' ? .88 : 1.03;
  if (car.jumpY > clearance) return;
  car.lastHazard = key;
  const guarded = (h.kind === 'slick' && car.grip > 0) || absorb(run, car, h.kind);
  if (!guarded) {
    if (h.kind === 'slick') {
      car.slick = 1.25;
      car.skidSide = Math.abs(car.offset - offset) > .12 ? Math.sign(car.offset - offset) : (h.id % 2 ? 1 : -1);
      car.speed *= .91;
    } else {
      const hard = h.kind === 'sweeper';
      car.slow = Math.max(car.slow, hard ? 1.35 : .85);
      car.speed *= hard ? .57 : .69;
      if (h.kind === 'slalom') car.sideSpeed += car.offset >= offset ? 2.8 : -2.8;
    }
    if (!car.id) run.trapHits++;
  }
  emit(run, car, { type: 'hazard', kind: h.kind, blocked: guarded, id: h.id });
}

export function trafficFeatures(run, car, prev) {
  const course = run.course;
  const { hazardMargin } = trackIndex(course);
  nearby(course, 'hazards', prev - hazardMargin, car.s + hazardMargin,
    (h, lap, position) => obstacle(run, car, h, lap, position, prev));
  if (run.mode === 'trial' || car.power) return;
  const lateral = captureRadius(car);
  const reach = captureReach(car);
  nearby(course, 'items', prev - 1.25, car.s + reach, (item, lap) => {
    // Each driver can take one box from a rack. An AI cannot remove the player's first choice.
    const group = item.group ?? item.id;
    const lapOffset = lap * course.items.length;
    const row = lapOffset + group;
    if (car.itemRows.has(row) || Math.abs(car.offset - item.offset) > lateral) return;
    car.itemRows.add(row);
    car.power = { kind: drawKind(car), level: 1, quizOffered: false };
    if (car.id) {
      car.aiUseAt = run.time + 1.7 + random(car) * 2.7;
      car.aiUseBy = car.aiUseAt + 7.5;
    } else {
      for (const box of course.items) {
        if ((box.group ?? box.id) === group) run.collectedItems.add(lapOffset + box.id);
      }
      run.itemsFound++;
      run.events.push({ type: 'powerPickup', kind: car.power.kind, level: 1, id: item.id, lap });
    }
    return false;
  });
}

export function avoidHazard(run, car, line) {
  const course = run.course;
  const sight = Math.max(17, car.speed * (run.difficulty === 'pro' ? 1.43 : 1.12));
  let target = line;
  nearby(course, 'hazards', car.s - 1.5, car.s + sight, (h, lap, position) => {
    if (car.lastHazard === lap * course.hazards.length + h.id || car.guards > 0 ||
        (car.grip > 0 && h.kind === 'slick')) return;
    const eta = Math.max(0, (position - car.s) / Math.max(5, car.speed));
    const lane = hazardOffset(course, h, run.time + eta);
    const clearance = h.halfWidth + 1.07;
    if (Math.abs(target - lane) >= clearance + .35) return false;
    if (h.kind === 'hurdle' && (car.id % 3 !== 0) && eta < .43 && eta > .22 && car.speed > 6) {
      leap(run, car, 7.3);
      return false;
    }
    if (h.kind === 'hurdle' && car.jumpY > .06) return false;
    const max = course.halfWidth - .65;
    const left = lane - clearance, right = lane + clearance;
    if (left < -max) target = Math.min(right, max);
    else if (right > max) target = Math.max(left, -max);
    else target = Math.abs(car.offset - left) < Math.abs(car.offset - right) ? left : right;
    return false;
  });
  return target;
}
