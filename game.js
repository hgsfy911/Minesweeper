'use strict';

/* ─── Difficulty configs ──────────────────────────────────────────────── */
const DIFFICULTIES = {
  beginner:     { rows: 9,  cols: 9,  mines: 10,  cellSize: '40px' },
  intermediate: { rows: 16, cols: 16, mines: 40,  cellSize: '34px' },
  expert:       { rows: 16, cols: 30, mines: 99,  cellSize: '28px' }
};

/* Number colour CSS classes (index = mine count 1-8) */
const NUM_CLASS = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

/* ─── DOM references ──────────────────────────────────────────────────── */
const boardEl       = document.getElementById('board');
const minesCountEl  = document.getElementById('mines-count');
const timerEl       = document.getElementById('timer');
const resetBtn      = document.getElementById('reset-btn');
const diffSelect    = document.getElementById('difficulty');
const overlay       = document.getElementById('overlay');
const overlayIcon   = document.getElementById('overlay-icon');
const overlayMsg    = document.getElementById('overlay-msg');
const overlaySub    = document.getElementById('overlay-sub');
const overlayRestart= document.getElementById('overlay-restart');

/* ─── Game state (single object, replaced on reset) ──────────────────── */
let G = {};

/* ─── Initialise / reset game ────────────────────────────────────────── */
function initGame(difficulty) {
  const cfg = DIFFICULTIES[difficulty];

  // Stop any running timer
  if (G.timerId) clearInterval(G.timerId);

  G = {
    rows:       cfg.rows,
    cols:       cfg.cols,
    totalMines: cfg.mines,
    cellSize:   cfg.cellSize,
    board:      [],          // 2-D array of cell objects
    status:     'idle',      // idle | playing | won | lost
    firstClick: true,
    minesLeft:  cfg.mines,
    elapsed:    0,
    timerId:    null
  };

  /* Build empty board */
  for (let r = 0; r < G.rows; r++) {
    G.board[r] = [];
    for (let c = 0; c < G.cols; c++) {
      G.board[r][c] = {
        mine:      false,
        revealed:  false,
        flagged:   false,
        count:     0,      // neighbour mine count
        exploded:  false,  // the mine the player actually clicked
        wrongFlag: false   // flagged but no mine here
      };
    }
  }

  /* Hide overlay */
  overlay.className = 'overlay';

  updateHUD();
  renderBoard();
}

/* ─── Place mines after first click (safe zone = 3×3 around click) ───── */
function placeMines(safeR, safeC) {
  let placed = 0;
  let guard  = G.rows * G.cols * 20; // prevent infinite loop on tiny boards

  while (placed < G.totalMines && guard-- > 0) {
    const r = Math.floor(Math.random() * G.rows);
    const c = Math.floor(Math.random() * G.cols);
    if (G.board[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    G.board[r][c].mine = true;
    placed++;
  }

  /* Pre-compute neighbour counts for every non-mine cell */
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      if (!G.board[r][c].mine) {
        G.board[r][c].count = countNeighbourMines(r, c);
      }
    }
  }
}

/* ─── Count mines around (r, c) ──────────────────────────────────────── */
function countNeighbourMines(r, c) {
  let n = 0;
  eachNeighbour(r, c, (nr, nc) => { if (G.board[nr][nc].mine) n++; });
  return n;
}

/* ─── Call fn(nr, nc) for every valid neighbour of (r, c) ────────────── */
function eachNeighbour(r, c, fn) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < G.rows && nc >= 0 && nc < G.cols) fn(nr, nc);
    }
  }
}

/* ─── BFS flood-fill reveal (iterative, avoids stack overflow) ───────── */
function revealBFS(startR, startC) {
  const queue   = [[startR, startC]];
  const visited = new Set();

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const key    = r * G.cols + c;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = G.board[r][c];
    if (cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;

    /* Expand into neighbours only for empty (count 0) cells */
    if (cell.count === 0) {
      eachNeighbour(r, c, (nr, nc) => queue.push([nr, nc]));
    }
  }
}

/* ─── Check win: every non-mine cell must be revealed ────────────────── */
function checkWin() {
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      if (!G.board[r][c].mine && !G.board[r][c].revealed) return;
    }
  }

  G.status = 'won';
  clearInterval(G.timerId);

  /* Auto-flag remaining mines */
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      if (G.board[r][c].mine) G.board[r][c].flagged = true;
    }
  }
  G.minesLeft = 0;

  showOverlay('won');
}

/* ─── Trigger game over ───────────────────────────────────────────────── */
function triggerGameOver() {
  G.status = 'lost';
  clearInterval(G.timerId);

  /* Reveal all unflagged mines; mark incorrect flags */
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      const cell = G.board[r][c];
      if (cell.mine  && !cell.flagged) cell.revealed  = true;
      if (!cell.mine && cell.flagged)  cell.wrongFlag = true;
    }
  }

  showOverlay('lost');
}

/* ─── Timer ───────────────────────────────────────────────────────────── */
function startTimer() {
  G.timerId = setInterval(() => {
    if (G.elapsed < 999) {
      G.elapsed++;
      timerEl.textContent = String(G.elapsed).padStart(3, '0');
    } else {
      clearInterval(G.timerId);
    }
  }, 1000);
}

/* ─── Update HUD counters and smiley ─────────────────────────────────── */
function updateHUD() {
  minesCountEl.textContent = String(Math.max(0, G.minesLeft)).padStart(3, '0');
  timerEl.textContent      = String(G.elapsed).padStart(3, '0');

  if      (G.status === 'won')  resetBtn.textContent = '😎';
  else if (G.status === 'lost') resetBtn.textContent = '😵';
  else                          resetBtn.textContent = '🙂';
}

/* ─── Show win / lose overlay ────────────────────────────────────────── */
function showOverlay(type) {
  if (type === 'won') {
    overlayIcon.textContent = '🎉';
    overlayMsg.textContent  = 'YOU WIN!';
    overlaySub.textContent  = `Field cleared in ${G.elapsed} second${G.elapsed === 1 ? '' : 's'}`;
    overlay.className = 'overlay active won';
  } else {
    overlayIcon.textContent = '💣';
    overlayMsg.textContent  = 'GAME OVER';
    overlaySub.textContent  = 'You hit a mine!';
    overlay.className = 'overlay active lost';
  }
}

/* ─── Handle left click ───────────────────────────────────────────────── */
function handleClick(r, c) {
  if (G.status === 'won' || G.status === 'lost') return;
  const cell = G.board[r][c];
  if (cell.revealed || cell.flagged) return;

  /* First click: place mines now so the first click is always safe */
  if (G.firstClick) {
    G.firstClick = false;
    placeMines(r, c);
    G.status = 'playing';
    startTimer();
  }

  if (cell.mine) {
    cell.revealed = true;
    cell.exploded = true;
    renderBoard();
    updateHUD();
    triggerGameOver();
    renderBoard(); // re-render after triggerGameOver marks wrong flags
  } else {
    revealBFS(r, c);
    checkWin();
    renderBoard();
    updateHUD();
  }
}

/* ─── Handle right click (flag / unflag) ─────────────────────────────── */
function handleRightClick(e, r, c) {
  e.preventDefault();
  if (G.status !== 'playing') return;

  const cell = G.board[r][c];
  if (cell.revealed) return;

  /* Prevent planting more flags than total mines */
  if (!cell.flagged && G.minesLeft === 0) return;

  cell.flagged   = !cell.flagged;
  G.minesLeft   += cell.flagged ? -1 : 1;

  renderBoard();
  updateHUD();
}

/* ─── Handle double-click chord: reveal neighbours if flag count matches ─ */
function handleDoubleClick(r, c) {
  if (G.status !== 'playing') return;
  const cell = G.board[r][c];
  if (!cell.revealed || cell.count === 0) return;

  /* Count flags around this cell */
  let flagCount = 0;
  eachNeighbour(r, c, (nr, nc) => { if (G.board[nr][nc].flagged) flagCount++; });
  if (flagCount !== cell.count) return;

  /* Reveal all non-flagged neighbours */
  let mineHit = false;
  eachNeighbour(r, c, (nr, nc) => {
    if (mineHit) return;
    const nb = G.board[nr][nc];
    if (!nb.revealed && !nb.flagged) {
      if (nb.mine) {
        nb.revealed = true;
        nb.exploded = true;
        mineHit     = true;
      } else {
        revealBFS(nr, nc);
      }
    }
  });

  if (mineHit) {
    renderBoard();
    updateHUD();
    triggerGameOver();
    renderBoard();
  } else {
    checkWin();
    renderBoard();
    updateHUD();
  }
}

/* ─── Render board into DOM ───────────────────────────────────────────── */
function renderBoard() {
  /* Apply cell size CSS variable on the board element */
  boardEl.style.setProperty('--cell-size', G.cellSize);
  boardEl.style.gridTemplateColumns = `repeat(${G.cols}, var(--cell-size))`;

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      const cell = G.board[r][c];
      const el   = document.createElement('div');
      el.className = 'cell';

      if (cell.wrongFlag) {
        /* Incorrectly flagged safe cell */
        el.classList.add('wrong-flag');
        el.textContent = '❌';

      } else if (cell.revealed) {
        el.classList.add('revealed');
        if (cell.mine) {
          el.classList.add('mine');
          if (cell.exploded) el.classList.add('exploded');
          el.textContent = '💣';
        } else if (cell.count > 0) {
          el.classList.add(NUM_CLASS[cell.count]);
          el.textContent = cell.count;
        }
        /* count === 0 → blank revealed cell */

      } else if (cell.flagged) {
        el.classList.add('flagged');
        el.textContent = '🚩';

      } else {
        el.classList.add('hidden');
      }

      /* Bind events with captured row/col */
      const row = r, col = c;
      el.addEventListener('click',        () => handleClick(row, col));
      el.addEventListener('contextmenu',  (e) => handleRightClick(e, row, col));
      el.addEventListener('dblclick',     () => handleDoubleClick(row, col));

      fragment.appendChild(el);
    }
  }

  boardEl.innerHTML = '';
  boardEl.appendChild(fragment);
}

/* ─── Prevent context menu on the whole board ────────────────────────── */
boardEl.addEventListener('contextmenu', e => e.preventDefault());

/* ─── Wire up global buttons and selects ─────────────────────────────── */
diffSelect.addEventListener('change', () => {
  overlay.className = 'overlay';
  initGame(diffSelect.value);
});

resetBtn.addEventListener('click', () => {
  overlay.className = 'overlay';
  initGame(diffSelect.value);
});

overlayRestart.addEventListener('click', () => {
  overlay.className = 'overlay';
  initGame(diffSelect.value);
});

/* ─── Start ───────────────────────────────────────────────────────────── */
initGame('beginner');
