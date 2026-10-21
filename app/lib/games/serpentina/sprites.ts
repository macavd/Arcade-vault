// Atlas de sprites de fruta para SERPENTINA (Snake).
//
// Portado de references/started-games/05-snake/sprites.js (antes
// window.SPRITE_ATLAS) a TypeScript, sin tocar el objeto global. Las
// coordenadas {x, y, w, h} son recortes dentro de fruits.png, que se sirve
// como asset estatico desde public/games/serpentina/.
// Recorte de un sprite dentro de la hoja de origen.
export interface FruitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
// Frutas (fila mediana de fruits.png, y=136..295, 160px de alto).
export const FRUITS: Record<string, FruitRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};
// Claves estables para elegir una fruta al azar sin reconstruir el array.
export const FRUIT_KEYS = Object.keys(FRUITS);
// Ruta del asset servido por Next desde public/games/serpentina/.
const SRC = "/games/serpentina/fruits.png";
// Cache de modulo: la imagen se carga una sola vez y se comparte entre
// instancias del motor. fruitsLoaded distingue "cargando" de "listo".
let fruitsImg: HTMLImageElement | null = null;
let fruitsLoaded = false;
const fruitsCallbacks: Array<() => void> = [];
// Carga fruits.png (idempotente). Si ya esta listo, llama cb al momento;
// si esta cargando, encola cb; la primera llamada dispara la peticion.
export function loadFruits(cb?: () => void): void {
  if (fruitsLoaded) {
    cb?.();
    return;
  }
  if (cb) fruitsCallbacks.push(cb);
  if (fruitsImg) return; // ya hay una carga en curso
  const image = new Image();
  image.onload = () => {
    fruitsLoaded = true;
    const pending = fruitsCallbacks.splice(0);
    for (const f of pending) f();
  };
  image.onerror = () =>
    console.error("No se pudo cargar el sprite de frutas de serpentina");
  image.src = SRC;
  fruitsImg = image; // marca "cargando" para evitar peticiones duplicadas
}
export function isFruitsReady(): boolean {
  return fruitsLoaded;
}
// Imagen ya cargada, o null mientras carga (el motor dibuja un circulo de
// reserva hasta que este lista).
export function getFruitsImage(): HTMLImageElement | null {
  return fruitsLoaded ? fruitsImg : null;
}
