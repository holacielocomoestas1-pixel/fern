import test from "node:test";
import assert from "node:assert/strict";
import { COURSES } from "./courses.mjs";
import { profile, ghostAt } from "./profile.mjs";

const storage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test("tour keeps previous controls and sound, with a separate record book for the longer roads", () => {
  const oldData = JSON.stringify({
    settings: { sound: false, motion: "calm", difficulty: "pro" },
    records: { "moss-trial": { time: 35, rank: null } },
    ghosts: { moss: [[0, 1, 2, 3, 0, 0], [35, 1, 2, 4, 0, 25]] },
  });
  const db = storage({ "fern-rally-3d-v1": oldData });
  const p = profile(db);
  assert.deepEqual(p.settings(), { sound: false, motion: "calm", difficulty: "pro", quality: "auto", camera: "chase" });
  assert.equal(p.best("moss", "trial"), undefined);
  assert.equal(p.ghost("moss"), null);
  p.setSetting("sound", true);
  assert.equal(db.getItem("fern-rally-3d-v1"), oldData);
  assert.equal(profile(db).settings().sound, true);
});

test("camera view defaults to chase, keeps valid values and drops invalid ones", () => {
  const db = storage();
  const p = profile(db);
  assert.equal(p.settings().camera, "chase");
  p.setSetting("camera", "bumper");
  assert.equal(profile(db).settings().camera, "bumper");
  p.setSetting("camera", "orbit");
  assert.equal(profile(db).settings().camera, "bumper");
});

test("visual quality defaults to auto, keeps valid values and drops invalid ones", () => {
  const db = storage();
  const p = profile(db);
  assert.equal(p.settings().quality, "auto");
  p.setSetting("quality", "high");
  assert.equal(profile(db).settings().quality, "high");
  p.setSetting("quality", "low");
  assert.equal(profile(db).settings().quality, "low");
  p.setSetting("quality", "ultra");
  assert.equal(profile(db).settings().quality, "low");
  const dirty = storage({ "fern-rally-touring-v2": JSON.stringify({ settings: { quality: "potato" } }) });
  assert.equal(profile(dirty).settings().quality, "auto");
});

test("all ten time trials persist independent bests and ghosts and merge writes from other instances", () => {
  const db = storage();
  const a = profile(db);
  const b = profile(db);
  for (const [index, course] of COURSES.entries()) {
    const duration = 300 + index;
    const frames = [[0, 0, 0, 0, 3.12, 0], [duration, 100, 0, 100, -3.12, 26]];
    assert.ok(a.save(course.id, "trial", { duration }, frames));
    assert.equal(b.save(course.id, "trial", { duration: duration + 1 }, []), false);
    const saved = profile(db);
    assert.equal(saved.best(course.id, "trial").time, duration);
    assert.ok(Math.abs(ghostAt(saved.ghost(course.id), duration / 2).yaw) > 3.12);
  }
  assert.doesNotThrow(() => profile({ getItem() { throw Error(); }, setItem() { throw Error(); } }).setSetting("motion", "calm"));
});
