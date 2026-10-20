// Registro de motores de juego por id del catalogo (app/lib/data.ts).
//
// Asocia cada id con la fabrica de su motor. Los ids sin motor registrado
// resuelven a null y el reproductor (app/jugar/[id]) conserva la maqueta.
// "rocas" resuelve al motor de Asteroids (SPEC 05) y "caida" al de Tetris
// (SPEC 07); el patron deja enchufables los demas ids (p.ej. Arkanoid
// "bloque-buster") sin tocar el reproductor.
import type { GameFactory } from "./types";
import { createAsteroidsGame } from "./asteroids/engine";
import { createCaidaGame } from "./caida/engine";
const REGISTRY: Record<string, GameFactory | undefined> = {
  rocas: createAsteroidsGame,
  caida: createCaidaGame,
  // bloque-buster, serpentina, gloton, invasores, ranaria, duelo-pixel
  // → undefined (maqueta)
};
export function getGameEngine(id: string): GameFactory | null {
  return REGISTRY[id] ?? null;
}
