import test from "node:test";
import assert from "node:assert/strict";
import { createGyroPower } from "./gyro-power.mjs";

test("first sample calibrates the rest posture and never fires", () => {
  const gyro = createGyroPower();
  assert.equal(gyro.calibrated, false);
  assert.equal(gyro.update({ beta: 30, gamma: -10 }, 0), false);
  assert.equal(gyro.calibrated, true);
});

test("a small tilt does not fire, a 26 degree tilt does", () => {
  const gyro = createGyroPower();
  gyro.update({ beta: 0, gamma: 0 }, 0);
  assert.equal(gyro.update({ beta: 10, gamma: 0 }, 100), false);
  assert.equal(gyro.update({ beta: 25, gamma: 0 }, 200), false);
  assert.equal(gyro.update({ beta: 26, gamma: 0 }, 300), true);
});

test("holding the tilt does not fire again until the phone comes back to rest", () => {
  const gyro = createGyroPower();
  gyro.update({ beta: 0, gamma: 0 }, 0);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 100), true);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 1200), false);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 2300), false);
  // Back within 12 degrees of rest re-arms it.
  assert.equal(gyro.update({ beta: 5, gamma: 0 }, 2400), false);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 2500), true);
});

test("cooldown blocks a second fire inside 900 ms", () => {
  const gyro = createGyroPower();
  gyro.update({ beta: 0, gamma: 0 }, 0);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 100), true);
  assert.equal(gyro.update({ beta: 5, gamma: 0 }, 200), false);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 500), false);
  assert.equal(gyro.update({ beta: 5, gamma: 0 }, 1100), false);
  assert.equal(gyro.update({ beta: 30, gamma: 0 }, 1200), true);
});

test("one sharp flick fires even below the tilt threshold", () => {
  const gyro = createGyroPower();
  gyro.update({ beta: 0, gamma: 0 }, 0);
  // 25 degrees in 100 ms = 250 deg/s, above the 240 deg/s jerk threshold.
  assert.equal(gyro.update({ beta: 25, gamma: 0 }, 100), true);
  const slow = createGyroPower();
  slow.update({ beta: 0, gamma: 0 }, 0);
  // Same 25 degrees spread over a full second = 25 deg/s: no fire.
  assert.equal(slow.update({ beta: 25, gamma: 0 }, 1000), false);
});

test("angle wraparound does not fake a tilt, and bad samples are ignored", () => {
  const gyro = createGyroPower();
  gyro.update({ beta: 179, gamma: 0 }, 0);
  assert.equal(gyro.update({ beta: -179, gamma: 0 }, 100), false);
  assert.equal(gyro.update({ beta: null, gamma: 0 }, 200), false);
  assert.equal(gyro.update({ beta: Number.NaN, gamma: 0 }, 300), false);
  assert.equal(gyro.update(null, 400), false);
});

test("reset clears the baseline so the next sample calibrates again", () => {
  const gyro = createGyroPower();
  gyro.update({ beta: 40, gamma: 0 }, 0);
  gyro.reset();
  assert.equal(gyro.calibrated, false);
  assert.equal(gyro.update({ beta: -20, gamma: 5 }, 100), false);
  assert.equal(gyro.update({ beta: -20, gamma: 5 }, 200), false);
  assert.equal(gyro.update({ beta: 6, gamma: 5 }, 300), true);
});
