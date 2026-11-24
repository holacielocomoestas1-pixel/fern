import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOST_COST, CIRCUITS, createRace, position, raceResult, resolvePit, sample, stepRace } from './race-model.mjs';

const step = 1 / 120;
const coast = { steer: 0, turbo: false };

function guide(run) {
  const progress = run.distance % run.circuit.length;
  const pad = run.circuit.pads.find((candidate) => candidate.distance > progress);
  const steer = pad && pad.distance - progress < 160 ? Math.max(-1, Math.min(1, (pad.lane - run.lane) / 24)) : 0;
  return { steer, turbo: true };
}

function simulate(circuit, guidePlayer) {
  const run = createRace(circuit);
  while (run.finishAt === null && run.elapsed < 80) stepRace(run, guidePlayer ? guide(run) : coast, step);
  assert.notEqual(run.finishAt, null);
  assert.equal(run.distance, circuit.laps * circuit.length);
  assert.equal(run.pitIndex, 0);
  return raceResult(run);
}

for (const circuit of CIRCUITS) {
  test(circuit.title.en + ' has a continuous closed course', () => {
    const before = sample(circuit, -.001);
    const first = sample(circuit, 0);
    const after = sample(circuit, circuit.length + .001);
    assert(Math.hypot(first.x - before.x, first.y - before.y) < .01);
    assert(Math.hypot(first.x - after.x, first.y - after.y) < .01);
    const edge = sample(circuit, 0, circuit.width);
    assert(Math.abs(Math.hypot(first.x - edge.x, first.y - edge.y) - circuit.width) < .0001);
  });

  test(circuit.title.en + ' rewards steering onto pads and using turbo', () => {
    const neutral = simulate(circuit, false);
    const guided = simulate(circuit, true);
    assert(neutral.rank > guided.rank);
    assert.equal(guided.rank, 1);
    assert(guided.pads > neutral.pads && guided.boosts >= 4);
    assert(guided.duration < neutral.duration);
    assert(guided.duration > 20 && neutral.duration < 65);
  });
}

test('the study question holds race time and rival progress and rewards only a correct answer', () => {
  const race = createRace(CIRCUITS[0], 'study');
  while (!race.pit && race.elapsed < 55) stepRace(race, coast, step);
  assert.equal(race.pitIndex, 1);
  const saved = [race.elapsed, race.distance, race.rivalCars[0].distance];
  for (let tick = 0; tick < 1200; tick += 1) stepRace(race, { steer: 1, turbo: true }, step);
  assert.deepEqual([race.elapsed, race.distance, race.rivalCars[0].distance], saved);
  assert.equal(race.boostCount, 0);
  resolvePit(race, false);
  assert.equal(race.pit, false);
  assert.equal(race.pitCorrect, 0);
  while (!race.pit && race.elapsed < 55) stepRace(race, coast, step);
  assert.equal(race.pitIndex, 2);
  resolvePit(race, true);
  assert.equal(race.pitCorrect, 1);
  assert.equal(race.boost, 2.7);
  assert.equal(race.boostCount, 1);
  while (race.finishAt === null && race.elapsed < 55) stepRace(race, coast, step);
  assert.equal(raceResult(race).correct, 1);
  const finish = race.elapsed;
  stepRace(race, { steer: 1, turbo: true }, step);
  assert.equal(race.elapsed, finish);
  assert(position(race) >= 1 && position(race) <= 4);
});

test('charge is consumed on activation and crossing the verge reduces speed', () => {
  const road = createRace(CIRCUITS[0]);
  const verge = createRace(CIRCUITS[0]);
  road.charge = BOOST_COST;
  stepRace(road, { steer: 0, turbo: true }, step);
  assert.equal(road.charge, 0);
  assert.deepEqual(road.events, ['turbo']);
  for (let tick = 0; tick < 600; tick += 1) {
    stepRace(road, coast, step);
    stepRace(verge, { steer: -1, turbo: false }, step);
  }
  assert(Math.abs(verge.lane) > verge.circuit.width);
  assert(verge.speed < road.speed * .8);
});
