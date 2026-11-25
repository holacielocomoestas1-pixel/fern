import assert from "node:assert/strict";
import test from "node:test";
import { createAudio, transmission, RACE_PULSE } from "./audio.mjs";
import { COURSES } from "./courses.mjs";
import { POWER_VOICES, SOUND_WORLDS } from "./sound-worlds.mjs";

const settle = () => new Promise(resolve => setImmediate(resolve));
class AudioGraph {
  static latest;
  state = "suspended";
  sampleRate = 48000;
  currentTime = 1;
  destination = {};
  nodes = [];
  constructor() { AudioGraph.latest = this; }
  node(kind, params = []) {
    const calls = [];
    const result = {
      kind, calls, ended: false, disconnected: false,
      connect(to) { assert.ok(to); return to; },
      disconnect() { this.disconnected = true; },
      start(time = 0) { this.startedAt = time; },
      stop(time) { this.endsAt = time; this.ended = time === undefined; },
    };
    for (const name of params) {
      const record = (time, ...values) => {
        assert.ok([time, ...values].every(Number.isFinite), name);
        calls.push([name, time, ...values]);
      };
      result[name] = { value: 0, setValueAtTime: record, setTargetAtTime: record, exponentialRampToValueAtTime: record };
    }
    this.nodes.push(result);
    return result;
  }
  createDynamicsCompressor() { return this.node("limiter", ["threshold", "knee", "ratio", "attack", "release"]); }
  createGain() { return this.node("gain", ["gain"]); }
  createDelay() { return this.node("delay", ["delayTime"]); }
  createBiquadFilter() { return this.node("filter", ["frequency", "Q"]); }
  createStereoPanner() { return this.node("panner", ["pan"]); }
  createOscillator() { return this.node("oscillator", ["frequency"]); }
  createBufferSource() { return this.node("buffer"); }
  createBuffer(channels, length, rate) {
    assert.equal(channels, 1);
    const data = new Float32Array(length);
    return { duration: length / rate, getChannelData: () => data };
  }
  async resume() { await settle(); if (this.state !== "closed") this.state = "running"; }
  async suspend() { await settle(); if (this.state !== "closed") this.state = "suspended"; }
  async close() { this.state = "closed"; }
  beforeVoices(action) {
    const before = this.nodes.length;
    action();
    return this.nodes.slice(before).filter(node => node.kind === "oscillator" && node.calls.length);
  }
}

test("the race pulse is a soft short tap on one beat only, never a heartbeat", () => {
  assert.deepEqual(RACE_PULSE.beats, [0]);
  assert.ok(RACE_PULSE.volume <= .06, `pulse volume ${RACE_PULSE.volume}`);
  assert.ok(RACE_PULSE.seconds <= .08, `pulse length ${RACE_PULSE.seconds}`);
});

test("transmission shifts up, preserves gear in the hysteresis band, then downshifts", () => {
  const idle = transmission(0);
  const first = transmission(8.8, idle.gear);
  const second = transmission(9, first.gear);
  assert.equal(first.gear, 0);
  assert.equal(second.gear, 1);
  assert.ok(second.firing < first.firing);
  assert.equal(transmission(8, second.gear).gear, 1);
  assert.equal(transmission(6, second.gear).gear, 0);
  assert.equal(transmission(47).gear, 4);
});

test("all tracks play original differentiable themes, physical sounds and balanced optional quiz cues", async () => {
  const document = new EventTarget();
  const audio = createAudio({ AudioContext: AudioGraph, document });
  try {
    assert.equal(await audio.unlock(), true);
    const graph = AudioGraph.latest;
    assert.equal(Object.keys(SOUND_WORLDS).length, COURSES.length);
    const themes = new Set();
    for (const world of COURSES) {
      audio.setWorld(world);
      const voices = graph.beforeVoices(() => audio.play("cinematic", "grid-reveal"));
      assert.equal(voices.length, 2, world.id);
      themes.add(voices[0].calls[0][1]);
      audio.setPhase("intro");
      audio.play("cinematic", "flyover");
      audio.play("cinematic", "landmark-pass");
      audio.play("cinematic", "hero");
      audio.setPhase("grid");
      audio.play("countdown", 3);
      audio.setPhase("run");
      for (let frame = 0; frame < 8; frame++) {
        graph.currentTime += .12;
        audio.update({ speed: 5.4 * frame, steer: .65, brake: frame > 6, airborne: frame % 3 === 0 ? .6 : 0, drift: frame === 5 });
      }
      audio.setPhase("menu");
      for (const node of graph.nodes) if (typeof node.onended === "function") node.onended();
    }
    assert.ok(themes.size >= 9);
    const powers = new Set();
    for (const kind of Object.keys(POWER_VOICES)) {
      const voices = graph.beforeVoices(() => audio.play("powerUse", { kind, level: 2 }));
      assert.equal(voices.length, 3);
      powers.add(voices[0].calls[0][1]);
    }
    assert.equal(powers.size, 6);
    audio.setPhase("quiz");
    assert.equal(graph.beforeVoices(() => audio.play("hop")).length, 0);
    assert.equal(graph.beforeVoices(() => audio.play("powerQuizEnd", { correct: false, skipped: true })).length, 0);
    assert.equal(graph.beforeVoices(() => audio.play("powerQuizEnd", { correct: false })).length, 1);
    assert.equal(graph.beforeVoices(() => audio.play("powerUpgrade")).length, 4);
    audio.setPhase("pause");
    assert.equal(graph.beforeVoices(() => audio.play("hit")).length, 0);
  } finally { audio.dispose(); }
  assert.equal(AudioGraph.latest.state, "closed");
  assert.ok(AudioGraph.latest.nodes.every(node => node.disconnected));
});

test("immediate visibility and mute changes converge even while context transitions are pending", async () => {
  const document = new EventTarget();
  document.hidden = false;
  const audio = createAudio({ AudioContext: AudioGraph, document });
  try {
    await audio.unlock();
    const graph = AudioGraph.latest;
    audio.setPhase("run");
    document.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    document.hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    await settle();
    assert.equal(graph.state, "running");
    audio.setMuted(true);
    await settle();
    assert.equal(graph.state, "suspended");
    audio.setMuted(false);
    await settle();
    assert.equal(graph.state, "running");
  } finally { audio.dispose(); }
});
