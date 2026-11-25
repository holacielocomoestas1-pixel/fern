import test from "node:test";
import assert from "node:assert/strict";
import { createGamepad } from "./gamepad.mjs";

test("standard controller reports each face action once, including across pause and reconnect", () => {
  const device = { index: 3, connected: true, mapping: "standard", axes: [.55, 0], buttons: Array(17).fill(0) };
  let list = [null, device];
  const pad = createGamepad(() => list);
  assert.ok(pad.read().steer > .4);
  device.buttons[0] = 1;
  assert.deepEqual([...pad.read().pressed], ["item"]);
  assert.equal(pad.read().pressed.size, 0);
  assert.ok(pad.read().held.has("item"));
  device.buttons[2] = 1;
  pad.suppress();
  assert.equal(pad.read().pressed.size, 0);
  device.buttons[2] = 0;
  pad.read();
  device.buttons[2] = 1;
  assert.ok(pad.read().pressed.has("hop"));
  list = [];
  assert.equal(pad.read().connected, false);
  list = [device];
  assert.equal(pad.read().pressed.size, 0);
});

test("analog brake, steering dead zone, rear and digital navigation work on physical positions", () => {
  const buttons = Array(17).fill(0);
  const pad = createGamepad(() => [{ index: 0, mapping: "standard", axes: [-.1], buttons }]);
  assert.equal(pad.read().steer, 0);
  buttons[4] = { pressed: true };
  buttons[6] = { value: .45 };
  buttons[7] = .8;
  buttons[14] = 1;
  const frame = pad.read();
  assert.equal(frame.steer, -1);
  assert.equal(frame.brake, .45);
  assert.ok(frame.drift && frame.rear);
  assert.equal(createGamepad(() => { throw Error("iframe policy"); }).read().connected, false);
});
