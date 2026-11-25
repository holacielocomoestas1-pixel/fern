import assert from "node:assert/strict";
import test from "node:test";
import { auroraBand, ridgeColor, ridgeElevation } from "./atmosphere.mjs";
import { COURSES } from "./courses.mjs";
import { hazardOffset } from "./powers.mjs";
import { createWorld, forVisibleFixtures } from "./world.mjs";
import { warningMarks } from "./world-track.mjs";

test("all circuits have bounded physical scenery, a Fern identity and dedicated procedural horizons", () => {
  const horizons = new Set();
  for (const course of COURSES) {
    const world = createWorld(course);
    assert.equal(world.palette.sign, course.name.en.toUpperCase());
    assert.match(world.palette.sign, /^FERN /);
    const { horizon } = world.environment;
    assert.ok(!("panorama" in world));
    horizons.add(horizon.seed);
    for (let layer = 0; layer < 4; layer++) {
      const samples = Array.from({length: 48}, (_, i) => ridgeElevation(2 * Math.PI * i/48, layer, horizon));
      assert.ok(samples.every(x => Number.isFinite(x) && x > -.18 && x <= .32));
      assert.ok(Math.max(...samples) - Math.min(...samples) >= .027);
      assert.ok(Math.abs(ridgeElevation(-Math.PI, layer, horizon) - ridgeElevation(Math.PI, layer, horizon)) < 1e-11);
      assert.ok(ridgeColor(layer,world.environment).every(x => x >= 0 && x <= 1));
    }
    assert.equal(auroraBand(.84, .7, horizon).strength > 0, course.id === "aurora");
    assert.ok(world.props.length > 100 && world.props.length < 1100);
    assert.equal(world.marks.length, course.landmarks.length);
    assert.ok(warningMarks(course).length > course.hazards.length);
    const triangles = world.meshes.reduce((n, mesh) => n + mesh.positions.length / 9, 0);
    assert.ok(triangles >= 80_000 && triangles <= 275_000, course.id + " " + triangles);
    assert.ok(world.meshes.some(mesh => mesh.surface === "stone"));
    assert.equal(world.meshes.some(mesh => mesh.surface === "foliage"), course.id !== "caldera");
    assert.ok(world.meshes.every(mesh =>
      mesh.bounds?.center.every(Number.isFinite) && mesh.bounds.radius < 145));
  }
  assert.equal(horizons.size, COURSES.length);
});

test("the lean CPU world preserves scenery placements without allocating GPU geometry", () => {
  const course = COURSES[5];
  const terrainOnly = createWorld(course, {staticMeshes: false});
  const full = createWorld(course);
  assert.deepEqual(terrainOnly.props,full.props);
  assert.deepEqual(terrainOnly.environment,full.environment);
  assert.deepEqual(terrainOnly.marks,full.marks);
  assert.equal(terrainOnly.meshes.length,0);
});

test("both renderers receive the same moving trap as physics and collected power boxes respawn next lap", () => {
  const course = COURSES[0];
  const world = createWorld(course, { staticMeshes: false });
  const sweeper = course.hazards.find(trap => trap.kind === "sweeper");
  const f = course.frame(sweeper.s);
  for (const clock of [0, .61, 1.2, 2.05]) {
    let detected = false;
    forVisibleFixtures(world, f, 19, { raceTime: clock }, (kind, center, _yaw, _sx, _sy, _sz, frame) => {
      if (kind !== "sweeper" || frame.x !== f.x || frame.z !== f.z) return;
      detected = true;
      assert.ok(Math.abs((center[0] - f.x) * f.rx + (center[2] - f.z) * f.rz -
        hazardOffset(course, sweeper, clock)) < 1e-6);
    });
    assert.ok(detected);
  }
  const startingBox = world.items[0];
  const near = startingBox.frame;
  const boxes = (lap, enabled) => {
    let total = 0;
    forVisibleFixtures(world, near, 0, { lap, itemsEnabled: enabled, collectedItems: new Set([startingBox.item.id]) },
      kind => { total += Number(kind === "item"); });
    return total;
  };
  assert.ok(boxes(0, true) >= 2);
  assert.equal(boxes(1, true), boxes(0, true) + 1);
  assert.equal(boxes(1, false), 0);
});
