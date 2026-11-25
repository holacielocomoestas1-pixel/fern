import { blend, randomFor, rgb } from "./world-geometry.mjs";
import { buildTrack, roadPoint } from "./world-track.mjs";
import { buildScenery, planting } from "./world-scenery.mjs";
import { horizonFor } from "./atmosphere.mjs";

import { markInstances } from "./world-fixtures.mjs";
import { hazardOffset } from "./powers.mjs";

export const assetURL = file => new URL("./assets/" + file + ".webp", import.meta.url).href;

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

const worldLighting = {
  moss: { ambient: .75, sunDirection: [.39,.40,.74] },
  lantern: { ambient: .71, sun: [1,.64,.43] },
  river: { ambient: .80 },
  mangrove: { ambient: .78, sun: [1,.82,.61] },
  quarry: { ambient: .77, sun: [1,.76,.51] },
  orchard: { ambient: .80, sun: [1,.85,.77] },
  glacier: { ambient: .87, sun: [.84,.96,1] },
  caldera: { ambient: .65, sun: [1,.59,.38], stars: .24 },
  citadel: { ambient: .79, sun: [.98,.88,.76] },
  aurora: { ambient: .69, sun: [.37,.89,.81], stars: .74 },
};

export function createWorld(course, { staticMeshes = true } = {}) {
  const { environment, sign, ...colors } = biomes[course.theme || course.id] || biomes.moss;
  const palette = Object.fromEntries(Object.entries({ ...shared, ...colors }).map(([id, hex]) => [id, rgb(hex)]));
  const parse = (name, fallback) => course.art?.[name] ? rgb(course.art[name].replace("#","")) : fallback;
  const ground = parse("ground", palette.terrain);
  const accent = parse("accent", palette.archGlow);
  palette.road = parse("road", palette.road);
  palette.terrain = blend(palette.terrain,ground,.70);
  palette.terrainLight = blend(palette.terrainLight,ground,.58);
  palette.verge = blend(palette.verge,ground,.74);
  palette.archGlow = blend(palette.archGlow,accent,.48);
  palette.curbDark = blend(palette.curbDark,accent,.26);
  palette.sign = course.name?.en?.toUpperCase().replace(/[^A-Z ]/g,"") || sign;
  const marks = markInstances(course);
  const track = staticMeshes ? buildTrack(course, palette, randomFor(course.seed)) : null;
  const props = planting(course, randomFor(course.seed ^ 0xad7f), marks);
  const landscapes = staticMeshes ? buildScenery(course, palette, marks, props) : [];
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
