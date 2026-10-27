// Paletas de skin para ROCAS (Asteroids) — SPEC 10.
//
// Un skin es una paleta nombrada que agrupa por rol los colores que el motor
// (engine.ts) antes incrustaba en sus draw*. El motor resuelve su paleta una
// vez con getAsteroidsSkin(skin) y lee cada rol al pintar, sin colores sueltos.
//
// Valores afinados con /frontend-design (Paso 5, SPEC 10) respetando las reglas
// de contraste sobre el CRT oscuro. Anclaje: la portada .cover-rocas usa fondo
// navy profundo (#0a0a30→#000), nave amarilla (--yellow #f5ff00) y estrellas
// cian (--cyan #00f5ff) — esa es la identidad de catalogo de rocas, de la que
// parte el skin neon. "clasico" reproduce el look de partida del motor
// (vectores blancos sobre negro, sin glow) y es el default seguro.
import type { GameSkin } from "../types";
export interface AsteroidsPalette {
  bg: string; // fondo del canvas (oscuro propio del skin)
  vector: string; // trazo de nave, asteroides, balas, iconos de vida, texto HUD, titulo overlay
  thrust: string; // llama del propulsor
  accent: string; // power-up 3x e indicador HUD
  particle: string; // base RGB de las particulas ("r, g, b"); el alpha lo aplica el motor
  textDim: string; // subtitulo del overlay
  glowColor: string; // color del shadowColor
  glowBlur: number; // shadowBlur en px; 0 = sin glow (preserva el look plano de clasico)
}
const SKINS: Record<GameSkin, AsteroidsPalette> = {
  // Fiel al arcade: vectores casi blancos sobre negro, sin glow.
  clasico: {
    bg: "#000000",
    vector: "#ffffff",
    thrust: "rgba(255, 130, 0, 0.85)",
    accent: "#00ffff",
    particle: "255, 255, 255",
    textDim: "rgba(255, 255, 255, 0.65)",
    glowColor: "#ffffff",
    glowBlur: 0,
  },
  // CRT vibrante de la plataforma: casco amarillo (--yellow de .cover-rocas)
  // sobre navy profundo (eco del cover), acento cian complementario (--cyan,
  // las estrellas del cover) y glow amarillo moderado que realza sin quemar.
  neon: {
    bg: "#06061a",
    vector: "#f5ff00",
    thrust: "rgba(255, 140, 26, 0.9)",
    accent: "#00f5ff",
    particle: "245, 255, 0",
    textDim: "rgba(245, 255, 0, 0.6)",
    glowColor: "#f5ff00",
    glowBlur: 10,
  },
  // Fosforo vintage: ambar sobre negro calido muy oscuro (no marron medio, que
  // bajaria el contraste), acento verde fosforo para distinguirlo del ambar y
  // glow tenue.
  retro: {
    bg: "#0d0a04",
    vector: "#ffb000",
    thrust: "rgba(255, 140, 40, 0.85)",
    accent: "#3be86b",
    particle: "255, 176, 0",
    textDim: "rgba(255, 176, 0, 0.55)",
    glowColor: "#ffb000",
    glowBlur: 4,
  },
};
export function getAsteroidsSkin(skin: GameSkin = "clasico"): AsteroidsPalette {
  return SKINS[skin];
}
