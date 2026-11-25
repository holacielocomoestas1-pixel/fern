import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer } from "./renderer.mjs";

function recordingContext() {
  const live = new Set();
  const draws = [];
  let sequence = 0;
  let model;
  let surface;
  let lost = false;
  const allocate = () => {
    const id = ++sequence;
    live.add(id);
    return id;
  };
  const methods = {
    createProgram: allocate, createShader: allocate, createBuffer: allocate,
    deleteProgram: id => live.delete(id), deleteShader: id => live.delete(id), deleteBuffer: id => live.delete(id),
    getParameter: () => 4096, getShaderParameter: () => true, getProgramParameter: () => true,
    getUniformLocation: (_, name) => name, isContextLost: () => lost,
    useProgram: () => { model = undefined; surface = undefined; },
    createTexture: () => { throw Error("Native rendering must not allocate image textures"); },
    uniform1f: (name, value) => { if (name === "uSurface") surface = value; },
    uniformMatrix4fv: (name, _, value) => { if (name === "uModel") model = [...value]; },
    drawArrays: (_, start, count) => draws.push({ count, surface, model }),
  };
  return {
    gl: new Proxy(methods, { get(target, name) { return target[name] ?? (() => {}); } }),
    draws, live, lose() { lost = true; },
  };
}

const material = (surface = "paint") => ({
  positions: new Float32Array([-.5,.1,0, .5,.1,0, 0,.8,0]), surface,
});
const camera = { x: 1.8, y: 2.9, z: -9, tx: 0, ty: 1.1, tz: 0, fov: 58 };
const racer = { id: 0, x: 0, y: 0, z: 0, yaw: 0, s: 0, speed: 13, steer: .48 };

test("WebGL draws native surfaces and steered, rotating independent wheels without images", () => {
  const previousImage = globalThis.Image;
  globalThis.Image = class { constructor() { throw Error("Native rendering must not request image assets"); } };
  const { gl, draws, live } = recordingContext();
  const renderer = createRenderer({ width: 390, height: 844, getContext: () => gl });
  try {
    renderer.setVehicles([{
      body: [material("paint"), material("fur"), material("cloth"), material("metal")],
      wheel: material("rubber"),
      wheelOffsets: [[.8,.32,1.1],[-.8,.32,1.1],[.83,.31,-1.01],[-.83,.31,-1.01]],
    }]);
    renderer.draw({ camera, vehicles: [racer] });
    const body = draws.filter(d => [4,5,6,8].includes(d.surface));
    assert.deepEqual(body.map(d => d.surface), [8,4,5,6]);
    const firstWheels = draws.filter(d => d.surface === 7).slice(0, 4).map(d => d.model);
    assert.ok(firstWheels[0][8] !== firstWheels[2][8]);
    assert.ok(firstWheels[0][12] > .7 && firstWheels[1][12] < -.7);
    draws.length = 0;
    renderer.draw({ camera, time: .016, vehicles: [{ ...racer, s: .23 }] });
    const nextWheels = draws.filter(d => d.surface === 7).slice(0, 4).map(d => d.model);
    assert.notDeepEqual(firstWheels[0].slice(0, 12), nextWheels[0].slice(0, 12));
    assert.deepEqual(firstWheels[0].slice(12), nextWheels[0].slice(12));
  } finally {
    renderer.dispose();
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
  assert.equal(live.size, 0);
});

test("shield and magnet emit geometry during an active frame and the renderer reports context loss", () => {
  const { gl, live, lose } = recordingContext();
  const renderer = createRenderer({ width: 390, height: 844, getContext: () => gl });
  renderer.setVehicles([{ body: [material()] }]);
  renderer.draw({ camera, vehicles: [racer] });
  const normal = renderer.stats.triangles;
  renderer.draw({ camera, time: .14, vehicles: [{ ...racer, shield: 4, magnet: 4 }] });
  assert.ok(renderer.stats.triangles > normal + 100);
  lose();
  assert.equal(renderer.draw({ camera, vehicles: [racer] }), false);
  assert.equal(renderer.stats.contextLost, true);
  renderer.dispose();
  assert.equal(live.size, 0);
});
