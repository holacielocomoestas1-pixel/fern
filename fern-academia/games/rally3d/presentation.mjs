import { cupRank, stamp } from "./profile.mjs";

const icons = {
  exit: '<path d="m11 6-6 6 6 6m-6-6h15"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 12 7-12 7z"/>',
  sound: '<path d="m3 9 4 0 5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m3 9 4 0 5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/>',
  camera: '<rect x="3" y="6" width="18" height="13" rx="3"/><circle cx="12" cy="12.5" r="3"/><path d="M8 6l1-2h6l1 2"/>',
  rear: '<path d="M4 9h13a3 3 0 0 1 0 6h-3M4 9l4-4m-4 4 4 4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3m0 13v3m9.5-9.5h-3m-13 0h-3m16.2-6.7-2.2 2.2m-9 9-2.2 2.2m13.4 0-2.2-2.2m-9-9L5.3 5.3"/><circle cx="12" cy="12" r="6.8"/>',
  drift: '<path d="M3 18c7 1 6-12 12-12h5m-4-4 4 4-4 4M3 13c4 0 4-8 9-9"/>',
  boost: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  hop: '<path d="M3 18h3l3-6 3 6h9M12 10V3m-3 3 3-3 3 3"/>',
  brake: '<path d="M6 5h10l2 2-2 12H7L5 16zm4 3-1 7m5-7-1 7"/>',
  quiz: '<path d="M3 5.5c3-1.5 6-.8 9 1.2 3-2 6-2.7 9-1.2V18c-3-.9-6-.4-9 1.8C9 17.6 6 17.1 3 18zM12 7v12"/>',
  item: '<path d="m12 2 9 5v10l-9 5-9-5V7zm0 10 9-5m-9 5L3 7m9 5v10"/>',
  shield: '<path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/>',
  comet: '<path d="m4 20 4-8L20 4l-4 12zM3 14l-1 3m8 4-3 1"/>',
  magnet: '<path d="M4 4h5v8a3 3 0 0 0 6 0V4h5v8a8 8 0 0 1-16 0zm0 4h5m6 0h5"/>',
  pulse: '<path d="M2 13h5l3-8 4 14 3-7h5"/>',
  grip: '<path d="m5 19 6-14h8l-6 14zm6-10h5m-7 5h5"/>',
  spring: '<path d="m8 21 8-3-8-3 8-3-8-3 8-3-8-3"/>',
  dial: '<path d="m6 9 6 6 6-6"/>',
  flag: '<path d="M5 22V4m0 0c5-4 8 3 15-1v11c-7 4-10-3-15 1"/>',
  trophy: '<path d="M8 4h8v7a4 4 0 0 1-8 0zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 3v4m-4 1h8"/>',
};

export const text = (lang, english, thai) => lang === "th" ? thai : english;

const glyph = key => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[key]}</svg>`;

const safe = value => String(value).replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const labels = {
  race: { en: "Quick race", th: "แข่งด่วน" },
  cup: { en: "Grand Prix", th: "กรังด์ปรีซ์" },
  trial: { en: "Time trial", th: "จับเวลา" },
  study: { en: "Study race", th: "แข่งพร้อมทบทวน" },
};

export const CUPS = [
  { ids: ["moss", "lantern", "river"], en: "Woodland Cup", th: "ถ้วยป่าเฟิร์น" },
  { ids: ["mangrove", "quarry", "orchard"], en: "Frontier Cup", th: "ถ้วยชายแดน" },
  { ids: ["glacier", "caldera", "citadel", "aurora"], en: "Summit Cup", th: "ถ้วยยอดเขา" },
];

const routes = new WeakMap();
function routeShape(course) {
  if (routes.has(course)) return routes.get(course);
  const points = Array.from({ length: 180 }, (_, i) => course.frame(course.length * i / 180));
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  const x0 = Math.min(...xs), z0 = Math.min(...zs), x1 = Math.max(...xs), z1 = Math.max(...zs);
  const scale = Math.min(110 / Math.max(x1 - x0, 1), 74 / Math.max(z1 - z0, 1));
  const xy = points.map(p => [(60 + (p.x - (x1+x0)/2) * scale).toFixed(1), (44 - (p.z - (z1+z0)/2) * scale).toFixed(1)]);
  const shape = `<svg class="rr3-outline" viewBox="0 0 120 88" fill="none" aria-hidden="true"><path d="M${xy.map(p => p.join(" ")).join(" L")} Z" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${xy[0][0]}" cy="${xy[0][1]}" r="3.6" fill="#fff9da"/></svg>`;
  routes.set(course, shape);
  return shape;
}

const trackDistance = (course, lang) => `${(course.length/1000).toFixed(2)} ${text(lang, "km", "กม.")}`;
const challenge = (value, lang) => text(lang,
  ["", "Easy", "Moderate", "Technical", "Advanced", "Expert"][value],
  ["", "ง่าย", "ปานกลาง", "เทคนิค", "ยาก", "เชี่ยวชาญ"][value]);

const names = [
  { en: "Fern", th: "เฟิร์น" }, { en: "Pip", th: "พิป" }, { en: "Ember", th: "เอ็มเบอร์" },
  { en: "Skye", th: "สกาย" }, { en: "Thistle", th: "ทิสเซิล" }, { en: "Juniper", th: "จูนิเปอร์" },
];

export const driverColors = ["#eaffba", "#efa8c7", "#ffb386", "#a3e9fd", "#d7b5ff", "#b0d9be"];

export function cameraLabel(mode, lang) {
  return {
    chase: text(lang, "Chase camera", "กล้องตามรถ"),
    wide: text(lang, "Wide camera", "กล้องมุมกว้าง"),
    bumper: text(lang, "Bumper camera", "กล้องหน้ารถ"),
    rear: text(lang, "Rear view", "มองด้านหลัง"),
  }[mode];
}

function smallButton(action, label, icon, data = "") {
  return `<button type="button" class="rr3-icon" data-act="${action}" aria-label="${safe(label)}" title="${safe(label)}" ${data}>${glyph(icon)}</button>`;
}

function chip(action, label, data = "") {
  return `<button type="button" class="rr3-chip" data-act="${action}" ${data}>${safe(label)}</button>`;
}

function mainButton(action, label, icon) {
  return `<button type="button" class="rr3-main" data-act="${action}">${icon ? glyph(icon) : ""}${safe(label)}</button>`;
}

function secondary(action, label) {
  return `<button type="button" class="rr3-secondary" data-act="${action}">${safe(label)}</button>`;
}

export function infrastructure(lang, exit) {
  const t = (en, th) => text(lang, en, th);
  return `<canvas class="rr3-canvas" aria-label="${t("Live 3D race scene", "ภาพสนามแข่งสามมิติ")}" role="img"></canvas>
    <div class="rr3-keyart" aria-hidden="true"></div><div class="rr3-lens" aria-hidden="true"></div><div class="rr3-film" aria-hidden="true"></div><div class="rr3-flare" aria-hidden="true"></div>
    <header class="rr3-toolbar">
      <a href="${safe(exit)}" class="rr3-icon" data-act="back" aria-label="${t("Back to playroom", "กลับห้องเกม")}" title="${t("Back to playroom", "กลับห้องเกม")}">${glyph("exit")}</a>
      <div class="rr3-tools">
        ${smallButton("rear", t("Hold to look back", "กดค้างเพื่อมองด้านหลัง"), "rear", 'hidden data-hold="rear"')}
        ${smallButton("camera", cameraLabel("chase", lang), "camera", "hidden")}
        ${smallButton("sound", t("Mute sound", "ปิดเสียง"), "sound", 'aria-pressed="true"')}
        ${smallButton("settings", t("Settings", "การตั้งค่า"), "gear")}
        ${smallButton("pause", t("Pause race", "หยุดแข่งชั่วคราว"), "pause", "hidden")}
      </div>
    </header>
    <div class="rr3-hud" hidden>
      <div class="rr3-timing"><div class="rr3-pills">
        <span class="rr3-stat" data-stat="rank"><small>${t("Position", "อันดับ")}</small><strong data-value="rank">—</strong></span>
        <span class="rr3-stat"><small>${t("Lap", "รอบ")}</small><strong data-value="lap">—</strong></span>
        <span class="rr3-stat"><small>${t("Time", "เวลา")}</small><strong data-value="time">0:00.00</strong></span>
      </div><div class="rr3-sector"><span data-value="sector"></span><span class="rr3-route-progress" aria-hidden="true"><i data-value="progress"></i></span></div></div>
      <canvas class="rr3-map" width="180" height="120" role="img" aria-label="${t("Circuit map", "แผนที่สนาม")}"></canvas>
    </div>
    <div class="rr3-power" data-power hidden>
      <button type="button" class="rr3-power-use" data-act="power" aria-keyshortcuts="E"><span data-power-symbol aria-hidden="true"></span><span><small>${t("Use power", "ใช้พลัง")}</small><strong data-value="item"></strong></span></button>
      <button type="button" class="rr3-power-quiz" data-act="power-quiz" aria-keyshortcuts="Q">${glyph("quiz")}<span>${t("Upgrade quiz", "ตอบเพื่ออัปเกรด")}</span></button>
    </div>
    <div class="rr3-speed" hidden><strong data-value="speed">0</strong><small>${t("km/h", "กม./ชม.")}</small></div>
    <div class="rr3-controls" hidden>
      <div class="rr3-steer" role="group" aria-label="${t("Steering", "บังคับทิศทาง")}">
        <button data-hold="left" type="button" aria-label="${t("Steer left", "เลี้ยวซ้าย")}">${glyph("left")}</button>
        <button data-hold="right" type="button" aria-label="${t("Steer right", "เลี้ยวขวา")}">${glyph("right")}</button>
      </div>
      <div class="rr3-actions" role="group" aria-label="${t("Driving actions", "การขับขี่")}">
        <button data-hold="brake" type="button" aria-keyshortcuts="S ArrowDown">${glyph("brake")}${t("Brake", "เบรก")}</button>
        <button data-hold="hop" type="button" aria-keyshortcuts="X J">${glyph("hop")}${t("Hop", "กระโดด")}</button>
        <button data-hold="drift" type="button">${glyph("drift")}${t("Drift", "ดริฟต์")}<span class="rr3-meter" aria-hidden="true"><i data-value="drift"></i></span></button>
        <button data-hold="boost" type="button">${glyph("boost")}${t("Turbo", "เทอร์โบ")}<span class="rr3-meter" aria-hidden="true"><i data-value="boost"></i></span></button>
      </div>
    </div>
    <p class="rr3-coach"></p><p class="rr3-sr" role="status" aria-live="polite" data-live></p>
    <div class="rr3-screen" data-panel></div>`;
}

export function menu(lang, course, mode, best, courses, cupChoice, standalone) {
  const t = (en, th) => text(lang, en, th);
  const cup = CUPS[cupChoice];
  const choosingCup = mode === "cup";
  const firstTrack = choosingCup ? courses.find(track => track.id === cup.ids[0]) : course;
  const options = choosingCup ? CUPS : courses;
  const selected = choosingCup ? cupChoice : courses.indexOf(course);
  const tag = choosingCup ? t(`${cup.ids.length} circuits · cumulative standings`, `${cup.ids.length} สนาม · คะแนนสะสม`) : course.tag[lang];
  const meta = choosingCup ? `${(cup.ids.reduce((a, id) => {
    const track = courses.find(c => c.id === id);
    return a + track.length * track.laps;
  }, 0) / 1000).toFixed(1)} ${t("km total", "กม. รวม")}` :
    `${trackDistance(course, lang)} / ${t("lap", "รอบ")} · ${course.laps} ${t("laps", "รอบ")} · ${challenge(course.difficulty, lang)}`;
  const title = lang === "th" ? "เฟิร์น<span>แรลลี</span>" : "Fern <span>Rally.</span>";
  const hint = { race: "", cup: "", trial: t("Race your personal-best ghost.", "แข่งกับเงาเวลาที่ดีที่สุดของคุณ"),
    study: t("Stop twice for practice and earn turbo.", "แวะทบทวนสองครั้งเพื่อรับเทอร์โบ") }[mode];
  const modes = standalone ? ["race", "cup", "trial", "study"] : ["race", "cup", "trial"];
  return `<section class="rr3-menu" aria-labelledby="rr3-title">
    <h1 id="rr3-title">${title}</h1>
    ${mode === "study" && !standalone ? `<p class="rr3-subtitle">${labels.study[lang]}</p>` :
      `<div class="rr3-modes" role="group" aria-label="${t("Race mode","โหมดแข่ง")}">${modes.map(id => chip("mode",labels[id][lang],`data-mode="${id}" aria-pressed="${id===mode}"`)).join("")}</div>`}
    <div class="rr3-trackline">
      ${routeShape(firstTrack)}
      <div class="rr3-tracktext"><label class="rr3-trackpick"><span class="rr3-sr">${choosingCup ? t("Select a cup","เลือกถ้วย") : t("Select a circuit","เลือกสนาม")}</span>
        <select data-choose="${choosingCup ? "cup" : "course"}">${options.map((value,index) =>
          `<option value="${index}" ${index===selected ? "selected" : ""}>${safe(choosingCup ? value[lang] : value.name[lang])}</option>`).join("")}</select>${glyph("dial")}</label>
        <p class="rr3-trackmeta">${safe(meta)}</p></div>
      <div class="rr3-arrows">${smallButton("previous", t("Previous","ก่อนหน้า"),"left")}${smallButton("next-course",t("Next","ถัดไป"),"right")}</div>
    </div>
    <p class="rr3-tag">${safe(tag)}</p>
    <div class="rr3-buttons">${mainButton("start", choosingCup ? t("Start cup","เริ่มแข่งชิงถ้วย") : t("Start race","เริ่มแข่ง"), "flag")}
    ${best && !choosingCup ? `<span class="rr3-best">${t("Personal best","สถิติส่วนตัว")} <b>${stamp(best.time)}</b></span>` : ""}</div>
    ${hint ? `<p class="rr3-foot">${safe(hint)}</p>` : ""}</section>`;
}

export function slate(lang, course, mode, cupIndex, cupChoice) {
  const t = (en, th) => text(lang, en, th);
  const cup = CUPS[cupChoice];
  const label = mode === "cup" ? `${cup[lang]} · ${cupIndex + 1} / ${cup.ids.length}` :
    `${labels[mode][lang]} · ${trackDistance(course,lang)} · ${course.laps} ${t("laps","รอบ")}`;
  return `<section class="rr3-slate"><div><p class="rr3-overline">${safe(label)}</p><h2>${safe(course.name[lang])}</h2></div>${chip("skip", t("Skip intro", "ข้ามฉากเปิด"))}</section>`;
}

export function powerSymbol(kind) {
  return glyph(Object.hasOwn(icons,kind) ? kind : "item");
}

export function quickQuiz(lang, quiz, info) {
  const t = (en, th) => text(lang,en,th);
  const { question, answer } = quiz;
  const ready = Number.isInteger(answer);
  const correct = answer === question.correct;
  const power = quiz.kind === "power";
  const context = power && info ? `${info[lang]} · ${t("Upgrade quiz","ตอบเพื่ออัปเกรด")}` : t("Study stop","จุดทบทวน");
  return `<section class="rr3-center rr3-question" role="dialog" aria-modal="true" aria-labelledby="rr3-question-title">
    <p class="rr3-overline">${safe(context)}</p>
    <h2 id="rr3-question-title">${safe(question.stem[lang])}</h2>
    ${ready ? `<p class="rr3-verdict" data-correct="${correct}">${correct ? power ? t("Power upgraded","อัปเกรดพลังแล้ว") : t("Correct","ตอบถูก") :
      power ? t("Base power kept","ยังมีพลังระดับเดิม") : t("Review the answer","ทบทวนคำตอบ")}</p>
      <p class="rr3-answerline"><b>${safe(question.answers[question.correct][lang])}</b> · ${safe(question.explanation[lang])}</p>
      ${correct && power && info ? `<p class="rr3-upgraded">${safe(info.enhanced[lang])}</p>` : ""}
      <div class="rr3-buttons">${mainButton("quiz-resume",t("Back to racing","กลับสู่สนาม"),"play")}</div>` :
      `<ol class="rr3-answers">${question.answers.map((choice,index) => `<li><button type="button" data-act="quiz-answer" data-answer="${index}"><small>${index+1}</small><span>${safe(choice[lang])}</span></button></li>`).join("")}</ol>
      <div class="rr3-question-foot"><span>${t("Race paused","หยุดเวลาแข่ง")}</span>${secondary("quiz-skip", power ? t("Keep base power","เก็บพลังเดิม") : t("Skip","ข้าม"))}</div>`}
    </section>`;
}

export function center(lang, phase, settings, wasPaused) {
  const t = (en, th) => text(lang, en, th);
  if (phase === "lost") {
    return `<section class="rr3-center" aria-labelledby="rr3-modal"><h2 id="rr3-modal">${t("Graphics interrupted", "กราฟิกถูกขัดจังหวะ")}</h2><p>${t("Restore the 3D scene or continue with compatible graphics.", "โหลดฉากสามมิติใหม่หรือเล่นด้วยภาพที่รองรับ")}</p><div class="rr3-buttons">${mainButton("restore", t("Restore graphics", "คืนค่ากราฟิก"))}${secondary("compatibility", t("Compatible graphics", "กราฟิกที่รองรับ"))}</div></section>`;
  }
  if (phase === "pause") {
    return `<section class="rr3-center" aria-labelledby="rr3-modal"><h2 id="rr3-modal">${t("Paused", "หยุดชั่วคราว")}</h2><p>${t("Steer with A/D or the arrows. Hold drift through a turn and release to boost. Dodge striped barriers or hop over low gates.", "เลี้ยวด้วย A/D หรือปุ่มลูกศร กดดริฟต์ค้างขณะเลี้ยวแล้วปล่อยเพื่อเร่ง หลบสิ่งกีดขวางหรือกระโดดข้ามรั้วเตี้ย")}</p><details class="rr3-help"><summary>${t("Controls","วิธีบังคับ")}</summary><p>${t("S / ↓ brake · Space drift · Shift turbo · X hop · E use power · Q upgrade quiz · C camera · hold R for rear view.","S / ↓ เบรก · Space ดริฟต์ · Shift เทอร์โบ · X กระโดด · E ใช้พลัง · Q ควิซอัปเกรด · C กล้อง · กด R ค้างมองหลัง")}</p></details><div class="rr3-buttons">${mainButton("resume", t("Resume race", "แข่งต่อ"), "play")}${secondary("restart", t("Restart race", "เริ่มรอบใหม่"))}${secondary("lobby", t("Race menu", "เมนูแข่ง"))}</div></section>`;
  }
  return `<section class="rr3-center" aria-labelledby="rr3-modal"><h2 id="rr3-modal">${t("Settings", "การตั้งค่า")}</h2>
    <label class="rr3-option">${t("Rival difficulty", "ระดับคู่แข่ง")}<select data-pref="difficulty" ${wasPaused ? "disabled" : ""}><option value="rookie" ${settings.difficulty === "rookie" ? "selected" : ""}>${t("Rookie", "มือใหม่")}</option><option value="pro" ${settings.difficulty === "pro" ? "selected" : ""}>${t("Pro", "โปร")}</option></select></label>
    <label class="rr3-option">${t("Camera motion", "การเคลื่อนไหวกล้อง")}<select data-pref="motion"><option value="system" ${settings.motion === "system" ? "selected" : ""}>${t("System", "ตามอุปกรณ์")}</option><option value="calm" ${settings.motion === "calm" ? "selected" : ""}>${t("Reduced", "ลดการเคลื่อนไหว")}</option></select></label>
    <label class="rr3-option">${t("Music and effects", "เพลงและเอฟเฟกต์")}<select data-pref="sound"><option value="on" ${settings.sound ? "selected" : ""}>${t("On", "เปิด")}</option><option value="off" ${!settings.sound ? "selected" : ""}>${t("Off", "ปิด")}</option></select></label>
    <details class="rr3-help"><summary>${t("Gamepad","จอยเกม")}</summary><p>${t("Left stick steers. L2 brakes. R1 or R2 drifts. The face buttons use power, boost, hop and open the quiz from bottom, right, left and top respectively. Press Start to pause. In a quiz, move the stick to select and press the bottom button to confirm.","สติกซ้ายใช้เลี้ยว L2 เบรก R1 หรือ R2 ดริฟต์ ปุ่มล่างใช้พลัง ปุ่มขวาเทอร์โบ ปุ่มซ้ายกระโดด ปุ่มบนเปิดควิซ กด Start เพื่อหยุดชั่วคราว ในควิซใช้สติกเลือกคำตอบและกดปุ่มล่างเพื่อยืนยัน")}</p></details>
    <div class="rr3-buttons">${mainButton("close-settings", t("Done", "เสร็จ"))}</div></section>`;
}

export function summary(lang, result, opts) {
  const t = (en, th) => text(lang, en, th);
  const { mode, isBest, cup, cupIndex, cupChoice, ranks, course } = opts;
  const contest = CUPS[cupChoice];
  const cupFinal = mode === "cup" && cupIndex === contest.ids.length - 1;
  const table = cupFinal ? cupRank(cup) : mode === "cup" ? ranks.map(row => ({ ...row, points: cup[row.id] })) : ranks;
  const place = cupFinal ? table.findIndex(row => row.id === 0) + 1 : result.position;
  const title = mode === "trial" ? stamp(result.duration) : place === 1 ? t("First place!", "อันดับหนึ่ง!") : t(`Place ${place}`, `อันดับ ${place}`);
  const note = [
    isBest ? t("New personal best", "สถิติใหม่") : mode === "trial" ? null : stamp(result.duration),
    result.bestLap ? `${t("Best lap", "รอบเร็วสุด")} ${stamp(result.bestLap)}` : null,
    mode === "study" ? `${result.correct || 0}/2 ${t("study stops correct", "ตอบถูก")}` : null,
  ].filter(Boolean).join(" · ");
  const points = mode === "cup" ? t("pts", "คะแนน") : "";
  return `<section class="rr3-result" aria-labelledby="rr3-result-title"><p class="rr3-overline">${cupFinal ? `${contest[lang]} · ${t("Final standings","คะแนนรวม")}` : safe(course.name[lang])}</p><h2 id="rr3-result-title">${title}</h2>
    ${note ? `<p>${safe(note)}</p>` : ""}
    ${mode === "trial" ? "" : `<ol class="rr3-results-list">${table.map((row, index) =>
      `<li data-you="${row.id === 0}"><span>${index + 1}. ${names[row.id][lang]}</span>${points ? `<b>${row.points} ${points}</b>` : ""}</li>`).join("")}</ol>`}
    <div class="rr3-buttons">${mode === "cup" && !cupFinal ?
      mainButton("continue-cup", t("Next circuit", "สนามถัดไป"), "flag") :
      mainButton("retry", mode === "cup" ? t("Race cup again", "แข่งถ้วยอีกครั้ง") : t("Race again", "แข่งอีกครั้ง"), "play")}
      ${secondary("lobby", t("Race menu", "เมนูแข่ง"))}</div></section>`;
}

export function updateSoundButton(button, sound, lang) {
  button.setAttribute("aria-pressed", String(sound));
  button.setAttribute("aria-label", sound ? text(lang, "Mute sound", "ปิดเสียง") : text(lang, "Enable sound", "เปิดเสียง"));
  button.title = button.getAttribute("aria-label");
  button.innerHTML = glyph(sound ? "sound" : "mute");
}
