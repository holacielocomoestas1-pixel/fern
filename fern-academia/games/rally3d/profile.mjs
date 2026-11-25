import { COURSES } from "./courses.mjs";

const key = "fern-rally-touring-v2";
const previousKey = "fern-rally-3d-v1";
const tracks = COURSES.map(course => course.id);
const difficulties = ["rookie", "pro"];
const limit = 1800;

export const POINTS = [15, 12, 10, 8, 6, 4];

const empty = () => ({ settings: { sound: true, difficulty: "rookie", motion: "system", quality: "auto", camera: "chase" }, records: {}, ghosts: {} });

function safeGhost(frames) {
  return Array.isArray(frames) && frames.length > 1 && frames.length <= limit &&
    frames.every((row, index) => Array.isArray(row) && row.length === 6 &&
      row.every(value => Number.isFinite(value) && Math.abs(value) < 10_000) &&
      (index === 0 ? row[0] >= 0 : row[0] > frames[index - 1][0]));
}

function validRecord(record) {
  return record && typeof record === "object" &&
    Number.isFinite(record.time) && record.time > 0 && record.time < 7200 &&
    (record.rank === null || Number.isInteger(record.rank) && record.rank >= 1 && record.rank <= 6);
}

function copySettings(destination, source) {
  if (difficulties.includes(source?.difficulty)) destination.difficulty = source.difficulty;
  if (typeof source?.sound === "boolean") destination.sound = source.sound;
  if (["system", "calm"].includes(source?.motion)) destination.motion = source.motion;
  if (["auto", "high", "low"].includes(source?.quality)) destination.quality = source.quality;
  if (["chase", "wide", "bumper"].includes(source?.camera)) destination.camera = source.camera;
}

function read(storage, fallback) {
  let raw;
  try {
    raw = storage.getItem(key);
    if (!raw) return fallback;
    raw = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!raw || Array.isArray(raw) || typeof raw !== "object") return fallback;
  const state = empty();
  copySettings(state.settings, raw.settings);
  for (const track of tracks) {
    for (const mode of ["race", "cup", "trial", "study"]) {
      const id = track + "-" + mode;
      if (validRecord(raw.records?.[id])) state.records[id] = raw.records[id];
    }
    if (safeGhost(raw.ghosts?.[track])) state.ghosts[track] = raw.ghosts[track];
  }
  return state;
}

export function profile(storage) {
  const defaults = empty();
  try {
    if (JSON.parse(storage.getItem("fern-academia-v1") || "null")?.sound === false) {
      defaults.settings.sound = false;
    }
  } catch {
    // Storage may be blocked in a private browser or embed.
  }
  try {
    // The course geometry changed. Preferences carry over, old racing lines do not.
    copySettings(defaults.settings, JSON.parse(storage.getItem(previousKey) || "null")?.settings);
  } catch { /* Corrupt or unavailable legacy data is optional. */ }
  let state = read(storage, defaults);
  let durable = true;
  const mutate = change => {
    if (durable) state = read(storage, state);
    change(state);
    try {
      if (durable) storage.setItem(key, JSON.stringify(state));
    } catch {
      durable = false;
    }
  };
  return {
    settings: () => state.settings,
    setSetting: (name, value) => mutate(s => copySettings(s.settings, { [name]: value })),
    best: (track, mode) => state.records[track + "-" + mode],
    ghost: track => state.ghosts[track] || null,
    save(track, mode, result, samples) {
      if (!tracks.includes(track) || !["race", "cup", "trial", "study"].includes(mode)) return false;
      const row = { time: result.duration, rank: mode === "trial" ? null : result.position };
      if (!validRecord(row)) return false;
      let improved = false;
      mutate(s => {
        const id = track + "-" + mode;
        if (s.records[id]?.time <= row.time) return;
        improved = true;
        s.records[id] = row;
        if (mode === "trial") {
          if (safeGhost(samples)) s.ghosts[track] = samples;
          else delete s.ghosts[track];
        }
      });
      return improved;
    },
  };
}

export function ghostAt(samples, time) {
  if (!samples?.length || time > samples[samples.length - 1][0]) return null;
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (samples[middle][0] <= time) low = middle;
    else high = middle;
  }
  const a = samples[low];
  const b = samples[high];
  const blend = Math.min(1, Math.max(0, (time - a[0]) / ((b[0] - a[0]) || 1)));
  const lerp = index => a[index] + (b[index] - a[index]) * blend;
  const rotation = Math.atan2(Math.sin(b[4] - a[4]), Math.cos(b[4] - a[4]));
  return { id: 0, ghost: true, x: lerp(1), y: lerp(2), z: lerp(3), yaw: a[4] + rotation * blend, speed: lerp(5), roll: 0, steer: 0, boost: 0, drift: false };
}

export function cupRank(rows) {
  return rows.map((points, id) => ({ id, points })).sort((a, b) => b.points - a.points || a.id - b.id);
}

export function stamp(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const hundredths = Math.round(seconds * 100);
  const minutes = Math.floor(hundredths / 6000);
  const secs = Math.floor(hundredths / 100) % 60;
  const decimals = hundredths % 100;
  return minutes + ":" + String(secs).padStart(2, "0") + "." + String(decimals).padStart(2, "0");
}
