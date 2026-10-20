// Sprites de "BLOQUE BUSTER" portados desde
// references/started-games/04-arkanoid/assets/spritesheet.js a TypeScript.
//
// El spritesheet (paleta, pelota, bloques por color y 4 frames de explosion
// por color) se sirve como asset estatico desde public/games/bloque-buster/.
// loadSpritesheet() cachea la imagen a nivel de modulo —es un asset inmutable,
// no estado de juego— y mantiene un flag "listo"; drawSprite/drawFrame hacen
// no-op hasta que la imagen ha cargado, para no romper el render del loop.
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
// Explosiones: 4 frames por color, 150 ms de duracion total.
export const EXPLOSION_DURATION = 150;
export const EXPLOSION_FRAMES: Record<string, SpriteRect[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};
const SPRITES: {
  paddle: SpriteRect;
  ball: SpriteRect;
  blocks: Record<string, SpriteRect>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};
// Ruta del asset servido por Next desde public/games/bloque-buster/.
const SRC = "/games/bloque-buster/spritesheet-breakout.png";
// Cache de modulo: la imagen se carga una sola vez y se comparte entre
// instancias del motor. ssLoaded distingue "cargando" de "listo".
let ssImg: HTMLImageElement | null = null;
let ssLoaded = false;
const ssCallbacks: Array<() => void> = [];
// Carga el spritesheet (idempotente). Si ya esta listo, llama cb al momento;
// si esta cargando, encola cb; la primera llamada dispara la peticion.
export function loadSpritesheet(cb?: () => void): void {
  if (ssLoaded) {
    cb?.();
    return;
  }
  if (cb) ssCallbacks.push(cb);
  if (ssImg) return; // ya hay una carga en curso
  const image = new Image();
  image.onload = () => {
    ssLoaded = true;
    const pending = ssCallbacks.splice(0);
    for (const f of pending) f();
  };
  image.onerror = () =>
    console.error("No se pudo cargar el spritesheet de bloque-buster");
  image.src = SRC;
  ssImg = image; // marca "cargando" para evitar peticiones duplicadas
}
export function isSpritesheetReady(): boolean {
  return ssLoaded;
}
// Dibuja un frame de animacion (explosiones). No-op hasta que carga la imagen.
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: SpriteRect,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!ssLoaded || !ssImg) return;
  ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
// Dibuja un sprite por nombre: "paddle", "ball" o "block_<color>".
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!ssLoaded || !ssImg) return;
  let sp: SpriteRect | undefined;
  if (name.startsWith("block_")) sp = SPRITES.blocks[name.slice(6)];
  else if (name === "paddle") sp = SPRITES.paddle;
  else if (name === "ball") sp = SPRITES.ball;
  if (!sp) return;
  ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
