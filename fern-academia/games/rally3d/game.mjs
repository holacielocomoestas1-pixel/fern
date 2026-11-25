import { COURSES, TURBO_COST, POWER_INFO, beginPowerQuiz, createRace, perfectStart, pose, resolvePowerQuiz, resolveStudy, resultFor, stepRace, usePower } from "./model.mjs";
import { createWorld } from "./world.mjs";
import { createKarts } from "./karts.mjs";
import { createRenderer } from "./renderer.mjs";
import { createSoftwareRenderer } from "./software.mjs";
import { createDirector, FINISH_SECONDS, INTRO_SECONDS } from "./camera.mjs";
import { createAudio } from "./audio.mjs";
import { ghostAt, POINTS, profile, stamp } from "./profile.mjs";
import { createQuizDeck } from "./item-quiz.mjs";
import { createGamepad } from "./gamepad.mjs";
import { createTapAction, createPointerOwner } from "./multi-touch.mjs";
import { createGyroPower } from "./gyro-power.mjs";
import { noteLocalChange } from "../../../firebase-sync.mjs";
import { CUPS, cameraLabel, center, driverColors, infrastructure, menu, powerSymbol, quickQuiz, slate, summary, text, updateSoundButton } from "./presentation.mjs";

const CAMERA_MODES = ["chase", "wide", "bumper"];
const FIXED = 1 / 60;
const GRID_TIME = 3;
const KEYS = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  Space: "drift", ShiftLeft: "boost", ShiftRight: "boost",
  ArrowDown: "brake", KeyS: "brake", KeyR: "rear", KeyX: "hop", KeyJ: "hop",
};

function readGraphicsPreference() {
  const query = new URLSearchParams(location.search).get("rallyGraphics");
  if (query === "high" || query === "low") return query;
  return null;
}

function buildMap(course, canvas) {
  const points = Array.from({ length: 100 }, (_, i) => course.frame(i / 100 * course.length));
  const ranges = ["x", "z"].map(axis => [Math.min(...points.map(point => point[axis])), Math.max(...points.map(point => point[axis]))]);
  const scale = Math.min((canvas.width - 26) / (ranges[0][1] - ranges[0][0]), (canvas.height - 22) / (ranges[1][1] - ranges[1][0]));
  const [cx, cz] = ranges.map(([a, b]) => (a + b) / 2);
  return { points, place: (x, z) => [(x - cx) * scale + canvas.width / 2, (z - cz) * -scale + canvas.height / 2] };
}

function paintMap(canvas, map, vehicles) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !map) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 6.2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#a9dacb83";
  ctx.beginPath();
  for (const [i, point] of map.points.entries()) {
    const [x, y] = map.place(point.x, point.z);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  for (const cart of [...vehicles].reverse()) {
    const [x, y] = map.place(cart.x, cart.z);
    ctx.beginPath();
    ctx.arc(x, y, cart.id === 0 ? 6.5 : 3.7, 0, Math.PI * 2);
    ctx.fillStyle = cart.id === 0 ? "#fffbe4" : driverColors[cart.id];
    ctx.fill();
    if (cart.id === 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#356748";
      ctx.stroke();
    }
  }
}

function newCount(panel, label) {
  const box = document.createElement("div");
  box.className = "rr3-countdown";
  box.setAttribute("aria-hidden", "true");
  const number = document.createElement("strong");
  number.textContent = label;
  box.append(number);
  panel.replaceChildren(box);
}

export function launch3D(container, ctx, switchToClassic) {
  const lang = ctx.lang === "th" ? "th" : "en";
  const t = (en, th) => text(lang, en, th);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const storage = {
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  };
  const record = profile(storage);
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => motionPreference.matches || record.settings().motion === "calm";
  const director = createDirector();
  const audio = createAudio();
  const pad = createGamepad();
  const gyroPower = createGyroPower();
  let gyroOn = false;
  let quality = readGraphicsPreference() || record.settings().quality;
  const scene = document.createElement("section");
  scene.className = "rr3";
  scene.lang = lang;
  scene.setAttribute("aria-label", "Fern Rally 3D");
  scene.innerHTML = infrastructure(lang, ctx.exitHref || "#games");
  container.replaceChildren(scene);
  const find = selector => scene.querySelector(selector);
  let canvas = find(".rr3-canvas");
  const miniMap = find(".rr3-map");
  const panel = find("[data-panel]");
  const hud = find(".rr3-hud");
  const controls = find(".rr3-controls");
  const speedTag = find(".rr3-speed");
  const coach = find(".rr3-coach");
  const live = find("[data-live]");
  const toolbar = Object.fromEntries([...scene.querySelectorAll(".rr3-toolbar [data-act]")].map(el => [el.dataset.act, el]));
  const values = Object.fromEntries([...scene.querySelectorAll("[data-value]")].map(el => [el.dataset.value, el]));
  const holdButtons = [...scene.querySelectorAll("[data-hold]")];
  const turbo = find("[data-hold=boost]");
  const rankTag = find("[data-stat=rank]");
  const powerDock = find("[data-power]");
  const powerUse = find("[data-act=power]");
  const powerQuizButton = find("[data-act=power-quiz]");
  const emblem = find("[data-power-symbol]");
  const hopButton = find("[data-hold=hop]");
  const quizDeck = createQuizDeck();
  const standalone = typeof ctx.askQuestion !== "function" && ctx.mode !== "study";
  const keyHeld = new Set();
  const pointers = new Map();
  const stick = find("[data-stick]");
  const stickThumb = stick?.querySelector(".rr3-stick-thumb");
  let stickSteer = 0;
  const stickOwner = createPointerOwner();
  const STICK_DEAD = 0.08;
  let controller;
  let controllerDirection = 0;
  let repaint = true;

  let courseIndex = 0;
  let course = COURSES[0];
  let mode = ctx.mode === "study" ? "study" : "race";
  let run = grid();
  let cup = Array(6).fill(0);
  let cupIndex = 0;
  let cupChoice = 0;
  let localQuiz;
  let previousPower = "";
  let hopPulse = false;
  let ghostInterval = .2;
  let cameraMode = "chase";
  let currentWorld;
  let karts;
  let uploadedKarts;
  let renderer;
  let resizeObserver;
  let dimensions;
  let map;
  let frameId = 0;
  let lastFrame = 0;
  let settledTime = 0;
  let accumulator = 0;
  let phase = "menu";
  let phaseTime = 0;
  let suspended = null;
  let lost = null;
  let settingsBack = "menu";
  let countdown = 0;
  let gone = false;
  let loadingCourse = false;
  let result;
  let ranks = [];
  let lastRank = null;
  let best = false;
  let ghosts = null;
  let samples = [];
  let lastHud = -1;
  let renderClock = 0;
  let messageUntil = 0;
  let boostPulse = false;
  let trauma = 0;
  let lastBoostPress = -10;
  let launchBoostHeld = false;
  let launchBoostQueued = false;
  let scaleDown = 1;
  let frameCost = 16;
  let perfClock = 0;
  let contextOk = true;
  let previewAngle = 0;
  let previewDrag = null;
  let backend = new URLSearchParams(location.search).get("rallyGraphics") === "canvas" ? "canvas" : "webgl";

  function grid() {
    return createRace(course, { mode: mode === "cup" ? "race" : mode, difficulty: record.settings().difficulty });
  }

  function launchRenderer() {
    const create = backend === "canvas" ? createSoftwareRenderer : createRenderer;
    const next = create(canvas, { quality, reducedMotion: motionPreference.matches });
    try {
      if (currentWorld) {
        next.setVehicles(karts ||= createKarts());
        next.setWorld(currentWorld);
        uploadedKarts = next;
      }
    } catch (error) {
      next.dispose();
      throw error;
    }
    return next;
  }

  function prepareCourse() {
    if (currentWorld?.course === course) return;
    const world = createWorld(course, { staticMeshes: backend === "webgl" });
    if (uploadedKarts !== renderer) {
      renderer.setVehicles(karts ||= createKarts());
      uploadedKarts = renderer;
    }
    renderer.setWorld(world);
    currentWorld = world;
  }

  function replaceCanvas() {
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
    contextOk = true;
  }

  try {
    try {
      renderer = launchRenderer();
    } catch (error) {
      if (backend === "canvas") throw error;
      backend = "canvas";
      replaceCanvas();
      renderer = launchRenderer();
    }
    scene.dataset.renderer = backend;
    map = buildMap(course, miniMap);
  } catch (error) {
    abort.abort();
    audio.dispose();
    scene.remove();
    throw error;
  }

  const driving = () => phase === "run";
  const previewing = () => phase === "menu" || phase === "settings" && settingsBack === "menu";
  const active = () => ["run", "intro", "grid", "finish"].includes(phase);
  const animated = () => active();
  const pressed = action => [...keyHeld].some(code => KEYS[code] === action) || [...pointers.values()].includes(action);
  const callFrame = () => { if (!frameId && !gone && !document.hidden) frameId = requestAnimationFrame(frame); };

  function say(message, seconds = 2.3) {
    coach.textContent = message;
    live.textContent = message;
    messageUntil = settledTime + seconds;
  }

  function paintCoach() {
    if (coach.textContent && (settledTime > messageUntil || !driving())) coach.textContent = "";
    if (!driving()) delete scene.dataset.boost;
  }

  function syncInputUI() {
    for (const button of holdButtons) button.dataset.on = String(pressed(button.dataset.hold));
  }

  function clearControls({ keepStick = false } = {}) {
    keyHeld.clear();
    pointers.clear();
    if (!keepStick) resetStick();
    pad.suppress();
    controller = null;
    controllerDirection = 0;
    boostPulse = false;
    hopPulse = false;
    syncInputUI();
  }

  // Virtual steering stick: analog [-1, 1] from horizontal drag, springing
  // back to center on release. It owns one pointer only — other fingers keep
  // their own action buttons (multi-touch).
  function updateStick(event) {
    if (!stick) return;
    const rect = stick.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = Math.max(-1, Math.min(1, (event.clientX - (rect.left + radius)) / radius));
    const value = Math.abs(dx) < STICK_DEAD ? 0 : dx;
    stickSteer = value;
    if (stickThumb) stickThumb.style.transform = `translate(calc(-50% + ${value * radius * 0.42}px), -50%)`;
    stick.dataset.on = String(value !== 0);
    stick.setAttribute("aria-valuenow", String(Math.round(value * 100)));
    stick.setAttribute("aria-valuetext", value === 0 ? t("Centered", "ตรงกลาง") : value < 0 ? t("Steering left", "เลี้ยวซ้าย") : t("Steering right", "เลี้ยวขวา"));
  }

  function resetStick() {
    const held = stickOwner.release();
    if (held !== null) {
      try { stick?.releasePointerCapture(held); } catch { }
    }
    stickSteer = 0;
    if (stickThumb) stickThumb.style.transform = "";
    if (stick) {
      stick.dataset.on = "false";
      stick.setAttribute("aria-valuenow", "0");
      stick.setAttribute("aria-valuetext", t("Centered", "ตรงกลาง"));
    }
  }

  function stickStart(event) {
    // The stick also works during the countdown (controls are only visible
    // in run/grid), so the kart can leave the line already steering.
    if (!stick || (!driving() && phase !== "grid") || stickOwner.held !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    stickOwner.claim(event.pointerId);
    try { stick.setPointerCapture(event.pointerId); } catch { }
    // Grabbing the stick (re)defines the gyroscope rest posture.
    gyroPower.reset();
    updateStick(event);
  }

  function stickMove(event) {
    if (!stickOwner.owns(event.pointerId)) return;
    event.preventDefault();
    updateStick(event);
  }

  function stickEnd(event) {
    if (!stickOwner.owns(event.pointerId)) return;
    resetStick();
  }

  function resize() {
    const rect = scene.getBoundingClientRect();
    dimensions = { width: rect.width, height: rect.height };
    renderer.resize(rect.width, rect.height, (window.devicePixelRatio || 1) * scaleDown);
    repaint = true;
    callFrame();
  }

  function setFocus(selector) {
    const button = find(selector);
    if (button && !button.hidden) button.focus({ preventScroll: true });
  }

  function refreshButtons() {
    const race = driving();
    toolbar.rear.hidden = !race;
    toolbar.camera.hidden = !race;
    toolbar.pause.hidden = !active() || phase === "finish";
    toolbar.settings.hidden = !["menu", "pause"].includes(phase);
    toolbar.sound.hidden = ["lost", "study", "quiz"].includes(phase);
    const label = cameraLabel(cameraMode, lang);
    toolbar.camera.setAttribute("aria-label", label);
    toolbar.camera.title = label;
    updateSoundButton(toolbar.sound, record.settings().sound, lang);
    audio.setMuted(!record.settings().sound);
  }

  function paintPower() {
    const item = run.player.power;
    powerDock.hidden = !driving() || !item;
    if (!item) {
      previousPower = "";
      return;
    }
    const info = POWER_INFO[item.kind];
    if (!info) { powerDock.hidden = true; return; }
    const key = item.kind + ":" + item.level + ":" + item.quizOffered;
    if (key === previousPower) return;
    previousPower = key;
    const name = info[lang] + (item.level > 1 ? " II" : "");
    emblem.innerHTML = powerSymbol(item.kind);
    values.item.textContent = name;
    powerUse.title = (item.level === 1 ? info.detail : info.enhanced)[lang];
    powerUse.setAttribute("aria-label", t("Use ", "ใช้") + name + " · " + powerUse.title);
    powerDock.dataset.level = String(item.level);
    powerQuizButton.hidden = item.level > 1 || !!item.quizOffered;
    powerQuizButton.title = info.enhanced[lang];
  }

  function paintPanel(focus = false) {
    const stats = ["run", "grid", "study", "quiz"].includes(phase);
    const userHUD = stats || phase === "pause" && suspended?.phase === "run";
    hud.hidden = !userHUD;
    speedTag.hidden = !userHUD;
    // The driving controls stay visible during the countdown: the turbo
    // button is the only way to time a launch boost or hold it on touch.
    controls.hidden = !["run", "grid"].includes(phase);
    rankTag.hidden = mode === "trial";
    scene.dataset.phase = phase;
    scene.dataset.calm = String(reduced());
    scene.dataset.menuSettings = String(phase === "settings" && settingsBack === "menu");
    canvas.tabIndex = phase === "menu" ? 0 : -1;
    if (phase !== "menu") previewDrag = null;
    toolbar.back.inert = phase === "quiz";
    repaint = true;
    refreshButtons();
    paintPower();
    if (phase === "menu") {
      panel.innerHTML = menu(lang, course, mode, record.best(course.id, mode), COURSES, cupChoice, standalone);
      if (focus) setFocus("[data-act=start]");
    } else if (phase === "intro") {
      panel.innerHTML = slate(lang, course, mode, cupIndex, cupChoice);
      if (focus) setFocus("[data-act=skip]");
    } else if (phase === "pause" || phase === "settings" || phase === "lost") {
      panel.innerHTML = center(lang, phase, { ...record.settings(), quality }, settingsBack === "pause");
      if (focus) setFocus("[data-panel] .rr3-main");
    } else if (phase === "quiz" && localQuiz) {
      panel.innerHTML = quickQuiz(lang, localQuiz, POWER_INFO[run.player.power?.kind]);
      if (focus) setFocus(Number.isInteger(localQuiz.answer) ? "[data-act=quiz-resume]" : "[data-act=quiz-answer]");
    } else if (phase === "result") {
      panel.innerHTML = summary(lang, result, { mode, isBest: best, cup, cupIndex, cupChoice, ranks, course });
      if (focus) setFocus("[data-panel] .rr3-main");
    } else {
      panel.replaceChildren();
      if (phase === "grid") {
        countdown = Math.max(1, Math.ceil(GRID_TIME - phaseTime));
        newCount(panel, String(countdown));
      }
      if (focus && phase === "run") setFocus("[data-act=pause]");
    }
  }

  function phaseTo(next, elapsed = 0, focus = true) {
    // A stick held through the countdown keeps steering across the GO:
    // resetting it there would straighten a kart the player is already
    // turning (and drop all later moves for that finger).
    const keepStick = phase === "grid" && next === "run" && stickOwner.held !== null;
    phase = next;
    phaseTime = elapsed;
    accumulator = 0;
    clearControls({ keepStick });
    audio.setPhase(next === "settings" || next === "lost" ? "paused" : next);
    paintPanel(focus);
    paintCoach();
    lastHud = -1;
    callFrame();
  }

  function changeMode(next) {
    if (loadingCourse || ctx.mode === "study" || !["race","cup","trial", ...(standalone ? ["study"] : [])].includes(next) || next === mode) return;
    mode = next;
    if (mode === "cup") selectCourse(COURSES.findIndex(track => track.id === CUPS[cupChoice].ids[0]));
    run = grid();
    director.reset();
    paintPanel();
    callFrame();
    setFocus(`[data-mode="${mode}"]`);
  }

  function selectCourse(index) {
    if (!Number.isInteger(index) || loadingCourse) return;
    courseIndex = (index + COURSES.length) % COURSES.length;
    course = COURSES[courseIndex];
    run = grid();
    map = buildMap(course, miniMap);
    director.reset();
  }

  function choose(index) {
    if (mode === "cup") {
      cupChoice = (index + CUPS.length) % CUPS.length;
      selectCourse(COURSES.findIndex(track => track.id === CUPS[cupChoice].ids[0]));
    } else selectCourse(index);
    paintPanel();
    callFrame();
  }

  function resetCup() {
    cup.fill(0);
    cupIndex = 0;
    selectCourse(COURSES.findIndex(track => track.id === CUPS[cupChoice].ids[0]));
  }

  // Gyroscope shortcut for the power button (extra, never a requirement):
  // on iOS 13+ the permission must come from a user gesture, so it rides on
  // the same tap that starts the race. Denied or missing sensor: the button
  // keeps working exactly as before.
  function enableGyro() {
    if (gyroOn) return;
    gyroOn = true;
    scene.dataset.gyro = "on";
  }
  async function requestGyroPermission() {
    if (typeof DeviceOrientationEvent === "undefined") return;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) === "granted") enableGyro();
      } catch { /* denied or unavailable: the button still works */ }
    } else enableGyro();
  }

  async function startRace(skip = false) {
    if (gone || loadingCourse) return;
    if (record.settings().sound) void audio.unlock();
    void requestGyroPermission();
    if (currentWorld?.course !== course) {
      loadingCourse = true;
      const pending = document.createElement("div");
      pending.setAttribute("role","status");
      pending.className = "rr3-loading";
      pending.textContent = t("Preparing circuit…","กำลังเตรียมสนาม…");
      find(".rr3-menu, .rr3-center, .rr3-result")?.append(pending);
      panel.querySelectorAll("button, select").forEach(button => { button.disabled = true; });
      try {
        await new Promise(resolve => {
          if (document.hidden) resolve();
          else requestAnimationFrame(() => document.hidden ? resolve() : requestAnimationFrame(resolve));
        });
        if (gone || phase === "lost") return;
        prepareCourse();
      } catch {
        if (!gone) graphicsInterrupted();
        return;
      } finally {
        loadingCourse = false;
      }
    }
    run = grid();
    audio.setWorld?.(course);
    director.reset();
    localQuiz = null;
    result = null;
    ghosts = mode === "trial" ? record.ghost(course.id) : null;
    samples = [];
    ghostInterval = Math.max(.18, course.length * run.laps / (course.cruise * 950));
    countdown = 0;
    launchBoostQueued = false;
    launchBoostHeld = false;
    lastBoostPress = -10;
    best = false;
    ranks = [];
    lastRank = null;
    const quick = skip || reduced();
    phaseTo(quick ? "grid" : "intro", 0, !quick);
    if (quick) audio.play("countdown", 3);
    if (document.hidden) pauseGame();
  }

  function toGrid() {
    phaseTo("grid", 0, false);
    audio.play("countdown", 3);
  }

  function pauseGame() {
    if (!active() || phase === "finish") return;
    suspended = { phase, elapsed: phaseTime };
    phaseTo("pause");
  }

  function resumeGame() {
    if (!suspended) return;
    const resume = suspended;
    suspended = null;
    if (record.settings().sound) void audio.unlock();
    phaseTo(resume.phase, resume.elapsed);
  }

  function lobby() {
    if (loadingCourse) return;
    suspended = null;
    localQuiz = null;
    run = grid();
    director.reset();
    phaseTo("menu");
  }

  function saveSample(force = false) {
    if (mode !== "trial") return;
    const last = samples.at(-1);
    if (last && (run.time <= last[0] || !force && run.time - last[0] < ghostInterval)) return;
    if (samples.length >= 1799) {
      samples = samples.filter((_, index) => index % 2 === 0);
      ghostInterval *= 2;
    }
    const player = pose(course, run.player);
    const row = [run.time, player.x, player.y, player.z, player.yaw, player.speed].map(value => Math.round(value * 1000) / 1000);
    if (!last || row[0] > last[0]) samples.push(row);
  }

  function finishRace(event) {
    if (!driving() || result) return;
    result = event.result || resultFor(run);
    saveSample(true);
    best = record.save(course.id, mode, result, samples);
    // La clave fern-rally-touring-v2 entra en el snapshot main (prefijo
    // fern-): avisar al sync para que la subida se programe. El sync jamás
    // rompe el juego. Espejo del race.mjs viejo (saveTime).
    if (best) { try { noteLocalChange('main'); } catch { /* sin sync no pasa nada */ } }
    ranks = [...run.racers].sort((a, b) => a.rank - b.rank).map(({ id, rank }) => ({ id, rank }));
    if (mode === "cup") for (const row of ranks) cup[row.id] += POINTS[row.rank - 1] || 0;
    phaseTo(reduced() ? "result" : "finish");
    audio.setPhase("finish");
    audio.play(result.win ? "win" : "finish");
    try {
      ctx.complete?.(result);
    } catch {
      // Keep the result screen available if the host cannot record points.
    }
  }

  async function studyStop() {
    if (!driving() || mode !== "study") return;
    const currentRun = run;
    if (typeof ctx.askQuestion !== "function") {
      localQuiz = { kind: "study", question: quizDeck(), elapsed: phaseTime };
      phaseTo("quiz", 0);
      return;
    }
    phaseTo("study", phaseTime, false);
    let correct = null;
    try {
      correct = await ctx.askQuestion?.();
    } catch {
      // A closed or unavailable question still allows the race to resume.
    }
    if (gone || currentRun !== run || phase !== "study") return;
    resolveStudy(run, correct);
    phaseTo("run");
    if (correct === true) say(t("Correct · turbo boost!", "ตอบถูก · รับเทอร์โบ!"));
    if (document.hidden) pauseGame();
  }

  function upgradeQuiz() {
    if (!driving() || !beginPowerQuiz(run)) return;
    localQuiz = { kind: "power", question: quizDeck(), elapsed: phaseTime };
    phaseTo("quiz");
  }

  function answerQuiz(index) {
    if (phase !== "quiz" || !localQuiz || !Number.isInteger(index) || !localQuiz.question.answers[index] || Number.isInteger(localQuiz.answer)) return;
    localQuiz.answer = index;
    paintPanel(true);
    const correct = index === localQuiz.question.correct;
    audio.play(correct ? "correct" : "wrong");
    live.textContent = correct ? t("Correct","ตอบถูก") : t("Review the answer","ทบทวนคำตอบ");
  }

  function closeQuiz() {
    if (phase !== "quiz" || !localQuiz) return;
    const { kind, answer, question, elapsed } = localQuiz;
    localQuiz = null;
    const correct = Number.isInteger(answer) ? answer === question.correct : null;
    if (kind === "power") resolvePowerQuiz(run,correct);
    else resolveStudy(run,correct);
    phaseTo("run",elapsed);
    processEvents();
    if (kind === "study" && correct) say(t("Correct · turbo boost!", "ตอบถูก · รับเทอร์โบ!"));
    if (document.hidden) pauseGame();
  }

  function firePower() {
    if (!driving() || !usePower(run)) return;
    processEvents();
    paintPower();
  }

  function processEvents() {
    for (const event of run.events.splice(0)) {
      if (event.type === "finish") {
        finishRace(event);
      } else if (event.type === "study") {
        void studyStop();
      } else if (event.type === "lap") {
        audio.play("lap");
        say(run.player.lap === run.laps ? t("Final lap", "รอบสุดท้าย") : t("Next lap", "รอบถัดไป"));
      } else if (event.type === "charge") {
        audio.play("charge");
        if (event.tier > 0) say(t("Release drift for a mini turbo", "ปล่อยดริฟต์เพื่อรับมินิเทอร์โบ"), 1.45);
        else say(t("Turbo ready", "เทอร์โบพร้อมใช้"), 1.7);
      } else if (["powerPickup","powerUse","powerUpgrade","powerQuizEnd","hazard","guard","hop","land"].includes(event.type)) {
        audio.play(event.type,event);
        if (event.type === "powerPickup") {
          paintPower();
          const info = POWER_INFO[event.kind];
          if (info) say(`${info[lang]} · ${info.detail[lang]}`, 3.2);
        } else if (event.type === "powerUpgrade") say(t("Level II ready","พลังระดับ II พร้อมแล้ว"),1.6);
        else if (event.type === "powerUse") {
          const name = POWER_INFO[event.kind]?.[lang];
          if (name) say(name + (event.level > 1 ? " II" : ""),1.25);
          director.pulse("power");
        } else if (event.type === "hazard" && !event.blocked) {
          trauma = Math.min(1, trauma + .3);
          const kind = { slick: t("Slippery surface","พื้นลื่น"), hurdle: t("Hop over low gates","กระโดดข้ามรั้วเตี้ย"), sweeper: t("Watch the moving gate","ระวังประตูเคลื่อนที่"), slalom: t("Dodge the barriers","หลบสิ่งกีดขวาง") }[event.kind];
          if (kind) say(kind,1.6);
        }
      } else if (["boost","pickup","hit","offroad","bump"].includes(event.type)) {
        audio.play(event.type,event);
        if (event.type === "boost") director.pulse("turbo");
        if (event.type === "hit") { trauma = Math.min(1, trauma + .5 * (event.strength || .5)); director.pulse("hit", event.strength || .5); }
        else if (event.type === "offroad") {
          trauma = Math.min(1, trauma + .25);
          say(t("Off the track!", "ออกนอกถนน!"), 1.4);
        }
        else if (event.type === "bump") { trauma = Math.min(1, trauma + .35 * (event.strength || .5)); director.pulse("hit", event.strength || .5); }
      }
    }
  }

  function offroad(car) {
    return car.friction > .28;
  }

  function visualCars(rolling, showpiece) {
    const racers = showpiece ? [{ ...run.player, s: 15, offset: .8, speed: 0 }] : run.racers;
    return racers.map(car => {
      const progress = rolling ? Math.min(1, rolling / FINISH_SECONDS) : 0;
      const rollOut = Math.min(Math.max(0, car.speed), 42) * .60 * (1 - Math.exp(-rolling * 1.55));
      const avatar = rolling ? { ...car, s: car.s + rollOut, speed: car.speed * (1 - progress), boost: 0, drift: false } : car;
      const position = pose(course, avatar);
      const base = course.frame(avatar.s);
      return {
        ...position, s: avatar.s, speed: avatar.speed, offroad: offroad(avatar),
        roadY: base.y + Math.tan(base.bank) * avatar.offset, roadPitch: -Math.atan(base.dy), bank: base.bank,
      };
    });
  }

  function draw(dt) {
    const showpiece = previewing();
    if (showpiece && !loadingCourse) prepareCourse();
    if (!currentWorld || currentWorld.course !== course) return;
    const rolling = phase === "finish" ? phaseTime : phase === "result" && !reduced() ? FINISH_SECONDS : 0;
    const vehicles = visualCars(rolling, showpiece);
    const viewPhase = showpiece ? "menu" :
      phase === "result" ? reduced() ? "run" : "finish" : phase === "pause" || phase === "study" || phase === "quiz" || phase === "settings" ? suspended?.phase || "run" : phase;
    const elapsed = phase === "result" ? FINISH_SECONDS : (phase === "pause" || phase === "settings") && suspended ? suspended.elapsed : phaseTime;
    const camera = director.get({
      phase: viewPhase, elapsed, course, player: { ...run.player, s: vehicles[0].s },
      pose: vehicles[0], mode: driving() && (pressed("rear") || controller?.rear) ? "rear" : cameraMode, reducedMotion: reduced(), dt,
      aspect: dimensions?.height ? dimensions.width / dimensions.height : 16 / 9, orbit: previewAngle,
    });
    // Camera shake from hits, hazards, bumps and off-track moments. The
    // trauma value is fed by processEvents and decays in frame().
    if (trauma > .01 && driving() && !reduced()) {
      const shake = trauma * trauma;
      camera.x += (Math.random() * 2 - 1) * .10 * shake;
      camera.y += (Math.random() * 2 - 1) * .08 * shake;
      camera.tx += (Math.random() * 2 - 1) * .14 * shake;
      camera.tz += (Math.random() * 2 - 1) * .14 * shake;
      camera.roll = (camera.roll || 0) + (Math.random() * 2 - 1) * .014 * shake;
    }
    if (camera.shot === "bumper") camera.hidePlayer = true;
    // The low pre-race dolly has its own clean framing. The grid reveal brings the other drivers back.
    if (camera.shot === "hero") vehicles.length = 1;
    if (scene.dataset.shot !== camera.shot) {
      scene.dataset.shot = camera.shot;
      if (phase === "intro") {
        audio.play("cinematic", camera.shot);
        const place = find("[data-landmark]");
        if (place) place.textContent = camera.landmark?.name?.[lang] || "";
      }
    }
    if (camera.shot === "lobby" && dimensions?.width < 590) camera.ty -= .30;
    const lap = Math.max(0, Math.floor(run.player.s / course.length));
    const pickups = course.pickups.map(item => !run.collected.has(lap * course.pickups.length + item.id));
    if (mode === "trial" && viewPhase === "run" && run.time > .52) {
      const ghost = ghostAt(ghosts, run.time);
      if (ghost && Math.hypot(ghost.x - vehicles[0].x, ghost.z - vehicles[0].z) > 1.5) vehicles.push(ghost);
    }
    const streak = !driving() || reduced() ? 0 : run.player.boost > 0 ? .88 : run.player.speed > 30 ? .22 : 0;
    renderer.draw({
      camera, vehicles, time: renderClock,
      boost: streak,
      effects: { pickups: showpiece ? [] : pickups, collectedItems: run.collectedItems, lap, raceTime: run.time, itemsEnabled: !showpiece && mode !== "trial", calm: reduced() },
    });
    if (userHudDue()) {
      values.rank.textContent = run.player.rank + " / " + run.racers.length;
      // A position change sweeps the drone camera sideways (gain = +, loss = -).
      if (driving() && lastRank !== null && run.player.rank !== lastRank) director.pulse("overtake", lastRank - run.player.rank);
      lastRank = run.player.rank;
      values.lap.textContent = run.player.lap + " / " + run.laps;
      values.time.textContent = stamp(run.time);
      values.speed.textContent = Math.round(run.player.speed * 3.6);
      const fraction = Math.max(0, run.player.s % course.length / course.length);
      const sector = course.sectors.findLast(part => part.fraction <= fraction) || course.sectors[0];
      values.sector.textContent = sector.name[lang];
      values.progress.style.width = Math.round(fraction * 100) + "%";
      paintPower();
      values.drift.style.width = `${Math.round(run.player.charge * 100)}%`;
      values.boost.style.width = `${Math.round(run.player.boostCharge * 100)}%`;
      turbo.dataset.ready = String(run.player.boostCharge >= TURBO_COST);
      scene.dataset.boost = String(driving() && !reduced() && run.player.boost > 0);
      paintMap(miniMap, map, vehicles.filter(car => !car.ghost));
      lastHud = settledTime;
    }
  }

  function userHudDue() {
    return !hud.hidden && (lastHud < 0 || settledTime - lastHud > .065);
  }

  function pollController() {
    const snapshot = pad.read();
    controller = snapshot;
    if (phase === "quiz") {
      const direction = Math.abs(snapshot.steer) > .5 ? Math.sign(snapshot.steer) : 0;
      if (direction && direction !== controllerDirection) {
        const choices = [...panel.querySelectorAll("button")];
        const current = Math.max(0, choices.indexOf(document.activeElement));
        choices[(current + direction + choices.length) % choices.length]?.focus();
      }
      controllerDirection = direction;
      if (snapshot.pressed.has("item")) {
        const selected = document.activeElement;
        if (panel.contains(selected) && !selected.disabled) selected.click();
      } else if (snapshot.pressed.has("boost") || snapshot.pressed.has("pause")) {
        closeQuiz();
      }
      return;
    }
    if (snapshot.pressed.has("pause")) {
      if (phase === "pause") resumeGame();
      else pauseGame();
      return;
    }
    if (phase === "grid" && snapshot.pressed.has("boost")) lastBoostPress = settledTime;
    if (!driving()) return;
    if (snapshot.pressed.has("quiz") && run.player.power && !run.player.power.quizOffered) {
      upgradeQuiz();
      return;
    }
    if (snapshot.pressed.has("item")) firePower();
    if (snapshot.pressed.has("hop")) hopPulse = true;
    if (snapshot.pressed.has("boost")) boostPulse = true;
    if (snapshot.pressed.has("camera")) cycleCamera();
  }

  function frame(now) {
    frameId = 0;
    if (gone || document.hidden || phase === "lost") {
      lastFrame = 0;
      return;
    }
    const rawDelta = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
    const elapsed = Math.min(Math.max(0, rawDelta), 1.5);
    const delta = Math.min(elapsed, .29);
    lastFrame = now;
    const beforeControl = phase;
    pollController();
    settledTime += elapsed;
    // Camera shake decays over time.
    trauma = Math.max(0, trauma - elapsed * 1.7);
    if (phase === beforeControl) phaseTime += elapsed;
    if (animated()) renderClock += delta;
    if (phase === "intro" && phaseTime >= INTRO_SECONDS) toGrid();
    else if (phase === "grid") {
      const left = Math.ceil(GRID_TIME - phaseTime);
      if (left <= 0) {
        phaseTo("run", 0, false);
        // Turbo pressed right at GO earns a launch boost; a turbo held
        // through the countdown queues the manual turbo for the launch.
        if (settledTime - lastBoostPress <= .35) perfectStart(run);
        if (launchBoostHeld || controller?.held?.has("boost")) launchBoostQueued = true;
        audio.play("go");
        newCount(panel, t("GO!", "ไป!"));
        saveSample(true);
        say(t("Hold Drift as you turn. Release for a boost.", "กดดริฟต์ค้างขณะเลี้ยว ปล่อยเพื่อเร่งความเร็ว"), 5.5);
      } else if (left !== countdown) {
        countdown = left;
        newCount(panel, String(left));
        audio.play("countdown", left);
      }
    } else if (driving() && phase === beforeControl) {
      if (phaseTime > .52 && panel.firstElementChild?.classList.contains("rr3-countdown")) panel.replaceChildren();
      accumulator += delta;
      const brake = pressed("brake") ? 1 : controller?.brake || 0;
      while (accumulator + 1e-8 >= FIXED && driving()) {
        stepRace(run, {
          steer: stickSteer || (Number(pressed("right")) - Number(pressed("left"))) || controller?.steer || 0,
          drift: pressed("drift") || controller?.drift, brake, boost: boostPulse || pressed("boost") || launchBoostQueued, hop: hopPulse || pressed("hop"),
        }, FIXED);
        boostPulse = false;
        hopPulse = false;
        accumulator -= FIXED;
        saveSample();
        processEvents();
      }
      // The queued launch turbo fires as soon as the kart is moving; drop
      // it then so a later press is a fresh edge.
      if (launchBoostQueued && run.player.speed > 5) launchBoostQueued = false;
      if (driving()) audio.update({ speed: run.player.speed, boost: run.player.boost > 0, drift: run.player.drift,
        brake, offroad: run.player.friction, airborne: run.player.airborne, steer: run.player.steer });
    } else if (phase === "finish" && phaseTime >= FINISH_SECONDS) {
      phaseTo("result");
    }
    paintCoach();
    try {
      if (animated() || repaint) {
        repaint = false;
        draw(delta);
      }
    } catch {
      graphicsInterrupted();
      return;
    }
    if (animated() && elapsed < .6 && quality === "auto") {
      frameCost = (frameCost * .92) + Math.min(rawDelta * 1000, 200) * .08;
      perfClock += elapsed;
      if (perfClock > 2.3) {
        perfClock = 0;
        const targetScale = frameCost > 59 ? .65 : frameCost > 34 ? .76 : frameCost > 24 ? .88 : scaleDown;
        if (targetScale < scaleDown) {
          scaleDown = targetScale;
          resize();
        }
      }
    }
    if (animated() || controller?.connected && ["pause","quiz"].includes(phase)) callFrame();
    else lastFrame = 0;
  }

  function graphicsInterrupted() {
    if (gone || phase === "lost") return;
    lost = { phase, elapsed: phaseTime };
    phaseTo("lost");
  }

  function recover(useCanvas = false) {
    if (!contextOk && !useCanvas) {
      say(t("Waiting for your browser to restore 3D.", "กำลังรอให้เบราว์เซอร์คืนค่า 3D"));
      const line = find(".rr3-center > p");
      if (line) line.textContent = live.textContent;
      return;
    }
    try {
      renderer.dispose();
      if (useCanvas) {
        backend = "canvas";
        replaceCanvas();
      }
      renderer = launchRenderer();
      scene.dataset.renderer = backend;
      director.reset();
      const previous = lost || { phase: "menu", elapsed: 0 };
      lost = null;
      if (["intro", "grid", "run", "study","quiz"].includes(previous.phase)) {
        suspended = { phase: ["quiz","study"].includes(previous.phase) ? "run" : previous.phase, elapsed: localQuiz?.elapsed ?? previous.elapsed };
        if (run.studyPending) resolveStudy(run, null);
        if (run.powerQuizPending) resolvePowerQuiz(run,null);
        localQuiz = null;
        phaseTo("pause");
      } else if (suspended && (previous.phase === "pause" || previous.phase === "settings" && settingsBack === "pause")) {
        phaseTo("pause");
      } else phaseTo(result ? "result" : "menu");
      resize();
    } catch {
      const line = find(".rr3-center > p");
      if (line) line.textContent = t("3D is still unavailable in this session.", "3D ยังไม่พร้อมใช้งานในครั้งนี้");
    }
  }

  function cycleCamera() {
    if (!driving()) return;
    const index = (CAMERA_MODES.indexOf(cameraMode) + 1) % CAMERA_MODES.length;
    cameraMode = CAMERA_MODES[index];
    refreshButtons();
    say(cameraLabel(cameraMode, lang), 1.0);
  }

  function toggleSound() {
    record.setSetting("sound", !record.settings().sound);
    refreshButtons();
    if (record.settings().sound) void audio.unlock();
  }

  function handleClick(event) {
    const button = event.target.closest("button[data-act]");
    if (!button || button.disabled || gone || loadingCourse) return;
    const action = button.dataset.act;
    if (action === "sound") toggleSound();
    else if (action === "settings") {
      settingsBack = phase;
      phaseTo("settings");
    } else if (action === "close-settings") {
      director.reset();
      phaseTo(settingsBack);
    } else if (action === "mode" && phase === "menu") changeMode(button.dataset.mode);
    else if ((action === "previous" || action === "next-course") && phase === "menu") {
      choose((mode === "cup" ? cupChoice : courseIndex) + (action === "previous" ? -1 : 1));
      setFocus(`[data-act="${action}"]`);
    } else if (action === "start" && phase === "menu") {
      if (mode === "cup") resetCup();
      void startRace();
    } else if (action === "skip" && phase === "intro") toGrid();
    else if (action === "pause") pauseTap.click(event);
    else if (action === "resume" && phase === "pause") resumeGame();
    else if (action === "camera") cameraTap.click(event);
    else if (action === "restart" && phase === "pause") startRace(true);
    else if (action === "lobby") lobby();
    else if (action === "power") powerTap.click(event);
    else if (action === "power-quiz") powerQuizTap.click(event);
    else if (action === "quiz-answer") answerQuiz(Number(button.dataset.answer));
    else if (action === "quiz-skip" || action === "quiz-resume") closeQuiz();
    else if (action === "retry" && phase === "result") {
      if (mode === "cup") resetCup();
      void startRace(true);
    } else if (action === "continue-cup" && phase === "result" && cupIndex + 1 < CUPS[cupChoice].ids.length) {
      const next = CUPS[cupChoice].ids[++cupIndex];
      selectCourse(COURSES.findIndex(track => track.id === next));
      void startRace();
    } else if (action === "restore" && phase === "lost") recover();
    else if (action === "compatibility" && phase === "lost") {
      if (backend === "canvas") switchToClassic?.();
      else recover(true);
    }
  }

  function handlePreference(event) {
    const selector = event.target.closest("select[data-choose]");
    if (selector && phase === "menu" && !loadingCourse) {
      const next = Number(selector.value);
      if (Number.isInteger(next) && next >= 0 && next < (mode === "cup" ? CUPS.length : COURSES.length)) {
        choose(next);
        setFocus("[data-choose]");
      }
      return;
    }
    const control = event.target.closest("select[data-pref]");
    if (!control) return;
    const name = control.dataset.pref;
    const value = control.value;
    record.setSetting(name, name === "sound" ? value === "on" : value);
    if (name === "sound" && value === "on") void audio.unlock();
    if (name === "quality" && quality !== record.settings().quality) {
      quality = record.settings().quality;
      scaleDown = 1;
      frameCost = 16;
      perfClock = 0;
      renderer.setQuality?.(quality);
      resize();
    }
    scene.dataset.calm = String(reduced());
    refreshButtons();
    callFrame();
  }

  function holdStart(event) {
    if (phase === "grid" && event.button === 0 && event.currentTarget.dataset.hold === "boost" && !event.currentTarget.disabled) {
      event.preventDefault();
      lastBoostPress = settledTime;
      launchBoostHeld = true;
      return;
    }
    if (!driving() || event.button !== 0 || event.currentTarget.disabled) return;
    const action = event.currentTarget.dataset.hold;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { }
    pointers.set(event.pointerId, action);
    if (action === "boost") boostPulse = true;
    if (action === "hop") hopPulse = true;
    syncInputUI();
  }

  function holdEnd(event) {
    if (event.currentTarget.dataset.hold === "boost") launchBoostHeld = false;
    if (pointers.delete(event.pointerId)) syncInputUI();
  }

  function keyboardDown(event) {
    if (gone || phase === "study" || event.target?.closest("dialog[open], select, input, textarea")) return;
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (phase === "menu" && event.target === canvas && ["ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
      rotatePreview(event.code === "ArrowLeft" ? -.28 : .28);
      return;
    }
    if (event.code === "Tab") {
      const scope = phase === "quiz" ? panel : scene;
      const focusable = [...scope.querySelectorAll("a[href], button, select, canvas[tabindex='0']")].filter(node => node.getClientRects().length && !node.disabled);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (phase === "quiz" && !scope.contains(document.activeElement) ||
        event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
      return;
    }
    if (phase === "quiz" && !event.repeat) {
      const numbers = ["Digit1","Digit2","Digit3"].indexOf(event.code);
      if (numbers >= 0) { event.preventDefault(); answerQuiz(numbers); return; }
      if (event.code === "Escape") { event.preventDefault(); closeQuiz(); return; }
    }
    if (event.code === "Escape" || event.code === "KeyP") {
      if (phase === "pause" && !event.repeat) resumeGame();
      else if (active() && !event.repeat) pauseGame();
      else return;
      event.preventDefault();
      return;
    }
    if (phase === "grid" && KEYS[event.code] === "boost") {
      // A turbo press during the countdown counts for the launch: a tap
      // timed at GO earns a perfect start, holding it queues the turbo.
      // (The generic guard below discards all input while not driving.)
      event.preventDefault();
      if (!event.repeat) lastBoostPress = settledTime;
      launchBoostHeld = true;
      return;
    }
    if (!driving()) return;
    if (["KeyE","KeyQ"].includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) (event.code === "KeyE" ? firePower : upgradeQuiz)();
      return;
    }
    if (event.code === "KeyC" && !event.repeat) {
      event.preventDefault();
      cycleCamera();
    } else if (KEYS[event.code]) {
      event.preventDefault();
      if (KEYS[event.code] === "boost" && !event.repeat) boostPulse = true;
      if (KEYS[event.code] === "hop" && !event.repeat) hopPulse = true;
      keyHeld.add(event.code);
      syncInputUI();
    }
  }

  scene.addEventListener("click", handleClick, options);
  function rotatePreview(change) {
    const next = previewAngle + change;
    previewAngle = Math.atan2(Math.sin(next), Math.cos(next));
    repaint = true;
    callFrame();
  }
  scene.addEventListener("pointerdown", event => {
    if (phase !== "menu" || event.target !== canvas || event.button !== 0 || previewDrag) return;
    previewDrag = { id: event.pointerId, x: event.clientX };
    try { canvas.setPointerCapture(event.pointerId); } catch { }
  }, options);
  scene.addEventListener("pointermove", event => {
    if (phase !== "menu" || previewDrag?.id !== event.pointerId) return;
    const delta = event.clientX - previewDrag.x;
    previewDrag.x = event.clientX;
    if (delta) rotatePreview(delta * .012);
  }, options);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    scene.addEventListener(type, event => {
      if (previewDrag?.id === event.pointerId) previewDrag = null;
    }, options);
  }
  scene.addEventListener("change", handlePreference, options);
  for (const button of holdButtons) {
    button.addEventListener("pointerdown", holdStart, options);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(type, holdEnd, options);
  }
  if (stick) {
    stick.addEventListener("pointerdown", stickStart, options);
    stick.addEventListener("pointermove", stickMove, options);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) stick.addEventListener(type, stickEnd, options);
  }
  // In-race action buttons fire on pointerdown, not on click: a second finger
  // down while the stick is held often never produces a click, so the power
  // button used to go dead until the stick was released. Click stays only as
  // the keyboard fallback (see handleClick).
  const powerTap = createTapAction(() => firePower());
  const powerQuizTap = createTapAction(() => upgradeQuiz());
  const cameraTap = createTapAction(() => cycleCamera());
  const pauseTap = createTapAction(() => pauseGame());
  if (powerUse) powerUse.addEventListener("pointerdown", event => { if (!powerUse.disabled) powerTap.down(event); }, options);
  if (powerQuizButton) powerQuizButton.addEventListener("pointerdown", event => { if (!powerQuizButton.disabled) powerQuizTap.down(event); }, options);
  if (toolbar.camera) toolbar.camera.addEventListener("pointerdown", event => { if (!toolbar.camera.hidden) cameraTap.down(event); }, options);
  if (toolbar.pause) toolbar.pause.addEventListener("pointerdown", event => { if (!toolbar.pause.hidden) pauseTap.down(event); }, options);
  // Gyroscope tilt fires the power without letting go of the stick. The
  // detector calibrates itself on the first sample of a race; on a desktop
  // (no sensor) this listener simply never fires.
  window.addEventListener("deviceorientation", event => {
    if (!gyroOn || !driving()) return;
    if (gyroPower.update({ beta: event.beta, gamma: event.gamma })) firePower();
  }, options);
  // A standard keyboard button activation still provides a momentary turbo.
  turbo.addEventListener("click", event => {
    if (event.detail === 0 && driving()) boostPulse = true;
  }, options);
  hopButton.addEventListener("click", event => { if (event.detail === 0 && driving()) hopPulse = true; }, options);
  window.addEventListener("keydown", keyboardDown, options);
  window.addEventListener("keyup", event => {
    if (KEYS[event.code] === "boost") launchBoostHeld = false;
    if (keyHeld.delete(event.code)) syncInputUI();
  }, options);
  window.addEventListener("gamepadconnected", callFrame, options);
  window.addEventListener("blur", () => { clearControls(); pauseGame(); }, options);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseGame();
      clearControls();
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrame = 0;
    } else callFrame();
  }, options);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    contextOk = false;
    graphicsInterrupted();
  }, options);
  canvas.addEventListener("webglcontextrestored", () => { contextOk = true; }, options);
  motionPreference.addEventListener?.("change", () => {
    if (reduced() && phase === "intro") toGrid();
    scene.dataset.calm = String(reduced());
    callFrame();
  }, options);
  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(scene);
  } else window.addEventListener("resize", resize, options);
  audio.setPhase("menu");
  paintPanel(true);
  resize();

  return () => {
    if (gone) return;
    gone = true;
    abort.abort();
    resizeObserver?.disconnect();
    if (frameId) cancelAnimationFrame(frameId);
    renderer.dispose();
    audio.dispose();
    scene.remove();
  };
}
