import assert from "node:assert/strict";
import test from "node:test";
import { createKarts } from "./karts.mjs";

const karts = createKarts();
const triangles = mesh => mesh.positions.length / 9;
const extent = (values, component) => {
  let low = Infinity, high = -Infinity;
  for (let i = component; i < values.length; i += 3) {
    low = Math.min(low, values[i]);
    high = Math.max(high, values[i]);
  }
  return [low, high];
};

test("six code-only models have complete material and independent wheel streams", () => {
  assert.deepEqual(karts.map(kart => kart.name.en), ["Fern", "Pip", "Ember", "Skye", "Thistle", "Juniper"]);
  for (const kart of karts) {
    assert.deepEqual(kart.body.map(mesh => mesh.surface), ["paint", "metal", "fur", "cloth", "detail", "lights"]);
    assert.equal(kart.wheel.surface, "rubber");
    assert.equal(kart.wheelOffsets.length, 4);
    assert.ok(kart.wheelOffsets[0][2] < 0 && kart.wheelOffsets[2][2] > 0);
    assert.ok(kart.body.at(-1).emissive > .4);
    let total = triangles(kart.wheel) * kart.wheelOffsets.length;
    for (const mesh of [...kart.body, kart.wheel]) {
      assert.ok(Number.isInteger(triangles(mesh)) && triangles(mesh) > 100);
      assert.equal(mesh.positions.length, mesh.colors.length);
      assert.equal(mesh.positions.length, mesh.normals.length);
      assert.ok(mesh.positions.every(Number.isFinite));
      assert.ok(mesh.colors.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 1));
      for (let i = 0; i < mesh.normals.length; i += 3) {
        const size = Math.hypot(mesh.normals[i], mesh.normals[i+1], mesh.normals[i+2]);
        assert.ok(Math.abs(size-1) < .011, `unit material normal in ${kart.name.en} ${mesh.surface}`);
      }
      if (mesh !== kart.wheel) total += triangles(mesh);
    }
    assert.ok(total < 19_000, `${kart.name.en} triangle budget: ${total}`);
  }
});

test("driver and chassis dimensions remain within camera framing, and Fern's bonnet is genuine geometry", () => {
  const fern = karts[0];
  const fabric = fern.body.find(mesh => mesh.surface === "cloth");
  const [bottom, top] = extent(fabric.positions, 1);
  const [stern, hood] = extent(fabric.positions, 2);
  assert.ok(bottom < 1 && top > 2);
  assert.ok(stern < -.85 && hood > -.065);
  for (const kart of karts) {
    for (const part of kart.body) {
      const [left,right] = extent(part.positions,0);
      const [base,peak] = extent(part.positions,1);
      const [rear,front] = extent(part.positions,2);
      assert.ok(left > -1.19 && right < 1.19);
      assert.ok(base > .11 && peak < 2.38);
      assert.ok(rear > -1.64 && front < 1.64);
    }
  }
  assert.deepEqual(createKarts()[0].body[3].positions, fabric.positions);
});
