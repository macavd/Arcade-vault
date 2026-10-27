// Registro de skins disponibles por juego, para el selector de tema de la UI.
//
// Solo los juegos cuyo motor lee una paleta (ver <slug>/skins.ts) aparecen
// aqui; el resto ignora el parametro skin de GameFactory y no debe mostrar
// selector. Mantener en sincronia con los modulos de paleta por juego.
// Implementados: rocas (app/lib/games/asteroids/skins.ts, SPEC 10),
// serpentina (app/lib/games/serpentina/skins.ts, SPEC 11),
// bloque-buster (app/lib/games/bloque-buster/skins.ts, SPEC 12).
import type { GameSkin } from "./types";
// Etiquetas legibles de cada skin para la UI (los 3 son transversales).
export const SKIN_LABELS: Record<GameSkin, string> = {
  clasico: "Clásico",
  neon: "Neón",
  retro: "Retro",
};
const SKINNED_GAMES: Record<string, GameSkin[] | undefined> = {
  rocas: ["clasico", "neon", "retro"],
  serpentina: ["clasico", "neon", "retro"],
  "bloque-buster": ["clasico", "neon", "retro"],
};
// Skins disponibles de un juego, o null si no tiene sistema de skins (no se
// muestra selector). El primero es el default.
export function getAvailableSkins(id: string): GameSkin[] | null {
  return SKINNED_GAMES[id] ?? null;
}
