export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function unit(x, y, z) {
  const inverse = 1 / (Math.hypot(x, y, z) || 1);
  return [x * inverse, y * inverse, z * inverse];
}

// The game uses +Z forward and +X right, including in road-local coordinates.
export function viewFor(camera, aspect, near, far) {
  const forward = unit(camera.tx - camera.x, camera.ty - camera.y, camera.tz - camera.z);
  if (Math.hypot(...forward) < 0.5) forward[2] = 1;
  const [fx, fy, fz] = forward;
  let right = unit(fz, 0, -fx);
  if (Math.hypot(...right) < 0.5) right = [1, 0, 0];
  const [rx, ry, rz] = right;
  let up = [fy * rz - fz * ry, fz * rx - fx * rz, fx * ry - fy * rx];
  if (camera.roll) {
    const rotatedRight = right;
    const c = Math.cos(camera.roll);
    const s = Math.sin(camera.roll);
    right = right.map((v, i) => c * v + s * up[i]);
    up = up.map((v, i) => c * v - s * rotatedRight[i]);
  }
  const scaleY = 1 / Math.tan(clamp(camera.fov || 61, 23, 112) * Math.PI / 360);
  const scaleX = scaleY / (aspect || 1);
  const a = (far + near) / (far - near);
  const b = -2 * far * near / (far - near);
  const dotEye = vector => camera.x * vector[0] + camera.y * vector[1] + camera.z * vector[2];
  const [px, py, pz] = right;
  const [qx, qy, qz] = up;
  const d = -dotEye(forward);
  return {
    forward, right, up, tanHalf: 1 / scaleY,
    viewProjection: new Float32Array([
      px * scaleX, qx * scaleY, fx * a, fx,
      py * scaleX, qy * scaleY, fy * a, fy,
      pz * scaleX, qz * scaleY, fz * a, fz,
      -dotEye(right) * scaleX, -dotEye(up) * scaleY, a * d + b, d,
    ]),
  };
}

export function transform(out, x, y, z, yaw = 0, roll = 0, pitch = 0) {
  const yc = Math.cos(yaw);
  const ys = Math.sin(yaw);
  const rc = Math.cos(roll);
  const rs = Math.sin(roll);
  const pc = Math.cos(pitch);
  const ps = Math.sin(pitch);

  out[0] = yc * rc + ys * ps * rs;
  out[1] = pc * rs;
  out[2] = -ys * rc + yc * ps * rs;
  out[3] = 0;
  out[4] = -yc * rs + ys * ps * rc;
  out[5] = pc * rc;
  out[6] = ys * rs + yc * ps * rc;
  out[7] = 0;
  out[8] = ys * pc;
  out[9] = -ps;
  out[10] = yc * pc;
  out[11] = 0;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

export function wheelTransform(out, body, offset, turn, spin) {
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const r = Math.cos(spin);
  const t = Math.sin(spin);
  for (let i = 0; i < 3; i++) {
    out[i] = c * body[i] - s * body[8 + i];
    out[4 + i] = s * t * body[i] + r * body[4 + i] + c * t * body[8 + i];
    out[8 + i] = s * r * body[i] - t * body[4 + i] + c * r * body[8 + i];
    out[12 + i] = body[12 + i] + body[i] * offset[0] + body[4 + i] * offset[1] + body[8 + i] * offset[2];
  }
  out[3] = 0;
  out[7] = 0;
  out[11] = 0;
  out[15] = 1;
  return out;
}
