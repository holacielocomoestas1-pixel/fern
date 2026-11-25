// W3C standard button positions are physical; the printed symbols vary by controller.
const actions = new Map([
  [0, "item"], [1, "boost"], [2, "hop"], [3, "quiz"], [9, "pause"], [11, "camera"],
]);
const button = (pad, index) => {
  const value = pad.buttons?.[index];
  if (typeof value === "number") return value;
  return Math.max(Number(value?.value) || 0, value?.pressed ? 1 : 0);
};
const clamp = value => Math.max(-1, Math.min(1, value));

function axis(value) {
  const limited = clamp(Number(value) || 0);
  const deadzone = .16;
  const amount = (Math.abs(limited) - deadzone) / (1 - deadzone);
  return amount > 0 ? Math.sign(limited) * amount : 0;
}

export function createGamepad(getPads = () => globalThis.navigator?.getGamepads?.()) {
  let previous = new Set();
  let slot = null;
  let discardEdges = true;
  function read() {
    let devices;
    try { devices = Array.from(getPads() || []); } catch { devices = []; }
    const valid = devices.filter(device => device?.connected !== false && device?.mapping === "standard");
    const device = valid.find(candidate => candidate.index === slot) || valid[0];
    const pressed = new Set();
    const held = new Set();
    if (!device) {
      slot = null;
      previous.clear();
      discardEdges = true;
      return { connected: false, steer: 0, brake: 0, drift: false, rear: false, pressed, held };
    }
    if (device.index !== slot) discardEdges = true;
    slot = device.index;
    for (const [index, action] of actions) {
      if (button(device, index) <= .55) continue;
      held.add(action);
      if (!discardEdges && !previous.has(action)) pressed.add(action);
    }
    previous = held;
    discardEdges = false;
    const digital = Number(button(device, 15) > .55) - Number(button(device, 14) > .55);
    return {
      connected: true, steer: digital || axis(device.axes?.[0]), brake: Math.max(0, clamp(button(device, 6))),
      drift: Math.max(button(device, 5), button(device, 7)) > .35,
      rear: button(device, 4) > .5, pressed, held,
    };
  }
  return { read, suppress() { discardEdges = true; } };
}
