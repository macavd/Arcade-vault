// Motor de Snake ("SERPENTINA") portado desde
// references/started-games/05-snake/game.js a TypeScript.
//
// A diferencia del original, NO usa estado global de modulo ni accede a
// document.getElementById: todo el estado vive en el closure de la fabrica y
// el canvas/ctx llegan por parametro. Preserva las mecanicas, constantes y
// feel del original (rejilla 32x24 de celdas de 25px sobre 800x600, muros
// mortales, +10 por fruta, frutas aleatorias del atlas), salvo que la
// aceleracion se agrupa en tramos de TIER_SIZE frutas para que velocidad y
// nivel avancen juntos. Notifica score/vidas/nivel/fin a React via callbacks;
// no dibuja HUD en el canvas (de eso se encarga .player-hud en React).
import type { GameCallbacks, GameEngine, GameFactory } from "../types";
import { FRUITS, FRUIT_KEYS, getFruitsImage, loadFruits } from "./sprites";
// ── Rejilla / resolucion interna ─────────────────────────────────────────────
const CELL = 25;
const W = 800;
const H = 600;
const COLS = W / CELL; // 32
const ROWS = H / CELL; // 24
// ── Ritmo ────────────────────────────────────────────────────────────────────
const BASE_STEP = 0.13; // segundos por paso al empezar
const MIN_STEP = 0.06; // tope de velocidad
const TIER_SIZE = 5; // frutas por tramo de aceleracion / nivel
const STEP_PER_TIER = 0.02; // cuanto acelera cada tramo (≈ SPEEDUP * TIER_SIZE)
const DT_CAP = 0.05; // tope de dt (s) anti-spiral tras blur/pausa
interface Cell {
  x: number;
  y: number;
}
interface Food extends Cell {
  fruit: string;
}
export const createSerpentinaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine => {
  const ctx = canvas.getContext("2d")!;
  canvas.width = W;
  canvas.height = H;
  // Carga perezosa del sprite de frutas (idempotente, compartido entre
  // instancias). Hasta que carga, drawFood dibuja un circulo de reserva.
  loadFruits();
  // ── Estado del juego (encapsulado en el closure, sin globales de modulo) ──
  let snake: Cell[];
  let dir: Cell;
  let nextDir: Cell;
  let food: Food;
  let score: number;
  let fruitsEaten: number;
  let level: number;
  let step: number;
  let acc: number;
  let gameOver: boolean;
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let paused = false;
  // Valores ya notificados a React, para emitir callbacks solo ante cambios.
  let lastScore = -1;
  let lastLevel = -1;
  let gameOverEmitted = false;
  function syncReactState() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevel(level);
    }
    if (gameOver && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onLives(0); // Snake tiene una sola vida: 0 al perder.
      callbacks.onGameOver(score);
    }
  }
  // ── Mecanica (identica al original salvo la aceleracion por tramos) ──────────
  function initGame() {
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
    fruitsEaten = 0;
    level = 1;
    step = BASE_STEP;
    acc = 0;
    gameOver = false;
    // Resetea el espejo de React para que el primer sync reemita todo.
    lastScore = -1;
    lastLevel = -1;
    gameOverEmitted = false;
    spawnFood();
  }
  function spawnFood() {
    const occupied = new Set(snake.map((s) => s.x + "," + s.y));
    let cell: Cell;
    do {
      cell = {
        x: (Math.random() * COLS) | 0,
        y: (Math.random() * ROWS) | 0,
      };
    } while (occupied.has(cell.x + "," + cell.y));
    const fruit = FRUIT_KEYS[(Math.random() * FRUIT_KEYS.length) | 0]!;
    food = { x: cell.x, y: cell.y, fruit };
  }
  function stepSnake() {
    dir = nextDir;
    const head = { x: snake[0]!.x + dir.x, y: snake[0]!.y + dir.y };
    // Muros mortales: chocar contra el borde termina la partida.
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOver = true;
      return;
    }
    // Auto-colision (la cola se libera este mismo paso, salvo que comamos).
    const willEat = head.x === food.x && head.y === food.y;
    const body = willEat ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver = true;
      return;
    }
    snake.unshift(head);
    if (willEat) {
      score += 10;
      fruitsEaten++;
      // Nivel = tramo de velocidad: sube cada TIER_SIZE frutas y acelera.
      level = 1 + Math.floor(fruitsEaten / TIER_SIZE);
      step = Math.max(MIN_STEP, BASE_STEP - STEP_PER_TIER * (level - 1));
      spawnFood();
    } else {
      snake.pop();
    }
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  // Se encola el proximo giro; no se permite invertir 180 sobre uno mismo.
  const DIRS: Record<string, Cell> = {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyD: { x: 1, y: 0 },
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const d = DIRS[e.code];
    if (!d) return;
    e.preventDefault();
    // Ignora el giro si es opuesto a la direccion actual de avance.
    if (d.x === -dir.x && d.y === -dir.y) return;
    nextDir = d;
  };
  // ── Render ─────────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = "#05080a";
    ctx.fillRect(0, 0, W, H);
    // Cuadricula tenue
    ctx.strokeStyle = "rgba(0, 255, 160, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }
    drawFood();
    drawSnake();
  }
  function drawFood() {
    const px = food.x * CELL;
    const py = food.y * CELL;
    const img = getFruitsImage();
    if (img) {
      const s = FRUITS[food.fruit]!;
      // Encaja el sprite dentro de la celda conservando proporcion.
      const scale = Math.min((CELL - 2) / s.w, (CELL - 2) / s.h);
      const dw = s.w * scale;
      const dh = s.h * scale;
      ctx.drawImage(
        img,
        s.x,
        s.y,
        s.w,
        s.h,
        px + (CELL - dw) / 2,
        py + (CELL - dh) / 2,
        dw,
        dh,
      );
    } else {
      ctx.fillStyle = "#ff3b6b";
      ctx.beginPath();
      ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawSnake() {
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i]!;
      const head = i === 0;
      ctx.fillStyle = head ? "#5dffb0" : "#17c98a";
      ctx.shadowColor = "#00ffa0";
      ctx.shadowBlur = head ? 16 : 8;
      roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 6);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    // Ojos en la cabeza, orientados segun la direccion.
    const h = snake[0]!;
    ctx.fillStyle = "#05080a";
    const cx = h.x * CELL + CELL / 2;
    const cy = h.y * CELL + CELL / 2;
    const off = 4;
    const ex = dir.y !== 0 ? off : dir.x * off;
    const ey = dir.x !== 0 ? off : dir.y * off;
    ctx.beginPath();
    ctx.arc(
      cx - ey * 0.6 + ex * 0.4,
      cy - ex * 0.6 + ey * 0.4,
      2,
      0,
      Math.PI * 2,
    );
    ctx.arc(
      cx + ey * 0.6 + ex * 0.4,
      cy + ex * 0.6 + ey * 0.4,
      2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // ── Loop principal ─────────────────────────────────────────────────────────
  function loop(ts: number) {
    // dt en segundos; lastTime null tras (re)arrancar/reanudar da dt=0.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, DT_CAP);
    lastTime = ts;
    if (!gameOver) {
      acc += dt;
      while (acc >= step) {
        acc -= step;
        stepSnake();
        if (gameOver) break;
      }
    }
    draw();
    syncReactState();
    if (!gameOver) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }
  function startLoop() {
    if (rafId === null && !gameOver) {
      // lastTime a null para que el primer dt tras (re)arrancar sea 0 y no
      // provoque un salto de simulacion.
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  }
  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTime = null;
  }
  // ── API publica (ciclo de vida) ─────────────────────────────────────────────
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      initGame();
      paused = false;
      callbacks.onLives(1); // Snake: una vida mientras se juega.
      syncReactState();
      startLoop();
    },
    pause() {
      if (paused) return;
      paused = true;
      stopLoop();
    },
    resume() {
      if (!paused) return;
      paused = false;
      // startLoop resetea lastTime para que el primer frame tras reanudar
      // tenga dt=0 y no acumule el tiempo en pausa (sin paso extra).
      startLoop();
    },
    restart() {
      stopLoop();
      initGame();
      paused = false;
      callbacks.onLives(1);
      // Emite el estado reseteado a React antes del primer frame.
      syncReactState();
      startLoop();
    },
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
