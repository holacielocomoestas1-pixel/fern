export const SUBJECTS = [
  { id: "general", th: "ความสามารถทั่วไป", en: "General ability", icon: "logic", weight: 20, group: "common" },
  { id: "thai", th: "ภาษาไทย", en: "Thai language", icon: "text", weight: 20, group: "common" },
  { id: "it", th: "คอมพิวเตอร์และเทคโนโลยี", en: "IT & office computing", icon: "screen", weight: 40, group: "specialty" },
  { id: "saraban", th: "งานสารบรรณ", en: "Official records", icon: "folder", weight: 30, group: "specialty" },
  { id: "law", th: "กฎหมายที่ประชาชนควรรู้", en: "Law for citizens", icon: "scales", weight: 25, group: "specialty" },
  { id: "english", th: "ภาษาอังกฤษ", en: "English language", icon: "letters", weight: 15, group: "specialty" },
];

export const EXAM_SOURCE = "https://s3-bkk.nipa.cloud/peb/PROD/Doc/64/ANN_6425690101.PDF";
export const STORAGE_KEY = "fern-academia-v1";
export const DAY = 86_400_000;

export function productDate(time = Date.now()) {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(time);
  return date;
}

export function daysUntil(date, today = productDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = Date.parse(date + "T00:00:00Z");
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) return null;
  return Math.round((parsed - Date.parse(today + "T00:00:00Z")) / DAY);
}

export function blankState() {
  return {
    lang: null, examDate: "", sound: true, lessons: {}, questions: {}, cards: {},
    saved: {}, gameResults: {}, days: {}, mockResults: [], mockDraft: null,
  };
}

export function readState(storage) {
  const defaults = blankState();
  try {
    const stored = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (typeof stored !== "object" || !stored || Array.isArray(stored)) return defaults;
    for (const key of ["lessons", "questions", "cards", "saved", "gameResults", "days"]) {
      if (stored[key] && typeof stored[key] === "object" && !Array.isArray(stored[key])) {
        defaults[key] = stored[key];
      }
    }
    if (Array.isArray(stored.mockResults)) defaults.mockResults = stored.mockResults.slice(0, 12);
    if (stored.mockDraft?.items?.length === 150 && Number.isFinite(stored.mockDraft.deadline)) {
      defaults.mockDraft = stored.mockDraft;
    }
    if (["th", "en"].includes(stored.lang)) defaults.lang = stored.lang;
    if (typeof stored.examDate === "string" && daysUntil(stored.examDate) !== null) defaults.examDate = stored.examDate;
    if (typeof stored.sound === "boolean") defaults.sound = stored.sound;
  } catch {
    // Private or restricted storage still allows an in-memory session.
  }
  return defaults;
}

export function recordAnswer(state, question, correct, time = Date.now()) {
  const previous = state.questions[question.id];
  const day = productDate(time);
  state.questions[question.id] = {
    subject: question.subject,
    seen: (previous?.seen || 0) + 1, hits: (previous?.hits || 0) + Number(correct),
    last: correct, time,
  };
  state.days[day] = (state.days[day] || 0) + 1;
}

export function updateCard(state, id, remembered, time = Date.now()) {
  const gaps = [1, 3, 7, 14, 30];
  const days = gaps.indexOf(state.cards[id]?.interval);
  const interval = remembered ? gaps[Math.min(days + 1, gaps.length - 1)] : 0;
  state.cards[id] = { interval, due: time + (remembered ? interval * DAY : 10 * 60_000) };
}

export function dateStreak(days, now = Date.now()) {
  let offset = days[productDate(now)] ? 0 : 1;
  let streak = 0;
  while (days[productDate(now - offset * DAY)]) {
    streak++;
    offset++;
  }
  return streak;
}

export function shuffle(items, random = Math.random) {
  const copy = Array.from(items);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function questionOrder(question, random = Math.random) {
  return { question, order: shuffle(question.options.map((_, index) => index), random), selected: null };
}

export function sampleChapters(bank, count, random = Math.random) {
  const buckets = new Map();
  for (const question of shuffle(bank, random)) {
    const key = question.lesson || question.subject;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(question);
  }
  let groups = [...buckets.values()];
  const result = [];
  while (result.length < count && groups.length > 0) {
    for (const group of groups) {
      result.push(group.pop());
      if (result.length >= count) break;
    }
    groups = groups.filter(group => group.length);
  }
  return result;
}

export function chooseQuestions(bank, count, history, { level = 0, lesson = "", pool = "all", saved = {} } = {}) {
  const eligible = bank.filter(q =>
    (!level || q.level === level) &&
    (!lesson || q.lesson === lesson) &&
    (pool !== "errors" || history[q.id]?.last === false) &&
    (pool !== "saved" || saved[q.id])
  );
  const priorities = [
    eligible.filter(q => history[q.id]?.last === false),
    eligible.filter(q => !history[q.id]),
    eligible.filter(q => history[q.id]?.last === true),
  ];
  const selected = [];
  for (const group of priorities) selected.push(...sampleChapters(group, count - selected.length));
  return selected;
}

export function grade(items) {
  const groups = {
    common: { correct: 0, total: 0 },
    specialty: { correct: 0, total: 0 },
  };
  const subjects = {};
  let correct = 0;
  let answered = 0;
  for (const item of items) {
    const q = item.question;
    const hit = item.selected === q.correct;
    const group = groups[SUBJECTS.find(subject => subject.id === q.subject).group];
    const subject = subjects[q.subject] ||= { correct: 0, total: 0 };
    group.total++;
    subject.total++;
    if (item.selected !== null) answered++;
    if (hit) {
      group.correct++;
      subject.correct++;
      correct++;
    }
  }
  const pass = Object.values(groups).every(group => group.total > 0 && group.correct * 5 >= group.total * 3);
  return { correct, answered, total: items.length, groups, subjects, pass };
}

export function subjectStats(history, id) {
  const tried = Object.values(history).filter(row => row?.subject === id);
  const attempts = tried.reduce((total, row) => total + row.seen, 0);
  const hits = tried.reduce((total, row) => total + row.hits, 0);
  return { unique: tried.length, attempts, hits, accuracy: attempts ? Math.round(hits * 100 / attempts) : 0 };
}
