import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { createGLPilots, drawPilot2D, pilotView } from "./pilot.mjs";

const fern = { id: 0, x: 0, y: 0, z: 0, yaw: 0 };
const view = (x, y, z) => ({ x, y, z });

test("Fern uses five directions and a higher rear view, with the visible side mirrored", () => {
  assert.equal(pilotView(fern, view(0, 1, 4)).frame, 0);
  assert.equal(pilotView(fern, view(-3, 1, 3)).frame, 1);
  assert.equal(pilotView(fern, view(-3, 1, 0)).frame, 2);
  assert.equal(pilotView(fern, view(-3, 1, -3)).frame, 3);
  assert.equal(pilotView(fern, view(0, 1, -4)).frame, 4);
  assert.equal(pilotView(fern, view(0, 4, -4)).frame, 5);
  assert.equal(pilotView(fern, view(-3, 1, 1)).flip, false);
  assert.equal(pilotView(fern, view(3, 1, 1)).flip, true);
  assert.equal(pilotView({...fern, yaw: Math.PI / 2}, view(4, 1, 0)).frame, 0);
});

test("every racer ships independent all-direction frames and a valid grounded silhouette", async () => {
  for (let id = 0; id < 6; id++) {
    const rects = new Set();
    for (const angle of [0,.8,1.57,2.35,Math.PI]) {
      const selected = pilotView({...fern, id}, view(Math.sin(angle)*4, 1, Math.cos(angle)*4));
      assert.ok([selected.width,selected.height].every(value => value > 1.4 && value < 3.6));
      rects.add(selected.rect.join(","));
    }
    assert.equal(rects.size, 5);
    const asset = await stat(new URL(`./assets/pilot-${id}.webp`, import.meta.url));
    assert.ok(asset.size > 80_000 && asset.size < 600_000);
  }
});

test("Canvas composition shares the selected asset and retains a wheel contact anchor", () => {
  const calls = [];
  const images = [{ complete: true, naturalWidth: 2048 }];
  const ctx = { scale(...v) { calls.push(v); }, drawImage(...v) { calls.push(v); } };
  assert.ok(drawPilot2D(ctx,images,fern,view(3,1,0),30));
  assert.deepEqual(calls[0],[-1,1]);
  const [image,x,y,w,h,dstX,dstY,dstW,dstH] = calls[1];
  assert.equal(image,images[0]);
  assert.deepEqual([x,y,w,h],pilotView(fern,view(3,1,0)).rect);
  assert.equal(dstX,-dstW/2);
  assert.ok(Math.abs(dstY+dstH)<.5);
  assert.equal(drawPilot2D(ctx,[],fern,view(0,1,4),30),false);
});

test("transient action effects respect motion settings while protection stays legible", () => {
  let rings = 0;
  const ctx = { drawImage() {}, beginPath() {}, ellipse() { rings++; }, stroke() {} };
  const images = [{ complete: true, naturalWidth: 2048 }];
  const camera = view(0, 1, -4);
  drawPilot2D(ctx,images,{...fern,pulse:.55},camera,40,true);
  assert.equal(rings,0);
  drawPilot2D(ctx,images,{...fern,pulse:.55},camera,40);
  assert.equal(rings,1);
  drawPilot2D(ctx,images,{...fern,shield:12},camera,40,true);
  assert.equal(rings,2);
  drawPilot2D(ctx,images,{...fern,ghost:true,shield:12},camera,40);
  assert.equal(rings,2);
});

test("a host without image decoding retains mesh fallback without touching GL", () => {
  const renderer = createGLPilots(new Proxy({}, {
    get() { throw Error("must not allocate GPU resources without image decoding"); },
  }));
  assert.equal(renderer.ready(fern),false);
  assert.equal(renderer.draw(),false);
  renderer.dispose();
});
