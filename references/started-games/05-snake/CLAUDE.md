# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

Open `index.html` directly in a browser, or serve with:

```bash
npx serve .
```

No build step, no bundler, no dependencies.

## Architecture

Single-file game logic (`game.js`) with a classic fixed-step game loop. Sprite atlas lives in `sprites.js` (sets `window.SPRITE_ATLAS`), loaded before `game.js` from `index.html`.

**Grid:** Fixed 32×24 cells of `CELL` (25px) over an 800×600 canvas. `COLS`/`ROWS` are derived from the canvas size.

**Game state globals:** `snake` (array of `{x, y}` grid cells, head first), `dir` / `nextDir` (current and queued step direction), `food` (`{x, y, fruit}`), `score`, `best`, `step` (seconds per step), `acc` (time accumulator), `state` (`'playing' | 'gameover'`).

**Loop:** `requestAnimationFrame` → `loop(ts)` → `update(dt)` then `draw()`. `dt` is capped at 50ms to prevent spiral-of-death on tab blur. `update` advances the snake one grid step each time `acc` exceeds `step`.

**Stepping:** `stepSnake()` moves the head by `dir`, checks wall + self collision, grows on food (keeps tail) or advances (drops tail). Eating raises `score`, shrinks `step` toward `MIN_STEP`, and respawns food.

**Input:** `DIRS` maps arrow/WASD `KeyboardEvent.code` to a direction vector. A queued turn (`nextDir`) is ignored if it is a 180° reversal of `dir`. Enter/Space restarts on game over.

**Food sprites:** Random fruit key from `SPRITE_ATLAS.fruits`, drawn from `snake-assets/fruits.png` scaled to fit a cell (falls back to a drawn circle until the image loads).
