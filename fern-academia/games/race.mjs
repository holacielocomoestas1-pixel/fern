import { BOOST_COST, CIRCUITS, createRace, position, raceResult, resolvePit, stepRace } from './race-model.mjs';
import { createScene, drawMap, drawRace } from './race-art.mjs';

const COPY = {
  en: {
    title: 'Fern Rally', free: 'Free play', study: 'Study race', choose: 'Choose a circuit',
    start: 'Start race', again: 'Race again', next: 'Next circuit',
    studyIntro: 'Two study stops freeze the race timer. Correct answers give you a speed burst.',
    raceIntro: 'The kart accelerates on its own. Steer into the glowing pads, then unleash turbo.',
    keyboard: '← → or A D to steer · Shift to turbo · P to pause',
    touch: 'Press to steer · Hold turbo when the meter is ready',
    position: 'Place', lap: 'Lap', time: 'Time', turbo: 'Turbo', ready: 'Turbo ready',
    left: 'Steer left', right: 'Steer right', accelerate: 'Use turbo', pause: 'Pause race',
    paused: 'Race paused', pauseIntro: 'The race clock is stopped.', resume: 'Resume race',
    restart: 'Restart race', go: 'Go!', pit: 'Study stop', pitIntro: 'Your race clock is stopped.',
    correct: 'Turbo earned', pad: '+26 energy', finalLap: 'Final lap', lapUp: 'New lap',
    finished: 'Circuit complete', gold: 'First across the line!', silver: 'Silver finish!',
    bronze: 'Bronze finish!', record: 'Personal best', score: 'Score', lowest: 'Best time',
    unavailable: 'This device could not start the race graphics.',
  },
  th: {
    title: 'เฟิร์นแรลลี', free: 'เล่นอิสระ', study: 'แข่งพร้อมทบทวน', choose: 'เลือกสนาม',
    start: 'เริ่มแข่ง', again: 'แข่งอีกครั้ง', next: 'สนามถัดไป',
    studyIntro: 'เวลาหยุดระหว่างตอบคำถาม 2 ครั้ง ตอบถูกจะได้เร่งความเร็ว',
    raceIntro: 'รถเร่งเอง เลี้ยวเข้าแถบเรืองแสงเพื่อชาร์จ แล้วกดเทอร์โบ',
    keyboard: '← → หรือ A D เพื่อเลี้ยว · Shift เร่งเทอร์โบ · P หยุดพัก',
    touch: 'กดค้างเพื่อเลี้ยว · กดเทอร์โบเมื่อชาร์จพร้อม',
    position: 'อันดับ', lap: 'รอบ', time: 'เวลา', turbo: 'เทอร์โบ', ready: 'เทอร์โบพร้อม',
    left: 'เลี้ยวซ้าย', right: 'เลี้ยวขวา', accelerate: 'เร่งเทอร์โบ', pause: 'หยุดการแข่งขันชั่วคราว',
    paused: 'พักการแข่งขัน', pauseIntro: 'นาฬิกาแข่งหยุดไว้แล้ว', resume: 'แข่งต่อ',
    restart: 'เริ่มแข่งใหม่', go: 'ไป!', pit: 'จุดพักทบทวน', pitIntro: 'นาฬิกาแข่งหยุดไว้แล้ว',
    correct: 'ได้รับเทอร์โบ', pad: '+26 พลังงาน', finalLap: 'รอบสุดท้าย', lapUp: 'เริ่มรอบใหม่',
    finished: 'เข้าเส้นชัยแล้ว', gold: 'เข้าเส้นชัยเป็นที่หนึ่ง!', silver: 'คว้าอันดับสอง!',
    bronze: 'คว้าอันดับสาม!', record: 'สถิติส่วนตัวใหม่', score: 'คะแนน', lowest: 'เวลาดีที่สุด',
    unavailable: 'อุปกรณ์นี้เปิดกราฟิกสนามแข่งไม่ได้',
  },
};

const STEER_KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'turbo', ShiftRight: 'turbo', Space: 'turbo' };
const FALLBACK_CODES = { a: 'KeyA', A: 'KeyA', d: 'KeyD', D: 'KeyD', p: 'KeyP', P: 'KeyP', Shift: 'ShiftLeft', ' ': 'Space' };
const FIXED_STEP = 1 / 90;

function loadStyles() {
  if (document.getElementById('fern-race-ui-css')) return;
  const style = document.createElement('link');
  style.id = 'fern-race-ui-css';
  style.rel = 'stylesheet';
  style.href = new URL('./race.css', import.meta.url).href;
  document.head.append(style);
}

function formatTime(seconds) {
  const tenths = Math.max(0, Math.floor(seconds * 10));
  const minutes = String(Math.floor(tenths / 600)).padStart(2, '0');
  const whole = String(Math.floor(tenths / 10) % 60).padStart(2, '0');
  return `${minutes}:${whole}.${tenths % 10}`;
}

function storedTime(circuit, mode) {
  try {
    const value = Number(localStorage.getItem(`fern-academia-rally-v1-${mode}-${circuit}`));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function saveTime(circuit, mode, duration) {
  const old = storedTime(circuit, mode);
  if (old !== null && old <= duration) return false;
  try {
    localStorage.setItem(`fern-academia-rally-v1-${mode}-${circuit}`, String(duration));
  } catch {
    return false;
  }
  return true;
}

export function mount(container, ctx) {
  loadStyles();
  const lang = ctx.lang === 'th' ? 'th' : 'en';
  const copy = COPY[lang];
  const mode = ctx.mode === 'study' ? 'study' : 'free';
  const section = document.createElement('section');
  section.className = 'fern-race';
  section.dataset.phase = 'ready';
  section.lang = lang;
  section.innerHTML = `
    <header class="race-heading">
      <div><p class="race-mode"><span></span>${copy[mode]}</p><h2>${copy.title}</h2></div>
      <img data-race="avatar" alt="" width="60" height="60" decoding="async">
    </header>
    <div class="race-stage" data-race="stage" tabindex="0" aria-label="${copy.title}">
      <canvas class="race-viewport" data-race="canvas" aria-hidden="true"></canvas>
      <div class="race-hud" data-race="hud" hidden>
        <div class="race-hud-item"><span>${copy.position}</span><strong data-race="rank">4<span>/4</span></strong></div>
        <div class="race-hud-item"><span>${copy.lap}</span><strong data-race="lap">1</strong></div>
        <div class="race-hud-item race-hud-clock"><span>${copy.time}</span><strong data-race="clock">00:00.0</strong></div>
        <button type="button" class="race-pause" data-race="pause" aria-label="${copy.pause}" title="${copy.pause}"><span aria-hidden="true"></span></button>
      </div>
      <div class="race-fuel" data-race="fuel" hidden>
        <span data-race="fuel-label">${copy.turbo}</span>
        <progress data-race="fuel-meter" max="100" value="26" aria-label="${copy.turbo}"></progress>
      </div>
      <p data-race="toast" class="race-toast" role="status" hidden></p>
      <div data-race="overlay" class="race-overlay"></div>
    </div>
    <div class="race-controls" data-race="controls" hidden>
      <div class="race-steering">
        <button type="button" data-drive="left" aria-label="${copy.left}" title="${copy.left}"><span class="race-chevron race-chevron-left" aria-hidden="true"></span></button>
        <button type="button" data-drive="right" aria-label="${copy.right}" title="${copy.right}"><span class="race-chevron" aria-hidden="true"></span></button>
      </div>
      <button type="button" class="race-turbo" data-drive="turbo" aria-label="${copy.accelerate}"><span aria-hidden="true">↯</span> ${copy.turbo}</button>
    </div>
    <div class="race-picker" data-race="picker" role="group" aria-label="${copy.choose}">
      ${CIRCUITS.map((track, index) => `
        <button class="race-circuit" type="button" data-circuit="${index}" aria-pressed="${index === 0}" style="--circuit-accent: ${track.accent}">
          <canvas aria-hidden="true" width="158" height="82"></canvas><strong>${track.title[lang]}</strong><small>${track.details[lang]}</small>
        </button>`).join('')}
    </div>
    <p class="race-hint" data-race="hint"><span class="race-key-hint">${copy.keyboard}</span><span class="race-touch-hint">${copy.touch}</span></p>
  `;
  container.replaceChildren(section);
  if (typeof ctx.asset === 'function') section.querySelector('[data-race="avatar"]').src = ctx.asset('assets/avatar.webp');
  const $ = (name) => section.querySelector(`[data-race="${name}"]`);
  const stage = $('stage');
  const canvas = $('canvas');
  const graphics = canvas.getContext('2d', { alpha: false });
  const overlay = $('overlay');
  if (!graphics || typeof Path2D !== 'function' || typeof graphics.roundRect !== 'function') {
    overlay.textContent = copy.unavailable;
    $('picker').hidden = true;
    $('hint').hidden = true;
    return () => section.remove();
  }

  const lifecycle = new AbortController();
  const listener = { signal: lifecycle.signal };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = { width: 0, height: 0, ratio: 1 };
  const controls = [...section.querySelectorAll('[data-drive]')];
  const circuits = [...section.querySelectorAll('[data-circuit]')];
  const scenes = CIRCUITS.map(createScene);
  const keyboard = new Set();
  const pointers = new Map();
  let tapDrive = '';
  let tapUntil = 0;
  let circuit = 0;
  let run = createRace(CIRCUITS[circuit], mode);
  let phase = 'ready';
  let resumePhase = 'running';
  let camera = { x: 0, y: 0, angle: 0, scale: 1, ready: false };
  let frameId = 0;
  let lastFrame = 0;
  let lastPaint = -Infinity;
  let accumulator = 0;
  let lastHud = -Infinity;
  let countdown = 0;
  let countdownValue = '';
  let toastUntil = -Infinity;
  let isDisposed = false;
  let result = null;
  let best = false;

  function paint(dt = .016) {
    drawRace(graphics, viewport, scenes[circuit], run, camera, dt, reduced.matches);
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    if (bounds.width < 3 || bounds.height < 3 || isDisposed) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    viewport.width = bounds.width;
    viewport.height = bounds.height;
    viewport.ratio = ratio;
    const width = Math.round(bounds.width * ratio);
    const height = Math.round(bounds.height * ratio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    paint();
  }

  function makeButton(label, click, secondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = secondary ? 'race-secondary' : 'race-primary';
    button.textContent = label;
    button.onclick = click;
    return button;
  }

  function message(title, text) {
    const content = document.createElement('div');
    content.className = 'race-message';
    const heading = document.createElement('h3');
    heading.textContent = title;
    content.append(heading);
    if (text) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      content.append(paragraph);
    }
    return content;
  }

  function updateCircuitButtons() {
    for (const [index, button] of circuits.entries()) {
      const track = CIRCUITS[index];
      button.setAttribute('aria-pressed', String(index === circuit));
      const fastest = storedTime(track.id, mode);
      button.title = fastest === null ? track.details[lang] : `${copy.lowest} ${formatTime(fastest)}`;
      drawMap(button.querySelector('canvas'), scenes[index]);
    }
  }

  function renderOverlay(focus) {
    overlay.hidden = phase === 'running';
    if (phase === 'running') {
      overlay.replaceChildren();
      if (focus) stage.focus({ preventScroll: true });
      return;
    }
    let content;
    let main;
    if (phase === 'ready') {
      const track = CIRCUITS[circuit];
      content = message(track.title[lang], mode === 'study' ? copy.studyIntro : copy.raceIntro);
      main = makeButton(copy.start, start);
      content.append(main);
    } else if (phase === 'countdown') {
      content = document.createElement('div');
      content.className = 'race-countdown';
      content.setAttribute('role', 'status');
      content.textContent = countdownValue;
    } else if (phase === 'paused') {
      content = message(copy.paused, copy.pauseIntro);
      main = makeButton(copy.resume, resume);
      const actions = document.createElement('div');
      actions.className = 'race-result-actions';
      actions.append(main, makeButton(copy.restart, start, true));
      content.append(actions);
    } else if (phase === 'pit') {
      content = message(copy.pit, copy.pitIntro);
    } else {
      const rankTitle = [copy.gold, copy.silver, copy.bronze, copy.finished][result.rank - 1];
      content = message(rankTitle, best ? copy.record : '');
      const recap = document.createElement('dl');
      recap.className = 'race-result-stats';
      for (const [key, value] of [[copy.position, `${result.rank}/4`], [copy.time, formatTime(result.duration)], [copy.score, String(result.score)]]) {
        const entry = document.createElement('div');
        const label = document.createElement('dt');
        const number = document.createElement('dd');
        label.textContent = key;
        number.textContent = value;
        entry.append(label, number);
        recap.append(entry);
      }
      const actions = document.createElement('div');
      actions.className = 'race-result-actions';
      main = makeButton(copy.again, start);
      actions.append(main, makeButton(copy.next, () => choose((circuit + 1) % CIRCUITS.length, true), true));
      content.append(recap, actions);
    }
    overlay.replaceChildren(content);
    if (focus) (main || stage).focus({ preventScroll: true });
  }

  function updateHud() {
    const track = CIRCUITS[circuit];
    const lap = Math.min(track.laps, Math.floor(run.distance / track.length) + 1);
    $('rank').textContent = `${position(run)}/4`;
    $('lap').textContent = `${lap}/${track.laps}`;
    $('clock').textContent = formatTime(run.elapsed);
    $('fuel-meter').value = run.charge;
    $('fuel-label').textContent = run.charge >= BOOST_COST ? copy.ready : copy.turbo;
    $('fuel').dataset.ready = String(run.charge >= BOOST_COST);
    controls.at(-1).dataset.ready = String(run.charge >= BOOST_COST);
    if (run.elapsed >= toastUntil) $('toast').hidden = true;
  }

  function change(next, focus = false) {
    phase = next;
    section.dataset.phase = next;
    const active = next === 'running';
    const status = active || next === 'countdown';
    $('hud').hidden = !status;
    $('fuel').hidden = !active;
    $('controls').hidden = !status;
    $('picker').hidden = next !== 'ready' && next !== 'results';
    $('hint').hidden = next !== 'ready' && !status;
    for (const button of controls) button.disabled = !active;
    clearInput();
    updateHud();
    renderOverlay(focus);
    paint();
  }

  function notify(text, duration = 1.3) {
    $('toast').textContent = text;
    $('toast').hidden = false;
    toastUntil = run.elapsed + duration;
  }

  function startFrame() {
    lastFrame = 0;
    accumulator = 0;
    if (frameId === 0 && !isDisposed) frameId = window.requestAnimationFrame(tick);
  }

  function choose(index, focus = false) {
    circuit = index;
    run = createRace(CIRCUITS[circuit], mode);
    camera.ready = false;
    toastUntil = -Infinity;
    lastHud = -Infinity;
    section.style.setProperty('--race-accent', CIRCUITS[circuit].accent);
    updateCircuitButtons();
    change('ready', focus);
  }

  function start() {
    run = createRace(CIRCUITS[circuit], mode);
    camera.ready = false;
    countdown = 3.35;
    countdownValue = '3';
    toastUntil = -Infinity;
    lastHud = -Infinity;
    change('countdown', true);
    ctx.sound?.('tick');
    startFrame();
  }

  function pause() {
    if (phase !== 'running' && phase !== 'countdown') return;
    resumePhase = phase;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    change('paused', true);
  }

  function resume() {
    if (phase !== 'paused') return;
    change(resumePhase, true);
    startFrame();
  }

  async function pitStop() {
    const activeRun = run;
    change('pit');
    let correct = null;
    try {
      correct = await ctx.askQuestion?.();
    } catch {
      correct = null;
    }
    if (isDisposed || run !== activeRun || phase !== 'pit') return;
    resolvePit(run, correct);
    if (document.hidden) {
      resumePhase = 'running';
      change('paused', true);
    } else {
      change('running', true);
      if (correct === true) {
        notify(copy.correct);
        ctx.sound?.('boost');
      }
      startFrame();
    }
  }

  function finish() {
    result = raceResult(run);
    best = saveTime(result.circuit, mode, result.duration);
    updateCircuitButtons();
    change('results', true);
    if (result.win) ctx.sound?.('win');
    ctx.complete?.(result);
  }

  function held(key) {
    for (const value of pointers.values()) if (value === key) return true;
    for (const code of keyboard) if (STEER_KEYS[code] === key) return true;
    return tapDrive === key && tapUntil > 0;
  }

  function syncControls() {
    for (const button of controls) button.dataset.held = String(held(button.dataset.drive));
  }

  function clearInput() {
    keyboard.clear();
    pointers.clear();
    tapDrive = '';
    tapUntil = 0;
    syncControls();
  }

  function tick(now) {
    frameId = 0;
    if (isDisposed || (phase !== 'running' && phase !== 'countdown')) return;
    const delta = lastFrame ? Math.max(0, Math.min(.1, (now - lastFrame) / 1000)) : 0;
    lastFrame = now;
    if (phase === 'countdown') {
      countdown -= delta;
      const display = countdown > .33 ? String(Math.min(3, Math.ceil(countdown - .33))) : copy.go;
      if (display !== countdownValue) {
        countdownValue = display;
        renderOverlay(false);
        ctx.sound?.('tick');
      }
      if (countdown <= 0) change('running', true);
    } else {
      accumulator += delta;
      const input = { steer: Number(held('right')) - Number(held('left')), turbo: held('turbo') };
      while (accumulator >= FIXED_STEP) {
        accumulator -= FIXED_STEP;
        stepRace(run, input, FIXED_STEP);
        for (const event of run.events) {
          if (event === 'finish') { finish(); return; }
          if (event === 'pit') { void pitStop(); return; }
          if (event === 'pad') { notify(copy.pad); ctx.sound?.('tick'); }
          if (event === 'turbo') ctx.sound?.('boost');
          if (event === 'lap') {
            const final = Math.floor(run.distance / CIRCUITS[circuit].length) + 1 === CIRCUITS[circuit].laps;
            notify(final ? copy.finalLap : copy.lapUp);
          }
        }
      }
      if (tapUntil > 0) {
        tapUntil = Math.max(0, tapUntil - delta);
        if (tapUntil === 0) syncControls();
      }
      if (now - lastHud >= 83) { updateHud(); lastHud = now; }
      const drawInterval = reduced.matches ? 28 : 14;
      if (now - lastPaint >= drawInterval) {
        paint(lastPaint === -Infinity ? delta : Math.min(.067, (now - lastPaint) / 1000));
        lastPaint = now;
      }
    }
    if (!isDisposed && (phase === 'running' || phase === 'countdown')) frameId = window.requestAnimationFrame(tick);
  }

  function keyDown(event) {
    if (!section.contains(document.activeElement) || event.altKey || event.metaKey || event.ctrlKey) return;
    const code = event.code || FALLBACK_CODES[event.key] || event.key;
    if (code === 'KeyP' || code === 'Escape') {
      if (phase === 'paused' || phase === 'running' || phase === 'countdown') {
        event.preventDefault();
        if (!event.repeat) (phase === 'paused' ? resume : pause)();
      }
      return;
    }
    if (phase !== 'running' || !STEER_KEYS[code]) return;
    if (code === 'Space' && event.target.closest?.('button')) return;
    event.preventDefault();
    keyboard.add(code);
    syncControls();
  }

  function keyUp(event) {
    const code = event.code || FALLBACK_CODES[event.key] || event.key;
    if (keyboard.delete(code)) syncControls();
  }

  for (const button of controls) {
    button.addEventListener('pointerdown', (event) => {
      if (phase !== 'running' || event.button !== 0) return;
      pointers.set(event.pointerId, button.dataset.drive);
      button.setPointerCapture(event.pointerId);
      syncControls();
    }, listener);
    const release = (event) => {
      pointers.delete(event.pointerId);
      syncControls();
    };
    button.addEventListener('pointerup', release, listener);
    button.addEventListener('pointercancel', release, listener);
    button.addEventListener('lostpointercapture', release, listener);
    button.addEventListener('click', (event) => {
      if (phase !== 'running' || event.detail !== 0) return;
      tapDrive = button.dataset.drive;
      tapUntil = .22;
      syncControls();
    }, listener);
  }
  for (const [index, button] of circuits.entries()) button.addEventListener('click', () => choose(index), listener);
  $('pause').addEventListener('click', pause, listener);
  window.addEventListener('keydown', keyDown, listener);
  window.addEventListener('keyup', keyUp, listener);
  window.addEventListener('blur', clearInput, listener);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, listener);
  window.addEventListener('resize', resize, listener);
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(stage);
  choose(0);
  resize();

  return () => {
    isDisposed = true;
    lifecycle.abort();
    resizeObserver?.disconnect();
    if (frameId) window.cancelAnimationFrame(frameId);
    clearInput();
    section.remove();
  };
}
