// Each score uses its own eight-note phrase, scale, harmony, percussion and room tone.
// Degrees are relative to the chord root. Rests leave space for the engine and cue tones.
const dorian = [0, 2, 3, 5, 7, 9, 10];
const major = [0, 2, 4, 5, 7, 9, 11];
const minor = [0, 2, 3, 5, 7, 8, 10];
const lydian = [0, 2, 4, 6, 7, 9, 11];
const mixolydian = [0, 2, 4, 5, 7, 9, 10];

function score(tempo, tonic, scale, chords, phrase, answer, instrument, air, detail, swing = .006) {
  return { tempo, tonic, scale, chords, phrase, answer, instrument, air, detail, swing };
}

export const SOUND_WORLDS = {
  moss: score(116, 50, major, [0, 3, 5, 4], [2, null, 4, 5, null, 4, null, 1], [1, 2, null, 4, 6, null, 4, 2], 'wood', [980, .055], 'songbird', .014),
  lantern: score(107, 45, dorian, [0, 3, 1, 4], [4, null, 6, null, 5, 2, null, 1], [2, null, 4, 1, null, 0, null, 3], 'silk', [1650, .035], 'nightbell', .009),
  river: score(124, 52, mixolydian, [0, 6, 3, 4], [2, 4, null, 6, null, 4, null, 5], [4, null, 2, 1, 3, null, 2, null], 'reed', [560, .095], 'surf', .019),
  mangrove: score(112, 48, dorian, [0, 2, 3, 1], [0, null, 3, 2, null, 0, 4, null], [null, 2, 4, null, 6, 5, null, 2], 'wood', [720, .062], 'kingfisher', .033),
  quarry: score(130, 43, minor, [0, 5, 3, 4], [0, null, 0, 2, null, 4, 1, null], [0, null, 5, 4, null, 2, 1, null], 'iron', [265, .084], 'hoist', .002),
  orchard: score(119, 53, lydian, [0, 1, 4, 0], [4, null, 5, 6, null, 2, null, 3], [2, 1, null, 3, null, 2, 0, null], 'silk', [1280, .047], 'blossom', .022),
  glacier: score(122, 49, dorian, [0, 6, 3, 2], [4, null, 1, null, null, 5, 4, 2], [null, 3, null, 4, 6, null, 2, 1], 'glass', [1500, .067], 'ice', .002),
  caldera: score(138, 44, minor, [0, 1, 5, 4], [0, 0, null, 4, 3, null, 1, 0], [2, null, 4, 5, null, 4, 1, null], 'iron', [185, .12], 'vent', .005),
  citadel: score(126, 46, mixolydian, [0, 4, 6, 3], [0, null, 4, 6, null, 3, 4, null], [5, null, 4, 2, 1, null, 0, null], 'horn', [795, .064], 'belfry', .011),
  aurora: score(128, 51, lydian, [0, 5, 1, 4], [3, null, 4, null, 6, 5, null, 2], [4, 6, null, 5, null, 3, 1, null], 'glass', [1120, .075], 'auroral', .004),
};

export function degreeMidi(world, degree, octave = 0) {
  const span = world.scale.length;
  const index = (degree % span + span) % span;
  return world.tonic + world.scale[index] + 12 * (octave + Math.floor(degree / span));
}

// Different transient, pitch contour and resonance identify each item by ear.
export const POWER_VOICES = {
  shield: { start: 56, stop: 68, accent: 75, tone: 'sine', band: 940, duration: .48 },
  comet: { start: 39, stop: 80, accent: 67, tone: 'sawtooth', band: 1750, duration: .38 },
  magnet: { start: 76, stop: 54, accent: 71, tone: 'triangle', band: 2600, duration: .36 },
  pulse: { start: 64, stop: 32, accent: 52, tone: 'sine', band: 470, duration: .42 },
  grip: { start: 42, stop: 50, accent: 57, tone: 'triangle', band: 720, duration: .27 },
  spring: { start: 49, stop: 84, accent: 72, tone: 'sine', band: 3450, duration: .23 },
};
