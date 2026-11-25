/* ===== Fern v6.0 — capa docente (Fase 2+3) =====
   Enseñar como a un niño de 5 años + audio/memoria + «Cómo vamos» +
   «Empieza aquí» + mini-check + historias + escucha.
   Carga con defer DESPUÉS de app.js/fern-ui.js. Todo lo que depende de
   audio.js (FernAudio) o tour.js (FernTour) va con guarda: si esos
   módulos no cargaron, la app funciona igual (sin escucha / sin tour).
   Progreso nuevo: LS.set con prefijo fern2- (auto-sync por FernSync). */
(function () {
'use strict';

/* ---------- Audio (contrato window.FernAudio) ---------- */
function FA() { return (typeof window !== 'undefined' && window.FernAudio) ? window.FernAudio : null; }
function canSpeak() { var a = FA(); try { return !!(a && a.isSupported && a.isSupported()); } catch (e) { return false; } }
function stopAudio() { var a = FA(); try { if (a && a.stop) a.stop(); } catch (e) {} }
function playSound(name) { var a = FA(); try { if (a && a.play) a.play(name); } catch (e) {} }
function speakText(text, opts) {
  var a = FA(); if (!a || !a.speak) return false;
  try { a.speak(text, opts || { lang: 'th-TH' }); return true; } catch (e) { return false; }
}

/* ---------- Utilidades ---------- */
function escHtml(s) { return (typeof esc === 'function') ? esc(s) : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function langIsEn() { return (typeof LANG !== 'undefined' && LANG === 'en'); }
function pick(pair) { if (!pair) return ''; return langIsEn() ? (pair.en || pair.th || '') : (pair.th || pair.en || ''); }
function subjTitle(sid) {
  var s = (typeof subjById === 'function') ? subjById(sid) : null;
  if (!s) return sid;
  return (typeof subjectTitle === 'function') ? subjectTitle(s) : s.name;
}
function subjIcon(sid) {
  var s = (typeof subjById === 'function') ? subjById(sid) : null;
  return s && s.icon ? s.icon : '📖';
}
function t_(k) { return (typeof t === 'function') ? t(k) : k; }

/* Botón «Escuchar»: el texto viaja codificado en data-say; un solo
   listener delegado en document lo resuelve (sobrevive a innerHTML). */
function listenBtn(text, label, cls) {
  if (!canSpeak() || !text) return '';
  var enc = encodeURIComponent(text);
  return '<button type="button" class="listen-btn ' + (cls || '') + '" data-say="' + enc + '" aria-label="' + escHtml(t_('listenBtn')) + '">🔊 ' + escHtml(label || t_('listenBtn')) + '</button>';
}
document.addEventListener('click', function (ev) {
  var btn = ev.target && ev.target.closest ? ev.target.closest('.listen-btn') : null;
  if (!btn) return;
  ev.preventDefault();
  var a = FA();
  if (a && a.isSpeaking && a.isSpeaking()) { stopAudio(); btn.classList.remove('speaking'); return; }
  var text = '';
  try { text = decodeURIComponent(btn.getAttribute('data-say') || ''); } catch (e) { text = ''; }
  if (!text) return;
  document.querySelectorAll('.listen-btn.speaking').forEach(function (b) { b.classList.remove('speaking'); });
  if (speakText(text)) {
    btn.classList.add('speaking');
    var iv = setInterval(function () {
      var still = false;
      try { still = !!(a && a.isSpeaking && a.isSpeaking()); } catch (e) {}
      if (!still) { clearInterval(iv); btn.classList.remove('speaking'); }
    }, 400);
    setTimeout(function () { clearInterval(iv); btn.classList.remove('speaking'); }, 60000);
  }
});

/* ---------- Tarjeta «¿Por qué?» (reutilizable en quiz / mock / extras) ---------- */
function whyHtml(explanation) {
  if (!explanation) return '';
  return '<div class="why-card"><div class="why-card__head"><span class="why-card__title">💡 ' + escHtml(t_('whyTitle')) + '</span>' +
    listenBtn(explanation) + '</div><p>' + escHtml(explanation) + '</p></div>';
}

/* ---------- 1. Capa docente por lección ---------- */
function teachFor(sid, part) {
  if (typeof TEACH === 'undefined') return null;
  return TEACH[sid + '-' + part] || null;
}
function teachBlockHtml(sid, part) {
  var entry = teachFor(sid, part);
  if (!entry) return '';
  var h = '<div class="teach-block">';
  if (entry.simple) {
    var st = pick(entry.simple);
    h += '<div class="teach-card"><div class="teach-card__head"><span class="teach-card__label">🌱 ' + escHtml(t_('teachSimple')) + '</span>' +
      listenBtn(entry.simple.th) + '</div><p>' + escHtml(st) + '</p></div>';
  }
  if (entry.why) {
    var steps = langIsEn() ? (entry.why.en || entry.why.th) : entry.why.th;
    var speakWhy = (entry.why.th || []).join(' ');
    h += '<div class="teach-card"><div class="teach-card__head"><span class="teach-card__label">🔍 ' + escHtml(t_('teachWhy')) + '</span>' +
      listenBtn(speakWhy) + '</div><ol class="teach-steps">' +
      steps.map(function (s) { return '<li>' + escHtml(s) + '</li>'; }).join('') + '</ol></div>';
  }
  if (entry.hook) {
    var hk = pick(entry.hook);
    h += '<div class="teach-card teach-card--hook"><div class="teach-card__head"><span class="teach-card__label">🧠 ' + escHtml(t_('teachHook')) + '</span>' +
      listenBtn(entry.hook.th) + '</div><p>' + escHtml(hk) + '</p></div>';
  }
  return h + '</div>';
}

/* ---------- 2. Mini-check tras cada lección ---------- */
var mini = null;
function shuffledIdx(n) {
  var arr = []; for (var i = 0; i < n; i++) arr.push(i);
  for (var j = arr.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp; }
  return arr;
}
function startMiniCheck(dialog, sid, part, key) {
  stopAudio();
  var pool = (typeof QUESTIONS !== 'undefined' && QUESTIONS[sid]) ? QUESTIONS[sid] : [];
  if (!pool.length) {
    /* Sin banco no hay mini-check: comportamiento original (marcar +15 XP). */
    if (typeof G !== 'undefined' && !G.lessons.includes(key)) {
      G.lessons.push(key);
      if (typeof addXP === 'function') addXP(15);
      else if (typeof saveG === 'function') saveG();
    }
    try { dialog.close(); } catch (e) {}
    if (typeof renderAll === 'function') renderAll();
    if (typeof checkBadges === 'function') checkBadges(true);
    return;
  }
  var picks = shuffledIdx(pool.length).slice(0, Math.min(2, pool.length));
  mini = { dialog: dialog, sid: sid, part: part, key: key,
    list: picks.map(function (i) { return { sid: sid, idx: i, q: pool[i] }; }), i: 0, score: 0 };
  renderMiniCheck();
}
function renderMiniCheck() {
  if (!mini) return;
  var dialog = mini.dialog;
  var item = mini.list[mini.i];
  var q = item.q;
  var total = mini.list.length;
  var art = dialog.querySelector('article') || dialog;
  art.innerHTML =
    '<header class="reader-head"><button type="button" class="text-action" id="mc-x">' + escHtml(t_('closeLabel')) + '</button>' +
    '<span>' + escHtml(t_('miniCheck')) + ' ' + (mini.i + 1) + '/' + total + '</span></header>' +
    '<div class="reader-title"><h1 tabindex="-1">' + escHtml(t_('miniCheck')) + '</h1></div>' +
    '<p class="mut">' + escHtml(t_('miniCheckSub')) + '</p>' +
    '<div class="lesson-body"><p style="font-weight:700;font-size:18px;line-height:1.55">' + escHtml(q.q) + '</p>' +
    '<div id="mc-opts" role="group">' + q.o.map(function (o, i) {
      return '<button type="button" class="opt" data-opt="' + i + '"><span class="key">' + 'ABCD'[i] + '</span><span>' + escHtml(o) + '</span></button>';
    }).join('') + '</div>' +
    '<div id="mc-fb" aria-live="polite"><button class="btn" type="button" id="mc-chk" disabled>' + escHtml(t_('check')) + '</button></div></div>';
  art.querySelector('#mc-x').onclick = function () { stopAudio(); mini = null; dialog.close(); };
  var picked = null;
  var opts = Array.prototype.slice.call(art.querySelectorAll('[data-opt]'));
  var chk = art.querySelector('#mc-chk');
  opts.forEach(function (opt) {
    opt.onclick = function () {
      picked = Number(opt.getAttribute('data-opt'));
      opts.forEach(function (o) { o.classList.toggle('sel', o === opt); });
      chk.disabled = false;
    };
  });
  chk.onclick = function () {
    if (picked === null) return;
    chk.disabled = true;
    var right = picked === q.a;
    opts.forEach(function (o, i) {
      o.disabled = true; o.classList.remove('sel');
      if (i === q.a) o.classList.add('correct'); else if (i === picked) o.classList.add('wrong');
    });
    playSound(right ? 'correct' : 'wrong');
    if (right) mini.score += 1;
    var fb = art.querySelector('#mc-fb');
    var verdict = right ? ('🎉 ' + t_('correct')) : ('💡 ' + t_('wrong') + ' ' + 'ABCD'[q.a] + '. ' + escHtml(q.o[q.a]));
    fb.innerHTML = '<div class="feedback ' + (right ? 'ok' : 'no') + '"><strong>' + verdict + '</strong></div>' +
      whyHtml(q.e) +
      '<button type="button" class="btn" id="mc-nxt" style="margin-top:10px">' +
      escHtml(t_(mini.i + 1 >= total ? 'finish' : 'next')) + '</button>';
    fb.querySelector('#mc-nxt').onclick = function () {
      stopAudio();
      mini.i += 1;
      if (mini.i >= total) finishMiniCheck(false);
      else renderMiniCheck();
    };
  };
}
function finishMiniCheck(skipped) {
  if (!mini) return;
  var key = mini.key, dialog = mini.dialog;
  stopAudio();
  mini = null;
  /* Misma semántica que el botón original: marcar hecha +15 XP. */
  if (typeof G !== 'undefined' && !G.lessons.includes(key)) {
    G.lessons.push(key);
    if (typeof addXP === 'function') addXP(15);
    else if (typeof saveG === 'function') saveG();
  }
  try { dialog.close(); } catch (e) {}
  if (typeof renderAll === 'function') renderAll();
  if (typeof checkBadges === 'function') checkBadges(true);
  if (!skipped && typeof toast === 'function') toast(t_('miniCheckDone'));
}

/* ---------- 4. Historias ---------- */
function storiesDone() { return (typeof LS !== 'undefined') ? LS.get('stories-done', []) : []; }
function storiesBySid(sid) {
  if (typeof STORIES === 'undefined') return [];
  return STORIES.filter(function (s) { return s.sid === sid; });
}
function storiesEntryHtml() {
  if (typeof STORIES === 'undefined' || !STORIES.length) return '';
  var done = storiesDone();
  var rows = SUBJECTS.map(function (s) {
    var list = storiesBySid(s.id);
    if (!list.length) return '';
    var n = list.filter(function (st) { return done.indexOf(st.id) >= 0; }).length;
    return '<button type="button" class="subject-row" data-story-subj="' + s.id + '" style="--subj:' + subjColor(s.id) + '">' +
      '<span class="subj-ic" aria-hidden="true">' + (s.icon || '') + '</span><b>' + escHtml(subjTitle(s.id)) + '</b>' +
      '<span class="mut">' + n + '/' + list.length + ' ✓</span></button>';
  }).join('');
  if (!rows) return '';
  return '<h2 class="subheading">📖 ' + escHtml(t_('storiesTitle')) + '</h2>' +
    '<p class="mut" style="margin:-4px 0 10px">' + escHtml(t_('storiesSub')) + '</p>' + rows;
}
function wireStoriesEntry(root) {
  root.querySelectorAll('[data-story-subj]').forEach(function (b) {
    b.onclick = function () { openStories(b.getAttribute('data-story-subj')); };
  });
}
function openDialog(html) {
  var root = document.getElementById('modal-root');
  root.innerHTML = '<dialog class="modal reader-modal">' + html + '</dialog>';
  var dialog = root.querySelector('dialog');
  dialog.addEventListener('close', function () { stopAudio(); dialog.remove(); }, { once: true });
  dialog.showModal();
  return dialog;
}
function openStories(sid) {
  var done = storiesDone();
  var list = storiesBySid(sid);
  var dialog = openDialog(
    '<article class="reader"><header class="reader-head"><button type="button" class="text-action" id="st-x">' + escHtml(t_('closeLabel')) + '</button>' +
    '<span>📖 ' + escHtml(t_('storiesTitle')) + '</span></header>' +
    '<div class="reader-title"><h1 tabindex="-1">' + subjIcon(sid) + ' ' + escHtml(subjTitle(sid)) + '</h1></div>' +
    '<p class="mut">' + escHtml(t_('storiesSub')) + '</p><div class="lesson-body">' +
    list.map(function (st) {
      var isDone = done.indexOf(st.id) >= 0;
      return '<button type="button" class="subject-row" data-story="' + st.id + '" style="--subj:' + subjColor(sid) + ';width:100%;margin-bottom:10px">' +
        '<span class="subj-ic" aria-hidden="true">📖</span><b>' + escHtml(pick(st.title)) + '</b>' +
        '<span class="mut">' + (isDone ? '✓ ' + escHtml(t_('storiesRead')) : escHtml(t_('readLesson'))) + '</span></button>';
    }).join('') + '</div></article>');
  dialog.querySelector('#st-x').onclick = function () { dialog.close(); };
  dialog.querySelectorAll('[data-story]').forEach(function (b) {
    b.onclick = function () { dialog.close(); openStory(b.getAttribute('data-story')); };
  });
  dialog.querySelector('h1').focus({ preventScroll: true });
}
function openStory(id) {
  var st = null;
  if (typeof STORIES !== 'undefined') STORIES.forEach(function (s) { if (s.id === id) st = s; });
  if (!st) return;
  var fullText = st.body.join(' ');
  var dialog = openDialog(
    '<article class="reader"><header class="reader-head"><button type="button" class="text-action" id="st-x">' + escHtml(t_('closeLabel')) + '</button>' +
    '<span>📖 ' + escHtml(subjTitle(st.sid)) + '</span></header>' +
    '<div class="reader-title"><h1 tabindex="-1">' + escHtml(pick(st.title)) + '</h1></div>' +
    '<div class="lesson-body"><div class="teach-card story-body">' +
    st.body.map(function (p) { return '<p>' + escHtml(p) + '</p>'; }).join('') +
    '<div style="margin-top:10px">' + listenBtn(fullText, t_('storyListenAll')) + '</div></div>' +
    '<h3 style="margin-top:18px">' + escHtml(t_('storyQuestion')) + '</h3>' +
    '<p style="font-weight:700;font-size:18px;line-height:1.55">' + escHtml(st.q.th) + '</p>' +
    '<div id="story-opts" role="group">' + st.q.o.map(function (o, i) {
      return '<button type="button" class="opt" data-opt="' + i + '"><span class="key">' + 'ABCD'[i] + '</span><span>' + escHtml(o) + '</span></button>';
    }).join('') + '</div>' +
    '<div id="story-fb" aria-live="polite"><button class="btn" type="button" id="story-chk" disabled>' + escHtml(t_('check')) + '</button></div></div></article>');
  dialog.querySelector('#st-x').onclick = function () { dialog.close(); };
  var picked = null;
  var opts = Array.prototype.slice.call(dialog.querySelectorAll('[data-opt]'));
  var chk = dialog.querySelector('#story-chk');
  opts.forEach(function (opt) {
    opt.onclick = function () {
      picked = Number(opt.getAttribute('data-opt'));
      opts.forEach(function (o) { o.classList.toggle('sel', o === opt); });
      chk.disabled = false;
    };
  });
  chk.onclick = function () {
    if (picked === null) return;
    chk.disabled = true;
    var right = picked === st.q.a;
    opts.forEach(function (o, i) {
      o.disabled = true; o.classList.remove('sel');
      if (i === st.q.a) o.classList.add('correct'); else if (i === picked) o.classList.add('wrong');
    });
    playSound(right ? 'correct' : 'wrong');
    var done = storiesDone();
    if (done.indexOf(st.id) < 0) { done.push(st.id); LS.set('stories-done', done); }
    if (right && typeof addXP === 'function') addXP(10);
    var fb = dialog.querySelector('#story-fb');
    var whyText = pick(st.q.why);
    fb.innerHTML = '<div class="feedback ' + (right ? 'ok' : 'no') + '"><strong>' +
      (right ? '🎉 ' + t_('correct') : '💡 ' + t_('wrong') + ' ' + 'ABCD'[st.q.a] + '. ' + escHtml(st.q.o[st.q.a])) +
      '</strong></div>' + whyHtml(whyText) +
      '<div class="chiprow" style="margin-top:12px"><button type="button" class="btn" id="story-back">' + escHtml(t_('backToList')) + '</button></div>';
    fb.querySelector('#story-back').onclick = function () {
      dialog.close();
      if (typeof renderAll === 'function') renderAll();
      openStories(st.sid);
    };
  };
  dialog.querySelector('h1').focus({ preventScroll: true });
}

/* ---------- 5. Ejercicios de escucha ---------- */
var listen = null;
function listenDone() { return (typeof LS !== 'undefined') ? LS.get('listen-done', {}) : {}; }
function listenEntryHtml() {
  if (typeof LISTEN_SETS === 'undefined') return '';
  var done = listenDone();
  var rows = SUBJECTS.map(function (s) {
    var items = LISTEN_SETS[s.id];
    if (!items || !items.length) return '';
    var n = (done[s.id] || []).length;
    return '<button type="button" class="subject-row" data-listen-subj="' + s.id + '" style="--subj:' + subjColor(s.id) + '">' +
      '<span class="subj-ic" aria-hidden="true">🎧</span><b>' + escHtml(subjTitle(s.id)) + '</b>' +
      '<span class="mut">' + n + '/' + items.length + '</span></button>';
  }).join('');
  if (!rows) return '';
  return '<h2 class="subheading">🎧 ' + escHtml(t_('listenTitle')) + '</h2>' +
    '<p class="mut" style="margin:-4px 0 10px">' + escHtml(t_('listenSub')) + '</p>' + rows;
}
function wireListenEntry(root) {
  root.querySelectorAll('[data-listen-subj]').forEach(function (b) {
    b.onclick = function () { startListen(b.getAttribute('data-listen-subj')); };
  });
}
function startListen(sid) {
  if (typeof LISTEN_SETS === 'undefined' || !LISTEN_SETS[sid]) return;
  stopAudio();
  document.body.classList.add('quiz-on');
  /* Sin TTS disponible, el texto se muestra desde el principio: el
     ejercicio sigue siendo usable leyendo en vez de escuchando. */
  listen = { sid: sid, items: LISTEN_SETS[sid], i: 0, score: 0, revealed: !canSpeak() };
  if (typeof go === 'function') go('quiz');
  document.getElementById('quiz-menu').hidden = true;
  renderListen();
}
function exitListen() {
  stopAudio();
  document.body.classList.remove('quiz-on');
  listen = null;
  document.getElementById('quiz-box').innerHTML = '';
  document.getElementById('quiz-menu').hidden = false;
  if (typeof renderAll === 'function') renderAll();
}
function renderListen() {
  if (!listen) return;
  var box = document.getElementById('quiz-box');
  var it = listen.items[listen.i];
  var total = listen.items.length;
  var pct = Math.round(listen.i / total * 100);
  box.innerHTML = '<div class="prow"><button type="button" class="xbtn" id="li-x">✕</button>' +
    '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
    '<span style="font-weight:800">🎧 ' + (listen.i + 1) + '/' + total + '</span></div>' +
    '<div class="question-head"><div><p class="mut">' + escHtml(subjTitle(listen.sid)) + ' · ' + escHtml(t_('listenTitle')) + '</p>' +
    '<h1 class="question-title" tabindex="-1">' + escHtml(t_('listenPlay')) + '</h1></div>' + mascotArt(74, 'guide') + '</div>' +
    '<div class="listen-stage"><button type="button" class="btn primary listen-big" id="li-play">🔊 ' + escHtml(t_('listenAgain')) + '</button>' +
    '<button type="button" class="text-action" id="li-reveal">' + escHtml(t_(listen.revealed ? 'listenHide' : 'listenShow')) + '</button>' +
    '<p class="listen-text" id="li-text" ' + (listen.revealed ? '' : 'hidden') + '>' + escHtml(it.say) + '</p></div>' +
    '<div id="li-opts" role="group" style="margin-top:14px">' + it.o.map(function (o, i) {
      return '<button type="button" class="opt" data-opt="' + i + '"><span class="key">' + 'ABCD'[i] + '</span><span>' + escHtml(o) + '</span></button>';
    }).join('') + '</div>' +
    '<div id="li-fb" aria-live="polite"><button class="btn" type="button" id="li-chk" disabled>' + escHtml(t_('check')) + '</button></div>';
  box.querySelector('#li-x').onclick = exitListen;
  var playBtn = box.querySelector('#li-play');
  playBtn.onclick = function () { speakText(it.say); };
  box.querySelector('#li-reveal').onclick = function () {
    listen.revealed = !listen.revealed;
    var t2 = document.getElementById('li-text');
    if (t2) t2.hidden = !listen.revealed;
    this.textContent = t_(listen.revealed ? 'listenHide' : 'listenShow');
  };
  var picked = null;
  var opts = Array.prototype.slice.call(box.querySelectorAll('[data-opt]'));
  var chk = box.querySelector('#li-chk');
  opts.forEach(function (opt) {
    opt.onclick = function () {
      picked = Number(opt.getAttribute('data-opt'));
      opts.forEach(function (o) { o.classList.toggle('sel', o === opt); });
      chk.disabled = false;
    };
  });
  chk.onclick = function () {
    if (picked === null) return;
    chk.disabled = true;
    var right = picked === it.a;
    opts.forEach(function (o, i) {
      o.disabled = true; o.classList.remove('sel');
      if (i === it.a) o.classList.add('correct'); else if (i === picked) o.classList.add('wrong');
    });
    playSound(right ? 'correct' : 'wrong');
    if (right) { listen.score += 1; if (typeof addXP === 'function') addXP(10); }
    var done = listenDone();
    var arr = done[listen.sid] || [];
    if (arr.indexOf(listen.i) < 0) { arr.push(listen.i); done[listen.sid] = arr; LS.set('listen-done', done); }
    var fb = box.querySelector('#li-fb');
    fb.innerHTML = '<div class="feedback ' + (right ? 'ok' : 'no') + '"><strong>' +
      (right ? '🎉 ' + t_('correct') : '💡 ' + t_('wrong') + ' ' + 'ABCD'[it.a] + '. ' + escHtml(it.o[it.a])) +
      '</strong></div>' + whyHtml(pick(it.why)) +
      '<button type="button" class="btn" id="li-nxt" style="margin-top:10px">' + escHtml(t_(listen.i + 1 >= total ? 'finish' : 'next')) + '</button>';
    fb.querySelector('#li-nxt').onclick = function () {
      stopAudio();
      listen.i += 1;
      listen.revealed = !canSpeak();
      if (listen.i >= total) {
        var sc = listen.score, tt = total;
        exitListen();
        if (typeof celebrate === 'function') celebrate(t_('listenTitle'), t_('score') + ': <b>' + sc + ' / ' + tt + '</b>', t_('continue'), null);
        if (typeof checkBadges === 'function') checkBadges(true);
      } else renderListen();
    };
  };
  /* Escucha primero: reproducir la frase al entrar en el ítem. */
  speakText(it.say);
  window.scrollTo(0, 0);
}

/* ---------- 6. «Cómo vamos» ---------- */
function masteryFor(sid) {
  var parts = (typeof lessonParts === 'function') ? lessonParts(sid) : [];
  var totalL = parts.length || 1;
  var doneL = parts.filter(function (_, i) { return G.lessons.includes(lessonKey(sid, i)); }).length;
  var totalQ = QUESTIONS[sid] ? QUESTIONS[sid].length : 1;
  var best = LS.get('quiz-' + sid, null);
  var quizPct = best ? (best.best / totalQ) : null;
  var mistakes = G.mistakes.filter(function (m) { return m.sid === sid; }).length;
  var cleanPct = Math.max(0, (totalQ - mistakes) / totalQ);
  var lessonPct = doneL / totalL;
  /* Sin actividad (sin lecciones, sin quiz, sin errores) el dominio es 0:
     cleanPct vale 1 por defecto y regalaba un 30% a materias sin empezar. */
  var hasActivity = doneL > 0 || quizPct !== null || mistakes > 0;
  var mastery = !hasActivity ? 0 : (quizPct === null)
    ? Math.round(lessonPct * 70 + cleanPct * 30)
    : Math.round(lessonPct * 40 + quizPct * 40 + cleanPct * 20);
  return { doneL: doneL, totalL: totalL, lessonPct: lessonPct, best: best, totalQ: totalQ,
    quizPct: quizPct, mistakes: mistakes, mastery: mastery };
}
function fallbackNextStep() {
  for (var si = 0; si < SUBJECTS.length; si++) {
    var sid = SUBJECTS[si].id;
    var parts = lessonParts(sid);
    for (var pi = 0; pi < parts.length; pi++) {
      if (!G.lessons.includes(lessonKey(sid, pi))) {
        return { kind: 'lesson', sid: sid, part: pi,
          label: { th: subjTitle(sid) + ' · บทที่ ' + (pi + 1), en: subjTitle(sid) + ' · Lesson ' + (pi + 1) },
          sub: { th: 'บทเรียนถัดไปของเฟิร์น', en: 'Fern\'s next lesson' } };
      }
    }
  }
  return null;
}
function nextStep() {
  var step = null;
  try {
    if (window.FernTour && typeof window.FernTour.nextStep === 'function') step = window.FernTour.nextStep();
  } catch (e) { step = null; }
  return step || fallbackNextStep();
}
function goToStep(step) {
  if (!step) return;
  if (step.kind === 'practice') { if (typeof startQuiz === 'function') startQuiz(step.sid); return; }
  if (step.kind === 'lesson' && typeof openLesson === 'function') openLesson(step.sid, step.part || 0);
}
function openProgress() {
  stopAudio();
  var rows = SUBJECTS.map(function (s) {
    var m = masteryFor(s.id);
    var bestTxt = m.best ? (t_('bestScore') + ' ' + m.best.best + '/' + m.totalQ) : t_('noQuizYet');
    var mistTxt = m.mistakes ? (' · ⚠ ' + m.mistakes) : '';
    return '<div class="progress-row"><div class="progress-row__top"><span><span aria-hidden="true">' + (s.icon || '') + '</span> <b>' + escHtml(subjTitle(s.id)) + '</b></span>' +
      '<span class="progress-pct">' + m.mastery + '%</span></div>' +
      '<span class="bar" aria-hidden="true"><i style="width:' + m.mastery + '%"></i></span>' +
      '<p class="mut">' + m.doneL + '/' + m.totalL + ' ' + escHtml(t_('statLessons')) + ' · ' + bestTxt + mistTxt + '</p></div>';
  }).join('');
  var totalLessons = SUBJECTS.reduce(function (n, s) { return n + lessonParts(s.id).length; }, 0);
  var leftLessons = totalLessons - G.lessons.length;
  var step = nextStep();
  var stepHtml = '';
  if (step) {
    stepHtml = '<div class="card next-step-card"><p class="mut" style="margin:0 0 4px">' + escHtml(t_('progressNext')) + '</p>' +
      '<p style="font-weight:750;font-size:17px;margin:0 0 4px">' + escHtml(pick(step.label)) + '</p>' +
      '<p class="mut" style="margin:0 0 10px">' + escHtml(pick(step.sub)) + '</p>' +
      '<button type="button" class="btn primary" id="pv-go">' + escHtml(t_('start')) + ' →</button></div>';
  } else {
    stepHtml = '<div class="card next-step-card"><p style="font-weight:750;margin:0">' + escHtml(t_('startHereDone')) + '</p>' +
      '<div class="chiprow" style="margin-top:10px"><button type="button" class="chip" id="pv-mist">' + escHtml(t_('mistakeBtn')) + '</button>' +
      '<button type="button" class="chip" id="pv-mock">' + escHtml(t_('mockShort')) + '</button></div></div>';
  }
  var dialog = openDialog(
    '<article class="reader"><header class="reader-head"><button type="button" class="text-action" id="pv-x">' + escHtml(t_('closeLabel')) + '</button>' +
    '<span>📊 ' + escHtml(t_('progressTitle')) + '</span></header>' +
    '<div class="reader-title"><h1 tabindex="-1">' + escHtml(t_('progressTitle')) + '</h1>' + mascotArt(72, 'goal') + '</div>' +
    '<div class="stat-grid" style="margin:12px 0">' +
    '<div class="stat-cell"><span class="stat-cell__ic" aria-hidden="true">🔥</span><b>' + G.streak.n + '</b><small>' + escHtml(t_('statStreak')) + '</small></div>' +
    '<div class="stat-cell"><span class="stat-cell__ic" aria-hidden="true">✦</span><b>' + G.xp + '</b><small>XP</small></div>' +
    '<div class="stat-cell"><span class="stat-cell__ic" aria-hidden="true">📖</span><b>' + G.lessons.length + '/' + totalLessons + '</b><small>' + escHtml(t_('statLessons')) + '</small></div>' +
    '<div class="stat-cell"><span class="stat-cell__ic" aria-hidden="true">🎯</span><b>' + G.mistakes.length + '</b><small>' + escHtml(t_('mistakeBtn')) + '</small></div></div>' +
    stepHtml +
    '<h2 class="subheading">' + escHtml(t_('progressMastery')) + '</h2>' + rows +
    '<p class="mut" style="margin-top:6px">' + escHtml(t_('progressLeft')) + ': ' +
    escHtml(String(leftLessons)) + ' ' + escHtml(t_('statLessons')) +
    (G.mistakes.length ? ' · ' + G.mistakes.length + ' ' + escHtml(t_('mistakeBtn')) : '') + '</p>' +
    '</article>');
  dialog.querySelector('#pv-x').onclick = function () { dialog.close(); };
  var goBtn = dialog.querySelector('#pv-go');
  if (goBtn) goBtn.onclick = function () { dialog.close(); goToStep(step); };
  var mistBtn = dialog.querySelector('#pv-mist');
  if (mistBtn) mistBtn.onclick = function () { dialog.close(); if (typeof startMistakes === 'function') startMistakes(); };
  var mockBtn = dialog.querySelector('#pv-mock');
  if (mockBtn) mockBtn.onclick = function () { dialog.close(); if (typeof go === 'function') go('mock'); };
  dialog.querySelector('h1').focus({ preventScroll: true });
}

/* ---------- 7. «Empieza aquí» (Home) ---------- */
function renderStartHere() {
  var home = document.getElementById('v-home');
  if (!home) return;
  var today = home.querySelector('.today');
  var existing = document.getElementById('start-here');
  var step = nextStep();
  var label = step ? pick(step.label) : t_('startHereDone');
  var mainHtml = '<button type="button" class="start-here__main" id="sh-go">' +
    '<span class="start-here__ic" aria-hidden="true">' + (step ? '🚀' : '🏆') + '</span>' +
    '<span class="start-here__txt"><strong>' + escHtml(t_('startHere')) + ' · ' + escHtml(label) + '</strong></span>' +
    '<span class="start-here__chev" aria-hidden="true">›</span></button>' +
    '<button type="button" class="start-here__progress" id="sh-progress" aria-label="' + escHtml(t_('progressTitle')) + '"><span aria-hidden="true">📊</span></button>';
  var html = '<div class="start-here" id="start-here">' + mainHtml + '</div>';
  if (existing) {
    existing.outerHTML = html;
  } else if (today) {
    today.insertAdjacentHTML('beforebegin', html);
  } else {
    home.insertAdjacentHTML('beforeend', html);
  }
  var goBtn = document.getElementById('sh-go');
  if (goBtn) goBtn.onclick = function () {
    if (step) goToStep(step);
    else if (typeof startMistakes === 'function') startMistakes();
  };
  var pvBtn = document.getElementById('sh-progress');
  if (pvBtn) pvBtn.onclick = openProgress;
}

/* ---------- 8. Sonido / introducción (filas de Perfil) ---------- */
function soundRowHtml() {
  var a = FA();
  if (!a || typeof a.isMuted !== 'function' || typeof a.setMuted !== 'function') return '';
  var muted = false;
  try { muted = !!a.isMuted(); } catch (e) {}
  return '<button type="button" class="menu-row" id="sound-toggle" role="switch" aria-checked="' + String(!muted) + '">' +
    '<span class="menu-ic" aria-hidden="true">' + (muted ? '🔇' : '🔊') + '</span>' +
    '<span class="menu-txt"><strong>' + escHtml(t_('soundRow')) + '</strong><small>' + escHtml(t_('soundSub')) + '</small></span>' +
    '<span class="teach-switch' + (muted ? '' : ' on') + '" aria-hidden="true"><i></i></span></button>';
}
function wireSoundRow() {
  var btn = document.getElementById('sound-toggle');
  if (!btn) return;
  btn.onclick = function () {
    var a = FA(); if (!a) return;
    var nowMuted = false;
    try { nowMuted = !!a.isMuted(); a.setMuted(!nowMuted); } catch (e) { return; }
    if (nowMuted) { /* se acaba de encender */ playSound('tap'); }
    else stopAudio();
    if (typeof renderProfile === 'function') renderProfile();
  };
}
function introRowHtml() {
  if (!window.FernTour || typeof window.FernTour.start !== 'function') return '';
  return '<button type="button" class="menu-row" id="repeat-intro">' +
    '<span class="menu-ic" aria-hidden="true">👋</span>' +
    '<span class="menu-txt"><strong>' + escHtml(t_('repeatIntro')) + '</strong><small>' + escHtml(t_('repeatIntroSub')) + '</small></span>' +
    '<span class="menu-chev" aria-hidden="true">›</span></button>';
}
function wireIntroRow() {
  var btn = document.getElementById('repeat-intro');
  if (!btn) return;
  btn.onclick = function () {
    try { if (window.FernTour && window.FernTour.start) window.FernTour.start(); } catch (e) {}
  };
}

/* ---------- API pública ---------- */
window.FernTeach = {
  canSpeak: canSpeak,
  speak: speakText,
  stop: stopAudio,
  play: playSound,
  whyHtml: whyHtml,
  listenBtn: listenBtn,
  teachBlockHtml: teachBlockHtml,
  startMiniCheck: startMiniCheck,
  storiesEntryHtml: storiesEntryHtml,
  wireStoriesEntry: wireStoriesEntry,
  openStories: openStories,
  openStory: openStory,
  listenEntryHtml: listenEntryHtml,
  wireListenEntry: wireListenEntry,
  startListen: startListen,
  exitListen: exitListen,
  openProgress: openProgress,
  renderStartHere: renderStartHere,
  nextStep: nextStep,
  soundRowHtml: soundRowHtml,
  wireSoundRow: wireSoundRow,
  introRowHtml: introRowHtml,
  wireIntroRow: wireIntroRow
};

/* teach.js se ejecuta DESPUÉS de fern-ui.js (defer): el primer render ya
   ocurrió sin la capa docente. Re-renderizar una vez para inyectarla. */
if (typeof renderAll === 'function') {
  try { renderAll(); } catch (e) {}
}
})();
