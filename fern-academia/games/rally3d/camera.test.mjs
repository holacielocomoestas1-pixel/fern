import assert from "node:assert/strict";
import test from "node:test";
import { createDirector, INTRO_SECONDS, FINISH_SECONDS } from "./camera.mjs";
import { geometry, cameraSubject } from "./camera-fixture.mjs";
import { COURSES, createRace, pose as toPose } from "./model.mjs";
import { viewFor } from "./render-math.mjs";

const vectorKeys = ["x", "y", "z", "tx", "ty", "tz", "fov", "roll"];
function sane(view) {
  assert.ok(vectorKeys.every(key => Number.isFinite(view[key])));
  assert.ok(view.fov >= 42 && view.fov <= 82);
  assert.ok(Math.hypot(view.x - view.tx, view.y - view.ty, view.z - view.tz) > 1);
}

test("cinematic has four distinct cuts and lands exactly on the launch camera", () => {
  const camera = createDirector();
  const data = cameraSubject(-4);
  let view = camera.get({ phase: "intro", elapsed: 0, ...data });
  assert.equal(view.shot, "flyover");
  assert.equal(view.cut, true);
  assert.equal(camera.get({ phase: "intro", elapsed: 1, ...data }).cut, false);
  view = camera.get({ phase: "intro", elapsed: 2.06, ...data });
  assert.equal(view.shot, "landmark-pass");
  assert.equal(view.cut, true);
  view = camera.get({ phase: "intro", elapsed: 3.67, ...data });
  assert.equal(view.shot, "hero");
  assert.equal(view.cut, true);
  assert.equal(camera.get({ phase: "intro", elapsed: 5.21, ...data }).shot, "grid-reveal");
  const settle = camera.get({ phase: "intro", elapsed: INTRO_SECONDS, ...data });
  const launch = camera.get({ phase: "grid", ...data });
  for (const key of vectorKeys) assert.ok(Math.abs(settle[key] - launch[key]) < 1e-6, key);
  const finish = camera.get({ phase: "finish", elapsed: FINISH_SECONDS, ...data });
  assert.equal(finish.shot, "finish-orbit");
  sane(finish);
});

test("all ten introductions establish two physical landmarks before the kart close-up and grid", () => {
  for (const course of COURSES) {
    const director = createDirector();
    const { player } = createRace(course);
    const entry = { phase: "intro", course, player, pose: toPose(course, player), aspect: 390 / 844 };
    const opening = director.get({ ...entry, elapsed: 1.4 });
    const nearPass = director.get({ ...entry, elapsed: 2.9 });
    const hero = director.get({ ...entry, elapsed: 4.3 });
    const reveal = director.get({ ...entry, elapsed: 5.3 });
    assert.deepEqual([opening.shot, nearPass.shot, hero.shot, reveal.shot], ["flyover", "landmark-pass", "hero", "grid-reveal"]);
    for (const view of [opening, nearPass, hero, reveal]) sane(view);
    for (const view of [opening, nearPass]) {
      assert.ok(course.landmarks.some(mark => Math.abs(view.trackDistance - mark.fraction * course.length) < 43));
      assert.ok(view.y > course.frame(view.trackDistance).y + 3.6);
    }
    assert.ok(Math.abs(opening.trackDistance - nearPass.trackDistance) > 340);
    assert.equal(hero.trackDistance, player.s);
    const settled = director.get({ ...entry, elapsed: INTRO_SECONDS });
    const grid = director.get({ ...entry, phase: "grid" });
    for (const key of vectorKeys) assert.ok(Math.abs(settled[key] - grid[key]) < 1e-6, course.id + key);
  }
});

test("portrait viewport centers the whole kart on both chase cameras across hard bends and elevation changes", () => {
  const aspect = 390 / 844;
  const dot = (a, b) => a.reduce((total, value, i) => total + value * b[i], 0);
  for (const course of COURSES) {
    for (const mode of ["chase", "wide"]) {
      const director = createDirector();
      const { player } = createRace(course);
      for (let i = 0; i <= 176; i++) {
        player.s = course.length * i / 176;
        player.speed = 28 + 7 * Math.cos(i * .17);
        player.offset = Math.sin(i * .21) * course.halfWidth * .92;
        player.yawOffset = Math.sin(i * .21) * .30;
        player.boost = i % 37 < 9 ? 1 : 0;
        const pose = toPose(course, player);
        const camera = director.get({ phase: "run", course, player, pose, mode, aspect });
        const { right, up, forward, tanHalf } = viewFor(camera, aspect, .09, 600);
        // Conservative chassis radius and pilot height, rather than the origin only.
        for (const x of [-1.30, 1.30]) {
          for (const z of [-1.7, 1.7]) {
            for (const y of [.10, 1.96]) {
              const local = [pose.x + x * Math.cos(pose.yaw) + z * Math.sin(pose.yaw) - camera.x,
                pose.y + y - camera.y, pose.z + z * Math.cos(pose.yaw) - x * Math.sin(pose.yaw) - camera.z];
              const depth = dot(local, forward);
              assert.ok(depth > 1, course.id + " " + i);
              const horizontal = dot(local, right) / (depth * tanHalf * aspect);
              const vertical = dot(local, up) / (depth * tanHalf);
              assert.ok(Math.abs(horizontal) < .98, course.id + " " + mode + " " + i + " " + horizontal);
              assert.ok(Math.abs(vertical) < .98, course.id + " " + mode + " " + i + " " + vertical);
            }
          }
        }
      }
    }
  }
});

test("playable views have distinct clear positions and aim directions", () => {
  const data = cameraSubject(50);
  const views = {};
  for (const mode of ["chase", "wide", "bumper", "rear"]) {
    views[mode] = createDirector().get({ phase: "run", mode, ...data });
    sane(views[mode]);
    assert.equal(views[mode].shot, mode);
  }
  assert.ok(views.wide.y > views.chase.y + 1.2);
  assert.ok(views.bumper.y < views.chase.y - 1);
  const forward = geometry.frame(data.player.s);
  const viewDot = view => (view.tx - view.x) * forward.dx + (view.tz - view.z) * forward.dz;
  assert.ok(viewDot(views.chase) > 8);
  assert.ok(viewDot(views.rear) < -8);
  const director = createDirector();
  director.get({ phase: "run", ...data });
  assert.ok(director.get({ phase: "run", mode: "rear", ...data }).cut);
});

test("reduced motion keeps the launch composition and disables tilt and boost zoom", () => {
  const camera = createDirector();
  const data = cameraSubject(20, 37, 1.6, 2);
  const sample = camera.get({ phase: "intro", elapsed: 2.3, ...data, reducedMotion: true });
  assert.equal(sample.shot, "grid");
  assert.equal(sample.roll, 0);
  const live = camera.get({ phase: "run", ...data, reducedMotion: true });
  assert.equal(live.fov, 57);
  assert.equal(live.roll, 0);
  const finish = camera.get({ phase: "finish", ...data, reducedMotion: true });
  assert.equal(finish.shot, "chase");
  sane(finish);
});

test("chase stays continuous on curves, banks, wraparound and an irregular frame clock", () => {
  const camera = createDirector();
  let latest;
  let meters = -12;
  let largest = 0;
  for (let i = 0; i < 2500; i++) {
    const dt = [1 / 60, 1 / 120, 1 / 39, 1 / 90][i % 4];
    const speed = 25 + 7 * Math.sin(i * .027);
    meters += dt * speed;
    const subject = cameraSubject(meters, speed, 3.2 * Math.sin(i * .017), i % 100 < 32 ? .8 : 0);
    const view = camera.get({ phase: "run", elapsed: i * dt, ...subject, dt });
    sane(view);
    if (latest) largest = Math.max(largest, Math.hypot(view.x - latest.x, view.y - latest.y, view.z - latest.z));
    const distance = Math.hypot(view.x - subject.pose.x, view.y - subject.pose.y, view.z - subject.pose.z);
    assert.ok(distance > 4.8 && distance < 12.8, distance);
    latest = view;
  }
  assert.ok(meters > geometry.length);
  assert.ok(largest < 2, largest);
  camera.reset();
  assert.equal(camera.get({ phase: "menu", ...cameraSubject(0) }).cut, true);
});
