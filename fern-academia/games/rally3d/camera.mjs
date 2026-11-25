export const INTRO_SECONDS = 7.25;
export const FINISH_SECONDS = 3.6;

const PI = Math.PI;
const LANDMARK_PASS = 2.05;
const HERO_CUT = 3.66;
const GRID_REVEAL = 5.20;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

function trackBasis(course, s) {
  const frame = course.frame(s);
  const magnitude = Math.hypot(frame.dx, frame.dz) || 1;
  return { ...frame, dx: frame.dx / magnitude, dz: frame.dz / magnitude };
}

function onTrack(frame, right, height) {
  return {
    x: frame.x + frame.dz * right,
    y: frame.y + Math.tan(frame.bank || 0) * right + height,
    z: frame.z - frame.dx * right,
  };
}

function relative(pose, forward, right, up, basis = pose.yaw) {
  const dx = Math.sin(basis);
  const dz = Math.cos(basis);
  return { x: pose.x + dx * forward + dz * right, y: pose.y + up, z: pose.z + dz * forward - dx * right };
}

function shot(position, target, fov, name, roll = 0) {
  return { ...position, tx: target.x, ty: target.y, tz: target.z, fov, roll, shot: name };
}

function chase(course, player, pose, mode, reduced, time, aspect) {
  const position = trackBasis(course, player.s);
  const heading = Math.atan2(position.dx, position.dz);
  const speed = clamp(player.speed || pose.speed || 0, 0, 46);
  const boost = !reduced && (player.boost || pose.boost) > 0;
  const offset = player.offset || 0;
  const steering = pose.steer || 0;
  const limit = Math.max(2, (course.halfWidth || 6) - 1.2);
  const portrait = clamp((.92 - aspect) * 2.35, 0, 1);

  if (mode === "bumper") {
    const front = trackBasis(course, player.s + .85);
    const look = trackBasis(course, player.s + 14 + speed * .13);
    const eye = onTrack(front, offset, .95);
    const target = onTrack(look, offset * .45, 1.3);
    return shot(eye, target, (boost ? 74 : 68) + 8 * portrait, "bumper", reduced ? 0 : steering * .015);
  }
  if (mode === "rear") {
    const front = trackBasis(course, player.s + 3.3);
    const behind = trackBasis(course, player.s - 14);
    const eye = onTrack(front, clamp(offset * .7, -limit, limit), 2.55);
    return shot(eye, onTrack(behind, offset * .5, .85), 63 + 11 * portrait, "rear");
  }

  const wide = mode === "wide";
  const distance = (wide ? 10.2 : 6.5) + speed * (reduced ? .01 : .023) + portrait * 1.05;
  const before = trackBasis(course, player.s - distance);
  const forward = trackBasis(course, player.s + (wide ? 13 : 10) + speed * .09);
  const fast = !reduced && speed > 34;
  const vibration = (boost || fast) && mode !== "wide" ? (boost ? .018 : .010) * Math.sin(time * 40) : 0;
  const lateral = clamp(offset * .8 - steering * .28 + vibration, -limit, limit);
  const eye = onTrack(before, lateral, (wide ? 4.9 : 3.18) + speed * .01);
  const target = onTrack(forward, offset * .62, wide ? .50 : .85);
  const aligned = relative(pose, 6, 0, 1.04, heading);
  const lookBias = .66 - .28 * portrait;
  target.x = mix(aligned.x, target.x, lookBias);
  target.z = mix(aligned.z, target.z, lookBias);
  target.y = mix(aligned.y, target.y, .68);
  const roll = reduced ? 0 : clamp((pose.roll || 0) * .14 + steering * .01 + (position.bank || 0) * .07, -.048, .048);
  const base = (wide ? 61 : 57) + (boost ? 6 : 0) + (reduced ? 0 : Math.min(4, speed * .09)) + 11 * portrait;
  const widthFloor = 2 * Math.atan(.38 / Math.max(.35, aspect)) * 180 / PI;
  const fov = Math.max(base, widthFloor);
  if (portrait > 0) {
    const targetAngle = Math.atan2(target.x - eye.x, target.z - eye.z);
    const driverAngle = Math.atan2(pose.x - eye.x, pose.z - eye.z);
    const difference = Math.atan2(Math.sin(targetAngle - driverAngle), Math.cos(targetAngle - driverAngle));
    const bound = Math.atan(Math.tan(fov * PI / 360) * aspect * (.20 + (1 - portrait) * .30));
    const angle = driverAngle + clamp(difference, -bound, bound);
    const reach = Math.hypot(target.x - eye.x, target.z - eye.z);
    target.x = eye.x + Math.sin(angle) * reach;
    target.z = eye.z + Math.cos(angle) * reach;
  }
  return shot(eye, target, fov, wide ? "wide" : "chase", roll);
}

function blend(a, b, t, name) {
  return {
    x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), z: mix(a.z, b.z, t),
    tx: mix(a.tx, b.tx, t), ty: mix(a.ty, b.ty, t), tz: mix(a.tz, b.tz, t),
    fov: mix(a.fov, b.fov, t), roll: mix(a.roll || 0, b.roll || 0, t), shot: name,
  };
}

function cameraFloor(course, s, camera) {
  const frame = trackBasis(course, s);
  const offset = (camera.x - frame.x) * frame.dz - (camera.z - frame.z) * frame.dx;
  const road = frame.y + Math.tan(frame.bank || 0) * offset;
  return road + .65;
}

const scenicOrder = {
  moss: [2, 0], lantern: [1, 2], river: [2, 0], mangrove: [2, 1],
  quarry: [1, 0], orchard: [2, 1], glacier: [1, 2], caldera: [1, 0],
  citadel: [2, 1], aurora: [2, 1],
};

function landscapeShot(course, time, aspect, close) {
  const index = (scenicOrder[course.id] || [1, 0])[Number(close)];
  const landmark = course.landmarks?.[index];
  const location = course.length * (landmark?.fraction ?? .14);
  const normal = index % 2 ? -1 : 1;
  const place = normal * (course.halfWidth + 10 + 1.5 * index);
  const portrait = clamp((.92 - aspect) * 2.35, 0, 1);
  const t = ease(close ? (time - LANDMARK_PASS) / (HERO_CUT - LANDMARK_PASS) : time / LANDMARK_PASS);
  const distance = location + (close ? mix(-29, -7, t) : mix(-44, -15, t));
  const start = trackBasis(course, distance);
  const focus = trackBasis(course, location + (close ? mix(-4, 8, t) : mix(5, 21, t)));
  const eye = close
    ? onTrack(start, -normal * mix(9, 4, t), mix(6.5, 4.2, t))
    : onTrack(start, normal * mix(4, -7, t), mix(25, 16, t));
  const towardsSubject = place * (close ? .84 : .53);
  const target = onTrack(focus, towardsSubject, close ? 3.4 : 3.8);
  const title = close ? "landmark-pass" : "flyover";
  return {
    ...shot(eye, target, (close ? 55 : 52) + 14 * portrait, title, normal * mix(.045, .008, t)),
    trackDistance: distance,
  };
}

// Following a tight corner can move the point of aim off-center in a portrait
// viewport. Limit the look-ahead after smoothing, when the rendered kart exists.
function protectDriver(view, pose, aspect) {
  const dx = view.tx - view.x;
  const dz = view.tz - view.z;
  const heading = Math.atan2(dx, dz);
  const towardsDriver = Math.atan2(pose.x - view.x, pose.z - view.z);
  const delta = Math.atan2(Math.sin(heading - towardsDriver), Math.cos(heading - towardsDriver));
  const width = Math.tan(view.fov * PI / 360) * aspect;
  const bound = Math.atan(width * .24);
  const constrained = towardsDriver + clamp(delta, -bound, bound);
  const distance = Math.hypot(dx, dz);
  return { ...view, tx: view.x + Math.sin(constrained) * distance, tz: view.z + Math.cos(constrained) * distance };
}

export function createDirector() {
  let latest = null;
  let previousPhase;
  let previousMode;
  let previousPose;

  function reset() {
    latest = null;
    previousPhase = undefined;
    previousMode = undefined;
    previousPose = undefined;
  }

  function get({ phase, elapsed = 0, course, player, pose, mode = "chase", reducedMotion = false, dt = 1 / 60, aspect = 16 / 9, orbit = 0 }) {
    const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    const portrait = clamp((.92 - aspect) * 2.35, 0, 1);
    const grid = () => chase(course, player, pose, "chase", true, time, aspect);
    let next;
    if (phase === "menu") {
      const angle = .60 - .10 * portrait + orbit;
      const distance = 5.50 + .78 * portrait;
      const eye = relative(pose, Math.cos(angle) * distance, Math.sin(angle) * distance, 2.52);
      eye.y = Math.max(eye.y, cameraFloor(course, player.s, eye));
      const target = relative(pose, 0, -.05, 1.23 - 1.42 * portrait);
      const across = clamp((aspect - .98) * 2.44, 0, 2.25);
      const x = target.x - eye.x;
      const z = target.z - eye.z;
      const lateral = Math.hypot(x, z) || 1;
      target.x -= z * across / lateral;
      target.z += x * across / lateral;
      next = shot(eye, target, 45 + 17 * portrait, "lobby");
    } else if (phase === "intro" && !reducedMotion) {
      if (time < HERO_CUT) {
        next = landscapeShot(course, time, aspect, time >= LANDMARK_PASS);
      } else if (time < GRID_REVEAL) {
        const t = ease((time - HERO_CUT) / (GRID_REVEAL - HERO_CUT));
        const angle = mix(.52, .95, t);
        const distance = mix(4.75, 4.20, t);
        const eye = relative(pose, Math.cos(angle) * distance, Math.sin(angle) * distance, mix(1.08, 1.48, t));
        eye.y = Math.max(eye.y, cameraFloor(course, player.s, eye));
        next = shot(eye, relative(pose, -.23, 0, 1.04), mix(46, 50, t) + 17 * portrait, "hero", mix(-.027, .008, t));
      } else {
        const t = ease((time - GRID_REVEAL) / (INTRO_SECONDS - GRID_REVEAL));
        const frame = trackBasis(course, player.s - 13.5);
        const target = trackBasis(course, player.s + 13);
        const high = shot(onTrack(frame, -2.9, 7.2), onTrack(target, .1, .6), 52 + 10 * portrait, "grid-reveal", -.045);
        next = blend(high, grid(), t, "grid-reveal");
      }
    } else if (phase === "grid" || phase === "intro") {
      next = { ...grid(), shot: "grid" };
    } else if (phase === "finish" && !reducedMotion) {
      const t = ease(time / FINISH_SECONDS);
      const moving = relative(pose, mix(-6.6, 3.4, t), mix(-1.9, -4.25, t), mix(3.45, 2.55, t));
      moving.y = Math.max(moving.y, cameraFloor(course, player.s, moving));
      next = shot(moving, relative(pose, mix(2.35, 0, t), 0, mix(1.05, 1.27, t)), mix(56, 45, t) + 14 * portrait, "finish-orbit", mix(.035, -.025, t));
    } else {
      next = chase(course, player, pose, mode, reducedMotion, time, aspect);
    }

    const cinematicShot = phase === "intro" || phase === "menu" || phase === "finish";
    const changedMode = phase === "run" && mode !== previousMode;
    const changedShot = next.shot !== latest?.shot;
    const cut = !latest || (cinematicShot && changedShot) || (changedMode && previousPhase === "run" && (mode === "rear" || mode === "bumper" || previousMode === "rear" || previousMode === "bumper"));
    let view = next;

    if (!cut && phase === "run" && (previousPhase === "run" || previousPhase === "grid") && latest) {
      const step = clamp(Number.isFinite(dt) ? dt : 1 / 60, 0, .1);
      const alpha = 1 - Math.exp(-step * (reducedMotion ? 15 : 8.5));
      const adapt = ["rear", "bumper"].includes(mode) ? 1 : .9;
      const offset = previousPose && Math.hypot(pose.x - previousPose.x, pose.y - previousPose.y, pose.z - previousPose.z) < 13
        ? { x: (pose.x - previousPose.x) * adapt, y: (pose.y - previousPose.y) * adapt, z: (pose.z - previousPose.z) * adapt }
        : null;

      if (!offset) {
        view = next;
      } else {
        const ext = {
          ...latest,
          x: latest.x + offset.x, y: latest.y + offset.y, z: latest.z + offset.z,
          tx: latest.tx + offset.x, ty: latest.ty + offset.y, tz: latest.tz + offset.z,
        };
        view = blend(ext, next, alpha, next.shot);
        view.fov = mix(latest.fov, next.fov, 1 - Math.exp(-step * 5.5));
      }
    }

    if (phase === "run" && aspect < .74 && ["chase", "wide"].includes(mode)) {
      view = protectDriver(view, pose, aspect);
    }
    latest = view;
    previousPhase = phase;
    previousMode = mode;
    previousPose = { x: pose.x, y: pose.y, z: pose.z };
    return { ...view, trackDistance: view.trackDistance ?? player.s, cut };
  }

  return { reset, get };
}
