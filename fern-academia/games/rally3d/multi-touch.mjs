// Multi-touch input for the race controls.
//
// Two facts about mobile browsers make plain `click` unreliable for the
// in-race action buttons (power, quiz, camera, pause):
//  - a second finger down while the stick is held is a pinch-gesture
//    candidate, so the tap often never produces a `click` at all;
//  - the stick already owns its own pointer, and the power button used to
//    listen only to that synthesized `click`.
// The hold buttons (brake / hop / drift / turbo) never had this problem:
// they answer `pointerdown` directly, one event per finger, per pointer.
// Action buttons now do the same: they fire on `pointerdown`, and `click`
// stays only as the keyboard fallback (keyboard clicks arrive with
// detail 0 and no pointerdown before them).

export function createTapAction(fire, { cooldownMs = 700, now = () => Date.now() } = {}) {
  let lastPointerFire = 0;
  return {
    // Fire at once on pointerdown, and cancel the compatibility mouse events
    // so the same tap cannot fire a second time through `click`.
    down(event) {
      if (event.button !== undefined && event.button !== 0) return false;
      event.preventDefault?.();
      lastPointerFire = now();
      fire();
      return true;
    },
    // Click fallback: only keyboard activation (detail 0), and never within
    // the cooldown after a pointer fire (a tap followed quickly by Enter).
    click(event) {
      if (event.detail !== 0) return false;
      if (now() - lastPointerFire < cooldownMs) return false;
      fire();
      return true;
    },
  };
}

// One pointer owns the stick; every other finger keeps its own button.
// Releasing a button's pointer must never release the steering.
export function createPointerOwner() {
  let held = null;
  return {
    get held() { return held; },
    claim(id) {
      if (held !== null) return false;
      held = id;
      return true;
    },
    owns(id) { return held !== null && held === id; },
    release(id) {
      if (id !== undefined && held !== id) return null;
      const was = held;
      held = null;
      return was;
    },
  };
}
