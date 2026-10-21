// Snake — clon clásico en canvas HTML5 puro, sin dependencias ni bundler.
// Rejilla fija de 32x24 celdas (25px) sobre un canvas 800x600.
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
// ── Rejilla ────────────────────────────────────────────────────────────────
const CELL = 25;
const COLS = canvas.width / CELL;   // 32
const ROWS = canvas.height / CELL;  // 24
// ── Ritmo ──────────────────────────────────────────────────────────────────
const BASE_STEP = 0.13;   // segundos por paso al empezar
const MIN_STEP = 0.06;    // tope de velocidad
const SPEEDUP = 0.004;    // cuánto acelera por fruta comida
// ── Sprites de fruta (atlas en sprites.js) ───────────────────────────────────
const atlas = window.SPRITE_ATLAS;
const fruitKeys = Object.keys(atlas.fruits);
const fruitImg = new Image();
let fruitReady = false;
fruitImg.onload = () => { fruitReady = true; };
fruitImg.src = atlas.sources.fruits;
// ── Estado del juego ─────────────────────────────────────────────────────────
let snake, dir, nextDir, food, score, best, step, acc, state;
function reset() {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  step = BASE_STEP;
  acc = 0;
  state = 'playing';
  spawnFood();
}
function spawnFood() {
  const occupied = new Set(snake.map((s) => s.x + ',' + s.y));
  let cell;
  do {
    cell = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
  } while (occupied.has(cell.x + ',' + cell.y));
  cell.fruit = fruitKeys[(Math.random() * fruitKeys.length) | 0];
  food = cell;
}
// ── Input ──────────────────────────────────────────────────────────────────
// Se encola el próximo giro; no se permite invertir 180° sobre uno mismo.
const DIRS = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
};
addEventListener('keydown', (e) => {
  if (state === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
    reset();
    return;
  }
  const d = DIRS[e.code];
  if (!d) return;
  e.preventDefault();
  // Ignora el giro si es opuesto a la dirección actual de avance.
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
});
// ── Lógica ─────────────────────────────────────────────────────────────────
function stepSnake() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  // Muros: chocar contra el borde mata.
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }
  // Auto-colisión (la cola se libera este mismo paso, salvo que comamos).
  const willEat = head.x === food.x && head.y === food.y;
  const body = willEat ? snake : snake.slice(0, -1);
  if (body.some((s) => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }
  snake.unshift(head);
  if (willEat) {
    score += 10;
    step = Math.max(MIN_STEP, step - SPEEDUP);
    spawnFood();
  } else {
    snake.pop();
  }
}
function gameOver() {
  state = 'gameover';
  best = Math.max(best || 0, score);
}
function update(dt) {
  if (state !== 'playing') return;
  acc += dt;
  while (acc >= step) {
    acc -= step;
    stepSnake();
    if (state !== 'playing') break;
  }
}
// ── Render ─────────────────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = '#05080a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Cuadrícula tenue
  ctx.strokeStyle = 'rgba(0, 255, 160, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }
  drawFood();
  drawSnake();
  drawHud();
  if (state === 'gameover') drawGameOver();
}
function drawFood() {
  const px = food.x * CELL;
  const py = food.y * CELL;
  if (fruitReady) {
    const s = atlas.fruits[food.fruit];
    // Encaja el sprite dentro de la celda conservando proporción.
    const scale = Math.min((CELL - 2) / s.w, (CELL - 2) / s.h);
    const dw = s.w * scale;
    const dh = s.h * scale;
    ctx.drawImage(
      fruitImg, s.x, s.y, s.w, s.h,
      px + (CELL - dw) / 2, py + (CELL - dh) / 2, dw, dh
    );
  } else {
    ctx.fillStyle = '#ff3b6b';
    ctx.beginPath();
    ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawSnake() {
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const head = i === 0;
    ctx.fillStyle = head ? '#5dffb0' : '#17c98a';
    ctx.shadowColor = '#00ffa0';
    ctx.shadowBlur = head ? 16 : 8;
    roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 6);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // Ojos en la cabeza
  const h = snake[0];
  ctx.fillStyle = '#05080a';
  const cx = h.x * CELL + CELL / 2;
  const cy = h.y * CELL + CELL / 2;
  const off = 4;
  const ex = dir.y !== 0 ? off : dir.x * off;
  const ey = dir.x !== 0 ? off : dir.y * off;
  ctx.beginPath();
  ctx.arc(cx - ey * 0.6 + ex * 0.4, cy - ex * 0.6 + ey * 0.4, 2, 0, Math.PI * 2);
  ctx.arc(cx + ey * 0.6 + ex * 0.4, cy + ex * 0.6 + ey * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();
}
function drawHud() {
  ctx.fillStyle = '#9fffe0';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE ' + score, 12, 22);
  ctx.textAlign = 'right';
  ctx.fillText('LEN ' + snake.length, canvas.width - 12, 22);
}
function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3b6b';
  ctx.shadowColor = '#ff3b6b';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px monospace';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#9fffe0';
  ctx.font = '20px monospace';
  ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 24);
  ctx.fillStyle = '#5dffb0';
  ctx.font = '16px monospace';
  ctx.fillText('Pulsa ENTER para reiniciar', canvas.width / 2, canvas.height / 2 + 60);
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// ── Loop ───────────────────────────────────────────────────────────────────
let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05); // cap anti-spiral
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
