// Motor de Arkanoid ("BLOQUE BUSTER") portado desde
// references/started-games/04-arkanoid/game.js a TypeScript.
//
// A diferencia del original, NO usa estado global de modulo ni accede a
// document.getElementById: todo el estado (paddle, ball, blocks, explosions,
// lives, score, currentLevel, gameState) vive en el closure de la fabrica y el
// canvas/ctx llegan por parametro. Preserva mecanicas, constantes, niveles y
// feel del original. La resolucion interna es 800x600 (4:3, igual que el
// .crt-screen de la SPEC 05), asi que no hay que reproyectar. El HUD, la pausa y
// el modal de fin los gestiona la plataforma: aqui se eliminan el HUD dibujado
// en canvas, los overlays (PAUSA/GAME OVER/victoria) y el selector de nivel del
// original. El estado se notifica a React via callbacks; la victoria (nivel 5
// completado) se trata como fin de partida (onGameOver).
import type { GameCallbacks, GameEngine, GameFactory } from "../types";
import {
  drawFrame,
  drawSprite,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  loadSpritesheet,
} from "./sprites";
import { LEVELS } from "./levels";
export const createBloqueBusterGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2d del canvas");
  const W = 800;
  const H = 600;
  canvas.width = W;
  canvas.height = H;
  // ── Constantes (preservadas del original) ─────────────────────────────────
  const PADDLE_SPEED = 400;
  const BLOCK_COLS = 10;
  const BLOCK_W = 64;
  const BLOCK_H = 24;
  const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
  const BLOCKS_ORIGIN_Y = 80;
  const BASE_BALL_VX = 200;
  const BASE_BALL_VY = -300;
  // ── Estado del juego ──────────────────────────────────────────────────────
  const paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
  interface Block {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    alive: boolean;
  }
  interface Explosion {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    elapsed: number;
  }
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let currentLevel = 1;
  let gameState: "playing" | "gameover" | "win" = "playing";
  // ── Audio ─────────────────────────────────────────────────────────────────
  // Efectos cortos; se reproducen con cloneNode() para permitir solapamiento.
  // Los clones activos se rastrean para poder detenerlos en destroy().
  const bounceSound = new Audio("/games/bloque-buster/ball-bounce.mp3");
  const breakSound = new Audio("/games/bloque-buster/break-sound.mp3");
  const activeAudio = new Set<HTMLAudioElement>();
  function playSound(base: HTMLAudioElement) {
    const node = base.cloneNode() as HTMLAudioElement;
    activeAudio.add(node);
    node.addEventListener("ended", () => activeAudio.delete(node));
    void node.play().catch(() => {});
  }
  // ── Input ─────────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.key)) {
      e.preventDefault();
      keys[e.key] = true;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.key)) {
      e.preventDefault();
      keys[e.key] = false;
    }
  };
  // Raton sobre el canvas: mapea clientX al sistema de coordenadas interno.
  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };
  // ── Helpers de juego ──────────────────────────────────────────────────────
  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }
  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * level.speed;
    ball.vy = BASE_BALL_VY * level.speed;
  }
  function collideAABB(block: Block) {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }
  function initGame() {
    score = 0;
    lives = 3;
    gameState = "playing";
    gameOverEmitted = false;
    initPaddle();
    loadLevel(1);
  }
  // ── Update ────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (gameState !== "playing") return;
    // Paddle (teclado; el raton se aplica directamente en onMouseMove)
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebotes contra muros (izq, der, arriba)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }
    // Rebote contra la paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }
    // Colision con bloques (uno por frame)
    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else gameState = "win";
        }
        break;
      }
    }
    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameState = "gameover";
      } else {
        initBall();
      }
    }
  }
  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);
    for (const block of blocks) {
      if (block.alive)
        drawSprite(
          ctx!,
          "block_" + block.color,
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }
    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawFrame(
        ctx!,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    }
    drawSprite(ctx!, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite(ctx!, "ball", ball.x, ball.y, ball.w, ball.h);
  }
  // ── Puente a React (callbacks solo ante cambios) ──────────────────────────
  let lastScore = -1;
  let lastLives = -1;
  let lastLevel = -1;
  let gameOverEmitted = false;
  function syncReactState() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    if (lives !== lastLives) {
      lastLives = lives;
      callbacks.onLives(lives);
    }
    if (currentLevel !== lastLevel) {
      lastLevel = currentLevel;
      callbacks.onLevel(currentLevel);
    }
    // Derrota (sin vidas) y victoria (nivel 5 completado) cierran la partida.
    if ((gameState === "gameover" || gameState === "win") && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
  }
  // ── Loop principal ────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let paused = false;
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    syncReactState();
    rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (rafId === null) {
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
  function stopAudio() {
    for (const a of activeAudio) a.pause();
    activeAudio.clear();
  }
  // ── API publica (ciclo de vida) ───────────────────────────────────────────
  return {
    start() {
      loadSpritesheet();
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("mousemove", onMouseMove);
      initGame();
      paused = false;
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
      // lastTime se resetea en startLoop para que el primer dt tras reanudar
      // sea 0 y no provoque un salto de simulacion.
      startLoop();
    },
    restart() {
      initGame();
      paused = false;
      syncReactState();
      startLoop();
    },
    destroy() {
      stopLoop();
      stopAudio();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
};
