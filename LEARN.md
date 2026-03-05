# Learning Guide — Minesweeper

This document explains the key concepts used to build this project. It is intended for students and learners exploring front-end development through a real, working example.

---

## 1. Project Structure

The project separates concerns across three files:

| File | Responsibility |
|---|---|
| `index.html` | Document structure and semantic markup |
| `style.css` | Visual presentation and animation |
| `game.js` | Application state and all game logic |

This separation makes each file easier to read, debug, and extend independently.

---

## 2. HTML Concepts

### Semantic structure
The layout uses `<header>`, `<div>`, `<select>`, and `<button>` elements chosen for their meaning, not just appearance.

### DOM as a view
The board is an empty `<div id="board">` in HTML. All cells are created dynamically by JavaScript. The HTML only defines the skeleton; the script fills it in.

### Forms without `<form>`
User input (difficulty selection, button clicks) is handled with plain event listeners, not form submissions — a common pattern in single-page applications.

---

## 3. CSS Concepts

### Custom properties (CSS variables)
All colours, sizes, and fonts are stored as variables under `:root`:
```css
:root {
  --cell-size: 36px;
  --accent: #58a6ff;
}
```
Change one value and the whole UI updates. This is the foundation of themeable design systems.

### Box-shadow bevel trick
The classic raised-button look uses no images — just two inset shadows:
```css
box-shadow:
  inset 2px 2px 0 #lighter-colour,
  inset -2px -2px 0 #darker-colour;
```

### CSS Grid for the board
The board is a CSS Grid container. Column count is set dynamically from JavaScript:
```js
boardEl.style.gridTemplateColumns = `repeat(${G.cols}, var(--cell-size))`;
```
Grid makes 2-D layouts straightforward without manual row/column calculations.

### Keyframe animations
The mine explosion and overlay pop-in use `@keyframes` with `transform` and `opacity` — properties that animate on the GPU and do not cause layout reflows.

---

## 4. JavaScript Concepts

### Game state as a single object
All mutable data lives in one object `G`. This makes it trivial to reset the game (replace `G` with a fresh object) and easy to reason about what data exists.

```js
let G = {
  rows, cols, board, status, minesLeft, elapsed, ...
};
```

### 2-D array for the board
The board is an array of row arrays: `G.board[row][col]`. Each cell is a plain object with properties like `mine`, `revealed`, `flagged`, `count`.

### First-click safety
Mines are **not** placed when the game loads. They are placed inside `placeMines(r, c)` the first time a cell is clicked, with that cell excluded from mine placement. This guarantees the player never loses on move one.

### BFS flood-fill (iterative)
When a cell with zero neighbouring mines is revealed, all connected empty cells must also be revealed. This uses a **Breadth-First Search** with a queue:

```js
const queue = [[startR, startC]];
while (queue.length > 0) {
  const [r, c] = queue.shift();
  // mark visited, reveal, push neighbours if count === 0
}
```

Using iteration instead of recursion avoids a call-stack overflow on large boards (Expert has 480 cells).

### Event delegation vs direct binding
Each cell element gets its own `click`, `contextmenu`, and `dblclick` listener. The row and column are captured in a closure:
```js
const row = r, col = c;
el.addEventListener('click', () => handleClick(row, col));
```

### Interval-based timer
The timer uses `setInterval` to increment a counter every 1000 ms. The ID is stored in `G.timerId` so it can be cleared on reset or game end — without clearing it, multiple intervals would stack up and cause bugs.

---

## 5. Algorithms

### Neighbour iteration
A reusable helper loops over all 8 surrounding cells of `(r, c)` while clamping to board boundaries:
```js
function eachNeighbour(r, c, fn) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < G.rows && nc >= 0 && nc < G.cols) fn(nr, nc);
    }
  }
}
```
Centralising this logic eliminates repeated boundary-check code throughout the file.

### Win detection
After each reveal, iterate every cell. If any non-mine cell is still unrevealed, the game is not won yet. This is O(rows × cols) but runs only when the board changes, which is acceptable.

---

## 6. Common Bugs to Watch

| Bug | Cause | Fix |
|---|---|---|
| Multiple timers running | `setInterval` called again without clearing previous | Always `clearInterval(G.timerId)` before starting a new one |
| Stack overflow on large boards | Recursive flood-fill on a 480-cell empty board | Use iterative BFS with a queue |
| First click hits a mine | Mines placed before any click | Place mines inside the first-click handler |
| Flags over the mine count | No guard on flagging | Check `G.minesLeft === 0` before adding a new flag |
| Stale DOM references after re-render | Saving `<div>` elements across renders | Re-query or re-create elements every render cycle |

---

## 7. Suggested Extensions

- **High scores** — save best times per difficulty using `localStorage`
- **Custom difficulty** — add inputs for arbitrary rows, columns, and mine count
- **Touch support** — long-press to flag on mobile (use `touchstart` / `touchend` timing)
- **Keyboard navigation** — arrow keys to move focus, Space/Enter to reveal, F to flag
- **Seed-based boards** — use a seeded PRNG so the same seed always generates the same board

---

## 8. Further Reading

- [MDN — CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- [MDN — Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [MDN — EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [Wikipedia — Breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search)
- [JavaScript.info — Closures](https://javascript.info/closure)
