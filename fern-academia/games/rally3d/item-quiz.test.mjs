import test from "node:test";
import assert from "node:assert/strict";
import { COURSES } from "./courses.mjs";
import { createQuizDeck } from "./item-quiz.mjs";
import { POWER_INFO } from "./model.mjs";
import { CUPS, menu, quickQuiz } from "./presentation.mjs";

function seeded(seed) {
  let x = seed;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
}

test("the offline quiz rotates question families, localizes both languages and shuffles the correct position", () => {
  const draw = createQuizDeck(seeded(356));
  const visits = new Set();
  const positions = new Set();
  let last;
  for (let i = 0; i < 600; i++) {
    const question = draw();
    assert.notEqual(question.family, last);
    last = question.family;
    visits.add(question.family);
    positions.add(question.correct);
    assert.equal(question.answers.length, 3);
    for (const lang of ["en", "th"]) {
      assert(question.stem[lang] && question.explanation[lang] && question.topic[lang]);
      assert.equal(new Set(question.answers.map(choice => choice[lang])).size, 3);
    }
  }
  assert.equal(visits.size, 12);
  assert.equal(positions.size, 3);
});

test("the answer flow preserves review and base power choices in either language", () => {
  const question = createQuizDeck(seeded(16))();
  for (const lang of ["en", "th"]) {
    const power = { kind: "power", question };
    const initial = quickQuiz(lang, power, POWER_INFO.shield);
    assert.match(initial, /aria-modal="true"/);
    assert.equal([...initial.matchAll(/data-act="quiz-answer"/g)].length, 3);
    assert.match(initial, /data-act="quiz-skip"/);
    const correct = quickQuiz(lang, { ...power, answer: question.correct }, POWER_INFO.shield);
    assert.match(correct, /data-correct="true"/);
    assert.match(correct, /data-act="quiz-resume"/);
    const wrong = quickQuiz(lang, { ...power, answer: (question.correct + 1) % 3 }, POWER_INFO.shield);
    assert.match(wrong, /data-correct="false"/);
    assert.doesNotMatch(wrong, /rr3-upgraded/);
  }
});

test("all ten courses are in the native selector and partitioned into the three cups", () => {
  for (const lang of ["en", "th"]) {
    const html = menu(lang, COURSES.at(-1), "race", null, COURSES, 0, true);
    assert.equal([...html.matchAll(/<option/g)].length, 10);
    for (const course of COURSES) assert(html.includes(course.name[lang]));
    assert.match(html, /4\.65/);
  }
  assert.deepEqual(CUPS.map(cup => cup.ids.length), [3, 3, 4]);
  assert.deepEqual(CUPS.flatMap(cup => cup.ids), COURSES.map(course => course.id));
});
