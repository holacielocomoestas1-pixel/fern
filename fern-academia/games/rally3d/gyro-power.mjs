// Gyroscope shortcut for the power button: tilt the phone to use a power
// without letting go of the stick. Pure detection logic — the DOM wiring
// (permission, listener, calibration) lives in game.mjs. The detector only
// says "fire now"; it never touches game state, so a missing sensor or a
// denied permission changes nothing: the button keeps working exactly as
// before.
//
// Rest posture is calibrated on the first sample of a race (and again every
// time the stick is grabbed). A fire needs either a tilt of ~26 degrees
// away from that posture, or one sharp flick (>= 240 deg/s). After a fire
// the player has to come back within 12 degrees of rest before it can fire
// again, and at most one power fires per 900 ms.
const DEFAULTS = {
  tiltDegrees: 26,
  jerkDegreesPerSecond: 240,
  rearmDegrees: 12,
  cooldownMs: 900,
};

function angleDelta(a, b) {
  // Shortest signed arc between two orientation angles.
  return ((a - b + 540) % 360) - 180;
}

export function createGyroPower(options = {}) {
  const { tiltDegrees, jerkDegreesPerSecond, rearmDegrees, cooldownMs } = { ...DEFAULTS, ...options };
  let base = null; // { beta, gamma } rest posture
  let last = null; // { beta, gamma, at } previous sample
  let lastFire = -Infinity;
  let armed = true;

  function calibrate(beta, gamma, now = Date.now()) {
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return false;
    base = { beta, gamma };
    // Keep the calibration sample: the very next sample can already measure
    // a flick rate away from the rest posture.
    last = { beta, gamma, at: now };
    armed = true;
    return true;
  }

  function reset() {
    base = null;
    last = null;
    armed = true;
  }

  // Returns true exactly when this sample should fire the power.
  function update(sample, now = Date.now()) {
    const { beta, gamma } = sample || {};
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return false;
    if (!base) {
      calibrate(beta, gamma, now);
      return false;
    }
    const tilt = Math.hypot(angleDelta(beta, base.beta), angleDelta(gamma, base.gamma));
    let jerk = 0;
    if (last) {
      const dt = Math.max(1, now - last.at) / 1000;
      jerk = Math.hypot(angleDelta(beta, last.beta), angleDelta(gamma, last.gamma)) / dt;
    }
    last = { beta, gamma, at: now };
    if (!armed) {
      if (tilt < rearmDegrees) armed = true;
      return false;
    }
    if (tilt < tiltDegrees && jerk < jerkDegreesPerSecond) return false;
    if (now - lastFire < cooldownMs) return false;
    lastFire = now;
    armed = false;
    return true;
  }

  return { calibrate, reset, update, get calibrated() { return base !== null; } };
}
