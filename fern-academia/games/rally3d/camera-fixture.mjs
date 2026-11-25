export const geometry = {
  halfWidth: 6.4,
  length: 2 * Math.PI * 76,
  frame(s) {
    const a = s / 76;
    return {
      x: Math.sin(a) * 76, y: 1 + 3.1 * Math.sin(a * 2), z: -Math.cos(a) * 76,
      dx: Math.cos(a), dy: .08 * Math.cos(a * 2), dz: Math.sin(a),
      rx: Math.sin(a), rz: -Math.cos(a), bank: .07 * Math.cos(a), curve: 1 / 76,
    };
  },
};

export function cameraSubject(distance, speed = 27, offset = .6, boost = 0) {
  const f = geometry.frame(distance);
  return {
    course: geometry,
    player: { s: distance, offset, speed, boost },
    pose: {
      x: f.x + f.rx * offset, y: f.y + Math.tan(f.bank) * offset, z: f.z + f.rz * offset,
      yaw: Math.atan2(f.dx, f.dz), steer: .46, roll: .08, speed, boost,
    },
  };
}
