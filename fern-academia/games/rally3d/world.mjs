import { blend, randomFor, rgb } from "./world-geometry.mjs";
import { buildTrack, roadPoint } from "./world-track.mjs";
import { buildScenery, planting, terrainSurvey } from "./world-scenery.mjs";
import { horizonFor } from "./atmosphere.mjs";

import { markInstances } from "./world-fixtures.mjs";
import { hazardOffset } from "./powers.mjs";

const shared = {
  margin: "d6e8d4", center: "82948c", curbLight: "e7e8c2",
};

const biomes = {
  moss: {
    sign: "MOSS HOLLOW",
    road: "3d5851", bridge: "755047", shoulder: "66775a", curbDark: "2f7666",
    rail: "38634e", pad: "295964", padGlow: "8bffe2", arch: "316553",
    archTrim: "b98657", archGlow: "ffe49c",
    terrain: "2d7057", terrainLight: "8aa94c", verge: "526c49",
    rock: "586172", rockLight: "9aa18b", bark: "694a3f",
    leaf: "245e52", leafLight: "67b376", flower: "ffac73",
    beach: "bea575", coast: "72997a", water: "289a8c",
    environment: {
      skyTop: [.15, .53, .68], skyBottom: [.77, .89, .77], fog: [.61, .76, .68],
      sun: [1, .91, .68], sunDirection: [.39, .48, .74],
      fogNear: 33, fogFar: 192, ambient: .72, clouds: .62, stars: 0,
    },
  },
  lantern: {
    sign: "LANTERN GROVE",
    road: "45445d", bridge: "634665", shoulder: "62526d", curbDark: "a27284",
    margin: "c9bccd", center: "8a6e90", curbLight: "efcd9d",
    rail: "6e506b", pad: "544d78", padGlow: "ffce89", arch: "534266",
    archTrim: "c78d70", archGlow: "ffca77",
    terrain: "382e57", terrainLight: "72618c", verge: "594f76",
    rock: "5d4e71", rockLight: "8d729d", bark: "563d56",
    leaf: "514973", leafLight: "ad69a0", flower: "f5a474",
    beach: "b88a86", coast: "806287", water: "526a95",
    environment: {
      skyTop: [.12, .14, .30], skyBottom: [.52, .30, .48], fog: [.42, .33, .53],
      sun: [1, .72, .45], sunDirection: [.62, .40, .34],
      fogNear: 31, fogFar: 174, ambient: .81, clouds: .38, stars: .72,
    },
  },
  river: {
    sign: "SILVERWATER BEND",
    road: "51646d", bridge: "986f57", shoulder: "967e61", curbDark: "299387",
    margin: "dbe9e7", center: "9bb4b4",
    rail: "3c6c72", pad: "406e75", padGlow: "86ffef", arch: "467f7e",
    archTrim: "d9a36d", archGlow: "ffe1a2",
    terrain: "547e67", terrainLight: "a6b968", verge: "809263",
    rock: "8a9292", rockLight: "dbdec0", bark: "986e51",
    leaf: "227e6d", leafLight: "71ba81", flower: "fda565",
    beach: "e8cda4", coast: "9cae74", water: "208992",
    environment: {
      skyTop: [.19, .55, .81], skyBottom: [.87, .93, .88], fog: [.67, .83, .82],
      sun: [1, .91, .73], sunDirection: [-.55, .47, .62],
      fogNear: 39, fogFar: 217, ambient: .75, clouds: .68, stars: 0,
    },
  },
};

// The clock is an art-direction parameter, measured as one turn from midnight.
// Exposure and wetness are shared between the WebGL and compatibility drawings.
const worldLighting = {
  moss: {
    ambient: .59, wetness: .65, exposure: 1.15, timeOfDay: .69, weather: "mist", humidity: .91,
    sun: [1, .75, .43], sunDirection: [-.42, .23, -.86], skyTop: [.125, .295, .32],
    skyBottom: [.72, .67, .49], fog: [.51, .585, .534], fogNear: 35, fogFar: 195, clouds: .68,
  },
  lantern: {
    ambient: .52, wetness: .82, exposure: 1.12, timeOfDay: .835, weather: "rain", humidity: .84,
    sun: [.88, .52, .36], sunDirection: [-.68, .22, -.69], skyTop: [.095, .116, .21],
    skyBottom: [.49, .32, .43], fog: [.32, .29, .42], fogNear: 52, fogFar: 202, clouds: .73, stars: .32,
  },
  river: {
    ambient: .75, wetness: .22, exposure: 1.02, timeOfDay: .54, weather: "clear", humidity: .45,
    sun: [1, .93, .75], sunDirection: [-.60, .51, .61], fogNear: 64, fogFar: 246, clouds: .57,
  },
  mangrove: {
    ambient: .61, wetness: .74, exposure: 1.10, timeOfDay: .58, weather: "mist", humidity: .97,
    sun: [1, .84, .62], sunDirection: [.49, .38, -.79],
    skyTop: [.23, .34, .40], skyBottom: [.67, .68, .53], fog: [.47, .55, .49], fogNear: 28, fogFar: 174, clouds: .87,
  },
  quarry: {
    ambient: .57, wetness: .08, exposure: 1.14, timeOfDay: .665, weather: "clear", humidity: .18,
    sun: [1, .71, .47], sunDirection: [-.51, .25, .79],
    fog: [.57, .49, .41], fogNear: 71, fogFar: 244, clouds: .36,
  },
  orchard: {
    ambient: .67, wetness: .44, exposure: 1.13, timeOfDay: .33, weather: "mist", humidity: .76,
    sun: [1, .82, .76], sunDirection: [.88, .20, .43], fogNear: 38, fogFar: 189, clouds: .61,
  },
  glacier: {
    ambient: .73, wetness: .37, exposure: 1.00, timeOfDay: .41, weather: "snow", humidity: .65,
    sun: [.85, .95, 1], sunDirection: [-.48, .44, -.75],
    skyTop: [.235, .385, .51], skyBottom: [.63, .77, .80], fog: [.49, .64, .72], fogNear: 46, fogFar: 219, clouds: .81,
  },
  caldera: {
    ambient: .47, wetness: .14, exposure: 1.15, timeOfDay: .78, weather: "ash", humidity: .27,
    sun: [1, .48, .31], sunDirection: [-.66, .18, .72],
    skyTop: [.165, .124, .168], skyBottom: [.56, .28, .25], fog: [.46, .31, .32], fogNear: 48, fogFar: 211, clouds: .62, stars: .13,
  },
  citadel: {
    ambient: .68, wetness: .38, exposure: 1.08, timeOfDay: .38, weather: "mist", humidity: .56,
    sun: [1, .87, .67], sunDirection: [.51, .48, -.72], fogNear: 54, fogFar: 240, clouds: .64,
  },
  aurora: {
    ambient: .48, wetness: .51, exposure: 1.11, timeOfDay: .02, weather: "aurora", humidity: .53,
    sun: [.47, .74, .94], sunDirection: [-.56, .25, -.78],
    skyTop: [.046, .10, .181], skyBottom: [.23, .42, .46], fog: [.235, .39, .46], fogNear: 47, fogFar: 220, clouds: .30, stars: .88,
  },
};

export function createWorld(course, { staticMeshes = true } = {}) {
  const { environment, sign, ...colors } = biomes[course.theme || course.id] || biomes.moss;
  const palette = Object.fromEntries(Object.entries({ ...shared, ...colors }).map(([id, hex]) => [id, rgb(hex)]));
  const parse = (name, fallback) => course.art?.[name] ? rgb(course.art[name].replace("#","")) : fallback;
  const ground = parse("ground", palette.terrain);
  const accent = parse("accent", palette.archGlow);
  palette.road = blend(parse("road", palette.road), [.15, .164, .17], .19);
  palette.terrain = blend(palette.terrain,ground,.70);
  palette.terrainLight = blend(palette.terrainLight,ground,.58);
  palette.verge = blend(blend(palette.verge,ground,.74), [.21,.20,.155], .19);
  palette.archGlow = blend(palette.archGlow,accent,.48);
  palette.curbDark = blend(palette.curbDark,accent,.26);
  palette.sign = course.name?.en?.toUpperCase().replace(/[^A-Z ]/g,"") || sign;
  const marks = markInstances(course);
  const track = staticMeshes ? buildTrack(course, palette, randomFor(course.seed)) : null;
  const survey = terrainSurvey(course);
  const props = planting(course, randomFor(course.seed ^ 0xad7f), marks, survey);
  const landscapes = staticMeshes ? buildScenery(course, palette, marks, props, survey) : [];
  const finish = item => {
    const frame = course.frame(item.s);
    return { item, frame, center:roadPoint(course,item.s,item.offset) };
  };
  return {
    course, palette, marks, props,
    meshes: track ? [...landscapes, ...track.meshes] : [],
    pickupPositions: track?.pickupPositions || [],
    hazards: (course.hazards || []).map(finish),
    items: (course.items || []).map(finish),
    environment: {
      ...environment,
      fogNear: 67, fogFar: 216,
      skyTop: parse("skyTop",environment.skyTop),
      skyBottom: parse("skyLow",environment.skyBottom),
      fog: parse("fog",environment.fog),
      ...worldLighting[course.id],
      horizon: horizonFor(course.id),
    },
  };
}

export function forVisibleFixtures(world, camera, time, effects, accept) {
  const {course} = world;
  const radius = 142;
  const visible = center => (center[0]-camera.x)**2 + (center[1]-camera.y)**2 + (center[2]-camera.z)**2 < radius*radius;
  const clock = effects?.raceTime ?? time;
  for (const {item, frame, center} of world.hazards) {
    if (!visible(center)) continue;
    const offset = hazardOffset(course,item,clock);
    const base = [frame.x + frame.rx * offset, frame.y + Math.tan(frame.bank)*offset, frame.z+frame.rz*offset];
    accept(item.kind, base, Math.atan2(frame.dx,frame.dz), item.halfWidth, 1, item.halfLength, frame);
  }
  if (!effects?.itemsEnabled) return;
  const lap = (effects.lap || 0) * world.items.length;
  for (const {item, frame, center} of world.items) {
    if (!visible(center) || effects.collectedItems?.has(lap + item.id)) continue;
    const bob = effects.calm ? 0 : Math.sin(clock*3.1+item.id*.72)*.14;
    const at = [center[0], center[1]+1.23+bob, center[2]];
    accept("item",at,Math.atan2(frame.dx,frame.dz)+clock*.79+item.id*.17,1.03,1,1.03,frame);
  }
}

export function blendHex(first, second, amount) {
  const toRgb = hex => rgb(hex.replace("#", ""));
  return "#" + blend(toRgb(first), toRgb(second), amount)
    .map(channel => Math.round(channel*255).toString(16).padStart(2,"0")).join("");
}
