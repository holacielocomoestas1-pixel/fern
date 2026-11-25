// Original multiview plush pilots. Rectangles are packed with transparent gutters.
const atlasViews = [
  [[63,6,387,500],[526,6,484,500],[1030,25,500,462],[1543,6,499,500],[54,518,404,500],[573,518,390,500]],
  [[6,7,244,243],[262,13,244,231],[518,35,244,186],[774,27,244,203],[7,262,243,244]],
  [[12,6,233,244],[262,10,244,236],[518,34,244,189],[774,25,244,206],[12,262,233,244]],
  [[16,6,224,244],[262,11,244,235],[518,35,244,186],[774,21,244,215],[16,262,225,244]],
  [[9,6,239,244],[262,13,244,230],[518,34,244,189],[774,28,244,200],[6,262,244,244]],
  [[10,6,236,244],[262,12,244,232],[518,37,244,183],[774,26,244,204],[10,262,237,244]],
];
const carId = car => atlasViews[car.model ?? car.id] ? car.model ?? car.id : 0;
const height = [2.43, 2.30, 2.29, 2.29, 2.21, 2.28];
const radiansToSlice = 4 / Math.PI;
const amber = [1, .73, .35];
const cyan = [.37, .91, 1];
const violet = [.70, .53, 1];
const jade = [.46, 1, .65];
const coral = [1, .5, .34];

function activePower(car, calm) {
  if (car.ghost) return null;
  if (car.pulse > 0 && !calm) {
    const expansion = 1 - Math.min(.8, car.pulse);
    return [violet, 1.22 + expansion * 1.8, .63 + expansion * .48, -.05, .73 * Math.min(1, car.pulse * 4)];
  }
  if (car.shield > 0) return [amber, 1.38, 1.14, -.061, .57];
  if (car.magnet > 0) return [cyan, 1.49, .48, -.136, .68];
  if (car.grip > 0) return [jade, 1.19, .24, -.076, .62];
  if (car.spring > 0 && !calm) return [coral, 1.15, .41, -.24, .6 * Math.min(1, car.spring * 3)];
  return null;
}

export function pilotView(car, camera) {
  const id = carId(car);
  const dx = camera.x - car.x;
  const dz = camera.z - car.z;
  const dy = camera.y - car.y;
  const look = Math.atan2(dx, dz) - car.yaw;
  const angle = Math.atan2(Math.sin(look), Math.cos(look));
  const horizontal = Math.hypot(dx, dz);
  let frame = Math.min(4, Math.round(Math.abs(angle) * radiansToSlice));
  const flip = frame > 0 && frame < 4 && angle > 0;
  const sideView = frame === 2;
  if (id === 0 && frame === 4 && dy > horizontal * .53) frame = 5;
  const rect = atlasViews[id][frame];
  const tall = height[id] * (sideView ? .91 : 1);
  const wide = tall * rect[2] / rect[3];
  return { id, frame, rect, flip, width: wide, height: tall };
}

export function loadPilotImages() {
  if (typeof Image === "undefined") return [];
  return atlasViews.map((_, id) => {
    const image = new Image();
    image.decoding = "async";
    image.src = new URL(`./assets/pilot-${id}.webp`, import.meta.url).href;
    return image;
  });
}

export function drawPilot2D(ctx, images, car, camera, pixelsPerMetre, calm = false) {
  const pose = pilotView(car, camera);
  const image = images[pose.id];
  if (!image?.complete || image.naturalWidth < 1) return false;
  const scale = Math.min(pixelsPerMetre, 760 / pose.height);
  const width = pose.width * scale;
  const height = pose.height * scale;
  if (pose.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, ...pose.rect, -width / 2, -height + scale * .016, width, height);
  const power = activePower(car, calm);
  if (power) {
    const [rgb, wide, tall, lift, alpha] = power;
    const [r, g, b] = rgb.map(channel => Math.round(channel * 255));
    ctx.beginPath();
    ctx.ellipse(0, -height * (lift + tall / 2), width * wide * .4, height * tall * .4, 0, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.3, scale * .071);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = Math.min(8, scale * .24);
    ctx.stroke();
  }
  return true;
}

const vertexSource = `
attribute vec2 aPoint;
uniform mat4 uView;
uniform vec3 uBase;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec4 uCrop;
varying vec2 vUv;
void main() {
  vec3 position = uBase + aPoint.x * uRight + aPoint.y * uUp;
  vUv = mix(uCrop.xy, uCrop.zw, vec2(aPoint.x + .5, 1.0 - aPoint.y));
  gl_Position = uView * vec4(position, 1.0);
}
`;
const fragmentSource = `
precision mediump float;
uniform sampler2D uAtlas;
uniform vec3 uAmbient;
uniform vec4 uFog;
uniform float uOpacity;
uniform vec4 uRing;
varying vec2 vUv;
void main() {
  if (uRing.a > 0.0) {
    float distanceFromEdge = abs(length((vUv - .5) / .4) - 1.0);
    float line = 1.0 - smoothstep(.005, .055, distanceFromEdge);
    float glow = .34 * (1.0 - smoothstep(.038, .168, distanceFromEdge));
    float intensity = min(1.0, line + glow) * uRing.a;
    if (intensity < .016) discard;
    gl_FragColor = vec4(uRing.rgb, intensity);
    return;
  }
  vec4 texel = texture2D(uAtlas, vUv);
  if (texel.a < .12) discard;
  vec3 color = mix(texel.rgb * uAmbient, uFog.rgb, uFog.a);
  gl_FragColor = vec4(color, texel.a * uOpacity);
}
`;

function shader(gl, kind, text) {
  const handle = gl.createShader(kind);
  if (!handle) return null;
  gl.shaderSource(handle, text);
  gl.compileShader(handle);
  if (gl.getShaderParameter(handle, gl.COMPILE_STATUS)) return handle;
  gl.deleteShader(handle);
  return null;
}

function passthrough() {
  return { ready: () => false, draw: () => false, dispose() {} };
}

export function createGLPilots(gl) {
  const images = loadPilotImages();
  if (!images.length) return passthrough();
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (program) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  if (vertex) gl.deleteShader(vertex);
  if (fragment) gl.deleteShader(fragment);
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (program) gl.deleteProgram(program);
    return passthrough();
  }
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return passthrough();
  }
  const locations = Object.fromEntries(
    ["uView", "uBase", "uRight", "uUp", "uCrop", "uAtlas", "uAmbient", "uFog", "uOpacity", "uRing"]
      .map(name => [name, gl.getUniformLocation(program, name)]),
  );
  const point = gl.getAttribLocation(program, "aPoint");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5,0,.5,0,-.5,1,.5,1]), gl.STATIC_DRAW);
  const textures = new Map();
  const unavailable = new Set();
  let disposed = false;

  function texture(id) {
    if (disposed || unavailable.has(id)) return null;
    if (textures.has(id)) return textures.get(id);
    const image = images[id];
    if (!image.complete || !image.naturalWidth) return null;
    const next = gl.createTexture();
    if (!next) return null;
    try {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, next);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      textures.set(id, next);
      return next;
    } catch {
      unavailable.add(id);
      gl.deleteTexture(next);
      return null;
    }
  }

  function ready(car) { return !!texture(carId(car)); }

  function draw(view, camera, car, time, env, calm = false) {
    const pose = pilotView(car, camera);
    const sampler = texture(pose.id);
    if (!sampler) return false;
    const image = images[pose.id];
    const [x,y,w,h] = pose.rect;
    const tilt = (car.roll || 0) * .40;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const [rx, ry, rz] = view.right;
    const [ux, uy, uz] = view.up;
    const far = Math.hypot(camera.x-car.x, camera.y-car.y, camera.z-car.z);
    const fog = env?.fog || [.63, .73, .70];
    const fogNear = env?.fogNear ?? 40;
    const fogFar = env?.fogFar ?? 115;
    const mist = Math.max(0, Math.min(.91, (far - fogNear) / Math.max(1, fogFar - fogNear)));
    const sun = env?.sun || [1, .88, .68];
    const ambient = .81 + .16 * (env?.ambient ?? .7);
    gl.useProgram(program);
    gl.disable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(point);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sampler);
    gl.uniform1i(locations.uAtlas, 0);
    gl.uniformMatrix4fv(locations.uView, false, view.viewProjection);
    gl.uniform3f(locations.uBase, car.x, car.y + .022, car.z);
    gl.uniform3f(locations.uRight, (rx*c+ux*s)*pose.width, (ry*c+uy*s)*pose.width, (rz*c+uz*s)*pose.width);
    gl.uniform3f(locations.uUp, (ux*c-rx*s)*pose.height, (uy*c-ry*s)*pose.height, (uz*c-rz*s)*pose.height);
    gl.uniform4f(locations.uCrop,
      (x + (pose.flip ? w - .5 : .5)) / image.naturalWidth, (y + .5) / image.naturalHeight,
      (x + (pose.flip ? .5 : w - .5)) / image.naturalWidth, (y + h - .5) / image.naturalHeight);
    gl.uniform3f(locations.uAmbient, ambient + sun[0]*.057, ambient + sun[1]*.064, ambient + sun[2]*.086);
    gl.uniform4f(locations.uFog, fog[0], fog[1], fog[2], mist);
    gl.uniform1f(locations.uOpacity, car.ghost ? .44 + Math.sin(time*2.5)*.07 : 1);
    gl.uniform4f(locations.uRing, 0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(!car.ghost);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const power = activePower(car, calm);
    if (power) {
      const [rgb, wide, tall, lift, alpha] = power;
      const raise = pose.height * lift;
      const ahead = -.09;
      const [fx, fy, fz] = view.forward;
      gl.depthMask(false);
      gl.uniform3f(locations.uBase, car.x + ux*raise + fx*ahead, car.y + uy*raise + fy*ahead, car.z + uz*raise + fz*ahead);
      gl.uniform3f(locations.uRight, rx*pose.width*wide, ry*pose.width*wide, rz*pose.width*wide);
      gl.uniform3f(locations.uUp, ux*pose.height*tall, uy*pose.height*tall, uz*pose.height*tall);
      gl.uniform4f(locations.uCrop, 0, 0, 1, 1);
      gl.uniform4f(locations.uRing, rgb[0], rgb[1], rgb[2], alpha);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const value of textures.values()) gl.deleteTexture(value);
    textures.clear();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }
  return { ready, draw, dispose };
}
