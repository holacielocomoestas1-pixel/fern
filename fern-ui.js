'use strict';

Object.assign(I18N.th, {
  hello: 'เตรียมสอบ\nไปทีละขั้น',
  examWhen: 'บทเรียนสั้น ฝึกข้อสอบ และทบทวนตามจังหวะของคุณ',
  continuePath: 'เริ่มเรียน',
  resumePath: 'เรียนต่อ',
  pathTitle: 'เส้นทางการเรียน',
  learnTitle: 'บทเรียน',
  quizTitle: 'ฝึกข้อสอบ',
  extraTitle: 'แบบฝึกพิเศษ',
  extraSub: 'เติมคำ · ถูกหรือผิด · จับคู่ · เรียงลำดับ',
  cardsTitle: 'แฟลชการ์ด',
  mockTitle: 'สอบจำลองเต็มรูปแบบ',
  mockShort: 'สอบจำลอง',
  mockStart: 'เริ่มสอบจำลอง',
  moreTitle: 'แผนและคู่มือ',
  tabQuiz: 'ฝึกข้อสอบ',
  tabMore: 'แผน',
  planSubtitle: 'วางแผนตามวันสอบของคุณ',
  practiceBySubject: 'ฝึกตามวิชา',
  statStreak: 'วันต่อเนื่อง',
  statHearts: 'หัวใจ',
  loadingLabel: 'กำลังโหลด…',
  lessonLabel: 'บทที่',
  completedLabel: 'เรียนจบแล้ว',
  availableLabel: 'อ่านบทเรียน',
  lockedLabel: 'ยังไม่เปิด',
  openBadge: 'ปลดล็อกแล้ว',
  closedBadge: 'ยังไม่ปลดล็อก',
  dateLabel: 'วันสอบของฉัน',
  datePlaceholder: 'เลือกวันที่',
  optionalLabel: 'ไม่บังคับ',
  dayOfExam: 'วันนี้คือวันสอบ ขอให้โชคดี!',
  closeLabel: 'ปิด',
  allOptions: 'ดูคำอธิบายตัวเลือก',
  courseComplete: 'ทบทวนบทเรียน'
});
Object.assign(I18N.en, {
  hello: 'One lesson\nat a time',
  examWhen: 'Study, practise and review at your own pace.',
  continuePath: 'Start studying',
  resumePath: 'Continue studying',
  pathTitle: 'Study path',
  learnTitle: 'Lessons',
  quizTitle: 'Practice',
  extraTitle: 'Extra exercises',
  extraSub: 'Fill in the blank, true or false, matching and ordering',
  cardsTitle: 'Flashcards',
  mockTitle: 'Full mock exam',
  mockShort: 'Mock exam',
  mockStart: 'Start mock exam',
  moreTitle: 'Plan and guide',
  tabQuiz: 'Practice',
  tabMore: 'Plan',
  planSubtitle: 'Build a plan around your exam date.',
  practiceBySubject: 'Practise by subject',
  statStreak: 'streak days',
  statHearts: 'hearts',
  loadingLabel: 'Loading…',
  lessonLabel: 'Lesson',
  completedLabel: 'Completed',
  availableLabel: 'Read lesson',
  lockedLabel: 'Locked',
  openBadge: 'Unlocked',
  closedBadge: 'Locked',
  dateLabel: 'My exam date',
  datePlaceholder: 'Set date',
  optionalLabel: 'optional',
  dayOfExam: 'Today is your exam. Good luck!',
  closeLabel: 'Close',
  allOptions: 'See the options explained',
  courseComplete: 'Review lessons'
});

function fernAsset(relative) {
  return window.FERN_ASSETS?.[relative] || relative;
}

function mascotArt(size, mood = 'happy') {
  const treatments = {
    happy: ['home', 'enter'],
    welcome: ['welcome', 'greet'],
    guide: ['guide', 'enter'],
    practice: ['practice', 'enter'],
    correct: ['correct', 'pop'],
    cheer: ['complete', 'cheer'],
    sad: ['retry', 'nod'],
    goal: ['goal', 'enter'],
    streak: ['streak', 'enter'],
    avatar: ['avatar', 'none'],
    return: ['return', 'greet'],
    empty: ['empty', 'enter'],
    offline: ['offline', 'enter']
  };
  const [id, motion] = treatments[mood] || treatments.happy;
  const webp = `assets/webp/${id}.webp`;
  const hires = window.FERN_ASSETS || size < 90 ? '' : ` srcset="${webp} 1x, assets/webp/${id}@2x.webp 2x"`;
  return `<img class="mascot-art mascot-motion" data-motion="${motion}" src="${fernAsset(webp)}"${hires}
      width="${size}" height="${size}" style="--mascot-size:${size}px" alt="" decoding="async">`;
}

function subjectTitle(subject) {
  return LANG === 'en' ? SUBJ_EN[subject.id] || subject.name : subject.name;
}

function applyLang() {
  document.documentElement.lang = LANG;
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const code of ['th', 'en']) {
    const control = document.getElementById('lang-' + code);
    control.classList.toggle('on', LANG === code);
    control.setAttribute('aria-pressed', String(LANG === code));
  }
  renderAll();
}

function go(name) {
  for (const view of document.querySelectorAll('.view')) {
    view.classList.toggle('on', view.id === 'v-' + name);
  }
  for (const button of document.querySelectorAll('nav.tabs button')) {
    const active = button.dataset.go === name;
    button.classList.toggle('on', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
  document.querySelector('#v-' + name + ' h1')?.focus({ preventScroll: true });
}

function renderHUD() {
  const goal = Math.min(30, Math.max(0, G.goal.xp));
  document.getElementById('hud-xp').textContent = G.xp;
  document.getElementById('hud-streak').textContent = G.streak.n;
  document.getElementById('hud-hearts').textContent = G.hearts.n;
  document.getElementById('hud-level').textContent = level();
  document.getElementById('goal-bar').style.width = `${Math.round(goal / 30 * 100)}%`;
  document.getElementById('goal-progress').setAttribute('aria-valuenow', String(goal));
  document.getElementById('goal-txt').textContent = `${G.goal.xp} / 30 XP`;
  document.getElementById('mistake-n').textContent = G.mistakes.length;
  document.getElementById('mistake-n2').textContent = G.mistakes.length;
}

function renderPath() {
  let previous = null;
  let count = 0;
  let next = null;
  const units = SUBJECTS.map(subject => {
    const lessons = lessonParts(subject.id).map((_, index) => {
      const key = lessonKey(subject.id, index);
      const complete = G.lessons.includes(key);
      const unlocked = complete || previous === null || G.lessons.includes(previous);
      if (!complete && unlocked && !next) next = { subject, index };
      previous = key;
      count += 1;
      return { index, complete, unlocked };
    });
    return { subject, lessons };
  });
  BADGES.find(badge => badge[2].startsWith('lessons>='))[2] = `lessons>=${count}`;

  const path = document.getElementById('path');
  const open = new Set([...path.querySelectorAll('details[open]')].map(unit => unit.dataset.unit));
  const lessonList = document.getElementById('learn-list');
  const learnOpen = new Set([...lessonList.querySelectorAll('details[open]')].map(unit => unit.dataset.unit));
  if (next && learnOpen.size === 0) learnOpen.add(next.subject.id);
  lessonList.className = 'native-list';
  const unitSummary = (unit, expanded, rows) => {
    const { subject, lessons } = unit;
    const complete = lessons.filter(lesson => lesson.complete).length;
    return `<details data-unit="${subject.id}" ${expanded ? 'open' : ''}>
      <summary><span class="summary-title">${esc(subjectTitle(subject))}<small>${QUESTIONS[subject.id].length} ${t('qs')}</small></span>
       <span class="completion-count">${complete}/${lessons.length}</span></summary>
      <ul class="lesson-rows">${rows}</ul>
    </details>`;
  };
  const lessonRow = (subject, lesson, enforceOrder) => {
    const locked = enforceOrder && !lesson.unlocked;
    const status = lesson.complete ? 'done' : locked ? 'locked' : 'ready';
    const label = t(lesson.complete ? 'completedLabel' : locked ? 'lockedLabel' : 'availableLabel');
    return `<li><button type="button" class="lesson-row" data-lesson="${subject.id}:${lesson.index}" ${locked ? 'aria-disabled="true"' : ''}>
      <b>${t('lessonLabel')} ${lesson.index + 1}</b><span data-status="${status}">${label}</span></button></li>`;
  };
  path.innerHTML = units.map(unit => {
    const rows = unit.lessons.map(lesson => lessonRow(unit.subject, lesson, true)).join('');
    const practice = `<li><button type="button" class="lesson-row" data-practice="${unit.subject.id}">
      <b>${t('quizTitle')}</b><span class="mut">${QUESTIONS[unit.subject.id].length} ${t('qs')}</span></button></li>`;
    return unitSummary(unit, open.has(unit.subject.id), rows + practice);
  }).join('');
  lessonList.innerHTML = units.map(unit => unitSummary(
    unit, learnOpen.has(unit.subject.id), unit.lessons.map(lesson => lessonRow(unit.subject, lesson, false)).join('')
  )).join('');
  document.getElementById('quiz-list').innerHTML = units.map(({ subject }) => {
    const best = LS.get('quiz-' + subject.id, null);
    const total = QUESTIONS[subject.id].length;
    const score = best ? ` · ${t('score')} ${best.best}/${total}` : '';
    return `<button type="button" class="subject-row" data-practice="${subject.id}">
      <b>${esc(subjectTitle(subject))}</b><span class="mut">${total} ${t('qs')}${score}</span></button>`;
  }).join('');

  for (const button of document.querySelectorAll('[data-lesson]')) {
    button.onclick = () => {
      if (button.getAttribute('aria-disabled') === 'true') {
        toast(t('locked'));
        return;
      }
      const [id, index] = button.dataset.lesson.split(':');
      openLesson(id, Number(index));
    };
  }
  for (const button of document.querySelectorAll('[data-practice]')) {
    button.onclick = () => startQuiz(button.dataset.practice);
  }
  const resume = document.getElementById('resume-lesson');
  resume.textContent = t(next ? (G.lessons.length ? 'resumePath' : 'continuePath') : 'courseComplete');
  resume.onclick = next ? () => openLesson(next.subject.id, next.index) : () => go('learn');
}

function openLesson(id, index) {
  const subject = subjById(id);
  const parts = lessonParts(id);
  const key = lessonKey(id, index);
  const alreadyDone = G.lessons.includes(key);
  const root = document.getElementById('modal-root');
  const compact = LANG === 'en' ? SIMPLE_SUM[id].en : SIMPLE_SUM[id].th;
  root.innerHTML = `<dialog class="modal reader-modal" aria-labelledby="lesson-title">
    <article class="reader">
      <header class="reader-head">
        <button type="button" class="text-action" id="m-x">${t('closeLabel')}</button>
        <span>${t('lessonLabel')} ${index + 1} / ${parts.length}</span>
      </header>
      <div class="reader-title"><h1 id="lesson-title" tabindex="-1">${esc(subjectTitle(subject))}</h1>${mascotArt(93, 'practice')}</div>
      <div class="lesson-body">${parts[index] || parts[0]}
        <details class="plain-details">
          <summary>${LANG === 'en' ? 'In brief' : 'สรุปแบบสั้น'}</summary>
          <p>${compact}</p>
        </details>
      </div>
      <footer class="reader-actions">
        <button type="button" class="btn" id="m-done">${alreadyDone ? '✓ ' : ''}${t('lessonDone')}${alreadyDone ? '' : ' +15 XP'}</button>
        <button type="button" class="btn secondary" id="m-quiz">${t('startQuiz')}</button>
      </footer>
    </article>
  </dialog>`;
  const dialog = root.querySelector('dialog');
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
  dialog.querySelector('h1').focus({ preventScroll: true });
  document.getElementById('m-x').onclick = () => dialog.close();
  document.getElementById('m-done').onclick = () => {
    if (!G.lessons.includes(key)) {
      G.lessons.push(key);
      addXP(15);
    }
    dialog.close();
    renderAll();
    checkBadges(true);
  };
  document.getElementById('m-quiz').onclick = () => {
    dialog.close();
    startQuiz(id);
  };
}

function renderQ() {
  if (!quiz) return;
  if (quiz.i >= quiz.list.length) {
    finishQuiz();
    return;
  }
  const box = document.getElementById('quiz-box');
  const attempt = quiz;
  const { sid, idx, q } = attempt.list[attempt.i];
  const pct = Math.round(attempt.i / attempt.list.length * 100);
  const optionMarkup = q.o.map((option, index) =>
    `<button type="button" class="opt" data-opt="${index}" aria-pressed="false">
      <span aria-hidden="true" class="key">${'ABCD'[index]}</span><span>${esc(option)}</span></button>`
  ).join('');
  box.innerHTML = `<div class="prow">
      <button type="button" class="xbtn" id="exit-question" aria-label="${t('closeLabel')}">×</button>
      <div class="bar" role="progressbar" aria-label="${t('quizTitle')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      <span aria-label="${G.hearts.n} ${t('statHearts')}">♥ ${G.hearts.n}</span>
    </div>
    <div class="question-head">
      <div><p class="mut">${esc(subjectTitle(subjById(sid)))} · ${attempt.i + 1} / ${attempt.list.length}</p>
      <h1 class="question-title" tabindex="-1">${esc(q.q)}</h1></div>${mascotArt(74, 'guide')}
    </div>
    <div id="opts" role="group" aria-label="${t('question')}">${optionMarkup}</div>
    <div id="fb" aria-live="polite"><button class="btn" type="button" id="chk" disabled>${t('check')}</button></div>`;
  box.querySelector('#exit-question').onclick = exitQuiz;
  const options = [...box.querySelectorAll('[data-opt]')];
  const check = box.querySelector('#chk');
  let picked = null;
  for (const option of options) {
    option.onclick = () => {
      picked = Number(option.dataset.opt);
      for (const other of options) {
        const selected = other === option;
        other.classList.toggle('sel', selected);
        other.setAttribute('aria-pressed', String(selected));
      }
      check.disabled = false;
    };
  }
  check.addEventListener('click', () => {
    if (picked === null) return;
    check.disabled = true;
    const right = picked === q.a;
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      option.disabled = true;
      option.classList.remove('sel');
      if (index === q.a) option.classList.add('correct');
      else if (index === picked) option.classList.add('wrong');
    }
    if (right) {
      attempt.score += 1;
      addXP(10);
      if (attempt.mode === 'mistakes') removeMistake(sid, idx);
    } else {
      G.hearts.n = Math.max(0, G.hearts.n - 1);
      saveG();
      renderHUD();
      addMistake(sid, idx);
    }
    const details = q.o.map((option, index) => {
      const description = index === q.a ? q.e : LANG === 'en'
        ? `Review the explanation for answer ${'ABCD'[q.a]}.`
        : `ดูคำอธิบายของตัวเลือก ${'ABCD'[q.a]}`;
      return `<li><b>${'ABCD'[index]}. ${esc(option)}</b> · ${esc(description)}</li>`;
    }).join('');
    const fb = box.querySelector('#fb');
    fb.innerHTML = `<div class="feedback feedback-line ${right ? 'ok' : 'no'}" tabindex="-1">
      ${mascotArt(68, right ? 'correct' : 'sad')}
      <div><strong>${t(right ? 'correct' : 'wrong')}${right ? '' : ` ${'ABCD'[q.a]}. ${esc(q.o[q.a])}`}</strong>
      <p>${esc(q.e)}</p></div>
      </div><details class="plain-details option-details"><summary>${t('allOptions')}</summary><ul>${details}</ul></details>
      <button type="button" class="btn" id="nxt">${t(attempt.i + 1 >= attempt.list.length ? 'finish' : 'next')}</button>`;
    fb.querySelector('.feedback').focus();
    fb.querySelector('#nxt').onclick = () => {
      attempt.i += 1;
      renderQ();
    };
  }, { once: true });
  window.scrollTo(0, 0);
  box.querySelector('h1').focus({ preventScroll: true });
}

function renderFC() {
  const box = document.getElementById('fc-box');
  const known = LS.get('fc-known', []);
  const total = FLASH.length;
  if (fcIdx >= total) fcIdx = 0;
  const word = (LANG === 'en' ? FLASH_EN : FLASH)[fcIdx];
  box.innerHTML = `<button type="button" class="fc" id="fc-card" aria-pressed="${fcFlip}">
      <span class="meta">${t('card')} ${fcIdx + 1}/${total} · ✓ ${known.length}</span>
      <span class="${fcFlip ? 'a' : 'q'}">${esc(word[fcFlip ? 1 : 0])}</span>
      <span class="hint">${t('tapFlip')}</span>
    </button>
    <div class="chiprow">
      <button type="button" class="chip" id="fc-prev">${t('prev')}</button>
      <button type="button" class="chip" id="fc-again">${t('notYet')}</button>
      <button type="button" class="chip" id="fc-know">${t('known')}</button>
      <button type="button" class="chip" id="fc-next">${t('nextC')}</button>
    </div>`;
  const move = (delta, focus) => {
    fcFlip = false;
    fcIdx = (fcIdx + total + delta) % total;
    renderFC();
    document.getElementById(focus)?.focus();
  };
  box.querySelector('#fc-card').onclick = () => {
    fcFlip = !fcFlip;
    renderFC();
    document.getElementById('fc-card').focus();
  };
  box.querySelector('#fc-prev').onclick = () => move(-1, 'fc-prev');
  box.querySelector('#fc-next').onclick = () => move(1, 'fc-next');
  box.querySelector('#fc-know').onclick = () => {
    if (!known.includes(fcIdx)) {
      LS.set('fc-known', [...known, fcIdx]);
      addXP(5);
    }
    move(1, 'fc-know');
    renderBadges();
  };
  box.querySelector('#fc-again').onclick = () => {
    LS.set('fc-known', known.filter(index => index !== fcIdx));
    move(1, 'fc-again');
    renderBadges();
  };
}

function renderExamDate() {
  const box = document.getElementById('exam-date-box');
  const saved = LS.get('exam-date', '');
  const days = daysLeft();
  const note = days > 0 ? (LANG === 'en' ? `${days} days until your exam` : `เหลืออีก ${days} วันถึงวันสอบ`)
    : days === 0 ? t('dayOfExam') : '';
  const date = new Date(typeof saved === 'string' && saved ? saved + 'T12:00:00' : NaN);
  const shownDate = Number.isNaN(date.getTime()) ? t('datePlaceholder')
    : new Intl.DateTimeFormat(LANG, { dateStyle: 'medium' }).format(date);
  box.innerHTML = `<div class="date-row"><label for="exam-date-in">${t('dateLabel')} <span class="mut">(${t('optionalLabel')})</span></label>
    <span class="date-value" aria-hidden="true">${shownDate}</span>
    <input type="date" class="datepick" id="exam-date-in"></div>${note ? `<p class="date-note">${note}</p>` : ''}`;
  const input = document.getElementById('exam-date-in');
  input.value = typeof saved === 'string' ? saved : '';
  input.onchange = () => {
    LS.set('exam-date', input.value);
    renderExamDate();
    renderMore();
    document.getElementById('exam-date-in').focus({ preventScroll: true });
  };
}

function organizePlan(content) {
  const [plan, ...sections] = [...content.children];
  if (!plan) return;
  for (const section of sections) {
    const heading = section.querySelector('.big');
    if (!heading) continue;
    const group = document.createElement('details');
    group.className = 'plain-details';
    const title = document.createElement('summary');
    title.textContent = heading.textContent.replace(/^(📖|🎤)\s*/, '');
    heading.remove();
    section.before(group);
    group.append(title, section);
  }
}

function renderBadges() {
  const state = badgeState();
  const badges = BADGES.map(badge => {
    const [metric, amount] = badge[2].split('>=');
    const on = state[metric] >= Number(amount);
    const labels = badge[1].split(' / ');
    const label = labels[LANG === 'en' ? 0 : 1] || labels[0];
    const progress = `${Math.min(state[metric], Number(amount))}/${amount}`;
    return `<div class="badge ${on ? '' : 'off'}"><b>${esc(label)}</b><span class="mut">${on ? t('openBadge') : progress}</span></div>`;
  });
  document.getElementById('badges').innerHTML = badges.join('');
}

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const burst = document.createElement('div');
  burst.className = 'confetti';
  burst.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 9; index += 1) {
    const speck = document.createElement('i');
    speck.style.left = `${28 + index * 5.5}%`;
    speck.style.background = ['#c38c50', '#4c775c', '#bf7758'][index % 3];
    speck.style.animationDelay = `${(index % 3) * 0.09}s`;
    burst.append(speck);
  }
  document.getElementById('fx').append(burst);
  setTimeout(() => burst.remove(), 2100);
}

function bootFern() {
  for (const [id, size, mood] of [
    ['logo-mascot', 36, 'avatar'], ['hero-mascot', 300, 'welcome'],
    ['learn-mascot', 100, 'practice'], ['practice-mascot', 100, 'guide'],
    ['cards-mascot', 100, 'practice'], ['mock-mascot', 100, 'goal'],
    ['plan-mascot', 100, 'streak']
  ]) {
    document.getElementById(id).innerHTML = mascotArt(size, mood);
  }
  applyLang();
  const splash = document.getElementById('splash');
  const load = splash.querySelector('img');
  const ready = load.decode ? load.decode().catch(() => {}) : Promise.resolve();
  Promise.race([ready, new Promise(resolve => setTimeout(resolve, 850))]).then(() => {
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 245);
    }, 420);
  });
}

bootFern();

function exitFernMock() {
  const warning = LANG === 'en' ? 'Leave this mock exam? Your current answers will be discarded.' : 'ออกจากการสอบจำลองหรือไม่ คำตอบครั้งนี้จะไม่ถูกบันทึก';
  if (!mock || !window.confirm(warning)) return;
  clearInterval(mockTimer);
  mock = null;
  document.body.classList.remove('quiz-on');
  document.getElementById('mock-box').replaceChildren();
  document.getElementById('mock-intro').hidden = false;
  go('mock');
}
