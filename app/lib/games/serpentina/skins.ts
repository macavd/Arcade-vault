// Paletas de skin para SERPENTINA (Snake) — SPEC 11.
//
// Un skin es una paleta nombrada que agrupa por rol los colores que el motor
// (engine.ts) antes incrustaba en draw()/drawFood()/drawSnake(). El motor
// resuelve su paleta una vez con getSerpentinaSkin(skin) y lee cada rol al
// pintar, sin colores sueltos.
//
// A diferencia de ROCAS (cuyo look de partida era "clasico"), el look actual
// del motor de SERPENTINA es el verde fosforescente con glow: ese es el skin
// "neon". El default "clasico" se disena nuevo, sobrio y sin glow, legible
// sobre el CRT oscuro. Anclaje: la portada .cover-snake usa verde (--green
// #00ff88) sobre un fondo verde muy oscuro — esa es la identidad de catalogo.
// El sprite de la fruta (atlas de imagen) NO se retine; el skin solo cubre el
// circulo de reserva que se dibuja mientras el atlas carga.
import type { GameSkin } from "../types";
export interface SerpentinaPalette {
  bg: string; // fondo del canvas (oscuro propio del skin)
  grid: string; // trazo de la rejilla (rgba con su propio alpha tenue)
  head: string; // cabeza de la serpiente
  body: string; // segmentos del cuerpo
  eye: string; // ojos: recorte sobre la cabeza; suele igualar bg
  foodFallback: string; // circulo de reserva de la fruta (mientras carga el atlas)
  glowColor: string; // shadowColor de los segmentos
  glowHead: number; // shadowBlur de la cabeza (0 = sin glow)
  glowBody: number; // shadowBlur del cuerpo
}
const SKINS: Record<GameSkin, SerpentinaPalette> = {
  // Sobrio: verde contenido monocromo sobre verde-negro profundo, sin glow.
  // El default seguro, legible sin el brillo saturado del look de partida.
  clasico: {
    bg: "#060a08",
    grid: "rgba(120, 200, 160, 0.06)",
    head: "#8fe3b4",
    body: "#4ea883",
    eye: "#060a08",
    foodFallback: "#e8556e",
    glowColor: "#4ea883",
    glowHead: 0,
    glowBody: 0,
  },
  // Verde fosforescente con glow: reproduce exactamente el look de partida del
  // motor (eco del --green de .cover-snake), vibrante sobre negro verdoso.
  neon: {
    bg: "#05080a",
    grid: "rgba(0, 255, 160, 0.05)",
    head: "#5dffb0",
    body: "#17c98a",
    eye: "#05080a",
    foodFallback: "#ff3b6b",
    glowColor: "#00ffa0",
    glowHead: 16,
    glowBody: 8,
  },
  // Fosforo vintage: ambar sobre negro calido muy oscuro (no marron medio, que
  // bajaria el contraste), fruta de reserva verde fosforo para distinguirla del
  // ambar, y glow tenue.
  retro: {
    bg: "#0d0a04",
    grid: "rgba(255, 176, 0, 0.05)",
    head: "#ffcf5a",
    body: "#d49a2e",
    eye: "#0d0a04",
    foodFallback: "#7ae582",
    glowColor: "#ffcf5a",
    glowHead: 6,
    glowBody: 3,
  },
};
export function getSerpentinaSkin(
  skin: GameSkin = "clasico",
): SerpentinaPalette {
  return SKINS[skin];
}
