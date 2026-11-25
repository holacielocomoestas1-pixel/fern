import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { COURSES } from "./courses.mjs";
import { hazardOffset } from "./powers.mjs";
import { assetURL, createWorld, forVisibleFixtures } from "./world.mjs";
import { warningMarks } from "./world-track.mjs";

test("all photographed circuits have bounded terrain, an in-world Fern identity and a dedicated horizon", () => {
  const horizons = new Set();
  for (const course of COURSES) {
    const world = createWorld(course);
    assert.equal(world.palette.sign, course.name.en.toUpperCase());
    assert.match(world.palette.sign, /^FERN /);
    assert.ok(existsSync(new URL(world.panorama)), world.panorama);
    horizons.add(world.panorama);
    assert.ok(world.props.length > 100 && world.props.length < 1100);
    assert.equal(world.marks.length, course.landmarks.length);
    assert.ok(warningMarks(course).length > course.hazards.length);
    const triangles = world.meshes.reduce((n, mesh) => n + mesh.positions.length / 9, 0);
    assert.ok(triangles >= 12_000 && triangles <= 78_000, course.id + " " + triangles);
    assert.ok(world.meshes.every(mesh =>
      mesh.bounds?.center.every(Number.isFinite) && mesh.bounds.radius < 145));
  }
  assert.equal(horizons.size, COURSES.length);
  for (const prop of ["pine", "blossom", "palm", "crag"])
    assert.ok(existsSync(new URL(assetURL("prop-" + prop))), prop);
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
