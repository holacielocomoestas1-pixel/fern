import { unit } from "./render-math.mjs";

export const depthVertex = `
attribute vec3 aPosition;
uniform mat4 uLightMatrix;
uniform mat4 uModel;
void main() {
  gl_Position = uLightMatrix * uModel * vec4(aPosition, 1.0);
}
`;

export const depthFragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
void main() {
  // Two 8-bit channels hold the depth, without a WebGL depth texture extension.
  float depth = min(gl_FragCoord.z, .99998);
  float fine = fract(depth * 255.0);
  gl_FragColor = vec4(depth - fine / 255.0, fine, 0.0, 1.0);
}
`;

export function allocateSunShadow(gl, size) {
  const { FRAMEBUFFER, TEXTURE_2D, RENDERBUFFER } = gl;
  if (!Number.isInteger(FRAMEBUFFER) || typeof gl.createFramebuffer !== "function") return null;
  let framebuffer, texture, depth;
  let good = false;
  const release = () => {
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    if (texture) gl.deleteTexture(texture);
    if (depth) gl.deleteRenderbuffer(depth);
    framebuffer = texture = depth = null;
  };
  try {
    framebuffer = gl.createFramebuffer();
    texture = gl.createTexture();
    depth = gl.createRenderbuffer();
    if (!framebuffer || !texture || !depth) return null;
    gl.bindTexture(TEXTURE_2D, texture);
    gl.texParameteri(TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(RENDERBUFFER, depth);
    gl.renderbufferStorage(RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
    gl.bindFramebuffer(FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(FRAMEBUFFER, gl.COLOR_ATTACHMENT0, TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(FRAMEBUFFER, gl.DEPTH_ATTACHMENT, RENDERBUFFER, depth);
    good = gl.checkFramebufferStatus(FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    return good ? { framebuffer, texture, size, texel: 1 / size, release } : null;
  } catch {
    return null;
  } finally {
    try {
      gl.bindTexture(TEXTURE_2D, null);
      gl.bindRenderbuffer(RENDERBUFFER, null);
      gl.bindFramebuffer(FRAMEBUFFER, null);
    } finally {
      if (!good) release();
    }
  }
}

export function lightMatrix(out, target, direction, extent, textureSize) {
  const forward = direction.map(value => -value);
  const right = unit(direction[2], 0, -direction[0]);
  if (!Math.hypot(right[0], right[2])) right[0] = 1;
  const up = [
    forward[1] * right[2] - forward[2] * right[1],
    forward[2] * right[0] - forward[0] * right[2],
    forward[0] * right[1] - forward[1] * right[0],
  ];
  const depth = 88;
  const stride = 2 * extent / textureSize;
  const p = v => v[0] * target[0] + v[1] * target[1] + v[2] * target[2];
  const snap = value => Math.round(value / stride) * stride;
  for (let i = 0; i < 3; i++) {
    out[i * 4] = right[i] / extent;
    out[i * 4 + 1] = up[i] / extent;
    out[i * 4 + 2] = forward[i] / depth;
    out[i * 4 + 3] = 0;
  }
  out[12] = -snap(p(right)) / extent;
  out[13] = -snap(p(up)) / extent;
  out[14] = -p(forward) / depth;
  out[15] = 1;
  return out;
}
