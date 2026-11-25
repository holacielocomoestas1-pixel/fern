import { degreeMidi, POWER_VOICES, SOUND_WORLDS } from './sound-worlds.mjs';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const QUIET = .0001;
const road = phase => ['run', 'running', 'race'].includes(phase);
const prelude = phase => ['intro', 'grid', 'countdown'].includes(phase);
const question = phase => ['quiz', 'powerQuiz', 'power-quiz', 'study', 'itemQuiz'].includes(phase);
const uiCues = new Set(['click', 'correct', 'wrong', 'powerUpgrade', 'powerQuizEnd']);
const ratios = [1.02, .72, .55, .44, .36];
const shiftSpeeds = [8.9, 15.1, 22.2, 31.4];

// Hysteresis keeps the engine from hunting through two gears on a threshold.
export function transmission(speed, gear = 0) {
  while (gear < shiftSpeeds.length && speed > shiftSpeeds[gear]) gear++;
  while (gear > 0 && speed < shiftSpeeds[gear - 1] - 2.3) gear--;
  return { gear, firing: 39 + speed * 6.8 * ratios[gear] };
}

export function createAudio({ AudioContext: ProvidedAudio, document: providedDocument } = {}) {
  const doc = providedDocument ?? globalThis.document;
  let context, master, music, effects, reflection, engine, intake, motor, whine;
  let gravel, tireFilter, tirePan, airGain, airFilter, noise;
  let schedule, transition;
  let muted = false, disposed = false;
  let phase = 'menu', world = SOUND_WORLDS.moss;
  let step = 0, nextBeat = 0, nextUpdate = 0, speedLast = 0, gear = 0, shiftedAt = -10, lastHit = -5;
  const fixed = [], sources = [], active = new Map();
  const remember = node => (fixed.push(node), node);
  const live = () => !disposed && !muted && !doc?.hidden && phase !== 'paused';
  const sequenced = () => road(phase) || prelude(phase);

  function gain(value, target) {
    const node = remember(context.createGain());
    node.gain.value = value;
    if (target) node.connect(target);
    return node;
  }

  function filter(type, cut, resonance, target) {
    const node = remember(context.createBiquadFilter());
    node.type = type;
    node.frequency.value = cut;
    node.Q.value = resonance;
    node.connect(target);
    return node;
  }

  function panNode(position, target) {
    if (typeof context.createStereoPanner !== 'function') return target;
    const pan = remember(context.createStereoPanner());
    pan.pan.value = position;
    pan.connect(target);
    return pan;
  }

  function loopNoise(target, sampleOffset) {
    const node = remember(context.createBufferSource());
    node.buffer = noise;
    node.loop = true;
    node.connect(target);
    sources.push(node);
    node.start(0, sampleOffset);
  }

  function build(Audio) {
    context = new Audio({ latencyHint: 'interactive' });
    const limiter = remember(context.createDynamicsCompressor());
    limiter.threshold.value = -14;
    limiter.knee.value = 15;
    limiter.ratio.value = 4;
    limiter.attack.value = .005;
    limiter.release.value = .13;
    limiter.connect(context.destination);
    master = gain(QUIET, limiter);
    music = gain(QUIET, master);
    effects = gain(QUIET, master);

    // Short stereo early reflections give pitched cues a location and leave the motor centred.
    if (typeof context.createDelay === 'function') {
      reflection = gain(.095, master);
      for (const [seconds, position] of [[.061, -.64], [.101, .64]]) {
        const delay = remember(context.createDelay(.15));
        delay.delayTime.value = seconds;
        delay.connect(filter('lowpass', 2200, .4, panNode(position, reflection)));
        music.connect(delay);
        effects.connect(delay);
      }
    }

    engine = gain(QUIET, master);
    intake = filter('lowpass', 450, .7, engine);
    motor = remember(context.createOscillator());
    if (typeof context.createPeriodicWave === 'function' && typeof motor.setPeriodicWave === 'function') {
      const harmonic = Float32Array.of(0, 1, .34, .58, .16, .23, .12, .085, .04, .09, .045, .03);
      motor.setPeriodicWave(context.createPeriodicWave(new Float32Array(harmonic.length), harmonic));
    } else motor.type = 'triangle';
    motor.frequency.value = 43;
    motor.connect(intake);
    whine = remember(context.createOscillator());
    whine.type = 'triangle';
    whine.frequency.value = 118;
    whine.connect(gain(.12, intake));
    sources.push(motor, whine);
    motor.start();
    whine.start();

    noise = context.createBuffer(1, Math.ceil(context.sampleRate * 1.37), context.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 0xa4580127, previous = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      const white = seed / 2147483648 - 1;
      samples[i] = .67 * white + .22 * previous;
      previous = white;
    }
    tirePan = panNode(0, master);
    gravel = gain(QUIET, tirePan);
    tireFilter = filter('bandpass', 1150, .75, gravel);
    loopNoise(tireFilter, .171);
    airGain = gain(QUIET, master);
    airFilter = filter('lowpass', world.air[0], .43, airGain);
    loopNoise(filter('lowpass', 2400, .5, panNode(-.7, airFilter)), .303);
    loopNoise(filter('lowpass', 1250, .55, panNode(.7, airFilter)), .862);
    doc?.addEventListener('visibilitychange', sync);
  }

  function cleanup(source) {
    const voice = active.get(source);
    if (!voice) return;
    active.delete(source);
    source.onended = null;
    source.disconnect();
    for (const node of voice.tail) node.disconnect();
  }

  function register(source, tail, start, end, group) {
    active.set(source, { tail, group });
    source.onended = () => cleanup(source);
    source.start(start);
    source.stop(end);
  }

  function stopVoices(group) {
    for (const [source, voice] of active) {
      if (group && group !== voice.group) continue;
      try { source.stop(); } catch { /* The context may already have ended this note. */ }
      cleanup(source);
    }
  }

  function envelope(when, length, level, attack, target) {
    const env = context.createGain();
    env.gain.setValueAtTime(QUIET, when);
    env.gain.exponentialRampToValueAtTime(Math.max(QUIET * 2, level), when + Math.min(attack, length * .5));
    env.gain.exponentialRampToValueAtTime(QUIET, when + length);
    env.connect(target);
    return env;
  }

  function note(midi, when, volume, seconds, target, type = 'sine', to = midi, attack = .009) {
    // Reserve voices for physical feedback during denser musical beats.
    if (active.size >= (target === music ? 46 : 66)) return;
    const source = context.createOscillator();
    const env = envelope(when, seconds, volume, attack, target);
    source.type = type;
    source.frequency.setValueAtTime(hz(midi), when);
    if (to !== midi) source.frequency.exponentialRampToValueAtTime(hz(to), when + .85 * seconds);
    source.connect(env);
    register(source, [env], when, when + seconds + .012, target === music ? 'score' : 'fx');
  }

  function rustle(when, volume, frequency, duration, target, mode = 'bandpass', endCut = frequency) {
    if (active.size >= (target === music ? 46 : 66)) return;
    const source = context.createBufferSource();
    const tone = context.createBiquadFilter();
    const env = envelope(when, duration, volume, .011, target);
    source.buffer = noise;
    source.loop = duration > noise.duration;
    tone.type = mode;
    tone.frequency.setValueAtTime(frequency, when);
    if (endCut !== frequency) tone.frequency.exponentialRampToValueAtTime(endCut, when + .83 * duration);
    tone.Q.value = .68;
    source.connect(tone).connect(env);
    register(source, [tone, env], when, when + duration + .012, target === music ? 'score' : 'fx');
  }

  function instrument(midi, time, level, length) {
    const voice = world.instrument;
    const soft = voice === 'horn' || voice === 'reed';
    note(midi, time, level, length, music, soft || voice === 'silk' ? 'triangle' : 'sine', midi, soft ? .045 : .007);
    if (voice === 'wood' || voice === 'iron' || voice === 'glass') {
      const partial = voice === 'iron' ? 22.5 : voice === 'glass' ? 19.1 : 19.65;
      note(midi + partial, time + .004, level * (voice === 'wood' ? .23 : .29), length * .29, music);
    } else if (voice === 'silk') note(midi + 12.09, time + .007, level * .19, length * .31, music);
  }

  function landscape(time, alternate) {
    const chirp = (midi, to, delay, length, volume) => note(midi, time + delay, volume, length, music, 'sine', to);
    const root = world.tonic;
    switch (world.detail) {
      case 'songbird': case 'kingfisher': case 'blossom': {
        const high = world.detail === 'kingfisher' ? 93 : world.detail === 'blossom' ? 88 : 98;
        chirp(high - 7, high + (alternate ? 3 : 1), 0, .11, .037);
        chirp(high + 1, high - 5, .16, .14, .032);
        if (world.detail === 'kingfisher') chirp(high + 5, high - 1, .32, .09, .025);
        break;
      }
      case 'nightbell': case 'belfry': {
        const bell = root + (world.detail === 'belfry' ? 17 : 31);
        chirp(bell, bell, 0, .95, .041);
        chirp(bell + 19.1, bell + 19.1, .004, .52, .023);
        break;
      }
      case 'surf': rustle(time, .17, 280, 1.29, music, 'lowpass', 1550); break;
      case 'hoist': chirp(54, 44, 0, .45, .034); rustle(time + .4, .11, 510, .22, music); break;
      case 'ice': chirp(95, 81, .02, .21, .027); rustle(time, .066, 3990, .13, music); break;
      case 'vent': rustle(time, .22, 115, .95, music, 'lowpass', 420); break;
      case 'auroral': chirp(root + 23.9, root + 26, 0, 1.1, .037); chirp(root + 31, root + 31, .3, .85, .024); break;
    }
  }

  function beatAt(index, time, isRace) {
    const beat = index % 8, bar = Math.floor(index / 8), chord = world.chords[bar % 4];
    const phrase = bar % 4 < 2 ? world.phrase : world.answer;
    const degree = phrase[beat];
    if (degree != null && (isRace || beat % 2 === 0)) {
      const lift = bar % 8 === 7 && beat === 6 ? 2 : 0;
      instrument(degreeMidi(world, chord + degree + lift, 1), time, isRace ? .092 : .11, isRace ? .31 : .64);
    }
    if (beat === 0 || isRace && beat === 5) {
      note(degreeMidi(world, chord + (beat ? 4 : 0), -1), time, isRace ? .145 : .1, isRace ? .23 : .61, music, 'triangle');
    }
    if (beat === 0 && bar % 2 === 0 || beat === 4 && bar % 2 === 1) {
      for (const add of [0, 2, 4]) note(degreeMidi(world, chord + add), time + add * .018, .037, isRace ? .56 : .83, music, 'sine', degreeMidi(world, chord + add), .085);
    }
    if (isRace) {
      if (beat === 0 || beat === 4) note(48, time, .235, .14, music, 'sine', 30);
      if (beat === 2 || beat === 6) rustle(time, .10, world.instrument === 'iron' ? 1920 : 1360, .108, music);
      if (beat % 2 && (beat !== 7 || bar % 2)) rustle(time, .065, 6300, .052, music, 'highpass');
    }
    if ((bar % 4 === 1 && beat === 7) || !isRace && index === 0) landscape(time + .07, bar % 8 > 3);
  }

  function tick() {
    if (!context || !live() || !sequenced() || context.state !== 'running') return;
    const now = context.currentTime;
    if (nextBeat < now - .19) nextBeat = now + .025;
    const isRace = road(phase);
    const tempo = isRace ? world.tempo : world.tempo * .72;
    while (nextBeat < now + .17) {
      beatAt(step, nextBeat + (step % 2 ? world.swing : 0), isRace);
      nextBeat += 30 / tempo;
      step++;
    }
    const swell = .83 + .17 * Math.sin(now * .69);
    airFilter.frequency.setTargetAtTime(world.air[0] * swell, now, .25);
    airGain.gain.setTargetAtTime(world.air[1] * swell * (isRace ? .68 : 1.2), now, .18);
  }

  function stopClock() {
    if (schedule != null) clearInterval(schedule);
    schedule = undefined;
  }

  function reconcileContext(audible) {
    if (transition) return;
    const shouldSuspend = muted || doc?.hidden;
    const shouldResume = audible && ['suspended', 'interrupted'].includes(context.state);
    const action = shouldSuspend && context.state === 'running' ? 'suspend' : shouldResume ? 'resume' : null;
    if (!action || typeof context[action] !== 'function') return;
    const before = context.state;
    try {
      transition = Promise.resolve(context[action]())
        .then(() => true, () => false).then(changed => {
          transition = null;
          if (changed && !disposed && context.state !== before) sync();
        });
    } catch { /* A later gesture can reopen an interrupted audio device. */ }
  }

  function sync() {
    if (!context || disposed) return;
    const now = context.currentTime;
    const audible = live();
    const runningScore = audible && sequenced();
    master.gain.setTargetAtTime(audible ? .79 : QUIET, now, .014);
    effects.gain.setTargetAtTime(audible ? .87 : QUIET, now, .018);
    music.gain.setTargetAtTime(runningScore ? (road(phase) ? .49 : .67) : QUIET, now, .028);
    if (!audible || !road(phase)) {
      engine.gain.setTargetAtTime(QUIET, now, .025);
      gravel.gain.setTargetAtTime(QUIET, now, .022);
    }
    if (!runningScore) {
      airGain.gain.setTargetAtTime(QUIET, now, .026);
      stopClock();
      stopVoices(audible ? 'score' : undefined);
    }
    reconcileContext(audible);
    if (!audible) return;
    if (runningScore && schedule == null) {
      if (nextBeat < now) nextBeat = now + .03;
      schedule = setInterval(tick, 65);
      tick();
    }
  }

  async function unlock() {
    if (disposed || muted || doc?.hidden) return false;
    const Audio = ProvidedAudio ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return false;
    try {
      if (!context) build(Audio);
      sync();
      if (transition) await transition;
      return !disposed && context.state === 'running';
    } catch {
      dispose();
      return false;
    }
  }

  function setWorld(course) {
    const next = SOUND_WORLDS[course?.id] ?? SOUND_WORLDS[course?.theme] ?? SOUND_WORLDS.moss;
    if (next === world) return;
    world = next;
    step = 0;
    nextBeat = context ? context.currentTime + .035 : 0;
    stopVoices('score');
    sync();
  }

  function setMuted(value) {
    if (muted === Boolean(value)) return;
    muted = Boolean(value);
    sync();
  }

  function setPhase(value) {
    const next = value === 'pause' || value === 'lost' || value === 'settings' ? 'paused' : value;
    if (phase === next) return;
    const wasSuspended = phase === 'paused' || question(phase);
    if ((road(next) && !road(phase) || next === 'intro') && !wasSuspended) {
      step = 0;
      gear = 0;
      nextUpdate = 0;
      shiftedAt = -10;
      speedLast = 0;
      nextBeat = context ? context.currentTime + .035 : 0;
      stopVoices('score');
    }
    if (question(next)) stopVoices();
    phase = next;
    sync();
  }

  function update({ speed = 0, boost = false, drift = false, brake = false, offroad = 0, airborne = 0, steer = 0 } = {}) {
    if (!context || !live() || !road(phase) || context.state !== 'running') return;
    const now = context.currentTime;
    if (now < nextUpdate) return;
    nextUpdate = now + .045;
    const velocity = clamp(Number(speed) || 0, 0, 58);
    const { gear: current, firing } = transmission(velocity, gear);
    if (current !== gear) {
      if (current > gear && now - shiftedAt > .18) rustle(now + .001, .068, 460, .083, effects, 'bandpass');
      shiftedAt = now;
      gear = current;
    }
    const shift = clamp((now - shiftedAt) / .15, 0, 1);
    const brakeLoad = brake ? clamp(Number(brake), 0, 1) : clamp((speedLast - velocity) * .48, 0, .72);
    const amount = clamp(velocity / 42, 0, 1), slip = clamp(Number(offroad) || 0, 0, 1);
    const pitch = (firing + (boost ? 14 : 0)) * (.91 + .09 * shift) * (1 - .07 * brakeLoad);
    motor.frequency.setTargetAtTime(pitch, now, .047);
    whine.frequency.setTargetAtTime(pitch * 2.98, now, .056);
    intake.frequency.setTargetAtTime(315 + 1140 * amount + (boost ? 450 : 0) - 220 * brakeLoad, now, .07);
    engine.gain.setTargetAtTime((.06 + .122 * amount + (boost ? .027 : 0)) * (.62 + .38 * shift), now, .046);
    const ground = clamp(1 - Math.max(0, Number(airborne)) * 2, 0, 1);
    gravel.gain.setTargetAtTime(QUIET + ground * amount * (.02 + slip * .13 + brakeLoad * .054 + (drift ? .172 : 0)), now, .045);
    tireFilter.frequency.setTargetAtTime(650 + (drift ? 1350 : 360) * amount - slip * 305, now, .066);
    if (tirePan.pan) tirePan.pan.setTargetAtTime(clamp(Number(steer) || 0, -1, 1) * -.36, now, .10);
    speedLast = velocity;
  }

  function powerUse(event, time) {
    const item = POWER_VOICES[event?.kind];
    if (!item) return;
    const strong = event.level === 2;
    const length = item.duration * (strong ? 1.29 : 1);
    note(item.start, time, item.tone === 'sawtooth' ? .078 : .16, length, effects, item.tone, item.stop);
    note(item.accent, time + length * .43, .077, length * .85, effects);
    rustle(time, .14, item.band, length * .8, effects, 'bandpass', item.band * .48);
    if (strong) note(item.accent + 12, time + .09, .073, length + .12, effects, 'triangle');
  }

  function play(type, value) {
    if (!context || !live() || (question(phase) && !uiCues.has(type))) return;
    const time = context.currentTime + .009;
    const tone = (n, delay = 0, vol = .12, length = .19, to = n, waveform = 'triangle') => note(n, time + delay, vol, length, effects, waveform, to);
    const burst = (level, cut, length, type = 'bandpass', end = cut) => rustle(time, level, cut, length, effects, type, end);
    switch (type) {
      case 'click': tone(75, 0, .047, .09); break;
      case 'tick': case 'countdown': {
        const n = Number(value?.count ?? value) === 1 ? 74 : 67;
        tone(n, 0, .133, .18); tone(n + 12, .008, .054, .15); break;
      }
      case 'go': tone(69); tone(76, .052); tone(81, .099, .115, .32); burst(.10, 1130, .27, 'bandpass', 3080); break;
      case 'cinematic': {
        const tonic = world.tonic;
        if (value === 'flyover') {
          burst(.089, world.air[0] * .60, .52, 'lowpass', world.air[0] * 1.25);
          tone(tonic - 12, 0, .065, .62, tonic - 7, 'sine');
        } else if (value === 'landmark-pass') {
          burst(.092, 850, .39, 'bandpass', world.air[0] + 700);
          landscape(time + .10, true);
        } else if (value === 'hero') {
          tone(tonic - 14, 0, .112, .40, tonic - 6, 'sine');
          burst(.085, 520, .33, 'lowpass', 1490);
        } else if (value === 'grid-reveal') {
          tone(tonic + 12, 0, .068, .31);
          tone(tonic + 19, .086, .067, .63, tonic + 19, 'sine');
        }
        break;
      }
      case 'boost': tone(44, 0, .13, .26, 70); burst(.18, 950, .34, 'bandpass', 3400); break;
      case 'charge': tone(70, 0, .079, .14); tone(77, .05, .09, .23); break;
      case 'pickup': tone(76, 0, .092, .115); tone(83, .057, .087, .23); break;
      case 'powerPickup': tone(62, 0, .1, .13); tone(73, .055, .103, .16); tone(80, .117, .098, .37, 80, 'sine'); break;
      case 'powerUse': powerUse(value, time); break;
      case 'powerUpgrade': tone(69, 0, .09, .24); tone(76, .051, .10, .26); tone(83, .112, .11, .38); tone(90, .20, .066, .52, 90, 'sine'); break;
      case 'powerQuizEnd':
        if (!value?.skipped && (value?.correct === false || value?.answer === false)) tone(63, 0, .068, .22, 59, 'sine');
        break;
      case 'guard': tone(66, 0, .112, .28, 73, 'sine'); tone(79, .055, .09, .41, 74); break;
      case 'hop': tone(55, 0, .067, .125, 71, 'sine'); burst(.062, 1150, .14, 'bandpass', 2390); break;
      case 'land': tone(42, 0, .125, .13, 33, 'sine'); burst(.13, 970, .125, 'lowpass', 395); break;
      case 'hazard': case 'hit': case 'offroad': case 'bump': {
        if (value?.blocked || time - lastHit < .19) return;
        lastHit = time;
        if (value?.kind === 'slick') { burst(.185, 2630, .31, 'bandpass', 795); break; }
        const soft = type === 'offroad';
        tone(46, 0, soft ? .066 : .17, .16, 31); burst(soft ? .095 : .205, 1420, .19, 'lowpass', 400); break;
      }
      case 'correct': tone(72, 0, .09); tone(76, .074, .084); tone(84, .146, .071, .31); break;
      case 'wrong': tone(65, 0, .072, .18); tone(60, .097, .066, .21); break;
      case 'lap': tone(74, 0, .095); tone(78, .072, .092); tone(81, .135, .085, .31); break;
      case 'finish': case 'win': {
        const tonic = world.tonic + 12;
        const notes = type === 'win' ? [0, 4, 7, 12, 16] : [0, 2, 7, 9];
        for (const [i, gap] of notes.entries()) tone(tonic + gap, i * .085, .105 - i * .007, .25 + i * .073);
        break;
      }
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopClock();
    doc?.removeEventListener('visibilitychange', sync);
    stopVoices();
    for (const source of sources) { try { source.stop(); } catch { /* Already stopped. */ } }
    for (const node of fixed) { try { node.disconnect(); } catch { /* An interrupted device can lose nodes. */ } }
    if (context && context.state !== 'closed') {
      try { context.close().catch(() => {}); } catch { /* Closing an interrupted context may throw. */ }
    }
  }

  return { unlock, setWorld, setMuted, setPhase, update, play, dispose };
}
