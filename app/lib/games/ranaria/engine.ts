// Motor de Frogger ("RANARIA") — convierte la maqueta `ranaria` (catálogo y
// leaderboard ya sembrados en SPEC 06) en juego jugable. Portado al patrón de
// motor de SPEC 05 / SPEC 09: una GameFactory que encapsula TODO el estado en
// el closure (sin globales de módulo ni document.getElementById), recibe el
// canvas por parámetro y notifica score/vidas/nivel/fin a React vía callbacks.
// El HUD React (.player-hud) refleja esos valores; el canvas dibuja además su
// propio HUD interno (patrón doble HUD del resto de juegos).
//
// Rejilla 16×12 de celdas de 50px sobre 800×600 (encaja con el aspect-ratio
// 4/3 del .crt-screen). De abajo arriba: fila 11 = acera de salida (segura),
// filas 10–7 = carretera (4 carriles), fila 6 = mediana segura, filas 5–2 =
// río (4 carriles de troncos/tortugas), fila 1 = 5 nenúfares, fila 0 = HUD.
import type {
  GameCallbacks,
  GameEngine,
  GameFactory,
  GameSkin,
} from "../types";
// ── Rejilla / resolución interna ─────────────────────────────────────────────
const CELL = 50;
const COLS = 16;
const ROWS = 12;
const W = COLS * CELL; // 800
const H = ROWS * CELL; // 600
// ── Zonas (índice de fila, 0 = arriba) ───────────────────────────────────────
const ROW_HUD = 0;
const ROW_GOALS = 1;
const ROW_RIVER_TOP = 2;
const ROW_RIVER_BOT = 5;
const ROW_MEDIAN = 6;
const ROW_ROAD_TOP = 7;
const ROW_ROAD_BOT = 10;
const ROW_START = 11;
// ── Ritmo ────────────────────────────────────────────────────────────────────
const DT_CAP = 0.05; // tope de dt (s) anti-spiral tras blur/pausa
const HOP_MS = 120; // duración de la animación de salto
const START_COL = Math.floor(COLS / 2); // columna central de reaparición
const SPEED_PER_LEVEL = 1.15; // cada nivel acelera las entidades un 15%
// Ciclo de inmersión de las tortugas (segundos): visibles dan soporte,
// sumergidas no. Grupos distintos se desfasan con entity.phase.
const TURTLE_VISIBLE = 3.0;
const TURTLE_SUBMERGED = 1.5;
const TURTLE_CYCLE = TURTLE_VISIBLE + TURTLE_SUBMERGED;
// Nenúfares (fila 1): 5 bocas en columnas fijas; entre ellas, orilla mortal.
// Aterrizar en una columna que no sea boca (o en una ya ocupada) mata.
const HOME_COLS = [1, 4, 8, 11, 14];
// Temporizador por cruce (segundos): base 15, se acorta con el nivel con tope.
const TIME_BASE = 15;
const TIME_MIN = 8;
const TIME_PER_LEVEL = 1.5;
type Direction = "up" | "down" | "left" | "right";
// Un nenúfar: columna de aterrizaje y si ya está ocupado en la ronda actual.
interface Home {
  col: number;
  occupied: boolean;
}
// Una entidad ocupa `width` celdas de su carril; `col` es su borde izquierdo en
// unidades de celda (float, para el desplazamiento continuo horizontal).
interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  color: string;
  phase: number; // solo tortugas: desfase (s) del ciclo de inmersión
}
// Un carril es una fila con entidades que se desplazan en un sentido a una
// velocidad (celdas/segundo). `kind` distingue carretera (colisión letal) de
// río (soporte: sobrevivir exige ir montado en una entidad visible).
interface Lane {
  row: number;
  kind: "road" | "river";
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}
// Plantilla de carril por fila. Las velocidades base están en celdas/segundo y
// se escalan por nivel. Sentidos alternos para el feel clásico de Frogger.
interface LaneDef {
  row: number;
  kind: "road" | "river";
  baseSpeed: number;
  dir: 1 | -1;
  type: Entity["type"];
  width: number;
  count: number;
  color: string;
}
const LANE_DEFS: LaneDef[] = [
  // Río (filas 2–5): troncos y tortugas. La rana entra al río por la fila 5.
  {
    row: 5,
    kind: "river",
    baseSpeed: 1.4,
    dir: 1,
    type: "log",
    width: 3,
    count: 2,
    color: "#7a4a24",
  },
  {
    row: 4,
    kind: "river",
    baseSpeed: 1.7,
    dir: -1,
    type: "turtle",
    width: 2,
    count: 3,
    color: "#2fae6b",
  },
  {
    row: 3,
    kind: "river",
    baseSpeed: 1.1,
    dir: 1,
    type: "log",
    width: 4,
    count: 2,
    color: "#8a5528",
  },
  {
    row: 2,
    kind: "river",
    baseSpeed: 1.5,
    dir: -1,
    type: "turtle",
    width: 3,
    count: 2,
    color: "#2fae6b",
  },
  // Carretera (filas 7–10): coches y camiones. La rana entra por la fila 10.
  {
    row: 10,
    kind: "road",
    baseSpeed: 1.8,
    dir: 1,
    type: "car",
    width: 1,
    count: 3,
    color: "#ff4d6d",
  },
  {
    row: 9,
    kind: "road",
    baseSpeed: 1.3,
    dir: -1,
    type: "truck",
    width: 2,
    count: 2,
    color: "#8a8f98",
  },
  {
    row: 8,
    kind: "road",
    baseSpeed: 2.4,
    dir: 1,
    type: "car",
    width: 1,
    count: 3,
    color: "#ffd23f",
  },
  {
    row: 7,
    kind: "road",
    baseSpeed: 1.6,
    dir: -1,
    type: "truck",
    width: 3,
    count: 2,
    color: "#8a8f98",
  },
];
interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms transcurridos de la animación de salto en curso
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
}
export const createRanariaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  // El 3er parámetro (skin) se acepta para cumplir la firma de GameFactory;
  // RANARIA aún no tiene sistema de paletas (getAvailableSkins devuelve null).
  _skin: GameSkin = "clasico",
): GameEngine => {
  const ctx = canvas.getContext("2d")!;
  canvas.width = W;
  canvas.height = H;
  // ── Estado del juego (encapsulado en el closure) ───────────────────────────
  let frog: Frog;
  let score: number;
  let lives: number;
  let level: number;
  let maxRow: number; // fila más alta alcanzada en el cruce actual (para +10/fila)
  let gameOver: boolean;
  let lanes: Lane[] = [];
  let homes: Home[] = [];
  let timer = 0; // segundos restantes del cruce actual
  let elapsed = 0; // segundos acumulados (reloj del ciclo de inmersión)
  let pendingDir: Direction | null = null;
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let paused = false;
  // Espejo de lo ya notificado a React, para emitir callbacks solo ante cambios.
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
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevel(level);
    }
    if (gameOver && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
  }
  // ── Reinicio de estado ──────────────────────────────────────────────────────
  function resetFrog() {
    frog = {
      col: START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      fromCol: START_COL,
      fromRow: ROW_START,
      targetCol: START_COL,
      targetRow: ROW_START,
    };
    maxRow = ROW_START;
  }
  // Construye los carriles del nivel: entidades repartidas con huecos visibles
  // y velocidades escaladas por nivel. Las tortugas de un mismo carril se
  // desfasan el ciclo de inmersión para que no se sumerjan todas a la vez.
  function buildLanes(lvl: number): Lane[] {
    const factor = Math.pow(SPEED_PER_LEVEL, lvl - 1);
    return LANE_DEFS.map((def) => {
      const spacing = COLS / def.count; // separación entre entidades del carril
      const entities: Entity[] = [];
      for (let i = 0; i < def.count; i++) {
        entities.push({
          col: i * spacing + (def.row % 2 === 0 ? 0.5 : 0),
          width: def.width,
          type: def.type,
          color: def.color,
          phase: def.type === "turtle" ? (i * TURTLE_CYCLE) / def.count : 0,
        });
      }
      return {
        row: def.row,
        kind: def.kind,
        speed: def.baseSpeed * factor,
        dir: def.dir,
        entities,
      };
    });
  }
  // Una tortuga está sumergida (no da soporte) en la ventana final de su ciclo.
  function isSubmerged(e: Entity): boolean {
    if (e.type !== "turtle") return false;
    const t = (elapsed + e.phase) % TURTLE_CYCLE;
    return t >= TURTLE_VISIBLE;
  }
  function timeLimitForLevel(lvl: number): number {
    return Math.max(TIME_MIN, TIME_BASE - (lvl - 1) * TIME_PER_LEVEL);
  }
  function resetTimer() {
    timer = timeLimitForLevel(level);
  }
  function initGame() {
    score = 0;
    lives = 3;
    level = 1;
    gameOver = false;
    pendingDir = null;
    elapsed = 0;
    lanes = buildLanes(level);
    homes = HOME_COLS.map((col) => ({ col, occupied: false }));
    resetTimer();
    resetFrog();
    // Resetea el espejo de React para que el primer sync reemita todo.
    lastScore = -1;
    lastLives = -1;
    lastLevel = -1;
    gameOverEmitted = false;
  }
  // ── Input ─────────────────────────────────────────────────────────────────
  // Flechas + WASD. Un salto por pulsación: se encola una sola dirección y el
  // update la consume cuando la rana no está animando.
  const DIRS: Record<string, Direction> = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const d = DIRS[e.code];
    if (!d) return;
    e.preventDefault();
    if (e.repeat) return; // sin auto-repeat: un salto por pulsación física
    pendingDir = d;
  };
  // ── Lógica ──────────────────────────────────────────────────────────────────
  // Avanza cada entidad en su carril; al salir por un borde reaparece por el
  // opuesto (loop continuo). La columna va en unidades de celda.
  function updateLanes(dt: number) {
    for (const lane of lanes) {
      for (const e of lane.entities) {
        e.col += lane.speed * lane.dir * dt;
        if (lane.dir === 1 && e.col >= COLS) e.col = -e.width;
        else if (lane.dir === -1 && e.col + e.width <= 0) e.col = COLS;
      }
    }
  }
  // Inicia un salto de una celda si el destino es válido. Bloquea los bordes
  // laterales y los límites verticales (no se puede pasar de los nenúfares ni
  // bajar de la acera de salida). En los lados, si no hay destino, se ignora.
  function startHop(dir: Direction) {
    // Re-alinea a la rejilla: en el río la rana deriva (col float) montada en un
    // tronco; al saltar vuelve a una columna entera.
    const base = Math.round(frog.col);
    let tc = base;
    let tr = frog.row;
    if (dir === "left") tc = base - 1;
    else if (dir === "right") tc = base + 1;
    else if (dir === "up") tr -= 1;
    else tr += 1;
    if (tc < 0 || tc > COLS - 1) return; // no sale por los lados
    if (tr < ROW_GOALS || tr > ROW_START) return; // tope arriba/abajo
    frog.fromCol = frog.col;
    frog.fromRow = frog.row;
    frog.targetCol = tc;
    frog.targetRow = tr;
    frog.animating = true;
    frog.animT = 0;
  }
  // Nuevo cruce: la rana vuelve a la acera y el temporizador se reinicia, sin
  // perder vida (tras alojar en un nenúfar).
  function newCross() {
    resetFrog();
    resetTimer();
  }
  // Ronda completa: las 5 bocas ocupadas → bonus, sube de nivel (tráfico y
  // corriente más rápidos), se vacían las bocas y empieza un cruce nuevo.
  function completeRound() {
    score += 1000;
    level += 1;
    lanes = buildLanes(level);
    for (const h of homes) h.occupied = false;
    newCross();
  }
  // Llegada a la fila de nenúfares: boca libre → +50 + bonus de tiempo; boca
  // ocupada u orilla (no hay boca en esa columna) → muerte.
  function handleGoal() {
    const home = homes.find((h) => h.col === Math.round(frog.col));
    if (!home || home.occupied) {
      killFrog();
      return;
    }
    home.occupied = true;
    score += 50 + Math.floor(timer) * 10; // +50 + bonus de tiempo (×10)
    if (homes.every((h) => h.occupied)) completeRound();
    else newCross();
  }
  // Se resuelve al completar un salto.
  function resolveLanding() {
    if (frog.row === ROW_GOALS) {
      handleGoal();
      return;
    }
    if (frog.row < maxRow) {
      score += 10; // +10 la primera vez que se alcanza una fila más alta
      maxRow = frog.row;
    }
  }
  // Pierde una vida: reaparece en la acera (y reinicia el temporizador) o, si
  // era la última, fin de partida. (syncReactState emite onLives y, al perder
  // la última, onLives(0)+onGameOver.)
  function killFrog() {
    lives -= 1;
    if (lives <= 0) {
      lives = 0;
      gameOver = true;
      return;
    }
    resetFrog();
    resetTimer();
  }
  // Atropello: cualquier solape 1D con un vehículo del carril es letal.
  function overlapsRoad(lane: Lane, col: number): boolean {
    return lane.entities.some((e) => e.col < col + 1 && e.col + e.width > col);
  }
  // Soporte de río: la entidad visible cuyo rango cubre el centro de la rana, o
  // null (agua descubierta o tortuga sumergida → sin soporte).
  function getSupport(lane: Lane, col: number): Entity | null {
    const center = col + 0.5;
    for (const e of lane.entities) {
      if (isSubmerged(e)) continue;
      if (e.col <= center && center <= e.col + e.width) return e;
    }
    return null;
  }
  // Resuelve el entorno de la celda donde reposa la rana (no en pleno salto):
  // carretera = muerte por atropello; río = muerte por agua, o arrastre con el
  // tronco/tortuga y muerte si la corriente la saca de pantalla.
  function checkEnvironment(dt: number) {
    const lane = lanes.find((l) => l.row === frog.row);
    if (!lane) return; // acera, mediana, nenúfares o HUD: terreno seguro
    if (lane.kind === "road") {
      if (overlapsRoad(lane, frog.col)) killFrog();
      return;
    }
    const support = getSupport(lane, frog.col);
    if (!support) {
      killFrog(); // agua descubierta o tortuga sumergida
      return;
    }
    frog.col += lane.speed * lane.dir * dt; // hereda el desplazamiento
    if (frog.col < 0 || frog.col > COLS - 1) killFrog(); // arrastrada fuera
  }
  function update(dt: number) {
    if (gameOver) return;
    elapsed += dt;
    updateLanes(dt);
    // Temporizador del cruce: agotarlo cuesta una vida (killFrog reinicia el
    // temporizador al reaparecer; si era la última vida, gameOver).
    timer -= dt;
    if (timer <= 0) {
      timer = 0;
      killFrog();
    }
    if (frog.animating) {
      frog.animT += dt * 1000;
      if (frog.animT >= HOP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        frog.animT = 0;
        resolveLanding();
      }
    } else if (pendingDir) {
      startHop(pendingDir);
      pendingDir = null;
    }
    // Entorno: solo cuando la rana está posada (no a mitad de salto).
    if (!frog.animating && !gameOver) checkEnvironment(dt);
  }
  // ── Render ─────────────────────────────────────────────────────────────────
  function rowY(row: number) {
    return row * CELL;
  }
  function drawZones() {
    // Fondo general.
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, W, H);
    // Franja de HUD (fila 0).
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, rowY(ROW_HUD), W, CELL);
    // Nenúfares (fila 1): verde oscuro.
    ctx.fillStyle = "#07160f";
    ctx.fillRect(0, rowY(ROW_GOALS), W, CELL);
    // Río (filas 2–5): azul profundo.
    ctx.fillStyle = "#07243a";
    ctx.fillRect(
      0,
      rowY(ROW_RIVER_TOP),
      W,
      (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL,
    );
    // Mediana (fila 6): verde seguro.
    ctx.fillStyle = "#123a24";
    ctx.fillRect(0, rowY(ROW_MEDIAN), W, CELL);
    // Carretera (filas 7–10): asfalto.
    ctx.fillStyle = "#121216";
    ctx.fillRect(
      0,
      rowY(ROW_ROAD_TOP),
      W,
      (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL,
    );
    // Acera de salida (fila 11): verde seguro.
    ctx.fillStyle = "#123a24";
    ctx.fillRect(0, rowY(ROW_START), W, CELL);
    // Divisorias discontinuas entre carriles de carretera.
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      ctx.beginPath();
      ctx.moveTo(0, rowY(r));
      ctx.lineTo(W, rowY(r));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  function drawFrog() {
    // Durante el salto interpola; en reposo usa la posición real (que en el
    // río deriva con el tronco/tortuga de soporte, paso 4).
    const t = frog.animating ? Math.min(frog.animT / HOP_MS, 1) : 1;
    const col = frog.animating
      ? frog.fromCol + (frog.targetCol - frog.fromCol) * t
      : frog.col;
    const row = frog.animating
      ? frog.fromRow + (frog.targetRow - frog.fromRow) * t
      : frog.row;
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    // Patas: más extendidas a mitad de salto (efecto de impulso).
    const legSpread = frog.animating ? 13 : 10;
    ctx.fillStyle = "#06c56a";
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          cx + sx * legSpread,
          cy + sy * (legSpread - 3),
          4,
          3,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    // Cuerpo: elipse verde brillante.
    ctx.fillStyle = "#00ff88";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Ojos.
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 6, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#04120b";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 6, 1.6, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 6, 1.6, 0, Math.PI * 2);
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
  function drawEntity(e: Entity, row: number) {
    const x = e.col * CELL;
    const y = row * CELL;
    const w = e.width * CELL;
    const pad = 6;
    if (e.type === "car") {
      ctx.fillStyle = e.color;
      roundRect(x + pad, y + pad, w - pad * 2, CELL - pad * 2, 8);
      ctx.fill();
      // Ruedas.
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(x + pad + 7, y + CELL - pad, 4, 0, Math.PI * 2);
      ctx.arc(x + w - pad - 7, y + CELL - pad, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "truck") {
      ctx.fillStyle = e.color;
      roundRect(x + 2, y + pad, w - 4, CELL - pad * 2, 4);
      ctx.fill();
      // Cabina diferenciada en el frente (según el sentido).
      ctx.fillStyle = "#5b6069";
      const cabW = CELL * 0.4;
      ctx.fillRect(x + 2, y + pad, cabW, CELL - pad * 2);
    } else if (e.type === "log") {
      ctx.fillStyle = e.color;
      roundRect(x + 2, y + pad, w - 4, CELL - pad * 2, 10);
      ctx.fill();
      // Vetas del tronco.
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      for (let i = 1; i < e.width; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * CELL, y + pad);
        ctx.lineTo(x + i * CELL, y + CELL - pad);
        ctx.stroke();
      }
    } else {
      // Tortugas: un caparazón por celda. Sumergidas → contorno tenue.
      const submerged = isSubmerged(e);
      for (let i = 0; i < e.width; i++) {
        const ccx = x + i * CELL + CELL / 2;
        const ccy = y + CELL / 2;
        if (submerged) {
          ctx.strokeStyle = "rgba(120, 220, 170, 0.35)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ccx, ccy, CELL / 2 - pad, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(ccx, ccy, CELL / 2 - pad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }
  function drawLanes() {
    for (const lane of lanes) {
      for (const e of lane.entities) drawEntity(e, lane.row);
    }
  }
  // Nenúfares (fila 1): boca verde con borde dorado; ocupada → silueta de rana.
  function drawHomes() {
    const y = rowY(ROW_GOALS);
    for (const h of homes) {
      const x = h.col * CELL;
      ctx.fillStyle = h.occupied ? "#0e3a24" : "#0a241a";
      ctx.strokeStyle = "#d9a441";
      ctx.lineWidth = 2;
      roundRect(x + 4, y + 6, CELL - 8, CELL - 12, 10);
      ctx.fill();
      ctx.stroke();
      if (h.occupied) {
        ctx.fillStyle = "#00ff88";
        ctx.beginPath();
        ctx.ellipse(x + CELL / 2, y + CELL / 2, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Barra de tiempo mínima en la franja de HUD (fila 0); el HUD completo llega
  // en el paso 7. Verde → amarillo → rojo según el tiempo restante.
  function drawTimerBar() {
    const frac = Math.max(0, timer / timeLimitForLevel(level));
    const barW = (W - 20) * frac;
    ctx.fillStyle =
      frac > 0.5 ? "#00ff88" : frac > 0.25 ? "#ffd23f" : "#ff4d6d";
    ctx.fillRect(10, rowY(ROW_HUD) + CELL - 12, barW, 6);
  }
  // HUD interno del canvas (patrón doble HUD): score, nivel y vidas en la
  // franja superior; la barra de tiempo se dibuja aparte.
  function drawHUD() {
    const midY = rowY(ROW_HUD) + CELL / 2 - 5;
    ctx.font = "16px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8f6ff";
    ctx.textAlign = "left";
    ctx.fillText("PTS " + score, 12, midY);
    ctx.textAlign = "center";
    ctx.fillText("NIV " + String(level).padStart(2, "0"), W / 2, midY);
    // Vidas restantes como iconos de rana.
    for (let i = 0; i < lives; i++) {
      const icx = W - 16 - i * 22;
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(icx, midY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#04120b";
      ctx.beginPath();
      ctx.arc(icx - 2.6, midY - 2, 1.4, 0, Math.PI * 2);
      ctx.arc(icx + 2.6, midY - 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function draw() {
    drawZones();
    drawLanes();
    drawHomes();
    drawFrog();
    drawHUD();
    drawTimerBar();
  }
  // ── Loop principal ───────────────────────────────────────────────────────────
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, DT_CAP);
    lastTime = ts;
    if (!gameOver) update(dt);
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
      lastTime = null; // primer dt = 0 tras (re)arrancar/reanudar: sin salto
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
  // ── API pública (ciclo de vida) ──────────────────────────────────────────────
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      initGame();
      paused = false;
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
      startLoop();
    },
    restart() {
      stopLoop();
      initGame();
      paused = false;
      syncReactState();
      startLoop();
    },
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
