// Motor de Tetris ("CAÍDA") portado desde
// references/started-games/03-tetris/game.js a TypeScript.
//
// A diferencia del original, NO usa estado global de modulo ni accede a
// document.getElementById: todo el estado del tablero vive en el closure de la
// fabrica y el canvas/ctx llegan por parametro. Preserva las mecanicas,
// constantes y feel del original (8 piezas incluida la "tuerca", LINE_SCORES,
// dropInterval, wall kicks, pieza fantasma). Dibuja el tablero 300x600 centrado
// en una resolucion interna 800x600 (4:3, igual que el .crt-screen de la SPEC
// 05), con el panel NEXT + SCORE / LINES / LEVEL dentro del mismo canvas, y
// notifica score/nivel/fin a React via callbacks.
import type { GameCallbacks, GameEngine, GameFactory } from "../types";
// ── Constantes del tablero ──────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
// Resolucion interna del canvas (4:3, coincide con el .crt-screen).
const W = 800;
const H = 600;
// Tablero 300x600 centrado dentro del canvas. El margen derecho aloja el panel.
const BOARD_W = COLS * BLOCK; // 300
const BOARD_H = ROWS * BLOCK; // 600
const BOARD_X = Math.floor((W - BOARD_W) / 2); // 250
const BOARD_Y = 0;
// Color de rejilla fijo: en el DOM original venia de la variable CSS
// --grid-line de document.body, que aqui no existe.
const GRID_LINE = "rgba(255, 255, 255, 0.08)";
// Origen del panel lateral (dentro del margen derecho del canvas).
const PANEL_X = BOARD_X + BOARD_W + 24; // 574
const NEXT_BOX = 120; // vista NEXT 120x120
const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metalico)
];
const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
const LINE_SCORES = [0, 100, 300, 500, 800];
interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}
export const createCaidaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2d del canvas");
  canvas.width = W;
  canvas.height = H;
  // ── Estado del juego (encapsulado en el closure, sin globales de modulo) ──
  let board: number[][];
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let gameOver: boolean;
  let dropAccum: number;
  let dropInterval: number;
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
      callbacks.onGameOver(score);
    }
  }
  // ── Mecanica (identica al original) ───────────────────────────────────────
  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }
  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }
  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }
  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result: number[][] = Array.from({ length: cols }, () =>
      new Array(rows).fill(0),
    );
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }
  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }
  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }
  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }
  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      endGame();
    }
  }
  function endGame() {
    gameOver = true;
  }
  // ── Dibujo adaptado a 800x600 ─────────────────────────────────────────────
  // Pinta una celda en coordenadas de rejilla, con un origen en pixeles.
  function drawBlock(
    originX: number,
    originY: number,
    gx: number,
    gy: number,
    colorIndex: number,
    size: number,
    alpha = 1,
  ) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex]!;
    ctx!.globalAlpha = alpha;
    ctx!.fillStyle = color;
    ctx!.fillRect(
      originX + gx * size + 1,
      originY + gy * size + 1,
      size - 2,
      size - 2,
    );
    // highlight
    ctx!.fillStyle = "rgba(255,255,255,0.12)";
    ctx!.fillRect(
      originX + gx * size + 1,
      originY + gy * size + 1,
      size - 2,
      4,
    );
    ctx!.globalAlpha = 1;
  }
  function drawGrid() {
    ctx!.strokeStyle = GRID_LINE;
    ctx!.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx!.beginPath();
      ctx!.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx!.lineTo(BOARD_X + c * BLOCK, BOARD_Y + BOARD_H);
      ctx!.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx!.beginPath();
      ctx!.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx!.lineTo(BOARD_X + BOARD_W, BOARD_Y + r * BLOCK);
      ctx!.stroke();
    }
  }
  function drawNext() {
    const NB = 30;
    const shape = next.shape;
    const boxX = PANEL_X;
    const boxY = 56;
    // Marco de la vista NEXT.
    ctx!.strokeStyle = "rgba(255,255,255,0.18)";
    ctx!.lineWidth = 1;
    ctx!.strokeRect(boxX, boxY, NEXT_BOX, NEXT_BOX);
    // Pieza centrada en una rejilla 4x4 dentro del marco.
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(boxX, boxY, offX + c, offY + r, shape[r][c], NB);
  }
  function drawPanel() {
    ctx!.textAlign = "left";
    ctx!.textBaseline = "alphabetic";
    // Etiqueta NEXT + su vista.
    ctx!.fillStyle = "rgba(255,255,255,0.6)";
    ctx!.font = "14px monospace";
    ctx!.fillText("NEXT", PANEL_X, 40);
    drawNext();
    // Contadores.
    const rows: [string, string][] = [
      ["SCORE", score.toLocaleString()],
      ["LINES", String(lines)],
      ["LEVEL", String(level)],
    ];
    let y = 236;
    for (const [label, value] of rows) {
      ctx!.fillStyle = "rgba(255,255,255,0.6)";
      ctx!.font = "14px monospace";
      ctx!.fillText(label, PANEL_X, y);
      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 28px monospace";
      ctx!.fillText(value, PANEL_X, y + 32);
      y += 80;
    }
  }
  function draw() {
    // Fondo del canvas.
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);
    // Fondo del tablero + marco.
    ctx!.fillStyle = "#0a0a12";
    ctx!.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    drawGrid();
    ctx!.strokeStyle = "rgba(255,255,255,0.25)";
    ctx!.lineWidth = 1;
    ctx!.strokeRect(BOARD_X + 0.5, BOARD_Y + 0.5, BOARD_W - 1, BOARD_H - 1);
    // Tablero (piezas fijadas).
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(BOARD_X, BOARD_Y, c, r, board[r][c], BLOCK);
    // Pieza fantasma (ghost) a alpha 0.2.
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            BOARD_X,
            BOARD_Y,
            current.x + c,
            gy + r,
            current.shape[r][c],
            BLOCK,
            0.2,
          );
    // Pieza actual.
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            BOARD_X,
            BOARD_Y,
            current.x + c,
            current.y + r,
            current.shape[r][c],
            BLOCK,
          );
    drawPanel();
  }
  // ── Loop principal ────────────────────────────────────────────────────────
  // dt en milisegundos para preservar dropInterval/dropAccum del original.
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;
    if (!gameOver) {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
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
  }
  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    lastTime = null;
    gameOverEmitted = false;
    next = randomPiece();
    spawn();
  }
  // ── Teclado web ───────────────────────────────────────────────────────────
  // Flechas y Space hacen preventDefault para no hacer scroll de la pagina.
  const GAME_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
  ]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    // Soft/hard drop y line clears pueden cambiar score/level: refleja ya.
    syncReactState();
  };
  // ── API publica (ciclo de vida) ───────────────────────────────────────────
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      initGame();
      paused = false;
      // Tetris no tiene vidas: el HUD de la plataforma renderiza 0 como "—".
      callbacks.onLives(0);
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
      // tenga un dt de 0 y no acumule el tiempo en pausa (sin salto de caida).
      startLoop();
    },
    restart() {
      stopLoop();
      initGame();
      paused = false;
      callbacks.onLives(0);
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
