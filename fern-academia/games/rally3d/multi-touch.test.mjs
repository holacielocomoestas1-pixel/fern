import test from "node:test";
import assert from "node:assert/strict";
import { createTapAction, createPointerOwner } from "./multi-touch.mjs";

const pointerDown = (pointerId, button = 0) => ({
  pointerId, button, prevented: false,
  preventDefault() { this.prevented = true; },
});
const click = detail => ({ detail });

test("tap action fires on pointerdown, not on the click that follows it", () => {
  let fires = 0;
  const tap = createTapAction(() => fires++);
  assert.equal(tap.down(pointerDown(2)), true);
  assert.equal(fires, 1);
  // The tap already fired: the synthesized click (detail 1) must not fire again.
  assert.equal(tap.click(click(1)), false);
  assert.equal(fires, 1);
});

test("tap action keeps click as the keyboard fallback", () => {
  let fires = 0;
  const tap = createTapAction(() => fires++);
  assert.equal(tap.click(click(0)), true);
  assert.equal(fires, 1);
  // A tap followed quickly by Enter must not double-fire.
  const tap2 = createTapAction(() => fires++, { now: () => 1000 });
  assert.equal(tap2.down(pointerDown(3)), true);
  assert.equal(tap2.click(click(0)), false);
  assert.equal(fires, 2);
});

test("tap action ignores non-primary buttons", () => {
  let fires = 0;
  const tap = createTapAction(() => fires++);
  assert.equal(tap.down(pointerDown(2, 2)), false);
  assert.equal(fires, 0);
});

test("pointer owner gives the stick to one finger and only that finger releases it", () => {
  const owner = createPointerOwner();
  assert.equal(owner.held, null);
  assert.equal(owner.claim(1), true);
  assert.equal(owner.claim(2), false);
  assert.equal(owner.owns(1), true);
  assert.equal(owner.owns(2), false);
  assert.equal(owner.release(2), null);
  assert.equal(owner.held, 1);
  assert.equal(owner.release(), 1);
  assert.equal(owner.held, null);
});

test("two simultaneous touches: power fires while the stick stays held", () => {
  let fires = 0;
  const owner = createPointerOwner();
  const tap = createTapAction(() => fires++);
  // First finger grabs the stick.
  assert.equal(owner.claim(1), true);
  // Second finger taps the power button: it must fire at once, without
  // waiting for the stick to be released.
  assert.equal(tap.down(pointerDown(2)), true);
  assert.equal(fires, 1);
  assert.equal(owner.held, 1);
  // Releasing the power finger must not release the steering.
  assert.equal(owner.release(2), null);
  assert.equal(owner.held, 1);
  // The power can be used again while still steering.
  assert.equal(tap.down(pointerDown(2)), true);
  assert.equal(fires, 2);
  // Only the stick finger releases the steering.
  assert.equal(owner.release(1), 1);
  assert.equal(owner.held, null);
});
