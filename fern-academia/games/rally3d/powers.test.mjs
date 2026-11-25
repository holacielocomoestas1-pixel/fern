import test from 'node:test';
import assert from 'node:assert/strict';
import { beginPowerQuiz, COURSES, createRace, hazardOffset, pose, POWER_INFO,
  resolvePowerQuiz, stepRace, usePower } from './model.mjs';

const dt = 1 / 60;
const base = COURSES[0];
const courseWith = fields => ({ ...base, hazards: [], items: [], pickups: [], pads: [], ...fields });
const box = (id, s, offset = 0) => ({ id, s, offset, group: id });
const hazard = (id, kind, s, offset = 0) => ({ id, kind, s, offset, halfWidth: 1.35, halfLength: .65, phase: 0 });
function prepare(course = courseWith({}), options) {
  const run = createRace(course, options);
  run.racers.slice(1).forEach((car, i) => { car.s = 200 + 16 * i; });
  Object.assign(run.player, { s: 10, speed: course.cruise, offset: 0 });
  return run;
}
function frames(run, count, input = {}) {
  for (let i = 0; i < count; i++) stepRace(run, input, dt);
}
function hold(run, kind, level = 1) {
  run.player.power = { kind, level, quizOffered: level === 2 };
}

test('each natural rack allows one draw, all six powers in a deck, and another draw next lap', () => {
  const racks = Array.from({ length: 7 }, (_, i) => box(i, 42 + 110 * i));
  const run = prepare(courseWith({ items: racks }));
  const seen = [];
  for (const rack of racks) {
    Object.assign(run.player, { s: rack.s - 1.5, offset: 0 });
    stepRace(run);
    assert.ok(run.collectedItems.has(rack.id));
    seen.push(run.player.power.kind);
    assert.equal(run.player.power.quizOffered, false);
    assert.equal(run.player.power.level, 1);
    assert.equal(usePower(run), true);
    assert.equal(usePower(run), false);
    stepRace(run);
    assert.equal(run.player.power, null);
  }
  assert.equal(new Set(seen.slice(0, 6)).size, 6);
  assert.notEqual(seen[5], seen[6]);
  assert.equal(run.itemsFound, 7);
  run.player.s = run.course.length + 41;
  stepRace(run);
  assert.ok(run.player.power);
  assert.ok(run.collectedItems.has(racks.length));
});

test('a held item survives other racks and a quiz freezes every simulation timer and rival', () => {
  const run = prepare(courseWith({ items: [box(0, 42), box(1, 85)] }));
  run.player.s = 41;
  stepRace(run);
  const original = run.player.power;
  run.player.s = 84;
  stepRace(run);
  assert.equal(run.player.power, original);
  assert.equal(run.itemsFound, 1);
  assert.equal(beginPowerQuiz(run), true);
  assert.equal(beginPowerQuiz(run), false);
  assert.equal(usePower(run), false);
  const time = run.time;
  const racers = run.racers.map(car => [car.s, car.speed, car.boost, car.offset, car.hopCooldown]);
  frames(run, 480, { hop: true, steer: 1, boost: true, brake: true });
  assert.equal(run.time, time);
  assert.deepEqual(run.racers.map(car => [car.s, car.speed, car.boost, car.offset, car.hopCooldown]), racers);
  assert.equal(resolvePowerQuiz(run, true), true);
  assert.equal(resolvePowerQuiz(run, true), false);
  assert.equal(beginPowerQuiz(run), false);
  assert.equal(run.player.power.level, 2);
  assert.equal(run.upgrades, 1);
  stepRace(run);
  assert.ok(run.time > time);
  assert.ok(run.events.some(e => e.type === 'powerUpgrade'));
  assert.equal(usePower(run), true);
});

for (const answer of [false, null]) {
  test('an optional quiz ending with ' + answer + ' retains the original power without a retry', () => {
    const run = prepare();
    assert.equal(beginPowerQuiz(run), false);
    hold(run, 'comet');
    assert.equal(beginPowerQuiz(run), true);
    assert.equal(resolvePowerQuiz(run, answer), true);
    assert.equal(run.player.power.level, 1);
    assert.equal(run.player.power.quizOffered, true);
    assert.equal(beginPowerQuiz(run), false);
    assert.equal(usePower(run), true);
    assert.equal(run.player.power, null);
  });
}

test('two guards absorb two separate obstacles, and the next one still costs speed', () => {
  const hazards = [hazard(0, 'slalom', 28), hazard(1, 'hurdle', 67), hazard(2, 'slick', 108)];
  const run = prepare(courseWith({ hazards }));
  hold(run, 'shield', 2);
  assert.equal(usePower(run), true);
  for (const h of hazards) {
    Object.assign(run.player, { s: h.s - .82, speed: 23, offset: 0 });
    stepRace(run);
  }
  assert.equal(run.player.guards, 0);
  assert.equal(run.trapHits, 1);
  assert.equal(run.events.filter(e => e.type === 'guard').length, 2);
  assert.ok(run.player.slick > 1);
  assert.ok(run.player.speed < 22);
});

test('a timed manual jump clears a physical hurdle, lands once, and holding the key does not pogo', () => {
  const h = hazard(0, 'hurdle', 42);
  const plain = prepare(courseWith({ hazards: [h] }));
  const clean = prepare(plain.course);
  for (const run of [plain, clean]) run.player.s = 33;
  frames(plain, 90);
  frames(clean, 90, { hop: true });
  assert.equal(plain.trapHits, 1);
  assert.equal(clean.trapHits, 0);
  assert.equal(clean.player.jumpY, 0);
  assert.equal(clean.events.filter(e => e.type === 'hop').length, 1);
  assert.equal(clean.events.filter(e => e.type === 'land').length, 1);
  assert.ok(clean.player.s > plain.player.s + 2);
  stepRace(clean, { hop: false });
  stepRace(clean, { hop: true });
  assert.ok(clean.player.jumpY > 0);
});

test('grip prevents a slick, leaves the shield intact while unused and reduces shoulder drag', () => {
  const h = hazard(0, 'slick', 45);
  const bare = prepare(courseWith({ hazards: [h] }));
  const grip = prepare(bare.course);
  bare.player.s = grip.player.s = 44;
  hold(grip, 'shield');
  usePower(grip);
  hold(grip, 'grip', 2);
  usePower(grip);
  stepRace(bare);
  stepRace(grip);
  assert.equal(bare.trapHits, 1);
  assert.equal(grip.trapHits, 0);
  assert.equal(grip.player.slick, 0);
  assert.equal(grip.player.guards, 1);
  // Compare both drivers at the same position on the verge. A driver already
  // sliding on the slick steers more slowly and would hit the shoulder later.
  for (const run of [bare, grip]) {
    Object.assign(run.player, { s: 56, offset: base.halfWidth + 2, speed: base.cruise, slick: 0, sideSpeed: 0 });
  }
  frames(bare, 120, { steer: 1 });
  frames(grip, 120, { steer: 1 });
  assert.ok(grip.player.speed > bare.player.speed + 4);
  assert.ok(pose(grip.course, grip.player).grip > 8);
});

test('the first rack introduces held powers within three seconds on every starting grid', () => {
  for (const course of COURSES) {
    const run = createRace(course);
    frames(run, 180);
    assert.ok(run.player.power, course.id);
    assert.equal(run.itemsFound, 1, course.id);
    assert.equal(run.powerQuizPending, false, course.id);
    assert.deepEqual([...run.collectedItems], course.items.slice(0, 3).map(item => item.id), course.id);
  }
});

test('pulse range, protection and recent-hit immunity prevent chained stuns', () => {
  const run = prepare();
  const [player, close, shielded, far, outside] = run.racers;
  for (const [car, ahead] of [[close, 13], [shielded, 16], [far, 30], [outside, 51]]) {
    Object.assign(car, { s: player.s + ahead, speed: 23, offset: 0 });
  }
  Object.assign(shielded, { guards: 1, shield: 6 });
  hold(run, 'pulse');
  usePower(run);
  assert.ok(close.slow > 0);
  assert.equal(far.slow, 0);
  assert.equal(shielded.slow, 0);
  assert.equal(shielded.guards, 0);
  assert.equal(outside.slow, 0);
  const previous = close.speed;
  hold(run, 'pulse', 2);
  usePower(run);
  assert.equal(close.speed, previous);
  assert.ok(far.slow > 1.5);
  assert.equal(outside.slow, 0);
});

test('pro opponents save powers for useful opportunities and release unused powers on timeout', () => {
  const run = prepare(courseWith({}), { difficulty: 'pro' });
  const rival = run.racers[1];
  run.racers.slice(2).forEach((car, index) => { car.s = 300 + index * 50; });
  Object.assign(rival, { power: { kind: 'pulse', level: 1 }, aiUseAt: 0, aiUseBy: 5 });
  stepRace(run);
  assert.equal(rival.power.kind, 'pulse');
  Object.assign(run.player, { s: rival.s - 9, offset: rival.offset });
  frames(run, 10);
  assert.equal(rival.power, null);
  assert.ok(run.player.slow > .8);
  Object.assign(rival, { power: { kind: 'grip', level: 1 }, aiUseAt: run.time, aiUseBy: run.time });
  stepRace(run);
  assert.equal(rival.power, null);
  assert.ok(rival.grip > 6);
});

test('magnet draws a distant gem and a new held item with a larger upgraded capture envelope', () => {
  const course = courseWith({ items: [box(0, 61, -5)], pickups: [{ id: 0, s: 58, offset: -5, special: false }] });
  const standard = prepare(course), advanced = prepare(course);
  for (const [run, tier] of [[standard, 1], [advanced, 2]]) {
    Object.assign(run.player, { s: 50, offset: 5 });
    hold(run, 'magnet', tier);
    usePower(run);
    stepRace(run);
  }
  assert.equal(standard.pickupHits, 0);
  assert.equal(standard.player.power, null);
  assert.equal(advanced.pickupHits, 1);
  assert.ok(advanced.player.power);
});

test('upgraded spring has greater apex and a longer landing thrust; stronger comet lasts longer', () => {
  const measure = level => {
    const run = prepare();
    hold(run, 'spring', level);
    usePower(run);
    let peak = 0;
    while (!run.events.some(e => e.type === 'land') && run.time < 2) {
      stepRace(run);
      peak = Math.max(peak, run.player.jumpY);
    }
    assert.ok(run.events.some(e => e.type === 'land' && e.boosted));
    const landing = run.player.boost;
    hold(run, 'comet', level);
    usePower(run);
    return [peak, landing, run.player.comet];
  };
  const basic = measure(1), advanced = measure(2);
  advanced.forEach((v, i) => assert.ok(v > basic[i]));
});

test('sweeper collision uses the same live centre as the visuals and has a clear escape lane', () => {
  const h = hazard(0, 'sweeper', 35);
  const course = courseWith({ hazards: [h] });
  const a = prepare(course), b = prepare(course);
  a.time = b.time = Math.PI / 2 / .88;
  const offset = hazardOffset(course, h, a.time);
  assert.ok(offset > 3);
  assert.ok(Math.abs(offset) + h.halfWidth < course.halfWidth);
  for (const [run, lane] of [[a, offset], [b, -3]]) {
    Object.assign(run.player, { s: 34.3, offset: lane });
    stepRace(run);
  }
  assert.equal(a.trapHits, 1);
  assert.equal(b.trapHits, 0);
  frames(a, 4);
  assert.equal(a.trapHits, 1);
});

test('analogue braking has three ordered outcomes and grouped steps preserve dynamics', () => {
  const speeds = [false, .5, true].map(brake => {
    const run = prepare();
    frames(run, 40, { brake });
    return run.player.speed;
  });
  assert.ok(speeds[0] > speeds[1]);
  assert.ok(speeds[1] > speeds[2]);
  const a = prepare(), b = prepare();
  for (let i = 0; i < 120; i++) stepRace(a, { steer: .45, hop: i < 6 });
  for (let i = 0; i < 20; i++) stepRace(b, { steer: .45, hop: i === 0 }, .1);
  assert.ok(Math.abs(a.player.s - b.player.s) < 1e-7);
  assert.ok(Math.abs(a.player.jumpY - b.player.jumpY) < 1e-7);
});

test('trial hides item gameplay, keeps physical hazards, and can never open a power quiz', () => {
  const run = prepare(courseWith({ hazards: [hazard(0, 'hurdle', 42)], items: [box(0, 25)] }), { mode: 'trial' });
  frames(run, 150);
  assert.equal(run.racers.length, 1);
  assert.equal(run.itemsFound, 0);
  assert.equal(run.trapHits, 1);
  assert.equal(beginPowerQuiz(run), false);
  assert.equal(usePower(run), false);
  assert.equal(Object.keys(POWER_INFO).length, 6);
});
