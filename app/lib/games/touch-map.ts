// Configuración de controles táctiles por juego (SPEC 13).
//
// El overlay de React (TouchControls) sintetiza los MISMOS eventos de teclado
// que los motores ya leen sobre `window`, sin tocar ningún engine.ts. Cada
// acción táctil es un botón que, al pulsarse, despacha un KeyboardEvent con
// `code` Y `key` fijados a la vez: rocas/caida/serpentina leen `e.code`,
// bloque-buster lee `e.key`, así un mismo despachador sirve para los cuatro.
// Una acción táctil = un botón del overlay que sintetiza una tecla.
// hold=true  → keydown al tocar, keyup al soltar (empuje/rotación/pala mantenida).
// hold=false → keydown+keyup en el mismo toque (disparo, giro, mover pieza).
export interface TouchAction {
  label: string; // glifo/etiqueta del botón, p. ej. "◄", "▲", "⟳", "⦿"
  code: string; // KeyboardEvent.code que leen rocas/caída/serpentina (p. ej. "ArrowUp", "Space", "KeyX")
  key: string; // KeyboardEvent.key que lee bloque-buster (p. ej. "ArrowLeft", " ")
  hold: boolean;
  slot:
    | "dpad-left"
    | "dpad-right"
    | "dpad-up"
    | "dpad-down"
    | "action-a"
    | "action-b";
}
// Un juego puede usar botones, arrastre de canvas, o ambos.
export interface TouchScheme {
  buttons: TouchAction[];
  canvasDrag?: boolean; // true solo en bloque-buster (pala por arrastre)
}
// Esquema por juego. Las teclas se toman de los motores actuales, no se inventan:
// - rocas (Asteroids, SPEC 05): e.code — ArrowLeft/Right rotar (hold), ArrowUp empuje (hold), Space disparar (tap).
// - caida (Tetris, SPEC 07): e.code — ArrowLeft/Right mover (tap), ArrowDown soft-drop (tap), ArrowUp rotar (tap), Space hard-drop (tap).
// - bloque-buster (Arkanoid, SPEC 08): e.key — pala por arrastre (canvasDrag) + ArrowLeft/Right (hold) como alternativa.
// - serpentina (Snake, SPEC 09): e.code — ArrowLeft/Right/Up/Down girar (tap).
export const TOUCH_MAP: Record<string, TouchScheme> = {
  rocas: {
    buttons: [
      {
        label: "◄",
        code: "ArrowLeft",
        key: "ArrowLeft",
        hold: true,
        slot: "dpad-left",
      },
      {
        label: "►",
        code: "ArrowRight",
        key: "ArrowRight",
        hold: true,
        slot: "dpad-right",
      },
      {
        label: "▲",
        code: "ArrowUp",
        key: "ArrowUp",
        hold: true,
        slot: "action-b",
      },
      { label: "⦿", code: "Space", key: " ", hold: false, slot: "action-a" },
    ],
  },
  caida: {
    buttons: [
      {
        label: "◄",
        code: "ArrowLeft",
        key: "ArrowLeft",
        hold: false,
        slot: "dpad-left",
      },
      {
        label: "►",
        code: "ArrowRight",
        key: "ArrowRight",
        hold: false,
        slot: "dpad-right",
      },
      {
        label: "▼",
        code: "ArrowDown",
        key: "ArrowDown",
        hold: false,
        slot: "dpad-down",
      },
      {
        label: "⟳",
        code: "ArrowUp",
        key: "ArrowUp",
        hold: false,
        slot: "action-b",
      },
      { label: "⤓", code: "Space", key: " ", hold: false, slot: "action-a" },
    ],
  },
  "bloque-buster": {
    canvasDrag: true,
    buttons: [
      {
        label: "◄",
        code: "ArrowLeft",
        key: "ArrowLeft",
        hold: true,
        slot: "dpad-left",
      },
      {
        label: "►",
        code: "ArrowRight",
        key: "ArrowRight",
        hold: true,
        slot: "dpad-right",
      },
    ],
  },
  serpentina: {
    buttons: [
      {
        label: "◄",
        code: "ArrowLeft",
        key: "ArrowLeft",
        hold: false,
        slot: "dpad-left",
      },
      {
        label: "►",
        code: "ArrowRight",
        key: "ArrowRight",
        hold: false,
        slot: "dpad-right",
      },
      {
        label: "▲",
        code: "ArrowUp",
        key: "ArrowUp",
        hold: false,
        slot: "dpad-up",
      },
      {
        label: "▼",
        code: "ArrowDown",
        key: "ArrowDown",
        hold: false,
        slot: "dpad-down",
      },
    ],
  },
};
