/* FernTour — visita guiada de primera apertura (v6.0, Fase 1).
 *
 * 5 pasos cortos con coach marks: Home (tu camino), Learn, Practice,
 * Cards y Academy. Aparece solo en la primera apertura, nunca sobre el
 * splash ni sobre la pantalla de login, y jamás vuelve tras completarse
 * o saltarse: el flag `tour-done` vive en localStorage (clave
 * `fern2-tour-done`) y se sincroniza a Firestore solo con guardarlo
 * vía LS.set (app.js ya avisa al sync en cada LS.set).
 *
 * API: window.FernTour = { maybeStart(), start(), isDone(), nextStep() }
 *  - maybeStart(): arranque automático con compuertas (splash/login/home).
 *  - start(): fuerza el tour aunque ya esté hecho (botón «Repetir la
 *    introducción» de Perfil, lo usa otro trabajador).
 *  - nextStep(): primer paso recomendado según el progreso real (lo usa
 *    el bloque «Empieza aquí» de Home, lo usa otro trabajador).
 *
 * No depende de audio.js ni de teach.js: funciona aunque aún no existan.
 */
(function () {
  'use strict';

  var FLAG_KEY = 'tour-done';
  var RAW_KEY = 'fern2-tour-done';
  var ORDER = ['general', 'thai', 'it', 'saraban', 'law', 'english'];
  var SUBJ = {
    general: { th: 'ความสามารถทั่วไป', en: 'General ability', n: 20 },
    thai: { th: 'ภาษาไทย', en: 'Thai language', n: 20 },
    it: { th: 'คอมพิวเตอร์เพื่อสำนักงาน', en: 'IT & office computing', n: 40 },
    saraban: { th: 'ระเบียบงานสารบรรณ', en: 'Records & correspondence', n: 30 },
    law: { th: 'กฎหมายที่ประชาชนควรรู้', en: 'Law every citizen should know', n: 25 },
    english: { th: 'ภาษาอังกฤษ', en: 'English', n: 15 }
  };

  /* Una frase simple por paso: qué es y para qué sirve. */
  var STEPS = [
    { target: ['#resume-lesson', '.hero', '.sidebar button[data-go="home"]', 'nav.tabs button[data-go="home"]'],
      title: { th: 'เส้นทางของเฟิร์น', en: 'Your Path' },
      text: { th: 'นี่คือเส้นทางของเฟิร์น — ดูภารกิจวันนี้ แล้วกดเริ่มเรียนได้เลย',
              en: 'This is your path — see today\u2019s mission and tap to start learning.' } },
    { target: ['.sidebar button[data-go="learn"]', 'nav.tabs button[data-go="learn"]'],
      title: { th: 'บทเรียน', en: 'Lessons' },
      text: { th: 'บทเรียนสั้น ๆ อ่านจบใน 2–3 นาที เรียนทีละวิชาไปเรื่อย ๆ',
              en: 'Short lessons, 2–3 minutes each — learn one subject at a time.' } },
    { target: ['.sidebar button[data-go="quiz"]', 'nav.tabs button[data-go="quiz"]'],
      title: { th: 'ฝึกข้อสอบ', en: 'Practice' },
      text: { th: 'ตอบคำถามเพื่อฝึกฝน ตอบถูกได้ XP ยิ่งฝึกยิ่งเก่ง',
              en: 'Answer questions to practise — correct answers earn XP. The more you practise, the better you get.' } },
    { target: ['.sidebar button[data-go="cards"]', 'nav.tabs button[data-go="cards"]'],
      title: { th: 'การ์ดจำ', en: 'Flashcards' },
      text: { th: 'แตะการ์ดเพื่อพลิกดูคำตอบ ท่องซ้ำจนจำแม่น',
              en: 'Tap a card to flip it and see the answer — repeat until you remember it.' } },
    { target: ['#sidebar-academy', '#fern-academia-entry', '#fern-academia-entry a', '.home-actions'],
      title: { th: 'ห้องเตรียมสอบ', en: 'Study Academy' },
      text: { th: 'ห้องเตรียมสอบมีข้อสอบ 6,104 ข้อ พร้อมเกมสนุก ๆ ให้ฝึก',
              en: 'The Academy has 6,104 questions, plus fun games to practise with.' } }
  ];

  var UI = {
    next: { th: 'เข้าใจแล้ว', en: 'Got it' },
    last: { th: 'เริ่มเรียนกันเลย', en: 'Let\u2019s start learning' },
    skip: { th: 'ข้าม', en: 'Skip' },
    of: { th: 'จาก', en: 'of' },
    dialog: { th: 'แนะนำการใช้งาน', en: 'Quick tour' }
  };

  var bootAt = Date.now();
  var giveUpAt = bootAt + 10000;
  var loginWasVisible = false;
  var running = false;
  var stepIndex = 0;
  var pollTimer = 0;
  var loginObserver = null;
  var positionRaf = 0;
  var overlay = null;
  var spot = null;
  var card = null;
  var cardTitle = null;
  var cardText = null;
  var cardCount = null;
  var btnNext = null;
  var btnSkip = null;

  function lang() {
    try {
      if (typeof LANG !== 'undefined' && LANG === 'en') return 'en';
    } catch (e) { /* LANG aún no existe: mirar el <html lang> */ }
    return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'th';
  }

  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* --- Almacenamiento (con respaldo si LS no está disponible) --- */

  function lsGet(key, fallback) {
    try {
      if (typeof LS !== 'undefined' && LS && typeof LS.get === 'function') return LS.get(key, fallback);
    } catch (e) { /* seguir con el respaldo directo */ }
    try {
      var raw = localStorage.getItem('fern2-' + key);
      if (raw !== null) return JSON.parse(raw);
      raw = localStorage.getItem('fern-' + key);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) { /* sin acceso a localStorage */ }
    return fallback;
  }

  function saveDone() {
    var saved = false;
    try {
      if (typeof LS !== 'undefined' && LS && typeof LS.set === 'function') {
        LS.set(FLAG_KEY, true); /* app.js ya avisa al sync en cada LS.set */
        saved = true;
      }
    } catch (e) { /* respaldo directo abajo */ }
    if (!saved) {
      try { localStorage.setItem(RAW_KEY, 'true'); } catch (e) { /* sin acceso */ }
      try { if (window.FernSync) window.FernSync.noteLocalChange('main'); } catch (e) { /* el sync jamás rompe el tour */ }
    }
  }

  function isDone() {
    if (lsGet(FLAG_KEY, false)) return true;
    try { return localStorage.getItem(RAW_KEY) === 'true'; }
    catch (e) { return false; }
  }

  /* --- Compuertas de arranque: splash, login y Home --- */

  // Splash: bootFern (fern-ui.js) añade body.ready y .hide al splash, y lo
  // elimina a los 245 ms; hay un respaldo que pone body.ready a los 3,5 s.
  function splashDone() {
    if (!document.body.classList.contains('ready')) return false;
    var splash = document.getElementById('splash');
    return !splash || splash.classList.contains('hide');
  }

  // Home renderizada: vista activa y título con texto (renderAll ya corrió).
  function homeReady() {
    var home = document.getElementById('v-home');
    if (!home || !home.classList.contains('on')) return false;
    var title = document.getElementById('home-title');
    if (title && title.textContent.trim()) return true;
    // Respaldo: si renderAll tarda, la vista visible basta pasados 6 s.
    return Date.now() - bootAt > 6000;
  }

  // Login visible: #login-screen sin [hidden], o body.login-open.
  // showLoginIfNeeded quita [hidden] y luego añade .on; hideLogin quita .on
  // y pone [hidden] 260 ms después: [hidden] es la señal fiable.
  function loginVisible() {
    var scr = document.getElementById('login-screen');
    if (scr && !scr.hidden) return true;
    return document.body.classList.contains('login-open');
  }

  // Sesión resuelta: hay usuario, el login ya apareció y se cerró (el usuario
  // lo descartó), o pasaron 6 s (el respaldo de bootFern muestra el login a
  // los 5 s si no hay sesión: si a los 6 s no se ve, es que hay sesión o ya
  // se descartó). Sin esto el tour podría arrancar antes de que aparezca el
  // login y quedar tapado por él.
  function authSettled() {
    try {
      var info = window.FernSync && window.FernSync.getSyncInfo
        ? window.FernSync.getSyncInfo() : null;
      if (info && info.user) return true;
    } catch (e) { /* sin FernSync: esperar al respaldo de 6 s */ }
    if (loginWasVisible) return true;
    return Date.now() - bootAt > 6000;
  }

  function canStart() {
    return !isDone() && !running && splashDone() && homeReady()
      && !loginVisible() && authSettled();
  }

  function stopWatching() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = 0; }
    if (loginObserver) { loginObserver.disconnect(); loginObserver = null; }
  }

  function ensurePolling() {
    if (!pollTimer && !isDone() && !running) pollTimer = setInterval(tick, 250);
  }

  function tick() {
    if (isDone()) { stopWatching(); return; }
    if (running) {
      // El tour ya arrancó: parar el polling pero mantener el observador,
      // que esconde el overlay si el login reaparece a mitad del tour.
      if (pollTimer) { clearInterval(pollTimer); pollTimer = 0; }
      return;
    }
    if (loginVisible()) {
      loginWasVisible = true;
      // Solo falta que se cierre el login: el observador vigila el cierre
      // (el usuario puede tardar lo que quiera en pulsar «Continuar sin
      // cuenta» o iniciar sesión) y se para el polling.
      if (pollTimer) { clearInterval(pollTimer); pollTimer = 0; }
      return;
    }
    if (canStart()) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = 0; }
      start(false);
      return;
    }
    // Abandono (~10 s): solo si la app nunca llega a estar lista
    // (splash/Home). El login, en cambio, se espera sin límite.
    if (Date.now() > giveUpAt && !(splashDone() && homeReady())) stopWatching();
  }

  function watchLogin() {
    if (loginObserver || typeof MutationObserver === 'undefined') return;
    var scr = document.getElementById('login-screen');
    if (!scr) return;
    loginObserver = new MutationObserver(function () {
      if (loginVisible()) {
        loginWasVisible = true;
        if (running) hideOverlay(true); // el login tapa el tour: esconderlo
        return;
      }
      if (running) { hideOverlay(false); positionStep(); return; }
      tick();
      ensurePolling();
    });
    loginObserver.observe(scr, { attributes: true, attributeFilter: ['hidden', 'class'] });
    loginObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function maybeStart() {
    if (isDone() || running) return false;
    giveUpAt = bootAt + 10000;
    watchLogin();
    tick();
    ensurePolling();
    return true;
  }

  /* --- Overlay y coach marks --- */

  function buildOverlay() {
    var L = lang();
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', UI.dialog[L]);
    spot = document.createElement('div');
    spot.className = 'tour-spot';
    spot.setAttribute('aria-hidden', 'true');
    card = document.createElement('div');
    card.className = 'tour-card';
    cardTitle = document.createElement('h2');
    cardTitle.className = 'tour-title';
    cardText = document.createElement('p');
    cardText.className = 'tour-text';
    cardText.setAttribute('aria-live', 'polite');
    cardCount = document.createElement('p');
    cardCount.className = 'tour-count';
    var actions = document.createElement('div');
    actions.className = 'tour-actions';
    btnSkip = document.createElement('button');
    btnSkip.type = 'button';
    btnSkip.className = 'btn ghost tour-skip';
    btnNext = document.createElement('button');
    btnNext.type = 'button';
    btnNext.className = 'btn tour-next';
    btnSkip.addEventListener('click', function () { finish(); });
    btnNext.addEventListener('click', function () { next(); });
    actions.appendChild(btnSkip);
    actions.appendChild(btnNext);
    card.appendChild(cardCount);
    card.appendChild(cardTitle);
    card.appendChild(cardText);
    card.appendChild(actions);
    overlay.appendChild(spot);
    overlay.appendChild(card);
    overlay.addEventListener('wheel', preventScroll, { passive: false });
    overlay.addEventListener('touchmove', preventScroll, { passive: false });
  }

  // La página de detrás no debe desplazarse mientras dura el tour; dentro
  // de la tarjeta sí se permite (por si el texto necesita scroll).
  function preventScroll(e) {
    if (e.target && e.target.closest && e.target.closest('.tour-card')) return;
    if (e.cancelable) e.preventDefault();
  }

  function hideOverlay(hidden) {
    if (overlay) overlay.style.visibility = hidden ? 'hidden' : 'visible';
  }

  function findTarget(step) {
    for (var i = 0; i < step.target.length; i++) {
      var el = document.querySelector(step.target[i]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) return el;
    }
    return null;
  }

  function showStep(index) {
    stepIndex = index;
    var step = STEPS[index];
    var L = lang();
    cardTitle.textContent = step.title[L];
    cardText.textContent = step.text[L];
    cardCount.textContent = (index + 1) + ' ' + UI.of[L] + ' ' + STEPS.length;
    btnNext.textContent = index === STEPS.length - 1 ? UI.last[L] : UI.next[L];
    btnSkip.textContent = UI.skip[L];
    var target = findTarget(step);
    if (target) {
      // Los botones del dock son fixed: no necesitan scroll. Lo mismo
      // vale para la barra lateral de escritorio (contenedor fixed).
      var fixed = false;
      try { fixed = window.getComputedStyle(target).position === 'fixed' || !!target.closest('.sidebar'); }
      catch (e) { /* medir sin desplazar */ }
      if (!fixed) {
        try {
          target.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
        } catch (e) {
          try { target.scrollIntoView(); } catch (e2) { /* medir tal cual */ }
        }
      }
    }
    // Medir tras el desplazamiento (el scroll suave tarda ~300 ms).
    setTimeout(positionStep, 380);
    try { btnNext.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
  }

  function positionStep() {
    if (!running || !overlay) return;
    var step = STEPS[stepIndex];
    var target = findTarget(step);
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pad = 8;
    var margin = 12;
    var box = null;
    if (target) {
      var r = target.getBoundingClientRect();
      var left = Math.max(6, r.left - pad);
      var top = Math.max(6, r.top - pad);
      var width = Math.min(vw - 12, r.width + pad * 2);
      var height = Math.min(vh - 12, r.height + pad * 2);
      spot.style.display = 'block';
      spot.style.left = Math.round(left) + 'px';
      spot.style.top = Math.round(top) + 'px';
      spot.style.width = Math.round(width) + 'px';
      spot.style.height = Math.round(height) + 'px';
      box = { top: top, bottom: top + height };
    } else {
      // Sin objetivo visible: tarjeta abajo, sin recorte.
      spot.style.display = 'none';
    }
    var cardH = card.offsetHeight;
    var topPos;
    if (box && box.bottom + margin + cardH <= vh - margin) topPos = box.bottom + margin;
    else if (box && box.top - margin - cardH >= margin) topPos = box.top - margin - cardH;
    else topPos = Math.max(margin, vh - cardH - margin);
    card.style.top = Math.round(topPos) + 'px';
    card.style.left = Math.max(margin, Math.round((vw - card.offsetWidth) / 2)) + 'px';
    overlay.classList.add('tour-positioned');
  }

  function schedulePosition() {
    if (positionRaf) return;
    positionRaf = requestAnimationFrame(function () {
      positionRaf = 0;
      positionStep();
    });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
    if (e.key === 'Tab') {
      // Trampa de foco mínima entre los dos botones de la tarjeta.
      if (document.activeElement === btnNext && !e.shiftKey) { e.preventDefault(); btnSkip.focus(); }
      else if (document.activeElement === btnSkip && e.shiftKey) { e.preventDefault(); btnNext.focus(); }
      return;
    }
    // Teclas que desplazarían la página de detrás (Espacio sobre un botón
    // no se toca: es el clic por teclado).
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp'
      || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
    }
  }

  function start(force) {
    if (running) return true;
    if (!force && isDone()) return false;
    if (loginVisible()) return false;
    try { if (typeof go === 'function') go('home'); } catch (e) { /* seguir en la vista actual */ }
    buildOverlay();
    document.body.appendChild(overlay);
    running = true;
    watchLogin(); // también en arranques forzados: el login puede reaparecer
    window.addEventListener('resize', schedulePosition);
    window.addEventListener('orientationchange', schedulePosition);
    window.addEventListener('scroll', schedulePosition, true);
    document.addEventListener('keydown', onKeyDown, true);
    showStep(0);
    return true;
  }

  function next() {
    if (stepIndex >= STEPS.length - 1) { finish(); return; }
    showStep(stepIndex + 1);
  }

  // Completar O saltar guardan el flag: el tour no vuelve jamás.
  function finish() {
    if (!running) { stopWatching(); return; }
    running = false;
    saveDone();
    window.removeEventListener('resize', schedulePosition);
    window.removeEventListener('orientationchange', schedulePosition);
    window.removeEventListener('scroll', schedulePosition, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (overlay) { overlay.remove(); overlay = null; }
    spot = null;
    card = null;
    stopWatching();
  }

  /* --- nextStep(): primer paso recomendado según el progreso real --- */

  function subjectOrder() {
    try {
      if (typeof SUBJECTS !== 'undefined' && Array.isArray(SUBJECTS) && SUBJECTS.length) {
        return SUBJECTS.map(function (s) { return s.id; });
      }
    } catch (e) { /* orden fijo abajo */ }
    return ORDER.slice();
  }

  function partCount(sid) {
    try {
      if (typeof lessonParts === 'function') return lessonParts(sid).length;
    } catch (e) { /* respaldo abajo */ }
    try {
      if (typeof LESSONS !== 'undefined' && LESSONS && LESSONS[sid]) {
        var n = 0;
        LESSONS[sid].split('<h3>').forEach(function (c) { if (c.trim()) n++; });
        return Math.max(1, Math.min(3, n));
      }
    } catch (e) { /* respaldo fijo */ }
    return 2;
  }

  function partTitle(sid, part) {
    try {
      var html = '';
      if (typeof lessonParts === 'function') html = lessonParts(sid)[part] || '';
      if (html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var h = tmp.querySelector('h3');
        if (h && h.textContent.trim()) return h.textContent.trim();
      }
    } catch (e) { /* sin título: usar el nombre de la materia */ }
    return '';
  }

  function quizTotal(sid) {
    try {
      if (typeof QUESTIONS !== 'undefined' && QUESTIONS && QUESTIONS[sid]) return QUESTIONS[sid].length;
    } catch (e) { /* respaldo abajo */ }
    try {
      if (typeof SUBJECTS !== 'undefined' && Array.isArray(SUBJECTS)) {
        var found = SUBJECTS.filter(function (s) { return s.id === sid; })[0];
        if (found && found.n) return found.n;
      }
    } catch (e) { /* respaldo fijo */ }
    return (SUBJ[sid] && SUBJ[sid].n) || 20;
  }

  function nextStep() {
    try {
      var done = lsGet('lessons-done', []);
      var doneSet = {};
      (Array.isArray(done) ? done : []).forEach(function (k) { doneSet[k] = true; });
      var order = subjectOrder();
      for (var i = 0; i < order.length; i++) {
        var sid = order[i];
        var total = partCount(sid);
        for (var p = 0; p < total; p++) {
          var key = sid + '-' + p;
          try { if (typeof lessonKey === 'function') key = lessonKey(sid, p); } catch (e) { /* clave sid-part */ }
          if (!doneSet[key]) {
            var title = partTitle(sid, p);
            var subj = SUBJ[sid] || { th: sid, en: sid };
            return {
              kind: 'lesson', sid: sid, part: p,
              label: { th: title || subj.th, en: subj.en + ' · Part ' + (p + 1) },
              sub: { th: 'บทที่ ' + (p + 1) + ' จาก ' + total + ' · ' + subj.th,
                     en: 'Part ' + (p + 1) + ' of ' + total + ' · ' + subj.en }
            };
          }
        }
      }
      // Todas las lecciones hechas: practicar la materia con peor
      // mejor-puntuación (proporción mejor/total, no puntos brutos:
      // las materias tienen distinto número de preguntas).
      var worst = null;
      order.forEach(function (id) {
        var rec = lsGet('quiz-' + id, null);
        var best = (rec && typeof rec.best === 'number') ? rec.best : 0;
        var n = quizTotal(id);
        var ratio = n > 0 ? best / n : 0;
        if (!worst || ratio < worst.ratio) worst = { sid: id, best: best, total: n, ratio: ratio };
      });
      if (!worst) worst = { sid: 'general', best: 0, total: 20, ratio: 0 };
      var wsubj = SUBJ[worst.sid] || { th: worst.sid, en: worst.sid };
      return {
        kind: 'practice', sid: worst.sid, best: worst.best, total: worst.total,
        label: { th: wsubj.th, en: wsubj.en },
        sub: { th: 'คะแนนดีที่สุด ' + worst.best + '/' + worst.total + ' — ฝึกอีกหน่อยนะ',
               en: 'Best score ' + worst.best + '/' + worst.total + ' — a little more practice' }
      };
    } catch (e) {
      // Sin progreso legible: la primera lección (general-0).
      return {
        kind: 'lesson', sid: 'general', part: 0,
        label: { th: 'ความสามารถทั่วไป', en: 'General ability · Part 1' },
        sub: { th: 'บทที่ 1 จาก 2 · ความสามารถทั่วไป', en: 'Part 1 of 2 · General ability' }
      };
    }
  }

  window.FernTour = {
    maybeStart: maybeStart,
    start: function () { return start(true); },
    isDone: isDone,
    nextStep: nextStep
  };

  /* Auto-arranque al cargar, si el flag no existe. */
  function init() {
    if (isDone()) return;
    maybeStart();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
