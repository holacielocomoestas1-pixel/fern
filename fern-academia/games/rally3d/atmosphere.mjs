import { blend, clamp, mix, tint } from "./world-geometry.mjs";

const profiles = {
  moss: [.171, .46, .91, 0, 1.12],
  lantern: [.196, .51, .76, 0, 2.87],
  river: [.207, .93, .14, 0, 4.13],
  mangrove: [.085, .32, .92, 0, 5.82],
  quarry: [.133, .84, .055, 0, 6.23],
  orchard: [.151, .40, .62, 0, 8.43],
  glacier: [.229, .96, 0, 0, 9.15],
  caldera: [.184, .79, .016, 0, 11.80],
  citadel: [.213, .61, .58, 0, 13.46],
  aurora: [.179, .91, .16, .90, 16.83],
};

export function horizonFor(id) {
  const [height, ruggedness, forest, aurora, seed] = profiles[id] || profiles.moss;
  return { height, ruggedness, forest, aurora, seed };
}

// Keep the angular functions here and in skyFragment in step. Integer angular
// frequencies create a continuous 360-degree skyline as the camera turns.
export function ridgeElevation(angle, layer, { height, ruggedness, forest, seed }) {
  const phase = seed + layer * 2.123;
  const swell = .43 + .35 * Math.sin(3 * angle + phase)
    + .17 * Math.sin(7 * angle - 1.453 * phase)
    + .051 * Math.sin(19 * angle + 2.087 * phase);
  const tooth = 1 - Math.abs(.63 * Math.sin(6 * angle + .639 * phase)
    + .29 * Math.sin(13 * angle - phase) + .08 * Math.sin(36 * angle + phase));
  const canopy = Math.sin(121 * angle + phase) * Math.sin(87 * angle + 2.21 * phase);
  return height * (1 - layer * .107) * (.41 + .59 * mix(swell, tooth, ruggedness * .58))
    - layer * .032 + canopy * forest * .0052 * Math.max(.15, (layer - .6) / 2.4);
}

export function ridgeColor(layer, environment) {
  const fog = environment.fog || environment.skyBottom;
  const cool = blend([.08, .24, .235], tint(environment.skyTop, .82), .41);
  return blend(blend(environment.skyBottom, fog, .63), cool, .32 + layer * .155);
}

export function auroraBand(angle, time, { seed, aurora }) {
  const phase = .17 * seed;
  return {
    center: .35 + .125 * Math.sin(2 * angle + phase + .017 * time)
      + .045 * Math.sin(5 * angle - phase - .029 * time),
    width: .065 + .044 * (.5 + .5 * Math.sin(4 * angle + time * .048)),
    strength: aurora * clamp(.67 + .33 * Math.sin(3 * angle - phase), 0, 1),
  };
}
