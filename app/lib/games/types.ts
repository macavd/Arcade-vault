// Contratos del puente motor de juego <-> React.
// Un motor recibe estos callbacks y los invoca cuando cambia su estado,
// de modo que la capa de UI de la plataforma (HUD, modal de fin) pueda
// reflejar score/vidas/nivel/fin sin conocer los detalles del motor.
export interface GameCallbacks {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
// Ciclo de vida que React controla sobre una instancia de motor.
// destroy() debe cancelar el requestAnimationFrame y quitar los listeners.
export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
}
// Skin seleccionable de un juego: una paleta nombrada que el motor lee en vez
// de incrustar colores. Contrato transversal (SPEC 10): lo heredan todos los
// motores. "clasico" es el default fiel al look de partida de cada juego.
export type GameSkin = "clasico" | "neon" | "retro";
// Una fabrica crea un motor sobre un canvas concreto, cableado a sus callbacks.
// El skin es opcional con default "clasico": los motores que aun no lo usan lo
// ignoran sin romper su firma.
export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin?: GameSkin,
) => GameEngine;
