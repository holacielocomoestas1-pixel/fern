import test from "node:test";
import assert from "node:assert/strict";
import { createDirector } from "./camera.mjs";
import { geometry, cameraSubject } from "./camera-fixture.mjs";
import { pose as toPose } from "./model.mjs";
import { viewFor } from "./render-math.mjs";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rigid = input => createDirector().get(input);
const runInput = (overrides = {}) => ({ phase: "run", dt: 1 / 60, aspect: 16 / 9, ...cameraSubject(50), ...overrides });

test("drone follow lags behind a sudden move and then settles on the rigid shot", () => {
  const director = createDirector();
  const base = runInput();
  for (let i = 0; i < 90; i++) director.get(base);
  const settled = director.get(base);
  // Sudden lateral jump of the kart: the rigid camera moves at once.
  const movedPlayer = { ...base.player, offset: 3.2, airborne: 0, yawOffset: 0, roll: 0, steer: 0 };
  const moved = runInput({ player: movedPlayer, pose: toPose(geometry, movedPlayer) });
  const rigidMoved = rigid(moved);
  const lagging = director.get(moved);
  const lag = dist(lagging, rigidMoved);
  assert.ok(lag > 0.1, `expected a visible lag, got ${lag}`);
  assert.ok(lag < dist(settled, rigidMoved), "the spring must move toward the new shot");
  // Held still, it converges back onto the rigid shot (up to the constant
  // subtle sway, which is bounded by ~0.06 m by design).
  for (let i = 0; i < 180; i++) director.get(moved);
  assert.ok(dist(director.get(moved), rigidMoved) < 0.08);
});

test("turbo pulls the camera back and punches the FOV, then decays", () => {
  const director = createDirector();
  const base = runInput();
  for (let i = 0; i < 90; i++) director.get(base);
  const before = director.get(base);
  const beforeDist = Math.hypot(before.x - base.pose.x, before.z - base.pose.z);
  director.pulse("turbo");
  const punched = director.get(base);
  const punchedDist = Math.hypot(punched.x - base.pose.x, punched.z - base.pose.z);
  assert.ok(punchedDist - beforeDist > 1.5, "turbo must pull the camera back");
  assert.ok(punched.fov - before.fov > 2, "turbo must punch the FOV");
  for (let i = 0; i < 240; i++) director.get(base);
  const decayed = director.get(base);
  assert.ok(Math.abs(decayed.fov - before.fov) < 0.15);
  assert.ok(Math.abs(Math.hypot(decayed.x - base.pose.x, decayed.z - base.pose.z) - beforeDist) < 0.1);
});

test("a hit pushes the camera in quickly", () => {
  const director = createDirector();
  const base = runInput();
  for (let i = 0; i < 90; i++) director.get(base);
  const before = director.get(base);
  const beforeDist = Math.hypot(before.x - base.pose.x, before.z - base.pose.z);
  director.pulse("hit", 1);
  const pushed = director.get(base);
  const pushedDist = Math.hypot(pushed.x - base.pose.x, pushed.z - base.pose.z);
  assert.ok(beforeDist - pushedDist > 0.7, "a hit must push the camera in");
});

test("using a power pans the aim forward, an overtake sweeps it sideways", () => {
  const director = createDirector();
  const base = runInput();
  for (let i = 0; i < 90; i++) director.get(base);
  const before = director.get(base);
  const heading = [Math.sin(base.pose.yaw), Math.cos(base.pose.yaw)];
  const along = view => (view.tx - base.pose.x) * heading[0] + (view.tz - base.pose.z) * heading[1];
  director.pulse("power");
  assert.ok(along(director.get(base)) - along(before) > 1, "power must pan the aim forward");
  const director2 = createDirector();
  for (let i = 0; i < 90; i++) director2.get(base);
  const before2 = director2.get(base);
  const { right } = viewFor(before2, 16 / 9, .1, 400);
  const lateral = view => (view.x - before2.x) * right[0] + (view.z - before2.z) * right[2];
  director2.pulse("overtake", 1);
  assert.ok(lateral(director2.get(base)) > 0.5, "gaining a position must sweep one way");
  const director3 = createDirector();
  for (let i = 0; i < 90; i++) director3.get(base);
  director3.pulse("overtake", -1);
  assert.ok(lateral(director3.get(base)) < -0.5, "losing a position must sweep the other way");
});

test("drift leans the camera into the curve", () => {
  const base = runInput();
  const plain = createDirector();
  for (let i = 0; i < 60; i++) plain.get(base);
  const plainView = plain.get(base);
  const drifting = createDirector();
  const driftInput = runInput({ player: { ...base.player, drift: true, driftSign: 1 } });
  for (let i = 0; i < 60; i++) drifting.get(driftInput);
  const driftView = drifting.get(driftInput);
  assert.ok(driftView.roll - plainView.roll > 0.015, "drifting must add roll into the curve");
});

test("reduced motion turns every drone move off", () => {
  const director = createDirector();
  const base = runInput({ reducedMotion: true });
  const rigidView = rigid(base);
  director.pulse("turbo");
  director.pulse("hit", 1);
  director.pulse("power");
  director.pulse("overtake", 1);
  const view = director.get(base);
  for (const key of ["x", "y", "z", "tx", "ty", "tz", "fov", "roll"]) {
    assert.ok(Math.abs(view[key] - rigidView[key]) < 1e-9, `${key} must stay rigid`);
  }
});

test("countdown slowly orbits the kart, starting exactly on the launch camera", () => {
  const director = createDirector();
  const data = cameraSubject(20);
  const first = director.get({ phase: "grid", ...data });
  assert.deepEqual(
    ["x", "y", "z", "tx", "ty", "tz", "fov", "roll"].map(key => first[key]),
    ["x", "y", "z", "tx", "ty", "tz", "fov", "roll"].map(key => rigid({ phase: "grid", ...data })[key]),
  );
  const angle = view => Math.atan2(view.x - data.pose.x, view.z - data.pose.z);
  const startAngle = angle(first);
  let view = first;
  for (let i = 0; i < 180; i++) view = director.get({ phase: "grid", dt: 1 / 60, ...data });
  assert.ok(Math.abs(angle(view) - startAngle) > 0.5, "three seconds of countdown must orbit visibly");
  assert.ok(Math.hypot(view.x - data.pose.x, view.z - data.pose.z) > 4, "the kart stays framed");
});

test("the camera never feels frozen: a settled shot still breathes", () => {
  const director = createDirector();
  const base = runInput();
  for (let i = 0; i < 180; i++) director.get(base);
  const a = director.get(base);
  const b = director.get(base);
  const sway = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  assert.ok(sway > 0, "consecutive settled frames must differ");
  assert.ok(sway < 0.05, "the sway must stay subtle");
});
