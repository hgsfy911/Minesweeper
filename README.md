# 💣 Minesweeper

A classic Minesweeper game built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies.

![License](https://img.shields.io/badge/license-MIT-blue) ![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JS](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

---

## Preview

<div align="center">
  <img alt="Minesweeper" src="https://github.com/user-attachments/assets/d9e429f3-95c0-4820-96c0-6a8f48d980e7" />
</div>

---

## Features

- **3 difficulty levels** — Beginner (9×9), Intermediate (16×16), Expert (30×16)
- **First-click safety** — mines are placed after your first click; you can never lose on move one
- **Flood-fill reveal** — clicking an empty cell auto-reveals all connected empty cells (BFS, no stack overflow)
- **Flagging** — right-click to place / remove flags; counter prevents over-flagging
- **Chord reveal** — double-click a numbered cell to reveal its neighbours when flags match the number
- **Win / lose overlay** — game result shown with elapsed time; one-click restart
- **Fully responsive** — scrollable board on small screens

---

## Getting Started

No build step required.

```bash
git clone https://github.com/your-username/minesweeper.git
cd minesweeper
# Open index.html in any modern browser
open index.html
```

---

## File Structure

```
minesweeper/
├── index.html   # Layout and markup
├── style.css    # Theme, animations, responsive styles
└── game.js      # All game logic (state, BFS, events)
```

---

## Controls

| Action | Input |
|---|---|
| Reveal cell | Left click |
| Flag / Unflag | Right click |
| Chord reveal | Double click |
| New game | Click smiley 🙂 |

---

## License

[MIT](LICENSE)
