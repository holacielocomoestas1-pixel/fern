import { clamp, transform, unit, viewFor, wheelTransform } from "./render-math.mjs";
import {
  effectFragment, effectVertex, meshFragment, meshVertex, screenVertex, skyFragment, streakFragment,
} from "./render-shaders.mjs";
import { forVisibleFixtures } from "./world.mjs";
import { fixtures, fixtureMesh } from "./world-fixtures.mjs";
import { allocateSunShadow, depthVertex, depthFragment, lightMatrix } from "./sun-shadow.mjs";

const TAU = Math.PI * 2;
const WHITE = [1, 1, 1];
const SHADOW = [0.013, 0.032, 0.031];
const TURBO = [0.22, 0.83, 1];
const SPARK = [1, 0.58, 0.15];
const CREAM = [1, .88, .54];
const DUST = [0.58, 0.45, 0.35];
const GUARD = [.94, .60, .14];
const ECHO = [.64, .25, .93];
const GRIP = [.31, .86, .40];
const SPRING = [.94, .61, .37];
const SURFACES = new Map([
  ["road", 1], ["water", 2], ["land", 3], ["fur", 4], ["cloth", 5],
  ["metal", 6], ["rubber", 7], ["paint", 8], ["foliage", 9], ["stone", 10],
]);
const LAND = {
  skyTop: [0.19, 0.49, 0.68],
  skyBottom: [0.67, 0.78, 0.70],
  fog: [0.57, 0.70, 0.63],
  sun: [1.0, 0.88, 0.68],
  sunDirection: [0.30, 0.49, -0.68],
  fogNear: 42, fogFar: 210, ambient: 0.69, clouds: .46, stars: 0,
  horizon: { height: .14, ruggedness: .38, forest: .75, aurora: 0, seed: 2.7 },
  wetness: .32, exposure: 1, timeOfDay: .34,
};

function makeProgram(gl, vs, fs, attrs, names) {
  function compile(kind, source) {
    const shader = gl.createShader(kind);
    if (!shader) throw new Error("Fern Rally could not allocate a shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || "Fern Rally could not compile a shader.");
  }
  const vertex = compile(gl.VERTEX_SHADER, vs);
  let fragment;
  let program;
  try {
    fragment = compile(gl.FRAGMENT_SHADER, fs);
    program = gl.createProgram();
    if (!program) throw new Error("Fern Rally could not allocate a program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    attrs.forEach((name, index) => gl.bindAttribLocation(program, index, name));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Fern Rally could not link a program.");
    }
    return { handle: program, u: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) };
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

function crystalMesh() {
  const points = [[0, .56, 0], [0, -.43, 0], [.30, 0, 0], [0, 0, .30], [-.30, 0, 0], [0, 0, -.30]];
  const positions = [], normals = [], colors = [];
  const shades = [[.61, .98, .81], [.33, .82, .58], [.86, 1, .58], [.50, .89, .68]];
  for (let i = 0; i < 4; i++) {
    const a = points[2 + i];
    const b = points[2 + (i + 1) % 4];
    for (const tip of [points[0], points[1]]) {
      const normal = unit(a[0] + b[0], tip[1] * .65, a[2] + b[2]);
      for (const point of [tip, a, b]) {
        positions.push(...point);
        normals.push(...normal);
        colors.push(...shades[i]);
      }
    }
  }
  return { positions, normals, colors, emissive: .52, roughness: .18 };
}

function kartShadowProxy() {
  const positions = [];
  function ellipsoid(x, y, z, rx, ry, rz) {
    const sides = 10, stacks = 6;
    const point = (i, j) => {
      const latitude = Math.PI * i / stacks;
      const longitude = TAU * j / sides;
      return [x + rx * Math.sin(latitude) * Math.cos(longitude),
        y + ry * Math.cos(latitude),
        z + rz * Math.sin(latitude) * Math.sin(longitude)];
    };
    for (let i = 0; i < stacks; i++) for (let j = 0; j < sides; j++) {
      const a = point(i, j), b = point(i + 1, j), c = point(i + 1, j + 1), d = point(i, j + 1);
      positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  ellipsoid(0, .50, .05, .82, .31, 1.54);
  ellipsoid(0, 1.13, -.43, .46, .63, .42);
  ellipsoid(0, 1.82, -.45, .55, .47, .45);
  for (const side of [-.89, .89]) {
    ellipsoid(side, .34, -1.05, .23, .34, .34);
    ellipsoid(side, .34, 1.1, .23, .34, .34);
  }
  return { positions };
}

function batch(maxQuads) {
  return { data: new Float32Array(maxQuads * 54), count: 0 };
}

function splat(writer, x, y, z, ax, ay, az, bx, by, bz, color, alpha) {
  const data = writer.data;
  let i = writer.count;
  if (i + 54 > data.length || alpha <= 0) return;
  const add = (u, v) => {
    data[i++] = x + u * ax + v * bx;
    data[i++] = y + u * ay + v * by;
    data[i++] = z + u * az + v * bz;
    data[i++] = u;
    data[i++] = v;
    data[i++] = color[0];
    data[i++] = color[1];
    data[i++] = color[2];
    data[i++] = alpha;
  };
  add(-1, -1); add(1, -1); add(-1, 1);
  add(-1, 1); add(1, -1); add(1, 1);
  writer.count = i;
}

export function createRenderer(canvas, { quality = "auto", reducedMotion = false } = {}) {
  const options = {
    alpha: false, antialias: quality !== "low", depth: true, stencil: false,
    preserveDrawingBuffer: false, powerPreference: "high-performance",
  };
  const gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
  if (!gl) throw new Error("WebGL is unavailable.");
  const programs = [];
  const buffers = new Set();
  const fixtureModels = Object.create(null);
  const array = gl.ARRAY_BUFFER;
  let worldMeshes = [];
  let world = null;
  let models = [];
  let env = LAND;
  let sunDirection = unit(...LAND.sunDirection);
  let disposed = false;
  let timeBefore = null;
  let playerLight = null;
  let shadow = null;
  let shadowProgram = null;
  let shadowSize = 0;
  let shadowReady = false;
  const spins = new Map();
  const eye = new Float32Array(3);
  const bodyMatrix = new Float32Array(16);
  const modelMatrix = new Float32Array(16);
  const wheelMatrix = new Float32Array(16);
  const sunMatrix = new Float32Array(16);
  const grade = new Float32Array(4);
  const identity = transform(new Float32Array(16), 0, 0, 0);
  const maxSize = Math.min(4096, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096);
  const stats = { width: canvas.width, height: canvas.height, drawCalls: 0, triangles: 0,
    shadowTriangles: 0, shadowResolution: 0, frameMs: 0, contextLost: false };
  const effectsBatch = batch(360);
  let drawable = true;

  function addProgram(vs, fs, attrs, names) {
    const program = makeProgram(gl, vs, fs, attrs, names);
    programs.push(program);
    return program;
  }

  function allocate(data, hint = gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Fern Rally could not allocate a graphics buffer.");
    buffers.add(buffer);
    gl.bindBuffer(array, buffer);
    gl.bufferData(array, data, hint);
    return buffer;
  }

  function release(buffer) {
    if (!buffers.delete(buffer)) return;
    gl.deleteBuffer(buffer);
  }

  function upload(mesh) {
    const { positions, normals, colors, indices } = mesh;
    if (!positions || positions.length % 3 || positions.length < 9) throw new Error("Malformed Fern Rally mesh.");
    const sourceCount = positions.length / 3;
    const count = indices?.length ?? sourceCount;
    if (count % 3 || !count) throw new Error("Fern Rally meshes contain triangles.");
    const interleaved = new Float32Array(count * 9);
    for (let i = 0; i < count; i++) {
      const source = (indices ? indices[i] : i) * 3;
      if (source < 0 || source >= positions.length) throw new Error("Fern Rally mesh index out of bounds.");
      const dest = i * 9;
      interleaved[dest] = positions[source];
      interleaved[dest + 1] = positions[source + 1];
      interleaved[dest + 2] = positions[source + 2];
      interleaved[dest + 3] = normals ? normals[source] : 0;
      interleaved[dest + 4] = normals ? normals[source + 1] : 1;
      interleaved[dest + 5] = normals ? normals[source + 2] : 0;
      interleaved[dest + 6] = colors ? colors[source] : WHITE[0];
      interleaved[dest + 7] = colors ? colors[source + 1] : WHITE[1];
      interleaved[dest + 8] = colors ? colors[source + 2] : WHITE[2];
    }
    return {
      buffer: allocate(interleaved), count, bounds: mesh.bounds,
      emissive: clamp(mesh.emissive || 0, 0, 1),
      roughness: clamp(mesh.roughness ?? .71, 0, 1),
      surface: mesh.water ? 2 : (SURFACES.get(mesh.surface) ?? 0),
    };
  }

  const retire = loaded => loaded.forEach(mesh => release(mesh.buffer));

  function visible(center, radius, view, camera, max = env.fogFar + 48) {
    const dx=center[0]-camera.x,dy=center[1]-camera.y,dz=center[2]-camera.z;
    const dot = direction => direction[0]*dx+direction[1]*dy+direction[2]*dz;
    if(dx*dx+dy*dy+dz*dz>(max+radius)**2)return false;
    const depth=dot(view.forward);
    return depth>=-radius &&
      Math.abs(dot(view.right)) < Math.max(0,depth)*view.tanHalf*(canvas.width/canvas.height)+radius*1.4 &&
      Math.abs(dot(view.up)) < Math.max(0,depth)*view.tanHalf+radius*1.4;
  }

  function setWorld(next) {
    const uploaded = [];
    try {
      for (const mesh of next.meshes) uploaded.push(upload(mesh));
    } catch (error) {
      retire(uploaded);
      throw error;
    }
    retire(worldMeshes);
    worldMeshes = uploaded;
    world = next;
    env = { ...LAND, ...next.environment };
    sunDirection = unit(...env.sunDirection);
  }

  function setVehicles(next) {
    const uploaded = [];
    const load = mesh => {
      const item = upload(mesh);
      uploaded.push(item);
      return item;
    };
    let selected;
    try {
      selected = next.map(model => ({
        body: model.body.map(load),
        wheel: model.wheel ? load(model.wheel) : null,
        wheelMetal: model.wheelMetal ? load(model.wheelMetal) : null,
        wheelOffsets: model.wheelOffsets || [],
      }));
    } catch (error) {
      retire(uploaded);
      throw error;
    }
    for (const model of models) {
      retire(model.body);
      if (model.wheel) release(model.wheel.buffer);
      if (model.wheelMetal) release(model.wheelMetal.buffer);
    }
    models = selected;
    spins.clear();
    timeBefore = null;
  }

  let mainProgram, skyProgram, effectProgram, streakProgram, skyBuffer, effectsBuffer, crystal, shadowProxy;
  try {
    mainProgram = addProgram(meshVertex, meshFragment, ["aPosition", "aNormal", "aColor"], [
      "uViewProjection", "uModel", "uEye", "uSunDirection", "uSunColor", "uFogColor", "uFogRange",
      "uAmbient", "uTime", "uEmissive", "uRoughness", "uOpacity", "uSurface",
      "uSkyTop", "uSkyBottom", "uGrade", "uCar", "uCarHeading", "uLightMatrix", "uShadowMap", "uShadowTexel", "uPortrait",
    ]);
    skyProgram = addProgram(screenVertex, skyFragment, ["aPosition"], [
      "uForward", "uRight", "uUp", "uSkyTop", "uSkyBottom", "uSunDirection", "uSunColor",
      "uAspect", "uTanHalf", "uTime", "uClouds", "uStars", "uFogColor", "uHorizon", "uHorizonSeed",
      "uGrade",
    ]);
    effectProgram = addProgram(effectVertex, effectFragment, ["aPosition", "aUv", "aColor"], ["uViewProjection"]);
    if (!reducedMotion) streakProgram = addProgram(screenVertex, streakFragment, ["aPosition"], ["uPower", "uTime", "uAspect"]);
    skyBuffer = allocate(new Float32Array([-1, -1, 3, -1, -1, 3]));
    effectsBuffer = allocate(effectsBatch.data.byteLength, gl.DYNAMIC_DRAW);
    for (const [kind, faces] of Object.entries(fixtures)) {
      fixtureModels[kind] = upload(fixtureMesh(faces, {
        roughness: kind === "slick" ? .24 : .56,
        emissive: kind === "item" ? .48 : .12,
      }));
    }
    crystal = upload(crystalMesh());
    shadowProxy = upload(kartShadowProxy());
    gl.enableVertexAttribArray(0);
    gl.disable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1);
  } catch (error) {
    dispose();
    throw error;
  }

  function resize(width, height, deviceRatio = 1) {
    if (!width || !height) return false;
    let cap = width < 650 ? 1.6 : 1.65;
    let pixelBudget = 1_560_000;
    if (quality === "low") { cap = 1; pixelBudget = 860_000; }
    else if (quality === "high") { cap = 2; pixelBudget = 2_550_000; }
    const ratio = Math.min(deviceRatio, cap, Math.sqrt(pixelBudget / (width * height)), maxSize / Math.max(width, height));
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (w !== canvas.width) canvas.width = w;
    if (h !== canvas.height) canvas.height = h;
    stats.width = w;
    stats.height = h;
    return true;
  }

  function triangles(count) {
    gl.drawArrays(gl.TRIANGLES, 0, count);
    stats.drawCalls++;
    stats.triangles += count / 3;
  }

  function setQuality(next) {
    quality = next === "high" || next === "low" ? next : "auto";
  }

  function updateShadow() {
    const requested = quality === "low" ? 0 : Math.min(quality === "high" ? 768 : 512, maxSize);
    if (requested === shadowSize) return;
    shadowSize = requested;
    shadow?.release();
    shadow = requested >= 128 ? allocateSunShadow(gl, requested) : null;
    if (shadow && !shadowProgram) {
      try {
        shadowProgram = addProgram(depthVertex, depthFragment, ["aPosition"], ["uLightMatrix", "uModel"]);
      } catch {
        shadow.release();
        shadow = null;
      }
    }
    stats.shadowResolution = shadow?.size ?? 0;
  }

  function castMesh(mesh, matrix) {
    gl.uniformMatrix4fv(shadowProgram.u.uModel, false, matrix);
    gl.bindBuffer(array, mesh.buffer);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
    triangles(mesh.count);
  }

  function renderSunShadow(camera, vehicles) {
    shadowReady = false;
    updateShadow();
    if (!shadow || !playerLight || Math.abs(camera.y - playerLight.y) > 22 || grade[2] > .75) return;
    const extent = quality === "high" ? 32 : 24;
    const sin = Math.sin(playerLight.yaw), cos = Math.cos(playerLight.yaw);
    const focus = [playerLight.x + sin * 5, playerLight.y, playerLight.z + cos * 5];
    lightMatrix(sunMatrix, focus, sunDirection, extent, shadow.size);
    // A caster may be up-sun of the visible road. Test its light-space x/y
    // bounds rather than clipping against the viewer's camera.
    const xAxis = [sunMatrix[0], sunMatrix[4], sunMatrix[8]];
    const yAxis = [sunMatrix[1], sunMatrix[5], sunMatrix[9]];
    const coordinate = (center, axis, offset) => center[0] * axis[0] + center[1] * axis[1] + center[2] * axis[2] + offset;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.framebuffer);
    gl.viewport(0, 0, shadow.size, shadow.size);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shadowProgram.handle);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.uniformMatrix4fv(shadowProgram.u.uLightMatrix, false, sunMatrix);
    const trianglesBefore = stats.triangles;
    for (const mesh of worldMeshes) {
      if (mesh.surface === 1 || mesh.surface === 2 || mesh.surface === 3 || mesh.emissive > .26) continue;
      const bounds = mesh.bounds;
      if (!bounds) continue;
      const fringe = bounds.radius / extent;
      if (fringe > 2.1) continue;
      if (Math.abs(coordinate(bounds.center, xAxis, sunMatrix[12])) > 1 + fringe ||
          Math.abs(coordinate(bounds.center, yAxis, sunMatrix[13])) > 1 + fringe) continue;
      if (stats.triangles - trianglesBefore > (quality === "high" ? 72_000 : 36_000)) break;
      castMesh(mesh, identity);
    }
    for (const car of vehicles) {
      if (car.ghost || Math.hypot(car.x - focus[0], car.z - focus[2]) > extent + 13) continue;
      const model = models[(car.model ?? car.id) % models.length] || models[0];
      if (!model) continue;
      transform(bodyMatrix, car.x, car.y, car.z, car.yaw, car.roll || 0, car.pitch || 0);
      const close = car.id === 0 && Math.hypot(camera.x - car.x, camera.z - car.z) < 21;
      if (!close) {
        castMesh(shadowProxy, bodyMatrix);
        continue;
      }
      for (const mesh of model.body) if (mesh.surface === 8 || mesh.surface === 4 || mesh.surface === 5) castMesh(mesh, bodyMatrix);
      if (!model.wheel) continue;
      for (const offset of model.wheelOffsets) {
        wheelTransform(wheelMatrix, bodyMatrix, offset, 0, 0);
        castMesh(model.wheel, wheelMatrix);
      }
    }
    stats.shadowTriangles = stats.triangles - trianglesBefore;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    shadowReady = true;
  }

  function screen(program) {
    gl.useProgram(program.handle);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.bindBuffer(array, skyBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  function sky(view, aspect, time) {
    const u = skyProgram.u;
    screen(skyProgram);
    gl.uniform3fv(u.uForward, view.forward);
    gl.uniform3fv(u.uRight, view.right);
    gl.uniform3fv(u.uUp, view.up);
    gl.uniform3fv(u.uSkyTop, env.skyTop);
    gl.uniform3fv(u.uSkyBottom, env.skyBottom);
    gl.uniform3fv(u.uSunDirection, sunDirection);
    gl.uniform3fv(u.uSunColor, env.sun);
    gl.uniform1f(u.uTanHalf, view.tanHalf);
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform1f(u.uTime, reducedMotion ? 0 : time);
    gl.uniform1f(u.uClouds, env.clouds);
    gl.uniform1f(u.uStars, env.stars);
    gl.uniform3fv(u.uFogColor, env.fog);
    const { height, ruggedness, forest, aurora, seed } = env.horizon ?? LAND.horizon;
    gl.uniform4f(u.uHorizon, height, ruggedness, forest, aurora);
    gl.uniform1f(u.uHorizonSeed, seed);
    gl.uniform4f(u.uGrade, ...grade);
    triangles(3);
  }

  function meshProgram(view, camera, time) {
    const u = mainProgram.u;
    gl.useProgram(mainProgram.handle);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    eye[0] = camera.x;
    eye[1] = camera.y;
    eye[2] = camera.z;
    gl.uniformMatrix4fv(u.uViewProjection, false, view.viewProjection);
    gl.uniform3fv(u.uEye, eye);
    gl.uniform3fv(u.uSunDirection, sunDirection);
    gl.uniform3fv(u.uSunColor, env.sun);
    gl.uniform3fv(u.uFogColor, env.fog);
    gl.uniform2f(u.uFogRange, env.fogNear, env.fogFar);
    gl.uniform1f(u.uAmbient, env.ambient);
    gl.uniform1f(u.uTime, reducedMotion ? 0 : time);
    gl.uniform3fv(u.uSkyTop, env.skyTop);
    gl.uniform3fv(u.uSkyBottom, env.skyBottom);
    gl.uniform4f(u.uGrade, ...grade);
    gl.uniform4f(u.uCar, playerLight?.x ?? 0, playerLight?.y ?? 0, playerLight?.z ?? 0, playerLight ? 1 : 0);
    gl.uniform2f(u.uCarHeading, Math.sin(playerLight?.yaw ?? 0), Math.cos(playerLight?.yaw ?? 0));
    gl.uniform1f(u.uPortrait, ["hero", "lobby", "finish-orbit"].includes(camera.shot) ? 1 : 0);
    gl.uniform1f(u.uShadowTexel, shadowReady ? shadow.texel : 0);
    if (shadowReady) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, shadow.texture);
      gl.uniform1i(u.uShadowMap, 0);
      gl.uniformMatrix4fv(u.uLightMatrix, false, sunMatrix);
    }
  }

  function drawMesh(mesh, matrix, opacity = 1) {
    const u = mainProgram.u;
    gl.uniformMatrix4fv(u.uModel, false, matrix);
    gl.uniform1f(u.uEmissive, mesh.emissive);
    gl.uniform1f(u.uRoughness, mesh.roughness);
    gl.uniform1f(u.uSurface, mesh.surface);
    gl.uniform1f(u.uOpacity, opacity);
    gl.bindBuffer(array, mesh.buffer);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
    triangles(mesh.count);
  }

  function drawFixtures(view,camera,time,effects){
    if (!world?.hazards) return;
    forVisibleFixtures(world,camera,time,effects,(kind,center,yaw,sx,sy,sz,frame)=>{
      if(!visible(center,Math.max(2.5,sz+.5),view,camera,138))return;
      transform(modelMatrix,...center,yaw,kind==="item"?0:frame.bank,kind==="item"?0:-Math.atan(frame.dy));
      for(let i=0;i<3;i++){
        modelMatrix[i]*=sx;
        modelMatrix[i+4]*=sy;
        modelMatrix[i+8]*=sz;
      }
      drawMesh(fixtureModels[kind], modelMatrix);
    });
  }

  function drawPickups(view, camera, pickupState, time) {
    if (!world?.pickupPositions) return;
    const forward = view.forward;
    for (const [index, pickup] of world.pickupPositions.entries()) {
      const flag = pickupState?.[pickup.index ?? index];
      if (flag === false || flag?.active === false) continue;
      const dx = pickup.x - camera.x, dy = pickup.y - camera.y, dz = pickup.z - camera.z;
      if (dx * dx + dy * dy + dz * dz > 112 ** 2 || forward[0] * dx + forward[1] * dy + forward[2] * dz < -2) continue;
      const cycle = reducedMotion ? 0 : time * 2.1 + index * 1.33;
      const hover = 0.86 + .17 * Math.sin(cycle);
      transform(modelMatrix, pickup.x, pickup.y + hover, pickup.z, cycle * .72, .12, .10);
      drawMesh(crystal, modelMatrix);
    }
  }

  function fxPass(view, additive) {
    const writer = effectsBatch;
    if (!writer.count) return;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(effectProgram.handle);
    gl.uniformMatrix4fv(effectProgram.u.uViewProjection, false, view.viewProjection);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.bindBuffer(array, effectsBuffer);
    gl.bufferSubData(array, 0, writer.data.subarray(0, writer.count));
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 12);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 36, 20);
    triangles(writer.count / 9);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    writer.count = 0;
  }

  function shadowFor(car) {
    const c = Math.cos(car.yaw), s = Math.sin(car.yaw);
    const roadHeight = Number.isFinite(car.roadY) ? car.roadY : car.y;
    const height = Math.max(0, car.y - roadHeight);
    const softness = Math.min(0.6, height * 0.17);
    const pitch = Number.isFinite(car.roadPitch) ? car.roadPitch : (car.pitch || 0);
    const bank = car.bank || 0;
    splat(effectsBatch, car.x, roadHeight + .065, car.z, c * (1.05 + softness), bank, -s * (1.05 + softness),
      s * (1.61 + softness), -pitch * 1.56, c * (1.61 + softness), SHADOW, .58 - softness * .55);
    splat(effectsBatch, car.x, roadHeight + .07, car.z, c * .68, bank * .63, -s * .68,
      s * 1.05, -pitch, c * 1.05, SHADOW, .28 - softness * .28);
    if (height > .46) return;
    const model = models[car.model ?? car.id];
    for (const [side, , forward] of model?.wheelOffsets ?? []) {
      splat(effectsBatch,
        car.x + c * side + s * forward, roadHeight + bank * side - pitch * forward + .062,
        car.z - s * side + c * forward, c * .24, bank * .24, -s * .24,
        s * .38, -pitch * .38, c * .38, SHADOW, .47 * (1 - height / .47));
    }
  }

  function drawCar(car, frameDelta, time) {
    const chosen = models[(car.model ?? car.id) % models.length] || models[0];
    if (!chosen) return;
    const y = car.y + (car.ghost ? .018 : 0);
    transform(bodyMatrix, car.x, y, car.z, car.yaw, car.roll || 0, car.pitch || 0);
    const alpha = car.ghost ? .41 + .05 * Math.sin(time * 3) : 1;
    for (const mesh of chosen.body) drawMesh(mesh, bodyMatrix, alpha);
    if (!chosen.wheel) return;
    const key = car.ghost ? "ghost" : car.id;
    const previous = spins.get(key) || 0;
    const spin = Number.isFinite(car.s) ? ((car.s / .35) % TAU) : (previous - car.speed * frameDelta / .35) % TAU;
    spins.set(key, Number.isFinite(spin) ? spin : 0);
    for (const offset of chosen.wheelOffsets) {
      const steer = offset[2] > 0 ? clamp(car.steer || 0, -1, 1) * .34 : 0;
      wheelTransform(wheelMatrix, bodyMatrix, offset, steer, spins.get(key));
      drawMesh(chosen.wheel, wheelMatrix, alpha);
      if (chosen.wheelMetal) drawMesh(chosen.wheelMetal, wheelMatrix, alpha);
    }
  }

  function trailsFor(car, view, time) {
    if (!car.drift && !car.boost && !car.offroad && !car.item) return;
    const { right: xAxis, up: yAxis } = view;
    const sy = Math.sin(car.yaw), cy = Math.cos(car.yaw);
    const tailX = car.x - sy * 1.26, tailZ = car.z - cy * 1.26;
    const boosting = car.boost > 0;
    const smoke = car.offroad && !boosting && !car.drift;
    const sign = car.steer < 0 ? -1 : 1;
    const trails = reducedMotion ? 2 : boosting ? 15 : smoke ? 6 : 10;
    for (let j = 0; j < trails; j++) {
      const path = ((j / trails + time * (boosting ? 3.1 : 2.85)) % 1 + 1) % 1;
      const across = j % 2 ? .60 : -.60;
      const along = path * (boosting ? 4.1 : 1.65);
      const scatter = across + sign * path * (boosting ? .18 : .57) + .17 * Math.sin(j * 2.4 + time * 11);
      const x = tailX - sy * along + cy * scatter;
      const z = tailZ - cy * along - sy * scatter;
      const groundBehind = car.y + (car.roadPitch || car.pitch || 0) * along;
      const y = groundBehind + .29 + path * (boosting ? .20 : smoke ? .73 : .39);
      const width = smoke ? .15 + path * .31 : .042 + (1 - path) * (boosting ? .17 : .091);
      const stretch = smoke ? width * 1.03 : width * (boosting ? 1.62 : 1.48);
      const color = boosting ? (j % 3 ? TURBO : CREAM) : smoke ? DUST : (j % 3 ? SPARK : CREAM);
      const strength = (smoke ? .15 : boosting ? .56 : .58) * (1 - path) * (reducedMotion ? .46 : 1);
      splat(effectsBatch, x, y, z, xAxis[0] * width, xAxis[1] * width, xAxis[2] * width,
        yAxis[0] * stretch, yAxis[1] * stretch, yAxis[2] * stretch, color, strength);
    }
  }

  function glowRing(car, right, forward, height, width, depth, vertical, color, intensity, count, phase) {
    const base = vertical ? car.y + height : (car.roadY ?? car.y) + height;
    const stride = TAU / count;
    for (let i = 0; i < count; i++) {
      const angle = i * stride + phase;
      const c = Math.cos(angle), s = Math.sin(angle);
      const across = width * c;
      const longitudinal = vertical ? 0 : depth * s;
      const x = car.x + right[0] * across + forward[0] * longitudinal;
      const y = base + (vertical ? depth * s : (car.bank || 0) * across - (car.roadPitch || 0) * longitudinal);
      const z = car.z + right[2] * across + forward[2] * longitudinal;
      const span = stride * .88;
      const tx = (-right[0] * width * s + (vertical ? 0 : forward[0] * depth * c)) * span;
      const ty = (vertical ? depth * c : 0) * span;
      const tz = (-right[2] * width * s + (vertical ? 0 : forward[2] * depth * c)) * span;
      const spread = vertical ? .089 : .13;
      const nx = (right[0] * c + (vertical ? 0 : forward[0] * s)) * spread;
      const ny = vertical ? s * spread : 0;
      const nz = (right[2] * c + (vertical ? 0 : forward[2] * s)) * spread;
      splat(effectsBatch, x, y, z, tx, ty, tz, nx, ny, nz, color,
        intensity * (0.68 + 0.32 * Math.sin(angle * 2 + phase)));
    }
  }

  function powerEffects(car, view, time, calm) {
    if (!(car.shield > 0 || car.magnet > 0 || car.grip > 0 || car.pulse > 0 || car.spring > 0)) return;
    const c = Math.cos(car.yaw), s = Math.sin(car.yaw);
    const right = [c, 0, -s], forward = [s, 0, c];
    const spin = calm ? 0 : time;
    if (car.shield > 0) {
      glowRing(car, right, forward, 1.15, 1.44, 1.18, true, GUARD, .56, 28, spin * 1.1);
      if (!calm) glowRing(car, forward, right, 1.15, 1.78, 1.18, true, CREAM, .31, 25, -spin * .85);
    }
    if (car.grip > 0) {
      for (const side of [-.91, .91]) {
        splat(effectsBatch, car.x + c * side, (car.roadY ?? car.y) + .12, car.z - s * side,
          c * .44, 0, -s * .44, s * 1.25, 0, c * 1.25, GRIP, .58);
      }
    }
    if (car.magnet > 0) {
      glowRing(car, right, forward, .22, 1.83, 2.14, false, TURBO, .42, 28, spin * 1.6);
      if (!calm) for (let i = 0; i < 10; i++) {
        const travel = (spin * 2.35 + i * .113) % 1;
        const radius = 2.95 * (1 - travel) + .38;
        const angle = i * 2.399 + spin * .43;
        const size = .038 + travel * .064;
        splat(effectsBatch, car.x + Math.cos(angle) * radius, car.y + .32 + travel * .74,
          car.z + Math.sin(angle) * radius, ...view.right.map(n => n * size), ...view.up.map(n => n * size),
          TURBO, .24 + travel * .47);
      }
    }
    if (car.pulse > 0 && !calm) {
      const expansion = 1 - Math.min(.9, car.pulse);
      glowRing(car, right, forward, .27, 1.6 + expansion * 7, 1.6 + expansion * 7,
        false, ECHO, .66 * Math.min(1, car.pulse * 4), 44, 0);
    }
    if (car.spring > 0 && !calm) {
      glowRing(car, right, forward, .16, 1.05, 1.52, false, SPRING, .56 * Math.min(1, car.spring * 3), 28, spin * 1.6);
    }
  }

  function streak(aspect, time, power) {
    if (!streakProgram || power < .015) return;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    screen(streakProgram);
    gl.uniform1f(streakProgram.u.uPower, power);
    gl.uniform1f(streakProgram.u.uTime, time);
    gl.uniform1f(streakProgram.u.uAspect, aspect);
    triangles(3);
    gl.disable(gl.BLEND);
  }

  function weatherPass(view, camera, time) {
    const rain = env.weather === "rain";
    const snow = env.weather === "snow";
    const ash = env.weather === "ash";
    if (!(rain || snow || ash)) return;
    const count = quality === "high" ? 51 : rain ? 34 : 27;
    const shade = rain ? [.67, .77, .92] : snow ? [.82, .91, 1.] : [.94, .61, .39];
    for (let i = 0; i < count; i++) {
      const scatter = Math.sin(i * 87.322 + 3.37) * .5;
      const across = Math.sin(i * 3.581 + 2.10) * .77;
      const drop = ((i * .73213 + time * (rain ? 2.22 : snow ? .42 : -.28) * (.87 + scatter * .33)) % 1 + 1) % 1;
      const far = 1.15 + (i / count) ** 2 * 23.0;
      const x = camera.x + view.forward[0] * far + view.right[0] * across * far;
      const y = camera.y + view.forward[1] * far + (1 - 2 * drop) * far * .63;
      const z = camera.z + view.forward[2] * far + view.right[2] * across * far;
      const scale = (rain ? .008 : .032) * (1 + i / count);
      const height = rain ? .06 + far * .031 : scale * .93;
      const lean = rain ? height * .22 : 0;
      const alpha = (rain ? .22 : snow ? .32 : .32) * (1 - i / count * .65) *
        Math.min(1, drop * 12, (1 - drop) * 12);
      splat(effectsBatch, x, y, z, ...view.right.map(value => value * scale),
        ...view.up.map((value, axis) => value * height + view.right[axis] * lean), shade, alpha);
    }
  }

  function draw({ camera, vehicles = [], time = 0, boost, effects } = {}) {
    const start = typeof performance === "undefined" ? 0 : performance.now();
    if (!camera || disposed || gl.isContextLost()) {
      if (!disposed && canvas) stats.contextLost = gl.isContextLost();
      return false;
    }
    if (!drawable || !canvas.width || !canvas.height) return false;
    stats.drawCalls = 0;
    stats.triangles = 0;
    stats.shadowTriangles = 0;
    const aspect = canvas.width / canvas.height;
    const view = viewFor(camera, aspect, .09, Math.max(258, env.fogFar * 1.62));
    const dt = timeBefore === null ? 0 : clamp(time - timeBefore, 0, .067);
    timeBefore = time;
    playerLight = vehicles.find(car => car.id === 0 && !car.ghost) ?? null;
    grade[0] = clamp(env.exposure ?? 1, .72, 1.4);
    grade[1] = clamp(env.wetness ?? .3, 0, 1);
    grade[2] = Number.isFinite(env.timeOfDay) ? 1 - clamp(Math.sin((env.timeOfDay - .25) * TAU) * 2 + .44, 0, 1) : 0;
    grade[3] = quality === "low" ? 0 : env.weather === "mist" || env.weather === "rain" ? .82 : env.weather === "ash" ? .65 : .34;
    renderSunShadow(camera, vehicles);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    sky(view, aspect, time);
    gl.enable(gl.DEPTH_TEST);
    meshProgram(view, camera, time);
    for (const mesh of worldMeshes) {
      if(!mesh.bounds || visible(mesh.bounds.center,mesh.bounds.radius,view,camera)) drawMesh(mesh, identity);
    }
    drawPickups(view, camera, effects?.pickups, time);
    drawFixtures(view,camera,time,effects);

    const visibleCars = [];
    const ghosts = [];
    for (const car of vehicles) {
      if (!visible([car.x, car.y + 1.05, car.z], 3.7, view, camera, 150)) continue;
      if (car.ghost) { ghosts.push(car); continue; }
      if (camera.hidePlayer && car.id === 0) continue;
      visibleCars.push(car);
      shadowFor(car);
    }
    fxPass(view, false);
    meshProgram(view, camera, time);
    for (const car of visibleCars) drawCar(car, dt, time);
    if (ghosts.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const car of ghosts) drawCar(car, dt, time);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    const calm = reducedMotion || effects?.calm;
    for (const car of visibleCars) powerEffects(car, view, time, calm);
    if (!calm) for (const car of visibleCars) trailsFor(car, view, time);
    fxPass(view, true);
    if (!calm) weatherPass(view, camera, time);
    fxPass(view, false);
    const boostPower = boost === true ? 1 : typeof boost === "number" ? clamp(boost, 0, 1) :
      (vehicles[0]?.boost > 0 ? .86 : 0);
    streak(aspect, time, boostPower);
    if (start) stats.frameMs = performance.now() - start;
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    drawable = false;
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const { handle } of programs) gl.deleteProgram(handle);
    shadow?.release();
    shadow = null;
    buffers.clear();
    programs.length = 0;
    worldMeshes = [];
    models = [];
    world = null;
  }

  return { setWorld, setVehicles, setQuality, draw, resize, dispose, stats };
}
