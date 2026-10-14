// app/lib/data.ts — tipos estáticos y constantes de UI del catálogo.
// Desde SPEC 06 el catálogo y las puntuaciones viven en Supabase (tablas
// `games` y `scores`); aquí solo quedan los tipos compartidos y las
// categorías de filtro, que son estáticas y no necesitan base de datos.
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string; // slug estable, ej. "rocas"
  title: string;
  short: string; // descripción de tarjeta
  long: string; // descripción de detalle
  cat: GameCategory;
  cover: string; // clase CSS de portada, ej. "cover-rocas"
  color: NeonColor; // color del botón JUGAR
  best: number; // mejor puntuación global (display)
  plays: string; // ej. "12.4K" (display)
}
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
