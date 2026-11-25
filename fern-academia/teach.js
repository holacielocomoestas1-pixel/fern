// Fern Academy v6.0 — capa docente + TTS.
// - buildTeachBlocks(lesson): compone los 3 bloques «niño de 5 años» de un
//   capítulo desde su propio material de catalog.json (title/summary/sections)
//   o desde la anulación escrita a mano en teach-content.js.
// - listenButton/speakKey/stopSpeaking: puente con window.FernAudio (audio.js,
//   script clásico cargado en index.html). Todo con guardas: si audio.js aún
//   no existe o el TTS no está soportado, los botones no se dibujan y nada
//   lanza errores.
// No toca el estado: el progreso vive en los mapas existentes (lessons, etc.).

import { TEACH_OVERRIDES, SUBJECT_ANALOGY } from "./teach-content.js";

const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

// Registro texto-a-voz: los botones llevan solo una clave corta (data-speech);
// el texto completo vive aquí, no en atributos HTML.
const speechTexts = new Map();

export function ttsAvailable() {
  try {
    const api = window.FernAudio;
    return !!(api && typeof api.isSupported === "function" && api.isSupported());
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  try {
    window.FernAudio?.stop?.();
  } catch {
    // Sin TTS no hay nada que cortar.
  }
}

export function speakText(text) {
  try {
    const api = window.FernAudio;
    if (!api || typeof api.speak !== "function") return false;
    return api.speak(text) !== false;
  } catch {
    return false;
  }
}

export function speakKey(key) {
  const text = speechTexts.get(key);
  if (!text) return false;
  return speakText(text);
}

// Botón «Escuchar» glass. Devuelve "" si no hay TTS (sin voz th-TH el botón
// se oculta, nunca error). El texto que se lee es siempre el tailandés:
// el contenido pedagógico es tailandés primero y FernAudio habla th-TH.
export function listenButton(key, textTh, label) {
  if (!textTh || !ttsAvailable()) return "";
  speechTexts.set(key, textTh);
  return `<button type="button" class="teach-listen" data-action="teach-listen" data-speech="${esc(key)}" aria-label="${esc(label)}"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 6 9H3v6h3l6 5zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><span>${esc(label)}</span></button>`;
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

// Corta en un límite de palabra/frase (los textos tailandeses separan
// sintagmas con espacios); nunca corta a mitad de palabra si hay un
// espacio razonable cerca.
function shorten(text, max) {
  const value = clean(text);
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut) + "…";
}

function sectionByTitle(lesson, titleEn) {
  return lesson.sections.find(section => section.title.en === titleEn);
}

// Los 3 bloques de un capítulo. source: "hand" (escrito a mano en
// teach-content.js) o "template" (compuesto desde el material del capítulo).
// why es siempre un array de pasos (2-4) en cada idioma.
export function buildTeachBlocks(lesson) {
  const override = TEACH_OVERRIDES[lesson.id];
  if (override) return { id: lesson.id, source: "hand", ...override };
  const core = lesson.sections[0];
  const example = sectionByTitle(lesson, "Worked example");
  const trap = lesson.sections.find(section => /^Common (mistake|trap)/.test(section.title.en));
  const analogy = SUBJECT_ANALOGY[lesson.subject] || SUBJECT_ANALOGY.general;
  const simple = {
    th: `บทนี้พูดเรื่อง${clean(lesson.title.th)} พูดง่าย ๆ คือ ${clean(lesson.summary.th)}`,
    en: `Explain it like you're five: ${clean(lesson.title.en)} — ${clean(lesson.summary.en)}.`,
  };
  const whyTh = [`เริ่มจากหลัก: ${shorten(core.text.th, 130)}`];
  const whyEn = [`Start with the rule: ${shorten(core.text.en, 130)}`];
  if (example) {
    whyTh.push(`ดูตัวอย่าง: ${shorten(example.text.th, 130)}`);
    whyEn.push(`See the example: ${shorten(example.text.en, 130)}`);
  }
  if (trap) {
    whyTh.push(`ระวังจุดพลาด: ${shorten(trap.text.th, 130)}`);
    whyEn.push(`Watch out: ${shorten(trap.text.en, 130)}`);
  }
  const hook = {
    th: `${analogy.th} สำหรับบทนี้จำสั้น ๆ ว่า ${clean(lesson.summary.th)}`,
    en: `${analogy.en} For this chapter, remember: ${clean(lesson.summary.en)}`,
  };
  return { id: lesson.id, source: "template", simple, why: { th: whyTh, en: whyEn }, hook };
}

// Los tres bloques en tarjetas glass, encima de las sections del capítulo.
export function teachBlocksHtml(ctx, lesson) {
  const { t, lang } = ctx;
  const blocks = buildTeachBlocks(lesson);
  const listenLabel = t("ฟัง", "Listen");
  const whySpeech = blocks.why.th.join(" ");
  return `<section class="teach-blocks" aria-label="${esc(t("อธิบายแบบง่าย ๆ", "Explained simply"))}">
    <div class="teach-card teach-simple"><div class="teach-head"><span class="teach-mark" aria-hidden="true">🌱</span><h2>${t("อธิบายแบบง่าย ๆ", "In simple words")}</h2>${listenButton(`teach-${lesson.id}-simple`, blocks.simple.th, listenLabel)}</div><p>${esc(blocks.simple[lang])}</p></div>
    <div class="teach-card teach-why"><div class="teach-head"><span class="teach-mark" aria-hidden="true">🔍</span><h2>${t("ทำไมถึงเป็นแบบนี้?", "Why does this happen?")}</h2>${listenButton(`teach-${lesson.id}-why`, whySpeech, listenLabel)}</div><ol>${blocks.why[lang].map(step => `<li>${esc(step)}</li>`).join("")}</ol></div>
    <div class="teach-card teach-hook"><div class="teach-head"><span class="teach-mark" aria-hidden="true">🧠</span><h2>${t("จำแบบนี้", "Remember it like this")}</h2>${listenButton(`teach-${lesson.id}-hook`, blocks.hook.th, listenLabel)}</div><p>${esc(blocks.hook[lang])}</p></div>
  </section>`;
}
