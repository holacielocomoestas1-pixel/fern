import { SUBJECTS, EXAM_SOURCE, daysUntil, productDate, subjectStats, dateStreak } from "./core.mjs";

// v4.4: color propio de cada materia (misma paleta que la app principal).
const SUBJ_COLORS = { general: "#ff9600", thai: "#ff4b8f", it: "#1cb0f6", saraban: "#a560e8", law: "#ff4b4b", english: "#58cc02" };

export const ICONS = {
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>',
  book: '<path d="M12 6a8 8 0 0 0-8-2H3v15h1a8 8 0 0 1 8 2 8 8 0 0 1 8-2h1V4h-1a8 8 0 0 0-8 2zM12 6v15"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  game: '<path d="M8 8h8a4 4 0 0 1 4 3l1 5a2 2 0 0 1-3 2l-3-3H9l-3 3a2 2 0 0 1-3-2l1-5a4 4 0 0 1 4-3zM8 10v4m-2-2h4m5-1h1m1 2h1"/>',
  stats: '<path d="M4 3v16a1 1 0 0 0 1 1h16M8 15v-4m5 4V7m5 8V4"/>',
  logic: '<path d="M3 12h18M12 3v18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6"/>',
  text: '<path d="M4 6h16M4 10h16M4 14h11m-11 4h13"/>',
  screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  scales: '<path d="M12 3v17m-5 1h10M3 6h18M6 6l-3 7h6zm12 0-3 7h6z"/>',
  letters: '<path d="m2 18 6-13 6 13m-9-4h6m4-3c1-1 5-2 5 1v6h-3a2 2 0 0 1 0-4h3"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  cards: '<path d="M7 4h12a2 2 0 0 1 2 2v11M5 8h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/>',
  bookmark: '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  flag: '<path d="M5 21V4c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  gem: '<path d="m12 2 6 5 3 6-9 9-9-9 3-6zM3 13h18m-9-11 4 11-4 9-4-9z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 7v4l3 1"/>',
  volume: '<path d="M12 4 6 9H3v6h3l6 5zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M12 4 6 9H3v6h3l6 5zm5 5 4 6m0-6-4 6"/>',
};

export const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

export function icon(name) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.next}</svg>`;
}

export const GAMES = {
  race: {
    th: "เฟิร์นแรลลี", en: "Fern Rally", icon: "flag", cover: "assets/games/fern-rally.webp",
    desc: { th: "เข้าโค้ง เก็บบูสต์ แล้วชิงเส้นชัยบนเส้นทางของเฟิร์น", en: "Lean into bends, build boost and race to the finish on Fern’s trails." },
  },
  match: {
    th: "สวนเฟิร์น", en: "Canopy Grove", icon: "gem", cover: "assets/games/canopy-grove.webp",
    desc: { th: "สลับชิ้นส่วนสามชิ้นขึ้นไป ต่อคอมโบและทำเป้าหมายให้สำเร็จ", en: "Match three or more pieces, chain combos and hit the board’s goal." },
  },
};

export function shell(ctx, active) {
  const { t, lang } = ctx;
  const links = [
    ["home", "วันนี้", "Today", "home"],
    ["library", "บทเรียน", "Library", "book"],
    ["practice", "ฝึกทำข้อสอบ", "Practice", "target"],
    ["games", "เกม", "Playroom", "game"],
    ["progress", "ความคืบหน้า", "Progress", "stats"],
  ];
  const originalUrl = new URL("../index.html", import.meta.url).href;
  return {
    top: `<div class="top-inner"><a class="wordmark" href="#home" aria-label="Fern ${t("หน้าหลัก", "home")}"><img src="assets/avatar.webp" width="34" height="34" alt=""><span>Fern<small>.</small></span></a><div class="top-actions"><a href="${esc(originalUrl)}">${t("แอปหลัก", "Main app")}</a><button type="button" data-action="locale" data-lang="th" lang="th" aria-pressed="${lang === "th"}">ไทย</button><button type="button" data-action="locale" data-lang="en" lang="en" aria-pressed="${lang === "en"}">EN</button></div></div>`,
    nav: links.map(([id, thai, english, glyph]) => `<a href="#${id}" ${id === active ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${t(thai, english)}</span></a>`).join(""),
  };
}

function heading(title, note = "", eyebrow = "") {
  return `<div class="intro">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h1>${title}</h1>${note ? `<p class="lead">${note}</p>` : ""}</div>`;
}

function row({ href, label, note = "", glyph = "", data = "", color = "" }) {
  const ic = glyph ? (color ? `<span class="row-icon" style="--rowc:${color}">${icon(glyph)}</span>` : icon(glyph)) : "";
  return `<a class="row" href="${esc(href)}">${ic}<span class="row-main"><span class="row-title">${label}</span>${note ? `<span class="row-note">${note}</span>` : ""}</span>${data ? `<span class="row-data">${data}</span>` : ""}${icon("next")}</a>`;
}

function kpis(items) {
  return `<div class="kpis">${items.map(([value, label]) => `<div class="kpi"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>`;
}

function subjectOptions(ctx, value = "all", allowAll = true) {
  const select = SUBJECTS.map(subject => `<option value="${subject.id}" ${value === subject.id ? "selected" : ""}>${esc(subject[ctx.lang])}</option>`).join("");
  return (allowAll ? `<option value="all" ${value === "all" ? "selected" : ""}>${ctx.t("ทุกวิชา", "All subjects")}</option>` : "") + select;
}

function backlink(label, href = "#library") {
  return `<a class="link" href="${href}">${label}</a>`;
}

export function sources(ctx, ids) {
  const valid = [...new Set(ids || [])].map(key => ctx.catalog.sources.find(source => source.id === key)).filter(Boolean);
  if (!valid.length) return "";
  return `<details class="sources"><summary>${ctx.t("แหล่งอ้างอิง", "References")}</summary><ul>${valid.map(source => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a></li>`).join("")}</ul></details>`;
}

// v4.3: línea de estado de la cuenta. El inicio de sesión vive en el perfil
// de la app principal; aquí solo se muestra si el progreso está respaldado.
function syncLine(ctx) {
  const { t, sync } = ctx;
  if (!sync) return "";
  if (!sync.user) {
    return `<p class="subtle section">☁️ ${t("ยังไม่ได้เข้าสู่ระบบ — ความก้าวหน้าอยู่ในเครื่องนี้เท่านั้น เข้าสู่ระบบได้ที่หน้าโปรไฟล์ในแอปหลัก", "Not signed in — progress stays on this device only. Sign in from your profile in the main app.")}</p>`;
  }
  const s = sync.status === "syncing"
    ? t("กำลังซิงก์…", "Syncing…")
    : sync.status === "offline"
      ? t("ออฟไลน์ — จะซิงก์เมื่อมีเน็ต", "Offline — will sync when back online")
      : sync.status === "error"
        ? t("ซิงก์ไม่สำเร็จ — จะลองอีกครั้งเอง", "Sync failed — will retry automatically")
        : t("ซิงก์กับบัญชีแล้ว ✓", "Synced to your account ✓");
  return `<p class="subtle section">☁️ ${esc(sync.user.email || "")} · ${s}</p>`;
}

export function homeView(ctx) {
  const { t, lang, n, state, catalog } = ctx;
  const remaining = daysUntil(state.examDate);
  const today = state.days[productDate()] || 0;
  const target = 15;
  const seen = Object.keys(state.questions).length;
  const lessons = catalog.lessons.filter(lesson => !state.lessons[lesson.id]);
  const next = lessons[0];
  const hasErrors = Object.values(state.questions).some(q => q.last === false);
  const weak = SUBJECTS.map(s => ({ ...s, stats: subjectStats(state.questions, s.id) })).filter(s => s.stats.attempts > 0).sort((first, second) => first.stats.accuracy - second.stats.accuracy)[0];
  const common = remaining !== null && remaining >= 0;
  let plan;
  if (!common) {
    plan = t("อ่านหนึ่งบท ทำข้อฝึก 15 ข้อ แล้วทบทวนคำตอบที่พลาด", "Read a chapter, answer 15 practice questions and review the ones you missed.");
  } else if (remaining <= 1) {
    plan = t("ทบทวนแฟลชการ์ดกับข้อที่เคยพลาด แล้วเตรียมบัตรและเวลาเดินทาง", "Review flashcards and past mistakes, then prepare your exam ID and travel plan.");
  } else if (remaining <= 5) {
    plan = t("ฝึกวิชาที่ยังอ่อนวันนี้ แล้วกันเวลา 3 ชั่วโมงสำหรับการจำลองสอบก่อนวันจริง", "Practise your weakest subject today and set aside three hours for a mock before exam day.");
  } else {
    plan = t("สลับอ่านเนื้อหา ฝึกทำข้อสอบ และทบทวนคำตอบที่ผิด วางวันสำหรับสอบจำลองล่วงหน้า", "Rotate chapters, practice questions and mistake review, then schedule a full mock.");
  }
  const due = catalog.cards.filter(card => !state.cards[card.id] || state.cards[card.id].due <= Date.now()).length;
  return `<section class="hero"><img class="hero-art" src="assets/reader.webp" width="640" height="640" alt="" fetchpriority="high"><div class="hero-copy"><p class="eyebrow">${t("นักเรียนนายสิบตำรวจ · อก.1", "Police NCO · Administration")}</p><h1>${t("ค่อย ๆ เก่งขึ้น", "Ready for exam day.")}</h1><p class="lead">${t("อ่าน ฝึกทำข้อสอบ และทบทวนกับเฟิร์นในจังหวะของคุณ", "Learn the material, test yourself and build a routine with Fern.")}</p><a class="act solid" href="${next ? `#lesson/${next.id}` : "#practice"}">${next ? t("เริ่มอ่าน", "Read a chapter") : t("เริ่มฝึก", "Start practising")}${icon("next")}</a></div></section>
  ${kpis([[n(catalog.totals.questions), t("ข้อฝึกพร้อมเฉลย", "Practice questions")], [n(catalog.lessons.length), t("บทเรียน", "Chapters")], [n(catalog.cards.length), t("แฟลชการ์ด", "Flashcards")]])}
  <section class="section"><div class="section-head"><h2>${t("แผนของวันนี้", "Today’s plan")}</h2><span class="subtle">${n(today)} / ${target} ${t("ข้อ", "answers")}</span></div>
    <progress value="${Math.min(today, target)}" max="${target}" aria-label="${t("เป้าหมายวันนี้", "Daily goal")}"></progress>
    <div class="plan"><p>${plan}</p>${common ? `<p class="subtle">${remaining === 0 ? t("วันสอบ", "Exam day") : t(`เหลือ ${n(remaining)} วัน`, `${n(remaining)} days to go`)}</p>` : ""}</div>
    <div class="list">
    ${row({ href: weak ? `#practice/${weak.id}` : "#practice", glyph: "target", label: weak ? esc(weak[lang]) : t("เริ่มทำข้อฝึก", "Start practice"), note: weak ? t("ทบทวนวิชาที่คะแนนยังน้อย", "Work on your current weak point") : t("ชุดสั้นพร้อมคำอธิบาย", "Short drills with answer explanations") })}
    ${row({ href: "#cards", glyph: "cards", label: t("แฟลชการ์ด", "Flashcards"), data: t(`${n(due)} ใบ`, `${n(due)} due`) })}
    ${hasErrors ? row({ href: "#practice/errors", glyph: "target", label: t("ฝึกข้อที่พลาด", "Review mistakes") }) : ""}
    </div>
    <details class="sources"><summary>${t("กำหนดวันสอบของคุณ", "Set your exam date")}</summary><form id="exam-form" class="fields"><label class="field field-short">${t("วันสอบ", "Exam date")}<input name="date" type="date" value="${esc(state.examDate)}" max="2099-12-31"></label><button class="act ghost" type="submit">${t("บันทึก", "Save")}</button>${state.examDate ? `<button class="text-button" type="button" data-action="clear-date">${t("ล้างวันที่", "Clear date")}</button>` : ""}</form><p class="subtle">${t("รอบ อก.1 ปี 2569 กำหนดสอบข้อเขียน 29 พฤศจิกายน 2569 ตรวจรายละเอียดของคุณในบัตรสอบ", "The 2569 administration intake lists 29 November 2026 for the written exam. Check your own admission slip.")} <a class="link" href="${EXAM_SOURCE}" target="_blank" rel="noopener noreferrer">${t("ประกาศ", "Notice")}</a></p></details>
  </section>
  <section class="section"><div class="section-head"><h2>${t("เลือกวิชา", "Pick up a subject")}</h2><a class="link" href="#library">${t("ดูทั้งหมด", "View library")}</a></div><div class="list">${SUBJECTS.map(s => row({ href: `#library/${s.id}`, glyph: s.icon, label: esc(s[lang]), data: n(catalog.subjects[s.id].questions), color: SUBJ_COLORS[s.id] })).join("")}</div></section>
  ${seen ? `<p class="subtle section">${t(`ทำไปแล้ว ${n(seen)} ข้อ`, `You’ve attempted ${n(seen)} different questions.`)}</p>` : ""}
  ${syncLine(ctx)}`;
}

export function libraryView(ctx, id) {
  const { t, lang, n, catalog, state } = ctx;
  const subject = SUBJECTS.find(row => row.id === id);
  const lessons = subject ? catalog.lessons.filter(lesson => lesson.subject === id) : catalog.lessons;
  const lessonRows = lessons.map(lesson => {
    const haystack = [lesson.title.th, lesson.title.en, lesson.summary.th, lesson.summary.en].join(" ").toLocaleLowerCase();
    return `<li data-search="${esc(haystack)}">${row({ href: `#lesson/${lesson.id}`, label: esc(lesson.title[lang]), note: esc(lesson.summary[lang]), data: state.lessons[lesson.id] ? t("อ่านแล้ว", "Read") : "" })}</li>`;
  }).join("");
  return `${subject ? backlink(t("ทุกวิชา", "All subjects")) : ""}
    ${heading(subject ? esc(subject[lang]) : t("ห้องอ่าน", "Study library"), subject
      ? t(`${n(lessons.length)} บท · ${n(catalog.subjects[id].questions)} ข้อฝึก`, `${n(lessons.length)} chapters · ${n(catalog.subjects[id].questions)} practice questions`)
      : t("อ่านเนื้อหา วิธีคิด และตัวอย่าง ก่อนลงมือทำข้อสอบ", "Read the concepts and worked examples, then try them in practice."))}
    ${id === "saraban" ? `<details class="sources"><summary>${t("ฉบับระเบียบที่ใช้", "Records regulation coverage")}</summary><p>${t("บทเรียนระเบียบตำรวจอิงฉบับรวมทางการถึงตุลาคม 2566 การแก้ไขฉบับที่ 21 อยู่ในสารบัญของกองกฎหมาย", "The police records chapters use the official consolidation through October 2023. The Legal Division index lists amendment 21.")} <a href="https://tsd.police.go.th/index.php/2025/07/18/77827852/" target="_blank" rel="noopener noreferrer">${t("เปิดสารบัญ", "Open index")}</a></p></details>` : ""}
    ${subject ? `<div class="inline-actions section"><a class="act solid" href="#practice/${id}">${t("ฝึกวิชานี้", "Practise this subject")}</a><a class="act ghost" href="#cards/${id}">${t("แฟลชการ์ด", "Flashcards")}</a></div>` : `<div class="list section">${SUBJECTS.map(s => row({ href: `#library/${s.id}`, label: esc(s[lang]), glyph: s.icon, data: t(`${n(catalog.subjects[s.id].lessons)} บท`, `${n(catalog.subjects[s.id].lessons)} chapters`), color: SUBJ_COLORS[s.id] })).join("")}</div>`}
    <section class="section"><h2>${t("ค้นหาบทเรียน", "Find a chapter")}</h2><label class="field fields">${t("คำค้น", "Search chapters")}<input id="chapter-filter" type="search" autocomplete="off" placeholder="${t("เช่น ร้อยละ หรือ Excel", "e.g. percentages or Excel")}"></label>
    <ul class="list plain-list" id="chapter-list">${lessonRows}</ul>
    <p id="search-empty" class="empty" role="status" hidden>${t("ไม่พบบทที่ตรงกับคำค้น", "No matching chapters.")}</p>
    </section>`;
}

export function lessonView(ctx, id) {
  const { t, lang, catalog, state } = ctx;
  const lesson = catalog.lessons.find(item => item.id === id);
  if (!lesson) return heading(t("ไม่พบบทเรียน", "Chapter unavailable")) + backlink(t("ไปที่ห้องอ่าน", "Go to the library"));
  const subject = SUBJECTS.find(row => row.id === lesson.subject);
  const done = !!state.lessons[id];
  const practice = catalog.byLesson[id] > 0;
  return `<article class="article">${backlink(esc(subject[lang]), `#library/${subject.id}`)}
    ${heading(esc(lesson.title[lang]), esc(lesson.summary[lang]))}
    ${lesson.sections.map(section => `<section class="article-section"><h2>${esc(section.title[lang])}</h2><p>${esc(section.text[lang])}</p></section>`).join("")}
    ${sources(ctx, lesson.sources)}
    <div class="inline-actions section"><button type="button" class="act ${practice ? "ghost" : "solid"}" data-action="lesson-done" data-id="${id}" aria-pressed="${done}">${done ? `${icon("check")}${t("อ่านแล้ว", "Marked as read")}` : t("ทำเครื่องหมายว่าอ่านแล้ว", "Mark as read")}</button>${practice ? `<button type="button" class="act solid" data-action="lesson-practice" data-id="${id}">${t("ลองทำข้อฝึกบทนี้", "Try this chapter’s questions")}</button>` : ""}</div>
  </article>`;
}

export function practiceView(ctx, args) {
  const { t, catalog, n, state } = ctx;
  const pool = ["errors", "saved"].includes(args[0]) ? args[0] : "all";
  const selected = SUBJECTS.some(s => s.id === args[0]) ? args[0] : "all";
  const counts = {
    errors: Object.values(state.questions).filter(row => row.last === false).length,
    saved: Object.values(state.saved).filter(Boolean).length,
  };
  const savedLabel = t("ข้อที่บันทึก", "Saved questions");
  const errorLabel = t("ข้อที่ตอบผิดล่าสุด", "Recent mistakes");
  return heading(t("สนามฝึก", "Practice"), t("เลือกวิชาและความยาวของชุดฝึก พร้อมคำอธิบายหลังตอบแต่ละข้อ", "Choose a subject and a set length. See a worked explanation after each answer.")) + `
    ${ctx.practiceSession && !ctx.practiceSession.done || ctx.mockSession && !ctx.mockSession.done ? `<div class="inline-actions section">${ctx.practiceSession && !ctx.practiceSession.done ? `<a class="act ghost" href="#session">${t("กลับไปทำชุดเดิม", "Resume practice")}</a>` : ""}${ctx.mockSession && !ctx.mockSession.done ? `<a class="act ghost" href="#session/mock">${t("ทำข้อสอบต่อ", "Resume timed mock")}</a>` : ""}</div>` : ""}
    <form id="practice-form" class="fields">
    <label class="field">${t("วิชา", "Subject")}<select name="subject">${subjectOptions(ctx, selected)}</select></label>
    <label class="field">${t("จำนวนข้อ", "Length")}<select name="count"><option value="10">10 ${t("ข้อ", "questions")}</option><option value="25">25 ${t("ข้อ", "questions")}</option><option value="50">50 ${t("ข้อ", "questions")}</option></select></label>
    <label class="field">${t("ระดับ", "Difficulty")}<select name="level"><option value="0">${t("ทุกระดับ", "All levels")}</option><option value="1">${t("พื้นฐาน", "Foundation")}</option><option value="2">${t("ประยุกต์", "Applied")}</option><option value="3">${t("ท้าทาย", "Challenge")}</option></select></label>
    <label class="field">${t("เลือกข้อจาก", "Question pool")}<select name="pool"><option value="all">${t("คลังคำถาม", "Full question bank")}</option><option value="errors" ${pool === "errors" ? "selected" : ""}>${errorLabel} (${n(counts.errors)})</option><option value="saved" ${pool === "saved" ? "selected" : ""}>${savedLabel} (${n(counts.saved)})</option></select></label>
    <button class="act solid" type="submit">${t("เริ่มฝึก", "Start practice")}</button>
    </form>
    <div class="section list">${row({ href: "#mock", label: t("สอบจำลองเต็มชุด", "Full timed mock"), note: t("150 ข้อ · 3 ชั่วโมง · 6 วิชา", "150 questions · 3 hours · six subjects"), glyph: "timer", color: "#ff9600" })}
    ${row({ href: "#interview", label: t("ซ้อมสัมภาษณ์", "Interview practice"), note: t("ฝึกตอบจากสถานการณ์จริง", "Practise common workplace scenarios"), glyph: "text", color: "#1cb0f6" })}
    ${row({ href: "#cards", label: t("แฟลชการ์ด", "Flashcards"), glyph: "cards", data: n(catalog.cards.length), color: "#a560e8" })}</div>`;
}

export function mockView(ctx) {
  const { t, lang } = ctx;
  return `${heading(t("สอบจำลอง", "Full mock exam"), t("ตอบ 150 ข้อใน 180 นาที สลับข้อได้และดูผลหลังส่ง", "Answer 150 questions in 180 minutes. Move between questions and see your results after submitting."), t("สอบข้อเขียน อก.1", "NCO administration written exam"))}
    <div class="section list">${SUBJECTS.map(subject => `<div class="row"><span class="row-icon" style="--rowc:${SUBJ_COLORS[subject.id]}">${icon(subject.icon)}</span><span class="row-main">${esc(subject[lang])}</span><span class="row-data">${subject.weight}</span></div>`).join("")}</div>
    <p class="subtle section">${t("ชุดฝึกสร้างจากคลังของเฟิร์น ใช้โครงสร้างข้อสอบและแสดงเกณฑ์ 60% แยกสองภาคของข้อเขียน", "Fern draws original questions from its bank using the written-exam blueprint. Scores show the 60% threshold for each of the two written sections.")} <a class="link" href="${EXAM_SOURCE}" target="_blank" rel="noopener noreferrer">${t("ภาคผนวก ฉ", "Annex ฉ")}</a></p>
    <div class="inline-actions section">${ctx.mockSession && !ctx.mockSession.done
      ? `<a class="act solid" href="#session/mock">${t("ทำข้อสอบต่อ", "Resume timed mock")}</a>`
      : `<button type="button" class="act solid" data-action="start-mock">${t("เริ่มจับเวลา", "Start timed mock")}${icon("timer")}</button>`}</div>`;
}

export function cardsView(ctx, id) {
  const { t, lang, n, catalog, state, cardRound } = ctx;
  if (cardRound) {
    const card = cardRound.cards[cardRound.index];
    if (!card) {
      return `${heading(t("ทบทวนเสร็จแล้ว", "Review complete"), t("เฟิร์นจัดเวลาทบทวนของแต่ละใบให้แล้ว", "Fern has scheduled your next review for these cards."))}<div class="inline-actions section"><button class="act solid" type="button" data-action="close-cards">${t("กลับไปที่แฟลชการ์ด", "Back to flashcards")}</button></div>`;
    }
    return `${heading(t("แฟลชการ์ด", "Flashcards"), `${n(cardRound.index + 1)} / ${n(cardRound.cards.length)}`)}
    <div class="study-card"><p class="eyebrow">${esc(SUBJECTS.find(s => s.id === card.subject)[lang])}</p><h2>${esc(card.front[lang])}</h2>${cardRound.open ? `<p class="back">${esc(card.back[lang])}</p>${sources(ctx, card.sources)}` : ""}</div>
    <div class="inline-actions">${cardRound.open ? `<button class="act ghost" type="button" data-action="card-rate" data-value="again">${t("ยังจำไม่ได้", "Review again")}</button><button class="act solid" type="button" data-action="card-rate" data-value="ok">${t("จำได้", "I remembered")}</button>` : `<button class="act solid" type="button" data-action="flip-card">${t("พลิกดูคำตอบ", "Reveal answer")}</button>`}<button class="text-button" type="button" data-action="close-cards">${t("จบการทบทวน", "End review")}</button></div>`;
  }
  const selected = SUBJECTS.some(subject => subject.id === id) ? id : "all";
  const cards = catalog.cards.filter(card => selected === "all" || card.subject === selected);
  const due = cards.filter(card => !state.cards[card.id] || state.cards[card.id].due <= Date.now()).length;
  return `${heading(t("แฟลชการ์ด", "Flashcards"), t("ฝึกนึกคำตอบก่อนพลิกดู แล้วให้เฟิร์นช่วยจัดรอบทบทวนถัดไป", "Try recalling the answer before flipping the card. Fern schedules the next review."))}
    <div class="tags"><span class="tag">${t(`พร้อมทบทวน ${n(due)} ใบ`, `${n(due)} ready to review`)}</span><span class="tag">${t(`ทั้งหมด ${n(cards.length)} ใบ`, `${n(cards.length)} cards in this deck`)}</span></div>
    <form id="card-form" class="fields"><label class="field field-short">${t("วิชา", "Subject")}<select name="subject" data-card-subject>${subjectOptions(ctx, selected)}</select></label>
    <button type="submit" name="scope" value="due" class="act solid">${t("ทบทวนชุดที่ถึงเวลา", "Review due cards")}</button><button type="submit" name="scope" value="all" class="act ghost">${t("ฝึกจากทุกใบ", "Practise any card")}</button></form>`;
}

export function gamesView(ctx) {
  const { t, lang, catalog, n, state } = ctx;
  const ids = Object.keys(GAMES);
  // Estante estilo Nintendo Switch: portadas cuadradas con foto; la enfocada
  // crece con anillo. Tocar una portada la enfoca; tocarla enfocada entra
  // al juego con la animación de lanzamiento (ver launchGame en app.mjs).
  return `${heading(t("ห้องเกม", "Playroom"), t("แวะมาเล่นได้ทุกเวลา เลือกเล่นอิสระหรือให้ข้อฝึกช่วยปลดบูสต์", "Drop in any time. Play freely or earn boosts by answering study questions."))}
    <div class="game-shelf" role="group" aria-label="${t("เลือกเกม", "Choose a game")}">${ids.map((id, i) => {
      const game = GAMES[id];
      return `<button type="button" class="game-card${i === 0 ? " on" : ""}" data-action="focus-game" data-game="${id}" aria-label="${esc(game[lang])}"><span class="game-card-art"><img src="${game.cover}" alt="" width="640" height="640" loading="eager"></span><span class="game-card-name">${esc(game[lang])}</span></button>`;
    }).join("")}</div>
    <p class="shelf-hint">${t("แตะเกมเพื่อเลือก · แตะอีกครั้งเพื่อเล่น", "Tap a game to select · tap again to play")}</p>
    ${ids.map((id, i) => {
      const game = GAMES[id];
      const best = state.gameResults[id]?.free?.runs ? `<p class="subtle">${t("สถิติเล่นอิสระ", "Free play best")} ${n(state.gameResults[id].free.best)}</p>` : "";
      return `<section class="game-detail${i === 0 ? " on" : ""}" data-game="${id}"><h2>${esc(game[lang])}</h2><p class="lead">${esc(game.desc[lang])}</p>${best}
      <div class="inline-actions"><button type="button" class="act solid" data-action="launch-game" data-game="${id}" data-mode="free">${t("เล่นอิสระ", "Free play")}</button><button type="button" class="act ghost" data-action="launch-game" data-game="${id}" data-mode="study">${t("เล่นพร้อมทบทวน", "Play & study")}</button></div></section>`;
    }).join("")}
    <button class="text-button section" data-action="sound" type="button" aria-pressed="${state.sound}">${state.sound ? t("ปิดเสียงเกม", "Mute game sounds") : t("เปิดเสียงเกม", "Enable game sounds")}</button>
    <p class="subtle">${t(`โหมดทบทวนเลือกจากคลัง ${n(catalog.totals.questions)} ข้อ`, `Study mode draws from the ${n(catalog.totals.questions)}-question bank.`)}</p>`;
}

export function gamePicker(ctx, id) {
  const { t, lang } = ctx;
  const game = GAMES[id];
  if (!game) return gamesView(ctx);
  return `${backlink(t("ห้องเกม", "Playroom"), "#games")}
    ${heading(esc(game[lang]), t("เลือกวิชาที่อยากทบทวน เกมจะหยุดชั่วคราวเมื่อแสดงคำถาม", "Pick a subject to review. The game pauses while you answer."))}
    <form id="game-form" data-game="${id}" class="fields">
    <label class="field field-short">${t("วิชา", "Subject")}<select name="subject">${subjectOptions(ctx, "general", false)}</select></label>
    <button class="act solid" type="submit">${t("เริ่มเล่น", "Start game")}</button></form>`;
}

export function gameView(ctx, game, mode, subject) {
  const { t, lang } = ctx;
  return `<div class="game-header">${backlink(t("กลับห้องเกม", "Back to playroom"), "#games")}<div class="tags"><span class="tag">${mode === "study" ? esc(SUBJECTS.find(s => s.id === subject)[lang]) : t("เล่นอิสระ", "Free play")}</span><button type="button" class="icon-button" data-action="sound" aria-label="${t("เสียงเกม", "Game sound")}" aria-pressed="${ctx.state.sound}">${icon(ctx.state.sound ? "volume" : "muted")}</button></div></div><section id="game-mount" class="game-mount" aria-label="${esc(GAMES[game][lang])}">${loadingView(ctx)}</section>`;
}

export function progressView(ctx) {
  const { t, lang, n, catalog, state } = ctx;
  const attempts = Object.values(state.questions).reduce((total, row) => total + row.seen, 0);
  const hits = Object.values(state.questions).reduce((total, row) => total + row.hits, 0);
  return `${heading(t("ความคืบหน้า", "Your progress"), t("ดูวิชาที่ทำได้ดีและเลือกจุดที่ควรฝึกต่อ", "See where you’re gaining ground and choose what to practise next."))}
    <section class="section">${kpis([[n(attempts), t("คำตอบทั้งหมด", "Answers")], [attempts ? `${n(Math.round(hits * 100 / attempts))}%` : "—", t("ตอบถูก", "Accuracy")], [n(dateStreak(state.days)), t("วันต่อเนื่อง", "Day streak")]])}</section>
    <section class="section"><div class="section-head"><h2>${t("แยกรายวิชา", "By subject")}</h2></div>
    ${SUBJECTS.map(subject => {
      const stats = subjectStats(state.questions, subject.id);
      const count = catalog.subjects[subject.id].questions;
      return `<div class="statline"><div class="section-head"><a class="link" href="#practice/${subject.id}">${esc(subject[lang])}</a><span class="subtle">${stats.attempts ? `${n(stats.accuracy)}% · ${n(stats.unique)} / ${n(count)}` : t("ยังไม่เริ่ม", "Ready to start")}</span></div><progress max="100" value="${stats.accuracy}" aria-label="${esc(subject[lang])}"></progress></div>`;
    }).join("")}
    </section>
    <section class="section"><div class="section-head"><h2>${t("ผลสอบจำลอง", "Mock history")}</h2></div>${state.mockResults.length ? `<div class="list">${state.mockResults.map(mock => `<div class="row"><span class="row-main">${esc(mock.date)}</span><span class="row-data">${n(mock.correct)} / ${n(mock.total)} · ${mock.pass ? t("ถึงเกณฑ์ฝึก", "Reached practice threshold") : t("ยังไม่ถึงเกณฑ์", "Below practice threshold")}</span></div>`).join("")}</div>` : `<p class="lead">${t("เมื่อสอบจำลองเสร็จ ผลจะปรากฏที่นี่", "Your completed mocks will appear here.")}</p>`}</section>
    <section class="section"><div class="section-head"><h2>${t("การเล่น", "Game history")}</h2></div>${Object.entries(GAMES).map(([id, game]) => {
      const modes = state.gameResults[id] || {};
      return row({ href: `#play/${id}/free`, label: esc(game[lang]), data: t(`${n((modes.free?.runs || 0) + (modes.study?.runs || 0))} รอบ`, `${n((modes.free?.runs || 0) + (modes.study?.runs || 0))} runs`), glyph: game.icon });
    }).join("")}
    </section>`;
}

export function loadingView(ctx) {
  return `<div class="loading" role="status"><img src="assets/avatar.webp" width="68" height="68" alt=""><p>${ctx.t("กำลังเตรียมให้เฟิร์น…", "Fern is getting things ready…")}</p></div>`;
}
