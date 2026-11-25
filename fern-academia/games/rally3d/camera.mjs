import { viewFor } from "./render-math.mjs";

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
    landmark,
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

// Dolly back only as far as the complete chassis and bonnet need. The angle
// and horizon stay intact when a tall viewport or a camera orbit crowds the kart.
function frameShowpiece(camera, pose, aspect) {
  const view = viewFor(camera, aspect, .1, 400);
  const sin = Math.sin(pose.yaw), cos = Math.cos(pose.yaw);
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const areaX = view.tanHalf * aspect * .94;
  const areaY = view.tanHalf * .89;
  let pullBack = 0;
  for (const x of [-1.16, 1.16]) {
    for (const z of [-1.66, 1.66]) {
      for (const y of [0, 2.04]) {
        const p = [pose.x + x*cos + z*sin - camera.x, pose.y + y - camera.y, pose.z + z*cos - x*sin - camera.z];
        const depth = dot(p, view.forward);
        pullBack = Math.max(pullBack, Math.abs(dot(p, view.right))/areaX-depth, Math.abs(dot(p, view.up))/areaY-depth);
      }
    }
  }
  return {
    ...camera,
    x: camera.x - pullBack * view.forward[0],
    y: camera.y - pullBack * view.forward[1],
    z: camera.z - pullBack * view.forward[2],
  };
}

export function createDirector() {
  let latest = null;
  let previousPhase;
  let previousMode;
  let previousPose;
  // Drone camera: a second-order spring follows the kart instead of a rigid
  // lock, and short-lived impulses move the camera when things happen.
  // Everything here is inert under reduced motion / calm mode.
  let spring = null;
  let swayTime = 0;
  let gridOrbit = 0;
  const impulses = { pull: 0, fov: 0, push: 0, pan: 0, sweep: 0 };

  function reset() {
    latest = null;
    previousPhase = undefined;
    previousMode = undefined;
    previousPose = undefined;
    spring = null;
    swayTime = 0;
    gridOrbit = 0;
    impulses.pull = impulses.fov = impulses.push = impulses.pan = impulses.sweep = 0;
  }

  // Event-driven drone moves. Values are peak offsets; they decay in get().
  // turbo: pull back + FOV punch. hit: quick push-in (the shake itself stays
  // the v8.2 trauma in game.mjs). power: brief pan toward where the power
  // went. overtake: lateral sweep, positive when gaining a position.
  function pulse(kind, value = 1) {
    if (kind === "turbo") { impulses.pull = Math.max(impulses.pull, 2.4); impulses.fov = Math.max(impulses.fov, 4); }
    else if (kind === "hit") { impulses.push = Math.max(impulses.push, 1.3 * clamp(value || 1, 0, 1)); }
    else if (kind === "power") { impulses.pan = 1.6; }
    else if (kind === "overtake") { impulses.sweep = (value >= 0 ? 1 : -1) * 1.0; }
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
    const step = clamp(Number.isFinite(dt) ? dt : 1 / 60, 0, .1);

    // Spring follow: eye, target, fov and roll chase the rigid shot with a
    // visible lag and a small settle overshoot — a drone following the kart,
    // not a camera bolted behind it. A big teleport (or a cut) snaps instead.
    if (phase === "run" && !reducedMotion) {
      const adapt = ["rear", "bumper"].includes(mode) ? 1 : .9;
      const offset = previousPose && Math.hypot(pose.x - previousPose.x, pose.y - previousPose.y, pose.z - previousPose.z) < 13
        ? { x: (pose.x - previousPose.x) * adapt, y: (pose.y - previousPose.y) * adapt, z: (pose.z - previousPose.z) * adapt }
        : null;
      const seed = target => ({ ex: target.x, ey: target.y, ez: target.z, tx: target.tx, ty: target.ty, tz: target.tz,
        fov: target.fov, roll: target.roll || 0, vx: 0, vy: 0, vz: 0, vtx: 0, vty: 0, vtz: 0, vfov: 0, vroll: 0 });
      if (cut || !spring || !offset) {
        // Hard cut, first frame, or a teleport: no lag, the camera is exactly
        // on the rigid shot (this is what keeps the kart framed on big jumps).
        spring = seed(next);
        view = next;
      } else {
        // Feed the kart's own movement forward so the spring only lags the
        // shape changes (curves, speed changes), never the translation.
        spring.ex += offset.x; spring.ey += offset.y; spring.ez += offset.z;
        spring.tx += offset.x; spring.ty += offset.y; spring.tz += offset.z;
        const omega = 5.2, zeta = .72;
        const k = omega * omega, c = 2 * zeta * omega;
        const target = [next.x, next.y, next.z, next.tx, next.ty, next.tz, next.fov, next.roll || 0];
        const pos = ["ex", "ey", "ez", "tx", "ty", "tz", "fov", "roll"];
        const vel = ["vx", "vy", "vz", "vtx", "vty", "vtz", "vfov", "vroll"];
        for (let i = 0; i < 8; i++) {
          spring[vel[i]] += (-k * (spring[pos[i]] - target[i]) - c * spring[vel[i]]) * step;
          spring[pos[i]] += spring[vel[i]] * step;
        }
        view = { ...next, x: spring.ex, y: spring.ey, z: spring.ez, tx: spring.tx, ty: spring.ty, tz: spring.tz, fov: spring.fov, roll: spring.roll };
      }
    }

    // Event impulses decay every frame, whether or not they are applied.
    for (const key of ["pull", "fov", "push", "pan", "sweep"]) {
      impulses[key] *= Math.exp(-step * (key === "push" ? 2.4 : key === "fov" ? 1.8 : key === "pull" ? 1.5 : key === "pan" ? 1.6 : 1.3));
    }
    if (phase === "run" && !reducedMotion) {
      swayTime += step;
      const basis = viewFor(view, aspect, .1, 400);
      // Turbo: pull back + FOV punch. Hit: quick push-in.
      const along = impulses.pull - impulses.push;
      view.x -= basis.forward[0] * along; view.y -= basis.forward[1] * along; view.z -= basis.forward[2] * along;
      view.fov = clamp(view.fov + impulses.fov, 42, 82);
      // Power: brief pan forward toward the effect. Overtake: lateral sweep.
      const yaw = pose.yaw || 0;
      view.tx += Math.sin(yaw) * impulses.pan;
      view.tz += Math.cos(yaw) * impulses.pan;
      view.x += basis.right[0] * impulses.sweep; view.z += basis.right[2] * impulses.sweep;
      // Drift: lean into the curve while the kart is sliding.
      if (player?.drift) {
        const sign = player.driftSign || Math.sign(pose.steer || 0) || 1;
        view.roll = (view.roll || 0) + sign * .028;
        view.tx -= basis.right[0] * sign * .3; view.tz -= basis.right[2] * sign * .3;
      }
      // Constant subtle sway so the camera never feels frozen.
      view.x += basis.right[0] * Math.sin(swayTime * .5) * .05;
      view.y += Math.sin(swayTime * .83 + 1.3) * .035;
      view.z += basis.right[2] * Math.sin(swayTime * .5) * .05;
      view.roll = (view.roll || 0) + Math.sin(swayTime * .4) * .0035;
      // The road ahead and the kart stay visible: keep the eye above the road.
      view.y = Math.max(view.y, cameraFloor(course, player.s, view));
    }
    // Countdown: a slow orbit around the kart while the lights count down.
    // The first grid frame is exactly the rigid launch camera (the intro
    // handoff must not jump); the orbit starts from the second frame on.
    if (phase === "grid" && !reducedMotion) {
      if (previousPhase !== "grid") gridOrbit = 0;
      else {
        gridOrbit += step * .22;
        const dx = view.x - pose.x, dz = view.z - pose.z;
        const cos = Math.cos(gridOrbit), sin = Math.sin(gridOrbit);
        view.x = pose.x + dx * cos - dz * sin;
        view.z = pose.z + dx * sin + dz * cos;
        view.y = Math.max(view.y, cameraFloor(course, player.s, view));
      }
    }

    if (view.shot === "lobby" || view.shot === "hero") {
      view = frameShowpiece(view, pose, aspect);
    } else if (phase === "run" && aspect < .74 && ["chase", "wide"].includes(mode)) {
      view = protectDriver(view, pose, aspect);
    }
    latest = view;
    previousPhase = phase;
    previousMode = mode;
    previousPose = { x: pose.x, y: pose.y, z: pose.z };
    return { ...view, trackDistance: view.trackDistance ?? player.s, cut };
  }

  return { reset, get, pulse };
}
