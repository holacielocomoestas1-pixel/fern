const precision = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

export const meshVertex = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uViewProjection;
uniform mat4 uModel;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  gl_Position = uViewProjection * world;
}`;

export const meshFragment = precision + `
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
varying vec3 vWorld;
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

void main() {
  vec3 n = normalize(vNormal);
  vec3 eyeDirection = normalize(uEye - vWorld);
  float distanceFromEye = length(uEye - vWorld);
  vec3 base = vColor;
  if (uSurface > 2.5) {
    float surfaceDetail = 1.0 - smoothstep(24.0, 83.0, distanceFromEye);
    float moss = grain(vWorld.xz*.82) * .55 + grain(vWorld.xz*3.5)*.26 + grain(vWorld.xz*11.0)*.19;
    base *= .96 + surfaceDetail * (moss-.39) * .46;
    base = mix(base, base * vec3(1.09, .98, .91), moss*.33);
  } else if (uSurface > 1.5) {
    vec2 q = vWorld.xz;
    vec2 swells = vec2(sin(0.54 * q.x + 0.41 * q.y + uTime * 1.75), cos(-0.63 * q.x + 0.72 * q.y - uTime * 1.26));
    n = normalize(n + vec3(swells.x, 0.0, swells.y) * 0.15);
    float crest = sin(q.x * 1.55 - q.y * 0.81 + uTime * 1.4 + 0.70 * sin(q.y * 0.65));
    float flecks = smoothstep(0.91, 1.0, crest) * (0.45 + 0.55 * swells.x * swells.x);
    float grazing = pow(1.0 - max(dot(eyeDirection, n), 0.0), 2.8);
    base = mix(base, uFogColor, grazing * 0.59) + vec3(0.05, 0.14, 0.145) * flecks;
  } else if (uSurface > 0.5) {
    float nearGrain = 1.0 - smoothstep(4.0, 25.0, distanceFromEye);
    float grains = grain(vWorld.xz * 18.0) * .62 + grain(vWorld.xz * 3.20) * .38;
    float stains = grain(vWorld.xz * .45);
    base *= .985 + (grains - .47) * .114 * nearGrain + stains * .066;
  }
  float daylight = max(dot(n, uSunDirection), 0.0);
  float upLight = n.y * 0.5 + 0.5;
  vec3 bounced = mix(vec3(0.77, 0.76, 0.81), vec3(0.94, 1.03, 1.08), upLight);
  vec3 halfVector = normalize(uSunDirection + eyeDirection);
  float highlights = pow(max(dot(n, halfVector), 0.0), mix(11.0, 67.0, 1.0 - uRoughness));
  float rim = pow(1.0 - max(dot(n, eyeDirection), 0.0), 3.0) * upLight;
  vec3 shaded = base * (bounced * uAmbient + uSunColor * daylight * 0.63);
  shaded += uSunColor * highlights * (0.13 + (1.0 - uRoughness) * 0.32);
  shaded += rim * base * vec3(0.09, 0.15, 0.20);
  shaded = mix(shaded, base * (1.0 + 0.38 * uEmissive), min(uEmissive * 1.25, 1.0));
  float haze = 0.94 * smoothstep(uFogRange.x, uFogRange.y, distanceFromEye);
  vec3 color = mix(shaded, uFogColor, haze);
  gl_FragColor = vec4(color, uOpacity);
}`;

export const screenVertex = `
attribute vec2 aPosition;
varying vec2 vScreen;

void main() {
  vScreen = aPosition;
  gl_Position = vec4(aPosition, 0.9999, 1.0);
}`;

export const skyFragment = precision + `
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
uniform sampler2D uPanorama;
uniform float uPanoramic;
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

void main() {
  vec3 ray = normalize(uForward + uRight * vScreen.x * uAspect * uTanHalf + uUp * vScreen.y * uTanHalf);
  float elev = ray.y;
  float graduation = smoothstep(-0.08, 0.82, elev);
  vec3 color = mix(uSkyBottom, uSkyTop, graduation);
  float sunDot = max(0.0, dot(ray, uSunDirection));
  float halo = pow(sunDot, 11.0) * 0.21 + pow(sunDot, 98.0) * 0.38;
  float sunDisc = smoothstep(0.9986, 0.99965, sunDot);
  color += (halo + sunDisc * 0.72) * uSunColor;

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
  if (uPanoramic > 0.5) {
    float azimuth = atan(ray.x, ray.z) / 1.5707963;
    float folded = 1.0 - abs(mod(azimuth + .5, 2.0) - 1.0);
    float altitude = atan(elev, max(.0001, length(ray.xz)));
    float vertical = .535 - altitude * 1.65;
    float feather = smoothstep(-.06, .11, vertical) * (1.0 - smoothstep(.88, 1.06, vertical));
    vec3 distant = texture2D(uPanorama, vec2(folded, clamp(vertical, 0.0, 1.0))).rgb;
    color = mix(color, distant, feather * .97);
  }
  gl_FragColor = vec4(color, 1.0);
}`;

export const foliageVertex = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aShade;
uniform mat4 uViewProjection;
uniform vec3 uEye;
varying vec2 vUv;
varying float vFogDistance;
varying float vShade;
void main() {
  vUv = aUv;
  vFogDistance = length(uEye-aPosition);
  vShade = aShade;
  gl_Position = uViewProjection * vec4(aPosition,1.0);
}`;

export const foliageFragment = precision + `
uniform sampler2D uImage;
uniform vec3 uFog;
uniform vec2 uFogRange;
uniform vec3 uGrade;
varying vec2 vUv;
varying float vFogDistance;
varying float vShade;
void main() {
  vec4 image=texture2D(uImage,vUv);
  if (image.a < .37) discard;
  vec3 shade=image.rgb * uGrade * vShade;
  float mist=.89 * smoothstep(uFogRange.x,uFogRange.y,vFogDistance);
  gl_FragColor=vec4(mix(shade,uFog,mist),1.0);
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
  float streak = 1.0 - smoothstep(0.012, 0.047, channel);
  float travel = fract(radius * 0.84 - uTime * (1.48 + seed * 1.28) + seed * 17.93);
  streak *= smoothstep(0.30, 0.42, travel) * (1.0 - smoothstep(0.52, 0.81, travel));
  streak *= smoothstep(0.50, 1.13, radius) * smoothstep(0.16, 0.63, seed);
  float glow = smoothstep(0.69, 1.44, radius) * 0.08;
  gl_FragColor = vec4(mix(vec3(0.34, 0.92, 1.0), vec3(1.0, 0.96, 0.71), seed), uPower * (streak * 0.62 + glow));
}`;
