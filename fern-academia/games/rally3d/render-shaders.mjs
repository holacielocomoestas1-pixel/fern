const precision = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const colorGrade = `
vec3 sceneGrade(vec3 source, float exposure, float night) {
  vec3 exposed = max(vec3(0.0), source) * exposure;
  // Soft shoulder rolls out bright lamps and sun glare into a filmic white.
  exposed /= 1.0 + max(vec3(0.0), exposed - .71) * .82;
  float Y = dot(exposed, vec3(.2126, .7152, .0722));
  exposed = mix(vec3(Y), exposed, 1.035 + night * .035);
  float toes = .94 + .075 * smoothstep(.12, .72, Y);
  vec3 coolShade = vec3(.95 - .035 * night, 1.045, 1.064);
  return exposed * toes * mix(coolShade, vec3(1.026, 1.0, .968), smoothstep(.19, .70, Y));
}
`;

export const meshVertex = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uViewProjection;
uniform mat4 uModel;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vColor;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vLocal = aPosition;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  gl_Position = uViewProjection * world;
}`;

export const meshFragment = precision + colorGrade + `
uniform vec3 uEye;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform float uAmbient;
uniform float uTime;
uniform float uEmissive;
uniform float uRoughness;
uniform float uOpacity;
uniform float uSurface;
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
// Exposure, wetness, night, atmospheric ground mist
uniform vec4 uGrade;
uniform vec4 uCar;
uniform vec2 uCarHeading;
uniform mat4 uLightMatrix;
uniform sampler2D uShadowMap;
uniform float uShadowTexel;
uniform float uPortrait;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vColor;

float pseudorandom(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float grain(vec2 p) {
  vec2 cell = floor(p);
  vec2 k = smoothstep(vec2(0.0), vec2(1.0), fract(p));
  vec2 h = vec2(pseudorandom(cell), pseudorandom(cell+vec2(0.0,1.0)));
  vec2 m = vec2(pseudorandom(cell+vec2(1.0,0.0)), pseudorandom(cell+vec2(1.0,1.0)));
  vec2 a = mix(h,m,k.x);
  return mix(a.x,a.y,k.y);
}

float compareDepth(vec2 coordinate, float depth) {
  vec2 depthChannels = texture2D(uShadowMap, coordinate).rg;
  return step(depth, dot(depthChannels, vec2(1.0, .0039215686)));
}

float sunlightAt(vec3 position, vec3 normal, float slope) {
  if (uShadowTexel <= .0) return 1.0;
  vec3 samplePoint = (uLightMatrix * vec4(position + normal * .065, 1.0)).xyz * .5 + .5;
  vec2 edge = min(samplePoint.xy, 1.0 - samplePoint.xy);
  float coverage = smoothstep(.018, .125, min(edge.x, edge.y));
  if (coverage <= 0.0 || samplePoint.z <= .01 || samplePoint.z >= .99) return 1.0;
  vec2 texel = vec2(uShadowTexel);
  vec2 pixel = samplePoint.xy / texel - .5;
  vec2 cell = (floor(pixel) + .5) * texel;
  vec2 weight = fract(pixel);
  float depth = samplePoint.z - (.00053 + .00125 * (1.0 - slope));
  float a = mix(compareDepth(cell, depth), compareDepth(cell + texel * vec2(1.0, 0.), depth), weight.x);
  float b = mix(compareDepth(cell + texel * vec2(0., 1.0), depth), compareDepth(cell + texel, depth), weight.x);
  return mix(1.0, mix(a, b, weight.y), coverage);
}

vec3 environmentColor(vec3 ray) {
  return mix(uSkyBottom, uSkyTop, smoothstep(-.04, .69, ray.y)) *
    (.69 + .23 * smoothstep(-.05, .27, ray.y));
}

vec3 vehicleLight(vec2 road, float wet) {
  vec2 delta = road - uCar.xz;
  float along = dot(delta, uCarHeading);
  float across = dot(delta, vec2(uCarHeading.y, -uCarHeading.x));
  float side = abs(across);
  float front = max(0.0, along - 1.10);
  float back = max(0.0, -along - 1.34);
  float bulbs = abs(side - .49);
  float beam = (1.0 - smoothstep(.06 + front * .05, .73 + front * .16, bulbs)) *
    smoothstep(1.35, 3.5, along) * exp(-front * .086) * (1.0 - smoothstep(20., 34., front));
  float warm = (1.0 - smoothstep(.04, .36 + back * .09, bulbs)) *
    smoothstep(1.34, 1.65, -along) * exp(-back * .68);
  return (vec3(.96, .79, .49) * beam * (.026 + .20 * wet + .29 * uGrade.z)
    + vec3(.83, .10, .042) * warm * (.06 + .48 * wet)) * uCar.w;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 eyeDirection = normalize(uEye - vWorld);
  float distanceFromEye = length(uEye - vWorld);
  float nearDetail = 1.0 - smoothstep(7.0, 46.0, distanceFromEye);
  vec3 base = vColor;
  float fiber = 0.0;
  float canopy = 0.0;
  float wet = 0.0;

  if (uSurface > 9.5) {
    float beds = sin(vWorld.y * 3.2 + grain(vWorld.xz * .21) * 3.2
      + .52 * sin(vWorld.x * .25 + vWorld.z * .31));
    float fissures = grain((vWorld.xz + vec2(vWorld.y,-vWorld.y)) * 7.5);
    base *= .91 + nearDetail * (.086 * beds + .19 * fissures);
  } else if (uSurface > 8.5) {
    float leafDapple = grain((vWorld.xy + vWorld.z * .64) * 11.3);
    canopy = .13 + .25 * leafDapple;
    base *= .95 + (leafDapple - .35) * nearDetail * .25;
  } else if (uSurface > 7.5) {
    float paint = grain(vLocal.xy * 78.0 + vLocal.z * 61.0);
    base *= 1.0 + (paint - .5) * nearDetail * .064;
  } else if (uSurface > 6.5) {
    float pattern = grain(vec2(vLocal.z + vLocal.y, vLocal.x - vLocal.y) * 58.0);
    base *= .92 + pattern * nearDetail * .25;
  } else if (uSurface > 5.5) {
    float brushed = grain(vec2(dot(vLocal, vec3(.7, .4, -.2)) * 118.0, vLocal.z * 16.0));
    base *= .958 + nearDetail * brushed * .13;
  } else if (uSurface > 4.5) {
    // Analytic thread weave on bonnet, scarf and garments in local coordinates.
    vec2 warp = vLocal.xz * 166.0 + vec2(vLocal.y * 119.0, vLocal.y * -134.0);
    float ribs = .5 + .5 * sin(warp.x) * cos(warp.y);
    fiber = nearDetail * (.32 + .68 * ribs);
    base *= .957 + fiber * .133;
  } else if (uSurface > 3.5) {
    // Fur nap follows the model as it steers. The diffuse noise is layered
    // rather than specular to preserve a soft plush finish, even in silhouette.
    vec2 coordinates = vec2(vLocal.x + vLocal.z * .51, vLocal.y + vLocal.z * .44);
    float yarn = grain(coordinates * vec2(111.0, 42.0));
    float clumps = grain(coordinates * vec2(27.0, 16.0));
    fiber = nearDetail * (.64 * yarn + .36 * clumps);
    base *= .902 + .198 * fiber + .092 * clumps;
  } else if (uSurface > 2.5) {
    float surfaceDetail = 1.0 - smoothstep(24.0, 83.0, distanceFromEye);
    float moss = grain(vWorld.xz * .82) * .55 + grain(vWorld.xz * 3.5) * .26 + grain(vWorld.xz * 11.0) * .19;
    base *= .96 + surfaceDetail * (moss - .39) * .46;
    base = mix(base, base * vec3(1.09, .98, .91), moss * .33);
  } else if (uSurface > 1.5) {
    vec2 q = vWorld.xz;
    vec2 swells = vec2(sin(.54 * q.x + .41 * q.y + uTime * 1.75), cos(-.63 * q.x + .72 * q.y - uTime * 1.26));
    n = normalize(n + vec3(swells.x, 0.0, swells.y) * .15);
    float crest = sin(q.x * 1.55 - q.y * .81 + uTime * 1.4 + .70 * sin(q.y * .65));
    float flecks = smoothstep(.91, 1.0, crest) * (.45 + .55 * swells.x * swells.x);
    float grazing = pow(1.0 - max(dot(eyeDirection, n), 0.0), 2.8);
    base = mix(base, uFogColor, grazing * .59) + vec3(.05, .14, .145) * flecks;
  } else if (uSurface > .5) {
    vec2 road = vWorld.xz;
    float nearGrain = 1.0 - smoothstep(6.0, 28.0, distanceFromEye);
    float chips = grain(road * 48.0);
    float grains = grain(road * 16.0) * .63 + grain(road * 3.1) * .37;
    float stains = grain(road * .39);
    float puddles = grain(road * .115 + vec2(4.57, 1.35)) * .67 + stains * .33;
    wet = uGrade.y * mix(.32, 1.0, smoothstep(.34, .64, puddles));
    base *= mix(1.075, .65, wet) * (.94 + (grains - .42) * .24 * nearGrain + stains * .13);
    base += vec3(.19, .17, .128) * smoothstep(.79, .985, chips) * .36 * nearGrain * (1.0 - wet);
    n = normalize(n + vec3(chips - .5, 0., grains - .46) * (.025 + .074 * wet) * nearGrain);
  }
  float daylight = max(dot(n, uSunDirection), 0.0);
  float upLight = n.y * 0.5 + 0.5;
  vec3 bounced = mix(vec3(.59, .69, .71), vec3(.91, 1.06, 1.12), upLight);
  float illumination = sunlightAt(vWorld, n, daylight);
  vec3 halfVector = normalize(uSunDirection + eyeDirection);
  float highlights = pow(max(dot(n, halfVector), 0.0), mix(11.0, 86.0, 1.0 - uRoughness));
  float grazing = pow(1.0 - max(dot(n, eyeDirection), 0.0), 3.0);
  float rim = grazing * upLight;
  vec3 shaded = base * (bounced * uAmbient * mix(.75, 1.0, illumination)
    + uSunColor * daylight * illumination * mix(.78, .35, uGrade.z));
  shaded += base * uSunColor * canopy * .28 * max(0.0, dot(-n, uSunDirection));
  shaded += base * uSunColor * fiber * rim * (.14 + .29 * illumination);
  bool enamel = uSurface > 7.5 && uSurface < 8.5;
  bool metal = uSurface > 5.5 && uSurface < 6.5;
  float glaze = enamel ? .68 : metal ? .56 : .22;
  shaded += uSunColor * highlights * illumination * (.045 + (1.0 - uRoughness) * glaze);
  vec3 reflection = reflect(-eyeDirection, n);
  if (enamel || metal) {
    vec3 rimSky = environmentColor(reflection);
    float horizonLine = exp(-14.0 * abs(reflection.y + .021));
    float highlight = pow(max(0.0, dot(reflection, uSunDirection)), enamel ? 114. : 55.);
    float fresnel = (enamel ? .09 : .22) + rim * .45;
    vec3 materialTint = metal ? mix(base, vec3(1.0, .91, .75), .56) : vec3(.92, 1., 1.);
    shaded += materialTint * (rimSky + horizonLine * uSkyBottom * .33) * fresnel;
    shaded += uSunColor * highlight * illumination * (enamel ? .65 : .39);
  } else if (uSurface > .5 && uSurface < 1.5) {
    vec3 reflectedSky = environmentColor(reflection);
    float reflectedSun = max(dot(reflection, uSunDirection), 0.0);
    float breakage = .68 + .32 * grain(vWorld.xz * 1.38 + vec2(.32, -.78));
    float glint = pow(reflectedSun, 33.) * .21 + pow(reflectedSun, 125.) * .40;
    shaded += (reflectedSky * (.08 + grazing * .41) * (.69 + illumination * .31)
      + glint * illumination * uSunColor) * wet * breakage;
    shaded += vehicleLight(vWorld.xz, wet);
  } else if (uSurface > 1.5 && uSurface < 2.5) {
    float glint = pow(max(dot(reflection, uSunDirection), 0.0), 95.);
    shaded += environmentColor(reflection) * (.14 + .31 * grazing) + uSunColor * .37 * glint;
  }
  if (uPortrait > .01 && uSurface > 3.5 && uSurface < 8.5) {
    // The hero framing has a broad off-camera fill, soft enough to preserve
    // the shape of the face and warm enough to balance cool sky reflections.
    vec3 softKey = normalize(eyeDirection * .8 + vec3(-.21, .59, .14));
    float broad = pow(.5 + .5 * dot(softKey, n), 2.);
    shaded += base * vec3(1.0, .93, .80) * (.065 + broad * .38) *
      (1.0 - smoothstep(7.1, 12.0, distanceFromEye)) * uPortrait;
  }
  shaded += rim * base * vec3(0.09, 0.15, 0.20);
  shaded = mix(shaded, base * (1.0 + 0.38 * uEmissive), min(uEmissive * 1.25, 1.0));
  float haze = .94 * smoothstep(uFogRange.x, uFogRange.y, distanceFromEye);
  float lowAltitude = abs(vWorld.y - uCar.y);
  float steam = grain(vWorld.xz * .082 + vec2(.067, -.029) * uTime) * .5 + .36;
  float mist = (1.0 - exp(-distanceFromEye * .024)) * exp(-lowAltitude * .16)
    * steam * uGrade.w * uCar.w * .53 * smoothstep(5.5, 28.0, distanceFromEye);
  float lightScatter = pow(max(0.0, dot(-eyeDirection, uSunDirection)), 6.);
  vec3 airy = mix(uFogColor, uSunColor * .88, lightScatter * .32);
  vec3 color = mix(shaded, airy, haze + (1.0 - haze) * mist);
  gl_FragColor = vec4(sceneGrade(color, uGrade.x, uGrade.z), uOpacity);
}`;

export const screenVertex = `
attribute vec2 aPosition;
varying vec2 vScreen;

void main() {
  vScreen = aPosition;
  gl_Position = vec4(aPosition, 0.9999, 1.0);
}`;

export const skyFragment = precision + colorGrade + `
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uAspect;
uniform float uTanHalf;
uniform float uTime;
uniform float uClouds;
uniform float uStars;
uniform vec3 uFogColor;
uniform vec4 uHorizon;
uniform float uHorizonSeed;
uniform vec4 uGrade;
varying vec2 vScreen;

float hash(vec2 p) {
  vec3 v = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  v += dot(v, v.yxz + 33.33);
  return fract((v.x + v.y) * v.z);
}

float cloud(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), u.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), u.x), u.y);
}

float ridge(float angle, float layer) {
  float p = uHorizonSeed + layer * 2.123;
  float swell = .43 + .35 * sin(3.0 * angle + p) + .17 * sin(7.0 * angle - 1.453 * p)
    + .051 * sin(19.0 * angle + 2.087 * p);
  float tooth = 1.0 - abs(.63 * sin(6.0 * angle + .639 * p) + .29 * sin(13.0 * angle - p)
    + .08 * sin(36.0 * angle + p));
  float canopy = sin(121.0 * angle + p) * sin(87.0 * angle + 2.21 * p);
  return uHorizon.x * (1.0 - layer * .107) * (.41 + .59 * mix(swell, tooth, uHorizon.y * .58))
    - layer * .032 + canopy * uHorizon.z * .0052 * max(.15, (layer - .6) / 2.4);
}

void main() {
  vec3 ray = normalize(uForward + uRight * vScreen.x * uAspect * uTanHalf + uUp * vScreen.y * uTanHalf);
  float elev = ray.y;
  float graduation = smoothstep(-0.08, 0.82, elev);
  vec3 color = mix(uSkyBottom, uSkyTop, graduation);
  float sunDot = max(0.0, dot(ray, uSunDirection));
  float halo = pow(sunDot, 8.0) * .22 + pow(sunDot, 38.0) * .21 + pow(sunDot, 230.) * .38;
  float sunDisc = smoothstep(0.99969, 0.99995, sunDot);
  color += (halo + sunDisc * 1.02) * uSunColor * mix(1.0, .62, uGrade.z);

  if (uClouds > 0.01 && elev > 0.02) {
    vec2 p = ray.xz * 1.17 / (elev + 0.24) + vec2(uTime * 0.007, -uTime * 0.003);
    float density = 0.57 * cloud(p) + 0.29 * cloud(p * 2.1 + vec2(4.3, 1.2)) + 0.14 * cloud(p * 4.5 - vec2(1.3, 1.9));
    float veil = smoothstep(0.47, 0.72, density) * smoothstep(0.025, 0.18, elev) * uClouds;
    vec3 clouds = mix(mix(uSkyBottom, uSunColor, 0.25), vec3(0.97, 0.96, 0.89), uClouds * 0.69);
    color = mix(color, clouds, veil * 0.60);
  }
  if (uStars > 0.01 && elev > 0.11) {
    vec2 p = vec2(atan(ray.z, ray.x) * 100.0, elev * 157.0);
    vec2 cell = floor(p);
    float randomStar = hash(cell);
    vec2 center = vec2(0.22 + 0.52 * hash(cell + 0.45), 0.22 + 0.52 * hash(cell + 1.25));
    float spot = 1.0 - smoothstep(0.018, 0.11, distance(fract(p), center));
    float shimmer = 0.70 + 0.27 * sin(uTime * 1.4 + randomStar * 25.0);
    float dust = smoothstep(0.973, 1.0, randomStar) * spot * shimmer;
    color += vec3(0.84, 0.91, 1.0) * dust * uStars * smoothstep(0.1, 0.4, elev);
  }
  float angle = atan(ray.x, ray.z);
  float altitude = atan(elev, max(.0001, length(ray.xz)));
  if (uHorizon.w > .01 && altitude > .10) {
    float p = .17 * uHorizonSeed;
    float center = .35 + .125 * sin(2.0 * angle + p + .017 * uTime)
      + .045 * sin(5.0 * angle - p - .029 * uTime);
    float band = .065 + .044 * (.5 + .5 * sin(4.0 * angle + uTime * .048));
    float delta = (altitude - center) / band;
    float curtain = exp(-2.55 * abs(delta)) * smoothstep(-1.0, .08, delta);
    float rayFold = .43 + .37 * sin(31.0 * angle + 6.0 * altitude + .18 * uTime)
      + .20 * sin(75.0 * angle - .13 * uTime);
    float volume = curtain * (.63 + .43 * rayFold) * (.67 + .33 * sin(3.0 * angle - p));
    color += mix(vec3(.055, .54, .32), vec3(.19, .095, .36), smoothstep(.18, 1.8, delta))
      * volume * uHorizon.w * .94;
  }

  // Stable atmospheric layers beyond physically meshed terrain.
  vec3 cool = mix(vec3(.08, .24, .235), uSkyTop * .82, .41);
  float feather = .0014 * max(.67, uTanHalf);
  for (int row = 0; row < 4; row++) {
    float layer = float(row);
    float height = ridge(angle, layer);
    float shade = .32 + layer * .155;
    vec3 distant = mix(mix(uSkyBottom, uFogColor, .63), cool, shade);
    float folds = .55 + .45 * sin(24.0 * angle + layer * 3.4 + 31.0 * altitude);
    float stylizedLight = smoothstep(-.012, .06, height - altitude);
    distant *= .96 + .09 * folds + layer * .018;
    distant = mix(uFogColor * .94, distant, .65 + .22 * stylizedLight);
    float mask = 1.0 - smoothstep(height - feather, height + feather, altitude);
    color = mix(color, distant, mask);
  }
  color = sceneGrade(color, uGrade.x, uGrade.z);
  // A fraction of one quantization step prevents color bands in the broad sky.
  color += (hash(gl_FragCoord.xy) - .5) * .0034;
  gl_FragColor = vec4(color, 1.0);
}`;

export const effectVertex = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute vec4 aColor;
uniform mat4 uViewProjection;
varying vec2 vUv;
varying vec4 vColor;

void main() {
  gl_Position = uViewProjection * vec4(aPosition, 1.0);
  vUv = aUv;
  vColor = aColor;
}`;

export const effectFragment = precision + `
varying vec2 vUv;
varying vec4 vColor;

void main() {
  float softness = 1.0 - smoothstep(0.02, 1.0, dot(vUv, vUv));
  vec3 core = mix(vColor.rgb, min(vColor.rgb * 1.2 + 0.24, 1.0), softness * 0.42);
  gl_FragColor = vec4(core, vColor.a * softness);
}`;

export const streakFragment = precision + `
uniform float uPower;
uniform float uTime;
uniform float uAspect;
varying vec2 vScreen;

float random(float x) {
  return fract(sin(x * 127.17 + 4.77) * 437.585);
}

void main() {
  vec2 point = vec2(vScreen.x * max(0.88, uAspect * 0.74), vScreen.y + 0.06);
  float radius = length(point);
  float angular = atan(point.y, point.x) * 10.1859;
  float lane = floor(angular);
  float channel = abs(fract(angular) - 0.5);
  float seed = random(lane);
  float streak = 1.0 - smoothstep(0.008, 0.038, channel);
  float travel = fract(radius * 0.84 - uTime * (1.48 + seed * 1.28) + seed * 17.93);
  streak *= smoothstep(0.30, 0.42, travel) * (1.0 - smoothstep(0.46, 0.68, travel));
  streak *= smoothstep(0.65, 1.18, radius) * smoothstep(0.22, 0.68, seed);
  float glow = smoothstep(0.69, 1.44, radius) * 0.08;
  gl_FragColor = vec4(mix(vec3(0.34, 0.92, 1.0), vec3(1.0, 0.96, 0.71), seed), uPower * (streak * 0.40 + glow));
}`;
