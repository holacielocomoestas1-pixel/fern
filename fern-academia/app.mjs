import {
  SUBJECTS, STORAGE_KEY, productDate, readState, recordAnswer, grade, chooseQuestions,
  questionOrder, updateCard, shuffle, sampleChapters,
} from "./core.mjs";
import {
  esc, icon, GAMES, shell, sources, homeView, libraryView, lessonView, practiceView,
  mockView, cardsView, gamesView, gamePicker, gameView, progressView, loadingView,
} from "./views.mjs";
import { interviewView } from "./interview.mjs";
import {
  initFirebaseSync, noteLocalChange, onSyncEvent, getSyncInfo, onAcademyCloudApply,
} from "../firebase-sync.mjs";

const main = document.querySelector("#content");
const top = document.querySelector("#top");
const nav = document.querySelector("#nav");
const dialog = document.querySelector("#study-dialog");
const notice = document.querySelector("#notice");
const storage = { getItem: key => window.localStorage.getItem(key) };
const banks = new Map();
let state = readState(storage);
let catalog;
let session = null;
let practiceSession = null;
let mockSession = null;
let cardRound = null;
let viewId = 0;
let current = "";
let disposeGame = null;
let dialogResolve = null;
let dialogResult = null;
let restoreDialogFocus = null;
let noticeTimer = null;
let audio;
let timer;
let currentGameQuestions = null;
let persistAvailable = true;

const linkedLanguage = new URL(location.href).searchParams.get("lang");
const validLang = value => ["th", "en"].includes(value);
function previousLanguage() {
  for (const key of ["fern2-lang", "fern-lang"]) {
    try {
      const value = JSON.parse(storage.getItem(key) || "null");
      if (validLang(value)) return value;
    } catch {
      // Continue with the next stored locale.
    }
  }
  return "th";
}
let lang = validLang(linkedLanguage) ? linkedLanguage : state.lang || previousLanguage();
const t = (th, en) => lang === "en" ? en : th;
const n = number => new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(number);
const ctx = () => ({ t, n, lang, state, catalog, practiceSession, mockSession, cardRound, sync: getSyncInfo() });
const asset = path => new URL(path, import.meta.url).href;
const subjectId = id => SUBJECTS.some(s => s.id === id);

function commit(change) {
  if (persistAvailable) {
    try {
      if (storage.getItem(STORAGE_KEY) !== null) state = readState(storage);
    } catch {
      persistAvailable = false;
    }
  }
  change(state);
  try {
    if (persistAvailable) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    persistAvailable = false;
  }
  // v4.3: cada cambio local avisa al módulo de sincronización.
  try { noteLocalChange("academy"); } catch { /* sin sync no pasa nada */ }
}

async function readJson(file) {
  const response = await fetch(asset(file));
  if (!response.ok) throw new Error("Unable to load " + file);
  return response.json();
}

function loadBank(id) {
  if (!subjectId(id)) return Promise.reject(new Error("Unknown subject"));
  if (!banks.has(id)) {
    banks.set(id, readJson(`content/${id}.json`).catch(error => {
      banks.delete(id);
      throw error;
    }));
  }
  return banks.get(id);
}

function putNotice(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  noticeTimer = setTimeout(() => notice.textContent = "", 3400);
}

function problem() {
  putNotice(t("โหลดข้อมูลไม่สำเร็จ ลองอีกครั้ง", "Couldn’t load the material. Try again."));
}

function go(hash) {
  if (location.hash === hash) return render();
  location.hash = hash;
}

function route() {
  const parts = location.hash.slice(1).split("/");
  const allowed = ["home", "library", "lesson", "practice", "mock", "session", "cards", "games", "game", "play", "progress", "interview"];
  return [allowed.includes(parts[0]) ? parts[0] : "home", ...parts.slice(1, 4)];
}

function drawShell(active) {
  document.documentElement.lang = lang;
  document.title = t("Fern · ห้องเตรียมสอบ", "Fern · Study Academy");
  document.getElementById("skip").textContent = t("ข้ามไปยังเนื้อหา", "Skip to content");
  const markup = shell(ctx(), active);
  top.innerHTML = markup.top;
  nav.innerHTML = markup.nav;
  nav.setAttribute("aria-label", t("เมนูหลัก", "Primary navigation"));
}

function hideDialog() {
  if (dialog.open) dialog.close();
  const resolve = dialogResolve;
  dialogResolve = null;
  const result = dialogResult;
  dialogResult = null;
  const focus = restoreDialogFocus;
  restoreDialogFocus = null;
  if (focus?.isConnected) focus.focus({ preventScroll: true });
  resolve?.(result);
}

function closeGame() {
  if (disposeGame) {
    disposeGame();
    disposeGame = null;
  }
  currentGameQuestions = null;
  if (dialog.open) {
    dialogResult = null;
    hideDialog();
  }
}

function sessionClock() {
  if (!mockSession || mockSession.done) return;
  const remaining = Math.max(0, Math.ceil((mockSession.deadline - Date.now()) / 1000));
  const element = document.querySelector("#clock");
  if (element) {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor(remaining % 3600 / 60);
    const seconds = remaining % 60;
    element.textContent = [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
  }
  if (remaining === 0) finish(mockSession);
}

function changeLocale(next) {
  if (!validLang(next) || next === lang) return;
  const gamePlaying = route()[0] === "play";
  lang = next;
  commit(latest => { latest.lang = next; });
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }
  if (gamePlaying) {
    drawShell("games");
    putNotice(t("ภาษาจะเปลี่ยนในรอบถัดไป", "The current run keeps its language."));
  } else {
    render(false);
    top.querySelector(`button[data-lang="${lang}"]`)?.focus({ preventScroll: true });
  }
}

async function render(resetScroll = true) {
  const [page, child, option, detail] = route();
  const active = { lesson: "library", mock: "practice", session: "practice", cards: "practice", game: "games", play: "games", interview: "practice" }[page] || page;
  const id = ++viewId;
  current = page;
  closeGame();
  drawShell(active);
  if (!catalog) return;
  const view = ctx();
  if (page === "library") main.innerHTML = libraryView(view, child);
  else if (page === "lesson") main.innerHTML = lessonView(view, child);
  else if (page === "practice") main.innerHTML = practiceView(view, [child, option]);
  else if (page === "mock") main.innerHTML = mockView(view);
  else if (page === "interview") main.innerHTML = interviewView(view);
  else if (page === "session") {
    session = child === "mock" ? mockSession : practiceSession;
    main.innerHTML = session ? sessionView() : practiceView(view, []);
  }
  else if (page === "cards") main.innerHTML = cardsView(view, child);
  else if (page === "games") main.innerHTML = gamesView(view);
  else if (page === "game") main.innerHTML = gamePicker(view, child);
  else if (page === "progress") main.innerHTML = progressView(view);
  else if (page === "play" && Object.hasOwn(GAMES, child)) {
    const mode = option === "study" ? "study" : "free";
    const subject = subjectId(detail) ? detail : "general";
    main.innerHTML = gameView(view, child, mode, subject);
    mountGame(id, child, mode, subject);
  } else main.innerHTML = homeView(view);
  if (page === "games") initGameShelf();
  if (resetScroll) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  sessionClock();
}

let shelfObserver = null;

// Estante estilo Switch: la portada más visible queda enfocada (anillo +
// panel de detalle). Al entrar, la primera portada queda centrada.
function initGameShelf() {
  const shelf = document.querySelector(".game-shelf");
  if (!shelf) return;
  const cards = [...shelf.querySelectorAll(".game-card")];
  const focus = id => {
    cards.forEach(card => card.classList.toggle("on", card.dataset.game === id));
    document.querySelectorAll(".game-detail").forEach(panel => panel.classList.toggle("on", panel.dataset.game === id));
  };
  shelfObserver?.disconnect();
  shelfObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) focus(visible.target.dataset.game);
  }, { root: shelf, threshold: [0.5, 0.75, 1] });
  cards.forEach(card => shelfObserver.observe(card));
  const first = cards[0];
  if (first) shelf.scrollTo({ left: first.offsetLeft - (shelf.clientWidth - first.clientWidth) / 2 });
  shelf.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const current = cards.findIndex(card => card.classList.contains("on"));
    const next = cards[Math.min(cards.length - 1, Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1)))];
    if (!next) return;
    event.preventDefault();
    next.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    next.focus({ preventScroll: true });
  });
}

// Animación de lanzamiento: la portada crece hasta llenar la pantalla y
// luego se navega; el velo se desvanece sobre la vista nueva.
function launchGame(button, hash) {
  if (document.querySelector(".game-launch")) return;
  const art = document.querySelector(`.game-card[data-game="${button.dataset.game}"] .game-card-art`);
  const rect = (art || button).getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.className = "game-launch";
  overlay.innerHTML = `<img src="${GAMES[button.dataset.game].cover}" alt="">`;
  Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    Object.assign(overlay.style, { left: "0", top: "0", width: "100vw", height: "100dvh", borderRadius: "0" });
  }));
  setTimeout(() => { location.hash = hash; }, 400);
  setTimeout(() => overlay.classList.add("out"), 550);
  setTimeout(() => overlay.remove(), 850);
}

function updateSession() {
  if (current !== "session") return;
  main.innerHTML = sessionView();
  sessionClock();
}

function answerOptions(item, reveal = false) {
  return item.order.map((index, pos) => {
    const q = item.question;
    const correct = reveal && index === q.correct;
    const wrong = reveal && item.selected === index && index !== q.correct;
    return `<label class="choice${correct ? " correct" : wrong ? " wrong" : ""}"><input type="radio" name="answer" value="${index}" ${item.selected === index ? "checked" : ""} ${reveal ? "disabled" : ""}><span>${String.fromCharCode(65 + pos)}. ${esc(q.options[index][lang])}</span>${correct ? `<strong>${t("ถูกต้อง", "Correct")}</strong>` : wrong ? `<strong>${t("คำตอบของคุณ", "Your choice")}</strong>` : ""}</label>`;
  }).join("");
}

function feedback(item) {
  const q = item.question;
  const hit = item.selected === q.correct;
  return `<div class="feedback ${hit ? "" : "miss"}"><strong>${hit ? t("ถูกต้อง", "Correct") : t("วิธีคิด", "How to solve it")}</strong><p>${esc(q.explanation[lang])}</p></div>${sources(ctx(), q.sources)}`;
}

function sessionView() {
  if (session.done) return resultsView();
  const mock = session.mode === "mock";
  const item = session.items[session.current];
  const q = item.question;
  const sub = SUBJECTS.find(s => s.id === q.subject);
  const saved = !!state.saved[q.id];
  const answered = session.items.filter(value => value.selected !== null).length;
  return `<section class="quiz-wrap">
    <div class="quiz-head"><a class="link" href="#practice">${t("สนามฝึก", "Practice")}</a>${mock ? '<span id="clock" class="clock" role="timer"></span>' : ""}<span class="subtle">${n(session.current + 1)} / ${n(session.items.length)}</span></div>
    <progress value="${mock ? answered : session.current + Number(item.revealed || false)}" max="${session.items.length}" aria-label="${t("ข้อที่ตอบแล้ว", "Questions answered")}"></progress>
    <div class="quiz-head"><p class="eyebrow">${esc(sub[lang])}</p><button type="button" data-action="save-question" class="icon-button" aria-label="${t("บันทึกข้อนี้", "Bookmark this question")}" aria-pressed="${saved}">${icon("bookmark")}</button></div>
    <h1 id="quiz-prompt" class="question-title" tabindex="-1">${esc(q.prompt[lang])}</h1>
    <form id="answer-form"><fieldset class="options" aria-labelledby="quiz-prompt">${answerOptions(item, item.revealed)}</fieldset>
    ${!mock && !item.revealed ? `<button class="act solid" type="submit">${t("ตรวจคำตอบ", "Check answer")}</button>` : ""}</form>
    ${item.revealed ? `${feedback(item)}<div class="inline-actions"><button class="act solid" type="button" data-action="next-question" autofocus>${session.current + 1 === session.items.length ? t("ดูผล", "See results") : t("ข้อต่อไป", "Next question")}</button></div>` : ""}
    ${mock ? `<div class="inline-actions timer-controls"><button class="act ghost" type="button" data-action="previous-question" ${session.current === 0 ? "disabled" : ""}>${t("ก่อนหน้า", "Previous")}</button><button class="act ghost" type="button" data-action="next-question" ${session.current + 1 === session.items.length ? "disabled" : ""}>${t("ถัดไป", "Next")}</button><button class="act solid" type="button" data-action="confirm-mock">${t("ส่งข้อสอบ", "Submit mock")}</button></div>
    <details class="sources" ${session.overview ? "open" : ""} id="overview"><summary>${t(`เลือกข้อ · ตอบแล้ว ${n(answered)} ข้อ`, `Jump to question · ${n(answered)} answered`)}</summary><div class="question-jump">${session.items.map((value, index) => `<button type="button" class="${value.selected !== null ? "answered" : ""}" data-action="jump" data-index="${index}" ${index === session.current ? 'aria-current="true"' : ""} aria-label="${t("ข้อ", "Question")} ${n(index + 1)}${value.selected !== null ? t(" ตอบแล้ว", " answered") : ""}">${n(index + 1)}</button>`).join("")}</div></details>` : ""}
    </section>`;
}

function resultsView() {
  const result = session.result;
  const mock = session.mode === "mock";
  const missed = session.items.filter(item => item.selected !== item.question.correct);
  const items = mock ? session.items : missed;
  return `<section class="quiz-wrap"><div class="result-head"><div><p class="eyebrow">${mock ? t("สอบจำลอง", "Full mock") : t("ผลการฝึก", "Practice results")}</p><h1 class="score">${n(result.correct)} / ${n(result.total)}</h1><p>${t(`ตอบแล้ว ${n(result.answered)} ข้อ`, `${n(result.answered)} answered`)}</p></div><img src="assets/cheer.webp" alt=""></div>
    ${mock ? `<div class="section"><h2>${result.pass ? t("ถึงเกณฑ์ฝึกทั้งสองภาค", "Reached the practice threshold in both sections") : t("ยังไม่ถึงเกณฑ์ฝึกทั้งสองภาค", "Below the practice threshold in at least one section")}</h2><div class="list">
      ${Object.entries(result.groups).map(([group, score]) => `<div class="row"><span class="row-main">${group === "common" ? t("ความรู้ความสามารถทั่วไป", "General section") : t("ความรู้เฉพาะตำแหน่ง", "Specialty section")}</span><span class="row-data">${n(score.correct)} / ${n(score.total)} · ${n(Math.round(100 * score.correct / score.total))}%</span></div>`).join("")}</div></div>` : ""}
    <section class="section"><div class="section-head"><h2>${t("ผลรายวิชา", "Subject scores")}</h2></div><div class="list">
    ${Object.entries(result.subjects).map(([id, score]) => `<a class="row" href="#practice/${id}"><span class="row-main">${esc(SUBJECTS.find(s => s.id === id)[lang])}</span><span class="row-data">${n(score.correct)} / ${n(score.total)}</span>${icon("next")}</a>`).join("")}
    </div></section>
    <div class="inline-actions section"><a class="act solid" href="${missed.length ? "#practice/errors" : "#practice"}">${missed.length ? t("ฝึกข้อที่พลาด", "Practise mistakes") : t("ฝึกชุดใหม่", "New practice session")}</a><a class="act ghost" href="#progress">${t("ดูความคืบหน้า", "See progress")}</a></div>
    ${items.length ? `<section class="section"><div class="section-head"><h2>${mock ? t("เฉลยครบทุกข้อ", "Full answer review") : t("ย้อนดูคำตอบที่พลาด", "Review missed answers")}</h2></div>
    ${items.map((item, index) => {
      const q = item.question;
      const answer = item.selected === null ? t("ไม่ได้ตอบ", "Unanswered") : esc(q.options[item.selected][lang]);
      return `<details class="review-item"><summary>${n(index + 1)}. ${esc(q.prompt[lang])}</summary><p class="subtle">${t("คำตอบของคุณ", "Your answer")} · ${answer}</p><p class="accent">${t("คำตอบที่ถูก", "Correct answer")} · ${esc(q.options[q.correct][lang])}</p><p>${esc(q.explanation[lang])}</p>${sources(ctx(), q.sources)}</details>`;
    }).join("")}</section>` : ""}</section>`;
}

function begin(items, mode = "practice") {
  if (!items.length) {
    putNotice(t("ยังไม่มีข้อที่ตรงกับตัวเลือกนี้", "No questions match this selection."));
    return;
  }
  const next = {
    mode, items: items.map(q => questionOrder(q)), current: 0, done: false,
    deadline: mode === "mock" ? Date.now() + 180 * 60_000 : 0,
  };
  if (mode === "mock") {
    next.id = (globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2)) + "-" + next.deadline;
    clearInterval(timer);
    mockSession = next;
    if (!persistMock("start")) {
      mockSession = null;
      restoreMock().then(() => {
        if (mockSession) go("#session/mock");
      }).catch(problem);
      return;
    }
    timer = setInterval(sessionClock, 500);
    go("#session/mock");
  } else {
    practiceSession = next;
    go("#session");
  }
}

function persistMock(action) {
  if (!mockSession || mockSession.done) return false;
  let synced = false;
  commit(latest => {
    const draft = latest.mockDraft;
    if (action === "start") {
      if (draft) return;
      latest.mockDraft = {
        id: mockSession.id,
        items: mockSession.items.map(item => ({ id: item.question.id, order: item.order, selected: item.selected })),
        current: mockSession.current,
        deadline: mockSession.deadline,
      };
      synced = true;
    } else if (draft?.id === mockSession.id) {
      draft.current = mockSession.current;
      if (action === "answer") draft.items[draft.current].selected = mockSession.items[draft.current].selected;
      draft.items.forEach((item, index) => { mockSession.items[index].selected = item.selected; });
      synced = true;
    }
  });
  return synced;
}

async function restoreMock() {
  if (!state.mockDraft || mockSession) return;
  const draft = state.mockDraft;
  const banksBySubject = await Promise.all(SUBJECTS.map(s => loadBank(s.id)));
  const byId = new Map(banksBySubject.flat().map(question => [question.id, question]));
  const items = draft.items.map(item => ({
    question: byId.get(item.id), order: item.order, selected: item.selected,
  }));
  if (items.some(item => !item.question ||
    !Array.isArray(item.order) || item.order.length !== 4 ||
    ![0, 1, 2, 3].every(index => item.order.includes(index)) ||
    ![null, 0, 1, 2, 3].includes(item.selected))) {
    commit(latest => {
      if (latest.mockDraft?.id === draft.id) latest.mockDraft = null;
    });
    return;
  }
  const current = Number.isInteger(draft.current) && items[draft.current] ? draft.current : 0;
  mockSession = { mode: "mock", id: draft.id, items, current, deadline: draft.deadline, done: false };
  timer = setInterval(sessionClock, 500);
}

async function startPractice(values, origin, chapter) {
  const id = viewId;
  try {
    if (origin) origin.disabled = true;
    const subjects = values.subject === "all" ? SUBJECTS.map(row => row.id) : [values.subject];
    const bank = (await Promise.all(subjects.map(loadBank))).flat();
    if (id !== viewId) return;
    const items = chooseQuestions(bank, Number(values.count), state.questions, {
      level: Number(values.level) || 0, lesson: chapter, pool: values.pool, saved: state.saved,
    });
    begin(items);
  } catch {
    if (id === viewId) problem();
  } finally {
    if (origin?.isConnected) origin.disabled = false;
  }
}

async function startMock(origin) {
  const id = viewId;
  try {
    origin.disabled = true;
    const banksBySubject = await Promise.all(SUBJECTS.map(s => loadBank(s.id)));
    if (id !== viewId) return;
    const items = SUBJECTS.flatMap((s, index) => sampleChapters(banksBySubject[index], s.weight));
    if (items.length !== 150) throw new Error("Incomplete mock");
    begin(items, "mock");
  } catch {
    if (id === viewId) problem();
  } finally {
    if (origin.isConnected) origin.disabled = false;
  }
}

function finish(target = session) {
  if (!target || target.done) return;
  target.done = true;
  if (target.mode === "mock") {
    if (dialog.open && dialog.dataset.kind === "mock") hideDialog();
    clearInterval(timer);
    commit(latest => {
      if (!latest.mockDraft || latest.mockDraft.id !== target.id) return;
      latest.mockDraft.items.forEach((item, index) => { target.items[index].selected = item.selected; });
      const result = grade(target.items);
      for (const item of target.items.filter(item => item.selected !== null)) {
        recordAnswer(latest, item.question, item.selected === item.question.correct);
      }
      latest.mockResults.unshift({ date: productDate(), correct: result.correct, total: result.total, pass: result.pass });
      latest.mockResults = latest.mockResults.slice(0, 12);
      latest.mockDraft = null;
    });
  }
  target.result = grade(target.items);
  if (current === "session" && session === target) render();
}

function changeQuestion(index) {
  if (!session || session.done || index < 0 || index >= session.items.length) return;
  session.current = index;
  if (session.mode === "mock") persistMock();
  updateSession();
  document.querySelector("#quiz-prompt")?.focus();
}

function confirmMock() {
  if (dialog.open || !session || session.done) return;
  const count = session.items.filter(item => item.selected === null).length;
  restoreDialogFocus = document.activeElement;
  dialog.dataset.kind = "mock";
  dialog.setAttribute("aria-labelledby", "dialog-title");
  dialog.innerHTML = `<h2 id="dialog-title">${t("ส่งข้อสอบตอนนี้ไหม", "Submit your mock?")}</h2><p class="lead">${count ? t(`ยังไม่ได้ตอบ ${n(count)} ข้อ`, `${n(count)} unanswered questions remain.`) : t("คุณตอบครบทุกข้อแล้ว", "You’ve answered every question.")}</p><div class="inline-actions section"><button type="button" class="act ghost" data-action="close-dialog" autofocus>${t("กลับไปทำต่อ", "Keep working")}</button><button type="button" class="act solid" data-action="finish-mock">${t("ส่งข้อสอบ", "Submit mock")}</button></div>`;
  dialog.showModal();
}

function startCardRound(subject, scope) {
  const cards = catalog.cards.filter(card => subject === "all" || card.subject === subject);
  const now = Date.now();
  const due = cards.filter(card => !state.cards[card.id] || state.cards[card.id].due <= now);
  const choices = scope === "all" ? shuffle(cards) : [...due].sort((a, b) =>
    (state.cards[a.id]?.due ?? now) - (state.cards[b.id]?.due ?? now));
  if (!choices.length) {
    putNotice(t("ทบทวนครบแล้ว", "You’re up to date."));
    return;
  }
  cardRound = { cards: choices.slice(0, 25), index: 0, open: false };
  render(false);
  main.querySelector("[data-action=flip-card]")?.focus({ preventScroll: true });
}

function sound(kind) {
  if (!state.sound || !audio || audio.state !== "running") return;
  const notes = { tick: [430], move: [310], tap: [310], hint: [500], match: [440, 600], combo: [460, 620, 770],
    success: [392, 523, 659], error: [330, 270],
    boost: [310, 580], correct: [480, 660], wrong: [330, 260], win: [392, 523, 659], lose: [330, 280] }[kind] || [400];
  notes.forEach((frequency, index) => {
    const start = audio.currentTime + index * .052;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(.035, start + .014);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + .13);
    oscillator.connect(envelope).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + .14);
  });
}

function unlockAudio() {
  if (!state.sound || current !== "play") return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio ||= new Audio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
  } catch {
    // Audio may be unavailable. The games remain playable.
  }
}

async function mountGame(id, game, mode, subject) {
  try {
    const [module, bank] = await Promise.all([
      game === "race" ? import("./games/race.mjs") : import("./games/match.mjs"),
      mode === "study" ? loadBank(subject) : Promise.resolve([]),
    ]);
    const host = document.querySelector("#game-mount");
    if (id !== viewId || !host) return;
    currentGameQuestions = sampleChapters(bank, bank.length).reverse();
    disposeGame = module.mount(host, {
      lang, mode, subject, asset, sound,
      askQuestion: () => mode === "study" && id === viewId ? askGameQuestion() : Promise.resolve(null),
      complete: result => {
        if (id !== viewId || !Number.isFinite(result.score)) return;
        commit(latest => {
          const results = latest.gameResults[game] ||= {};
          const record = results[mode] ||= { best: 0, runs: 0, wins: 0 };
          record.runs++;
          record.wins += Number(!!result.win);
          record.best = Math.max(record.best, Math.round(result.score));
        });
      },
    });
  } catch {
    if (id !== viewId) return;
    const host = document.querySelector("#game-mount");
    if (host) host.innerHTML = `<p class="empty">${t("เปิดเกมไม่สำเร็จ", "The game couldn’t load.")}</p><button type="button" class="act ghost" data-action="retry">${t("ลองอีกครั้ง", "Retry")}</button>`;
  }
}

function askGameQuestion() {
  const question = currentGameQuestions?.pop();
  if (!question || dialog.open) return Promise.resolve(null);
  const item = questionOrder(question);
  return new Promise(resolve => {
    dialogResolve = resolve;
    dialogResult = null;
    restoreDialogFocus = document.activeElement;
    dialog.dataset.kind = "study";
    dialog.setAttribute("aria-labelledby", "dialog-title");
    dialog.innerHTML = `<p class="eyebrow">${t("จุดทบทวน", "Study checkpoint")}</p>
      <h2 id="dialog-title" class="question-title">${esc(question.prompt[lang])}</h2>
      <form id="game-question-form"><fieldset class="options" aria-labelledby="dialog-title">${answerOptions(item)}</fieldset>
      <div class="inline-actions"><button type="submit" class="act solid">${t("ตอบ", "Answer")}</button><button type="button" class="text-button" data-action="close-dialog">${t("ข้าม", "Skip")}</button></div></form>
      <div id="game-feedback"></div>`;
    const form = dialog.querySelector("form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const answer = new FormData(form).get("answer");
      if (answer === null) {
        form.querySelector("input")?.focus();
        return;
      }
      item.selected = Number(answer);
      dialogResult = item.selected === question.correct;
      commit(latest => recordAnswer(latest, question, dialogResult));
      sound(dialogResult ? "correct" : "wrong");
      form.innerHTML = `<fieldset class="options" aria-labelledby="dialog-title">${answerOptions(item, true)}</fieldset>`;
      dialog.querySelector("#game-feedback").innerHTML = `${feedback(item)}<button type="button" class="act solid" data-action="close-dialog">${t("กลับไปเล่น", "Keep playing")}</button>`;
      dialog.querySelector("[data-action=close-dialog]").focus();
    }, { once: false });
    dialog.showModal();
  });
}

document.addEventListener("pointerdown", unlockAudio, { passive: true });
document.addEventListener("keydown", unlockAudio);
document.getElementById("skip").addEventListener("click", event => {
  event.preventDefault();
  main.focus();
});
dialog.addEventListener("cancel", event => {
  event.preventDefault();
  hideDialog();
});
window.addEventListener("hashchange", () => {
  if (route()[0] !== "cards") cardRound = null;
  render();
});
window.addEventListener("pageshow", sessionClock);

document.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "locale") changeLocale(button.dataset.lang);
  else if (action === "clear-date") {
    commit(latest => { latest.examDate = ""; });
    render(false);
    document.querySelector(".sources summary")?.click();
  } else if (action === "lesson-done") {
    const selected = button.dataset.id;
    commit(latest => {
      if (latest.lessons[selected]) delete latest.lessons[selected];
      else latest.lessons[selected] = productDate();
    });
    const marked = !!state.lessons[selected];
    button.setAttribute("aria-pressed", String(marked));
    button.innerHTML = marked ? icon("check") + t("อ่านแล้ว", "Marked as read") : t("ทำเครื่องหมายว่าอ่านแล้ว", "Mark as read");
  } else if (action === "lesson-practice") {
    const chapter = catalog.lessons.find(lesson => lesson.id === button.dataset.id);
    if (chapter) startPractice({ subject: chapter.subject, count: 10 }, button, chapter.id);
  } else if (action === "start-mock") startMock(button);
  else if (action === "save-question" && session && !session.done) {
    const id = session.items[session.current].question.id;
    commit(latest => {
      if (latest.saved[id]) delete latest.saved[id];
      else latest.saved[id] = true;
    });
    button.setAttribute("aria-pressed", String(!!state.saved[id]));
  } else if (action === "next-question" && session && !session.done) {
    if (session.current + 1 >= session.items.length) finish();
    else changeQuestion(session.current + 1);
  } else if (action === "previous-question" && session) changeQuestion(session.current - 1);
  else if (action === "jump") changeQuestion(Number(button.dataset.index));
  else if (action === "confirm-mock") confirmMock();
  else if (action === "close-dialog") hideDialog();
  else if (action === "finish-mock") finish();
  else if (action === "flip-card" && cardRound) {
    cardRound.open = true;
    render(false);
    main.querySelector("[data-action=card-rate]")?.focus({ preventScroll: true });
  } else if (action === "card-rate" && cardRound?.open) {
    const card = cardRound.cards[cardRound.index];
    commit(latest => updateCard(latest, card.id, button.dataset.value === "ok"));
    cardRound.index++;
    cardRound.open = false;
    render(false);
    main.querySelector("[data-action=flip-card], [data-action=close-cards]")?.focus({ preventScroll: true });
  } else if (action === "close-cards") {
    cardRound = null;
    render(false);
  } else if (action === "sound") {
    commit(latest => { latest.sound = !latest.sound; });
    button.setAttribute("aria-pressed", String(state.sound));
    if (current === "play") {
      button.innerHTML = icon(state.sound ? "volume" : "muted");
      unlockAudio();
    } else button.textContent = state.sound ? t("ปิดเสียงเกม", "Mute game sounds") : t("เปิดเสียงเกม", "Enable game sounds");
  } else if (action === "focus-game") {
    const id = button.dataset.game;
    if (button.classList.contains("on")) launchGame(button, `#play/${id}/free`);
    else {
      button.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      document.querySelectorAll(".game-card").forEach(card => card.classList.toggle("on", card === button));
      document.querySelectorAll(".game-detail").forEach(panel => panel.classList.toggle("on", panel.dataset.game === id));
    }
  } else if (action === "launch-game") {
    const id = button.dataset.game;
    launchGame(button, button.dataset.mode === "study" ? `#game/${id}` : `#play/${id}/free`);
  } else if (action === "retry") {
    if (catalog) render();
    else boot();
  }
});

document.addEventListener("input", event => {
  if (event.target.id !== "chapter-filter") return;
  const search = event.target.value.toLocaleLowerCase().trim();
  let visible = 0;
  for (const row of main.querySelectorAll("#chapter-list li")) {
    row.hidden = !row.dataset.search.includes(search);
    if (!row.hidden) visible++;
  }
  main.querySelector("#search-empty").hidden = visible !== 0;
});
document.addEventListener("change", event => {
  const form = event.target.form;
  if (event.target.matches("[data-card-subject]")) {
    go(`#cards/${event.target.value}`);
  } else if (form?.id === "answer-form" && session?.mode === "mock" && !session.done && event.target.name === "answer") {
    const item = session.items[session.current];
    item.selected = Number(event.target.value);
    persistMock("answer");
    updateSession();
    const selected = main.querySelector("#answer-form input:checked");
    selected?.focus({ preventScroll: true });
  }
});
document.addEventListener("toggle", event => {
  if (event.target.id === "overview" && session) session.overview = event.target.open;
}, true);

document.addEventListener("submit", event => {
  const { target: form } = event;
  if (form.id === "game-question-form") return;
  if (!["exam-form", "practice-form", "card-form", "game-form", "answer-form"].includes(form.id)) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (form.id === "exam-form") {
    commit(latest => { latest.examDate = values.date; });
    render(false);
    putNotice(t("บันทึกวันสอบแล้ว", "Exam date saved."));
  } else if (form.id === "practice-form") startPractice(values, event.submitter);
  else if (form.id === "card-form") startCardRound(values.subject, event.submitter?.value || "due");
  else if (form.id === "game-form") go(`#play/${form.dataset.game}/study/${values.subject}`);
  else if (session?.mode === "practice" && !session.done) {
    const item = session.items[session.current];
    if (item.revealed) return;
    if (values.answer === undefined) {
      form.querySelector("input")?.focus();
      putNotice(t("เลือกคำตอบก่อน", "Choose an answer first."));
      return;
    }
    item.selected = Number(values.answer);
    item.revealed = true;
    commit(latest => recordAnswer(latest, item.question, item.selected === item.question.correct));
    updateSession();
    main.querySelector("[data-action=next-question]")?.focus({ preventScroll: true });
  }
});

async function boot() {
  drawShell("home");
  main.innerHTML = loadingView(ctx());
  try {
    catalog = await readJson("content/catalog.json");
    try {
      await restoreMock();
    } catch {
      problem();
    }
    render();
    // v4.3: sincronización con Firebase en segundo plano. Si la nube trae un
    // progreso más nuevo, se re-lee el estado y se re-dibuja la vista actual.
    try {
      onAcademyCloudApply(() => { state = readState(storage); render(false); });
      onSyncEvent(() => { if (current === "") render(false); });
      initFirebaseSync();
    } catch { /* la Academy funciona sin sync */ }
  } catch {
    main.innerHTML = `<p class="empty">${t("โหลดคลังบทเรียนไม่สำเร็จ", "The study library couldn’t load.")}</p><button type="button" class="act ghost" data-action="retry">${t("ลองอีกครั้ง", "Retry")}</button>`;
  }
}

boot();
