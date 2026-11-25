import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES, createRace, pose, resolveStudy, resultFor, stepRace, usePower, hazardOffset } from './model.mjs';

const STEP = 1 / 60;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const wrap = (value, length) => ((value % length) + length) % length;

function chasePads(run) {
  const { player, course } = run;
  let target = 0;
  let nearest = 30;
  for (const pad of course.pads) {
    const ahead = wrap(pad.s - player.s, course.length);
    if (ahead < nearest) {
      nearest = ahead;
      target = pad.offset;
    }
  }
  if (player.power) usePower(run);
  let hop = false;
  for (const hazard of course.hazards) {
    const ahead = wrap(hazard.s - player.s, course.length);
    if (ahead > 25) continue;
    if (hazard.kind === 'hurdle') {
      if (ahead >= 6 && ahead <= 10 && Math.abs(player.offset - hazard.offset) < hazard.halfWidth + .8) hop = true;
    } else {
      const lane = hazardOffset(course, hazard, run.time + ahead / Math.max(8, player.speed));
      const clearance = hazard.halfWidth + 1.35;
      if (Math.abs(lane - target) < clearance) target = lane + (lane > 0 ? -clearance : clearance);
    }
    break;
  }
  const curvature = course.frame(player.s + 2.7).curve;
  const outward = clamp(curvature * player.speed ** 2 * .092, -2.1, 2.1);
  return {
    hop, steer: clamp(target - player.offset + .091 * (outward + player.offset * .4), -1, 1),
    boost: player.boostCharge >= .45 && player.boost < .032 && player.speed > 5,
  };
}

function play(course, options, pilot = () => ({}), onStudy = () => false) {
  const run = createRace(course, options);
  const events = [];
  const maximumTime = 35 + course.length * run.laps / (course.cruise * .66);
  for (let i = 0; i < maximumTime / STEP && !run.finished; i++) {
    stepRace(run, pilot(run), STEP);
    for (const event of run.events.splice(0)) {
      events.push(event);
      if (event.type === 'study') resolveStudy(run, onStudy(run, event));
    }
  }
  return { run, events, stats: resultFor(run) };
}

for (const course of COURSES) {
  test(course.id + ' closes continuously with a safe-width banked ribbon', () => {
    const a = course.frame(-.001);
    const b = course.frame(course.length - .001);
    assert.deepEqual(a, b);
    assert.ok(Math.hypot(a.x - course.frame(.001).x, a.z - course.frame(.001).z) < .01);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let s = 0; s < course.length; s += .45) {
      const f = course.frame(s);
      minY = Math.min(minY, f.y);
      maxY = Math.max(maxY, f.y);
      assert.ok(Math.abs(Math.hypot(f.dx, f.dz) - 1) < 1e-6);
      assert.ok(Math.abs(f.dx * f.rx + f.dz * f.rz) < 1e-6);
      assert.ok(Math.abs(f.curve) * (course.halfWidth + 1.6) < 1);
    }
    assert.ok(maxY - minY > 9);
    const start = createRace(course).player;
    const f = course.frame(start.s);
    const p = pose(course, start);
    assert.equal(p.y, f.y + Math.tan(f.bank) * start.offset);
    assert.ok(p.z < f.z + 2 && p.z > f.z - 2);
  });

  test(course.id + ' has a balanced two-lap race with a reachable win', () => {
    const { run, events, stats } = play(course);
    assert.equal(run.racers.length, 6);
    assert.equal(new Set(run.racers.map(car => car.rank)).size, 6);
    assert.equal(run.finished, true);
    assert.ok(stats.position > 1);
    assert.ok(stats.duration > 165 && stats.duration < 430, String(stats.duration));
    assert.equal(stats.laps.length, 2);
    assert.ok(Math.abs(stats.laps[0] + stats.laps[1] - stats.duration) < .0001);
    assert.equal(events.filter(event => event.type === 'finish').length, 1);
    assert.equal(events.filter(event => event.type === 'lap').length, 1);
    assert.equal(events.filter(event => event.type === 'study').length, 0);
    const skilled = play(course, {}, chasePads).stats;
    assert.equal(skilled.position, 1, JSON.stringify({skilled, passive: stats}));
    assert.ok(skilled.pads >= 4);
    assert.ok(skilled.duration < stats.duration - 5);
  });
}

test('drift charges the tier indicator and converts release to a brief turbo', () => {
  const run = createRace(COURSES[0], { mode: 'trial' });
  Object.assign(run.player, { s: 10, speed: 21 });
  for (let i = 0; i < 45; i++) stepRace(run, { steer: .61, drift: true });
  assert.equal(run.player.drift, true);
  assert.ok(run.player.driftTier > 0);
  const meter = run.player.boostCharge;
  stepRace(run, { steer: .05, drift: false });
  assert.equal(run.player.drift, false);
  assert.ok(run.player.boostCharge > meter);
  assert.ok(run.player.boost > .8);
  assert.ok(run.events.some(event => event.type === 'boost' && event.source === 'drift'));
});

test('manual turbo consumes charge once per press and offroad state lowers speed', () => {
  const run = createRace(COURSES[0], { mode: 'trial' });
  Object.assign(run.player, { speed: 21, boostCharge: 1, s: 18 });
  let manual = 0;
  for (let i = 0; i < 440; i++) {
    stepRace(run, { boost: true });
    manual += run.events.splice(0).filter(event => event.source === 'manual').length;
  }
  assert.equal(manual, 1);
  const onRoad = run.player.speed;
  for (let i = 0; i < 135; i++) stepRace(run, { steer: 1 });
  assert.ok(run.player.friction > .65);
  assert.ok(run.player.speed < onRoad * .7);
  assert.ok(run.events.some(event => event.type === 'offroad'));
});

test('close flank contact separates karts without stopping or trapping the player', () => {
  const run = createRace(COURSES[0]);
  const a = run.player;
  const b = run.racers[1];
  Object.assign(a, { s: 20, offset: .7, speed: 25, sideSpeed: 5.2 });
  Object.assign(b, { s: 21, offset: 0, speed: 19 });
  stepRace(run, {}, STEP);
  assert.ok(a.offset - b.offset > .7);
  assert.ok(a.speed > 17 && a.speed < 25);
  assert.ok(run.events.some(event => event.type === 'hit' && event.rival === b.id));
  for (let i = 0; i < 90; i++) stepRace(run, { steer: -.4 });
  assert.ok(a.s > 40);
});

test('study stops twice and freezes clock, rivals and input until resolved', () => {
  const { run, events, stats } = play(COURSES[1], { mode: 'study' }, () => ({}), (model, event) => {
    const { time, player, racers } = model;
    const s = player.s;
    const opponents = racers.map(car => car.s);
    for (let i = 0; i < 60; i++) stepRace(model, { steer: 1, boost: true });
    assert.equal(model.time, time);
    assert.equal(player.s, s);
    assert.deepEqual(racers.map(car => car.s), opponents);
    return event.index === 2;
  });
  assert.equal(run.finished, true);
  assert.equal(events.filter(event => event.type === 'study').length, 2);
  assert.equal(events.filter(event => event.type === 'boost' && event.source === 'study').length, 1);
  assert.equal(stats.correct, 1);
});

test('time trial only spawns the player and a seed/input replay is reproducible', () => {
  const options = { mode: 'trial', laps: 1, seed: 29 };
  const a = play(COURSES[2], options, chasePads);
  const b = play(COURSES[2], options, chasePads);
  assert.equal(a.run.racers.length, 1);
  assert.equal(a.run.finished, true);
  assert.equal(a.events.some(event => event.type === 'study'), false);
  assert.deepEqual(a.stats, b.stats);
  assert.deepEqual(a.events, b.events);
});
