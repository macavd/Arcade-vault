// Registro de motores de juego por id del catalogo (app/lib/data.ts).
//
// Asocia cada id con la fabrica de su motor. Los ids sin motor registrado
// resuelven a null y el reproductor (app/jugar/[id]) conserva la maqueta.
// Hoy solo "rocas" resuelve a un motor real (Asteroids); el patron deja
// enchufables a futuro Tetris ("caida") y Arkanoid ("bloque-buster") sin
// tocar el reproductor.
import type { GameFactory } from "./types";
import { createAsteroidsGame } from "./asteroids/engine";
const REGISTRY: Record<string, GameFactory | undefined> = {
  rocas: createAsteroidsGame,
  // bloque-buster, caida, serpentina, gloton, invasores, ranaria, duelo-pixel
  // → undefined (maqueta)
};
export function getGameEngine(id: string): GameFactory | null {
  return REGISTRY[id] ?? null;
}
