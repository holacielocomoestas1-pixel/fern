export const WIDTH = 7;
const CELL_COUNT = WIDTH * WIDTH;
const LEAF = 0;
let instanceCount = 0;

export const STAGES = [
  { id: 'sprout', name: { th: 'ทางใบอ่อน', en: 'Seedling Trail' }, kinds: 5, moves: 17, goal: 'leaves', target: 12 },
  { id: 'pond', name: { th: 'บึงแสงจันทร์', en: 'Moonlit Pond' }, kinds: 5, moves: 23, goal: 'moss', target: 8,
    moss: [8, 12, 16, 18, 30, 32, 36, 40] },
  { id: 'canopy', name: { th: 'เรือนยอดสีทอง', en: 'Golden Canopy' }, kinds: 6, moves: 16, goal: 'score', target: 950 },
];

export const TOKENS = [
  { th: 'ใบอ่อน', en: 'Leaf' },
  { th: 'หยดน้ำ', en: 'Dew' },
  { th: 'ดวงอาทิตย์', en: 'Sun' },
  { th: 'ดอกไม้', en: 'Petal' },
  { th: 'เมล็ด', en: 'Seed' },
  { th: 'หินจันทร์', en: 'Moonstone' },
];

function index(row, col) {
  return row * WIDTH + col;
}

function adjacent(first, second) {
  if (first < 0 || first >= CELL_COUNT || second < 0 || second >= CELL_COUNT) return false;
  const distance = Math.abs(Math.floor(first / WIDTH) - Math.floor(second / WIDTH))
    + Math.abs(first % WIDTH - second % WIDTH);
  return distance === 1;
}

function swapped(board, first, second) {
  const next = board.slice();
  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

export function findRuns(board) {
  const runs = [];
  for (let line = 0; line < WIDTH; line += 1) {
    for (const vertical of [false, true]) {
      const cells = Array.from({ length: WIDTH }, (_, offset) => (
        vertical ? index(offset, line) : index(line, offset)
      ));
      let start = 0;
      for (let end = 1; end <= WIDTH; end += 1) {
        if (board[cells[end]] === board[cells[start]] && end < WIDTH) continue;
        if (end - start >= 3) runs.push(cells.slice(start, end));
        start = end;
      }
    }
  }
  return runs;
}

export function findMoves(board) {
  const moves = [];
  for (let first = 0; first < CELL_COUNT; first += 1) {
    for (const second of [first + 1, first + WIDTH]) {
      if (!adjacent(first, second) || board[first] === board[second]) continue;
      const next = swapped(board, first, second);
      const runs = findRuns(next);
      if (runs.some((run) => run.includes(first) || run.includes(second))) moves.push({ first, second, runs });
    }
  }
  return moves;
}

export function makeBoard(kinds, random = Math.random) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const board = [];
    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      const forbidden = new Set();
      const col = cell % WIDTH;
      if (col >= 2 && board[cell - 1] === board[cell - 2]) forbidden.add(board[cell - 1]);
      if (cell >= WIDTH * 2 && board[cell - WIDTH] === board[cell - WIDTH * 2]) forbidden.add(board[cell - WIDTH]);
      const choices = Array.from({ length: kinds }, (_, kind) => kind).filter((kind) => !forbidden.has(kind));
      board.push(choices[Math.floor(random() * choices.length)]);
    }
    if (findMoves(board).length) return board;
  }

  // The fallback keeps a deterministic opening swap between rows one and two.
  const board = Array.from({ length: CELL_COUNT }, (_, cell) => (Math.floor(cell / WIDTH) * 2 + cell % WIDTH) % kinds);
  board[2] = LEAF;
  board[WIDTH + 1] = LEAF;
  return board;
}

function affectedCells(runs) {
  const matched = new Set(runs.flat());
  const blooms = new Set();
  for (const run of runs) {
    if (run.length < 4) continue;
    const pivot = run[Math.floor((run.length - 1) / 2)];
    const orthogonal = [pivot - WIDTH, pivot - 1, pivot + 1, pivot + WIDTH];
    for (const cell of orthogonal) {
      if (adjacent(pivot, cell) && !matched.has(cell)) blooms.add(cell);
    }
  }
  return { cells: [...matched, ...blooms], bloom: blooms.size > 0 };
}

function fall(board, cells, kinds, random) {
  const cleared = new Set(cells);
  const next = board.slice();
  for (let col = 0; col < WIDTH; col += 1) {
    let destination = WIDTH - 1;
    for (let row = WIDTH - 1; row >= 0; row -= 1) {
      if (cleared.has(index(row, col))) continue;
      next[index(destination, col)] = board[index(row, col)];
      destination -= 1;
    }
    while (destination >= 0) {
      next[index(destination, col)] = Math.floor(random() * kinds);
      destination -= 1;
    }
  }
  return next;
}

export function playTurn(board, first, second, kinds, random = Math.random) {
  if (!adjacent(first, second)) return null;
  const next = swapped(board, first, second);
  let current = next;
  let runs = findRuns(current);
  if (board[first] === board[second] || !runs.some((run) => run.includes(first) || run.includes(second))) {
    return { swapped: next, waves: [], board, reshuffled: false };
  }

  const waves = [];
  while (runs.length && waves.length < 20) {
    const { cells, bloom } = affectedCells(runs);
    const after = fall(current, cells, kinds, random);
    const chain = waves.length + 1;
    waves.push({
      cells,
      bloom,
      after,
      leaves: cells.filter((cell) => current[cell] === LEAF).length,
      points: cells.length * (10 + Math.min(chain - 1, 4) * 5),
    });
    current = after;
    runs = findRuns(current);
  }
  const reshuffled = Boolean(runs.length) || !findMoves(current).length;
  return { swapped: next, waves, board: reshuffled ? makeBoard(kinds, random) : current, reshuffled };
}

const COPY = {
  en: {
    title: 'Canopy Grove',
    instructions: 'Swap neighbors to line up three. Four or more clears nearby tiles.',
    instructionsStudy: 'Swap neighbors to match three. Earn extra moves with a study question.',
    stage: 'Choose a grove',
    board: 'Canopy Grove board',
    how: 'Tap two neighbors or swipe a tile. With a keyboard, move with the arrow keys and select with Enter.',
    howMoss: 'Match over a mossy square to uncover it.',
    goal: 'Goal',
    leaves: 'Collect leaves',
    moss: 'Clear moss',
    score: 'Reach this score',
    moves: 'Moves',
    points: 'Score',
    hint: 'Hint',
    reset: 'Restart',
    boost: 'Study boost · +2 moves',
    boostUnlock: (moves) => `Boost in ${moves} ${moves === 1 ? 'move' : 'moves'}`,
    selected: (row, col, tile, moss) => `Row ${row}, column ${col}: ${tile}${moss ? ', on moss' : ''}`,
    badSwap: 'Try a swap that lines up three.',
    hintShown: (r1, c1, r2, c2) => `Swap row ${r1}, column ${c1} with row ${r2}, column ${c2}.`,
    shuffle: 'Fresh tiles! The grove made space for a new move.',
    combo: (total) => `${total} chains!`,
    bloom: 'A row of four made a burst!',
    earned: 'Two extra moves added.',
    studyUnavailable: 'The question could not open. You can keep playing.',
    win: 'Grove complete!',
    lose: 'Out of moves',
    result: (score) => `${score} points`,
    retry: 'Play again',
    next: 'Next grove',
  },
  th: {
    title: 'สวนเฟิร์น',
    instructions: 'สลับช่องข้างกันให้เรียงสามอัน สี่อันขึ้นไปจะเคลียร์ช่องใกล้เคียงด้วย',
    instructionsStudy: 'สลับช่องข้างกันให้เรียงสามอัน ตอบคำถามเพื่อรับตาเดินเพิ่ม',
    stage: 'เลือกด่าน',
    board: 'กระดานสวนเฟิร์น',
    how: 'แตะสองช่องที่ติดกันหรือปัดเพื่อสลับ ใช้แป้นลูกศรเพื่อเลื่อน และกด Enter เพื่อเลือก',
    howMoss: 'จับคู่ให้ครอบคลุมช่องที่มีตะไคร่น้ำเพื่อเคลียร์ช่องนั้น',
    goal: 'เป้าหมาย',
    leaves: 'เก็บใบอ่อน',
    moss: 'เคลียร์ตะไคร่น้ำ',
    score: 'ทำคะแนนให้ถึง',
    moves: 'ตาที่เหลือ',
    points: 'คะแนน',
    hint: 'คำใบ้',
    reset: 'เริ่มใหม่',
    boost: 'ตอบคำถาม · +2 ตา',
    boostUnlock: (moves) => `ตอบคำถามได้ในอีก ${moves} ตา`,
    selected: (row, col, tile, moss) => `แถว ${row} คอลัมน์ ${col}: ${tile}${moss ? ' บนตะไคร่น้ำ' : ''}`,
    badSwap: 'ลองสลับให้เรียงกันสามอัน',
    hintShown: (r1, c1, r2, c2) => `สลับแถว ${r1} ช่อง ${c1} กับแถว ${r2} ช่อง ${c2}`,
    shuffle: 'จัดกระดานใหม่แล้ว ลองเดินต่อได้เลย',
    combo: (total) => `ต่อเนื่อง ${total} ชุด!`,
    bloom: 'เรียงสี่อัน เคลียร์ช่องใกล้เคียงได้ด้วย!',
    earned: 'ได้รับตาเดินเพิ่ม 2 ตา',
    studyUnavailable: 'เปิดคำถามไม่ได้ เล่นต่อได้ตามปกติ',
    win: 'ผ่านด่านแล้ว!',
    lose: 'หมดตาเดินแล้ว',
    result: (score) => `${score} คะแนน`,
    retry: 'เล่นอีกครั้ง',
    next: 'ด่านถัดไป',
  },
};

export function mount(container, ctx) {
  const doc = container.ownerDocument;
  const view = doc.defaultView;
  const controller = new view.AbortController();
  const { signal } = controller;
  const lang = ctx.lang === 'th' ? 'th' : 'en';
  const t = COPY[lang];
  const study = ctx.mode === 'study' && typeof ctx.askQuestion === 'function';
  const stylesheet = new URL('./match.css', import.meta.url).href;
  const number = new Intl.NumberFormat(lang);
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const helpId = `canopy-how-${++instanceCount}`;

  if (!doc.head.querySelector('link[data-fern-canopy]')) {
    const style = doc.createElement('link');
    style.rel = 'stylesheet';
    style.href = stylesheet;
    style.dataset.fernCanopy = '';
    doc.head.append(style);
  }

  const root = doc.createElement('section');
  root.className = 'canopy';
  root.lang = lang;
  root.innerHTML = `
    <header class="canopy-intro">
      <div>
        <h2>${t.title}</h2>
        <p>${study ? t.instructionsStudy : t.instructions}</p>
      </div>
      <span class="canopy-sigil" aria-hidden="true" data-kind="0"><span class="canopy-glyph"></span></span>
    </header>
    <div class="canopy-stages" role="group" aria-label="${t.stage}">
      ${STAGES.map((stage, position) => `<button type="button" data-stage="${position}" aria-pressed="false">${stage.name[lang]}</button>`).join('')}
    </div>
    <div class="canopy-layout">
      <div class="canopy-stats">
        <div class="canopy-target">
          <span class="canopy-stat-label" data-goal-label></span>
          <strong data-goal-value></strong>
          <progress data-goal></progress>
        </div>
        <div class="canopy-counter"><span class="canopy-stat-label">${t.moves}</span><strong data-moves></strong></div>
        <div class="canopy-counter"><span class="canopy-stat-label">${t.points}</span><strong data-points></strong></div>
      </div>
      <div class="canopy-playfield">
        <div class="canopy-grid" role="grid" aria-label="${t.board}" aria-describedby="${helpId}" aria-rowcount="${WIDTH}" aria-colcount="${WIDTH}"></div>
        <div class="canopy-result" hidden></div>
      </div>
      <div class="canopy-actions">
        <p class="canopy-message" role="status" aria-atomic="true"></p>
        <div class="canopy-buttons">
          <button type="button" data-hint>${t.hint}</button>
          <button type="button" data-restart>${t.reset}</button>
          ${study ? `<button type="button" class="canopy-boost" data-boost></button>` : ''}
        </div>
        <p class="canopy-how" id="${helpId}">${t.how}</p>
      </div>
    </div>
  `;
  container.replaceChildren(root);

  const query = (selector) => root.querySelector(selector);
  const grid = query('.canopy-grid');
  const result = query('.canopy-result');
  const goalProgress = query('[data-goal]');
  const hintButton = query('[data-hint]');
  const restartButton = query('[data-restart]');
  const boostButton = query('[data-boost]');
  const stageButtons = [...root.querySelectorAll('[data-stage]')];
  const tiles = [];
  for (let row = 0; row < WIDTH; row += 1) {
    const track = doc.createElement('div');
    track.className = 'canopy-row';
    track.setAttribute('role', 'row');
    for (let col = 0; col < WIDTH; col += 1) {
      const tile = doc.createElement('button');
      tile.type = 'button';
      tile.className = 'canopy-tile';
      tile.dataset.cell = index(row, col);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-rowindex', row + 1);
      tile.setAttribute('aria-colindex', col + 1);
      tile.innerHTML = '<span class="canopy-glyph" aria-hidden="true"></span>';
      tiles.push(tile);
      track.append(tile);
    }
    grid.append(track);
  }

  let game;
  let pointer;
  let suppressClickUntil = 0;

  function now() {
    return view.performance.now();
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      if (signal.aborted || motion.matches) {
        resolve();
        return;
      }
      function release() {
        view.clearTimeout(timer);
        signal.removeEventListener('abort', release);
        resolve();
      }
      const timer = view.setTimeout(release, ms);
      signal.addEventListener('abort', release, { once: true });
    });
  }

  function sound(kind) {
    ctx.sound?.(kind);
  }

  function announce(message = '') {
    query('.canopy-message').textContent = message;
  }

  function progress() {
    switch (game.stage.goal) {
      case 'leaves': return game.leaves;
      case 'moss': return game.stage.target - game.moss.size;
      default: return game.score;
    }
  }

  function updateStatus() {
    const label = t[game.stage.goal];
    const value = Math.min(game.stage.target, progress());
    query('[data-goal-label]').textContent = label;
    query('[data-goal-value]').textContent = `${number.format(value)} / ${number.format(game.stage.target)}`;
    goalProgress.max = game.stage.target;
    goalProgress.value = value;
    goalProgress.setAttribute('aria-label', label);
    query('[data-moves]').textContent = number.format(game.moves);
    query('[data-points]').textContent = number.format(game.score);
    hintButton.disabled = game.busy || game.done;
    restartButton.disabled = game.busy;
    for (const button of stageButtons) button.disabled = game.busy;
    if (boostButton) {
      boostButton.disabled = game.busy || game.done || game.turns < game.nextBoost || game.boosts >= 2;
      boostButton.hidden = game.boosts >= 2 || game.done;
      boostButton.textContent = game.turns < game.nextBoost ? t.boostUnlock(game.nextBoost - game.turns) : t.boost;
    }
  }

  function paint() {
    for (let cell = 0; cell < tiles.length; cell += 1) {
      const tile = tiles[cell];
      const token = game.board[cell];
      const moss = game.moss.has(cell);
      tile.dataset.kind = token;
      tile.tabIndex = !game.done && cell === game.focus ? 0 : -1;
      tile.classList.toggle('canopy-moss', moss);
      tile.classList.toggle('canopy-hint', game.hint.includes(cell));
      tile.classList.toggle('canopy-clear', game.clearing.includes(cell));
      tile.classList.toggle('canopy-drop', game.dropping.includes(cell));
      tile.setAttribute('aria-selected', String(cell === game.selected));
      tile.setAttribute('aria-label', t.selected(
        Math.floor(cell / WIDTH) + 1,
        cell % WIDTH + 1,
        TOKENS[token][lang],
        moss,
      ));
    }
    grid.inert = game.done;
  }

  function begin(stageIndex, focus = false) {
    const stage = STAGES[stageIndex];
    game = {
      stage, stageIndex, board: makeBoard(stage.kinds), moss: new Set(stage.moss || []),
      leaves: 0, moves: stage.moves, score: 0, turns: 0, hint: [],
      clearing: [], dropping: [], selected: -1, focus: 0, busy: false, done: false,
      start: null, studyTime: 0, boosts: 0, nextBoost: 3,
    };
    result.hidden = true;
    result.replaceChildren();
    for (let position = 0; position < stageButtons.length; position += 1) {
      stageButtons[position].setAttribute('aria-pressed', String(position === stageIndex));
    }
    query('.canopy-how').textContent = stage.goal === 'moss' ? `${t.howMoss} ${t.how}` : t.how;
    announce();
    paint();
    updateStatus();
    if (focus) tiles[game.focus].focus({ preventScroll: true });
  }

  function end(win) {
    game.done = true;
    const seconds = Math.max(0, Math.round((now() - (game.start ?? now()) - game.studyTime) / 1000));
    const next = win && game.stageIndex < STAGES.length - 1;
    result.innerHTML = `
      <div class="canopy-result-inner">
        <span class="canopy-sigil" aria-hidden="true" data-kind="${win ? 2 : 0}"><span class="canopy-glyph"></span></span>
        <h3>${win ? t.win : t.lose}</h3>
        <p>${t.result(number.format(game.score))}</p>
        <div class="canopy-buttons">
          <button type="button" data-retry>${t.retry}</button>
          ${next ? `<button type="button" class="canopy-boost" data-next>${t.next}</button>` : ''}
        </div>
      </div>
    `;
    result.hidden = false;
    if (win && typeof ctx.asset === 'function') {
      const rewardArt = doc.createElement('img');
      rewardArt.className = 'canopy-reward';
      rewardArt.alt = '';
      rewardArt.decoding = 'async';
      rewardArt.hidden = true;
      const seal = result.querySelector('.canopy-sigil');
      rewardArt.addEventListener('load', () => {
        seal.hidden = true;
        rewardArt.hidden = false;
      }, { signal, once: true });
      seal.before(rewardArt);
      rewardArt.src = ctx.asset('assets/cheer.webp');
    }
    query('[data-retry]').addEventListener('click', () => begin(game.stageIndex, true), { signal });
    const nextButton = query('[data-next]');
    nextButton?.addEventListener('click', () => begin(game.stageIndex + 1, true), { signal });
    sound(win ? 'success' : 'error');
    paint();
    updateStatus();
    (nextButton ?? query('[data-retry]')).focus({ preventScroll: true });
    ctx.complete?.({ score: game.score, duration: seconds, win, level: game.stage.id, turns: game.turns });
  }

  async function move(first, second) {
    if (game.busy || game.done || !adjacent(first, second)) return;
    if (game.start === null) game.start = now();
    game.hint = [];
    game.selected = -1;
    game.busy = true;
    updateStatus();
    announce();

    const turn = playTurn(game.board, first, second, game.stage.kinds);
    const before = game.board;
    game.board = turn.swapped;
    game.dropping = [first, second];
    paint();
    await sleep(120);
    if (signal.aborted) return;
    game.dropping = [];

    if (!turn.waves.length) {
      game.board = before;
      game.busy = false;
      game.selected = first;
      paint();
      updateStatus();
      announce(t.badSwap);
      return;
    }

    game.moves -= 1;
    game.turns += 1;
    for (const wave of turn.waves) {
      game.clearing = wave.cells;
      game.score += wave.points;
      game.leaves += wave.leaves;
      for (const cell of wave.cells) game.moss.delete(cell);
      sound(wave.bloom ? 'success' : 'tap');
      paint();
      updateStatus();
      await sleep(178);
      if (signal.aborted) return;
      game.clearing = [];
      const prior = game.board;
      game.board = wave.after;
      game.dropping = wave.after.flatMap((token, cell) => wave.cells.includes(cell) || token !== prior[cell] ? [cell] : []);
      paint();
      await sleep(94);
      if (signal.aborted) return;
      game.dropping = [];
    }

    game.board = turn.board;
    game.busy = false;
    paint();
    updateStatus();
    if (progress() >= game.stage.target || game.moves <= 0) {
      end(progress() >= game.stage.target);
    } else if (turn.reshuffled) {
      announce(t.shuffle);
    } else if (turn.waves.length > 1) {
      announce(t.combo(turn.waves.length));
    } else if (turn.waves[0].bloom) {
      announce(t.bloom);
    }
  }

  function choose(cell) {
    if (game.busy || game.done) return;
    const previous = game.selected;
    game.focus = cell;
    if (!game.hint.includes(cell)) game.hint = [];
    if (previous !== -1 && previous !== cell && adjacent(previous, cell)) {
      void move(previous, cell);
    } else {
      game.selected = previous === cell ? -1 : cell;
      paint();
    }
  }

  function hint() {
    const moves = findMoves(game.board);
    const mossCells = game.moss;
    const ranked = moves.map((move) => {
      const { cells } = affectedCells(move.runs);
      const next = swapped(game.board, move.first, move.second);
      let worth = cells.length;
      if (game.stage.goal === 'moss') worth += cells.filter((cell) => mossCells.has(cell)).length * 12;
      if (game.stage.goal === 'leaves') worth += cells.filter((cell) => next[cell] === LEAF).length * 12;
      return { ...move, worth };
    }).sort((first, second) => second.worth - first.worth);
    const suggestion = ranked[0];
    if (!suggestion) return;
    game.hint = [suggestion.first, suggestion.second];
    paint();
    announce(t.hintShown(...game.hint.flatMap((cell) => [Math.floor(cell / WIDTH) + 1, cell % WIDTH + 1])));
  }

  async function ask() {
    if (boostButton.disabled || boostButton.hidden) return;
    game.busy = true;
    updateStatus();
    const started = now();
    let correct;
    try {
      correct = await ctx.askQuestion();
    } catch {
      correct = undefined;
    }
    if (signal.aborted) return;
    game.studyTime += now() - started;
    game.busy = false;
    if (correct === true) {
      game.moves += 2;
      sound('success');
      announce(t.earned);
    } else if (correct === false) {
      hint();
    } else if (correct === undefined) {
      announce(t.studyUnavailable);
    }
    if (typeof correct === 'boolean') {
      game.boosts += 1;
      game.nextBoost = game.turns + 4;
    }
    updateStatus();
  }

  grid.addEventListener('click', (event) => {
    const tile = event.target.closest('[data-cell]');
    if (!tile || (event.detail > 0 && now() < suppressClickUntil)) return;
    choose(Number(tile.dataset.cell));
  }, { signal });

  grid.addEventListener('keydown', (event) => {
    const tile = event.target.closest('[data-cell]');
    if (!tile || game.busy || game.done) return;
    const cell = Number(tile.dataset.cell);
    const offset = { ArrowUp: -WIDTH, ArrowDown: WIDTH, ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (event.key === 'Escape') {
      game.selected = -1;
      paint();
    }
    if (offset === undefined) return;
    event.preventDefault();
    if (!adjacent(cell, cell + offset)) return;
    game.focus = cell + offset;
    paint();
    tiles[game.focus].focus({ preventScroll: true });
  }, { signal });

  grid.addEventListener('pointerdown', (event) => {
    const tile = event.target.closest('[data-cell]');
    if (!tile || !event.isPrimary || event.button !== 0 || game.busy || game.done) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, from: Number(tile.dataset.cell) };
  }, { signal });

  view.addEventListener('pointerup', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const { x, y, from } = pointer;
    pointer = null;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    const reach = Math.max(Math.abs(dx), Math.abs(dy));
    if (reach < Math.max(15, tiles[from].clientWidth * 0.33)) return;
    suppressClickUntil = now() + 280;
    const offset = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * WIDTH;
    if (adjacent(from, from + offset)) {
      game.focus = from + offset;
      void move(from, from + offset);
    }
  }, { signal });

  view.addEventListener('pointercancel', (event) => {
    if (pointer?.id === event.pointerId) pointer = null;
  }, { signal });

  for (const button of stageButtons) {
    button.addEventListener('click', () => {
      const stageIndex = Number(button.dataset.stage);
      if (stageIndex !== game.stageIndex) begin(stageIndex);
    }, { signal });
  }
  hintButton.addEventListener('click', hint, { signal });
  restartButton.addEventListener('click', () => begin(game.stageIndex, true), { signal });
  boostButton?.addEventListener('click', ask, { signal });

  begin(0);
  return () => {
    controller.abort();
    root.remove();
  };
}
