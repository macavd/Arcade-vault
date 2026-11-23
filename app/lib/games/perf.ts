// SPEC 16 — Degradación del glow por hardware/preferencias.
//
// El `shadowBlur` por dibujo (glow CRT) es caro, sobre todo en GPUs móviles.
// Esta utilidad devuelve un multiplicador para el `shadowBlur` de los motores
// según el dispositivo, SIN tocar la lógica de dibujo: cada motor multiplica su
// valor de glow por `glowScale()` una sola vez al instanciarse.
//
//   - prefers-reduced-motion: reduce  → 0  (sin glow: el frame más barato)
//   - pointer: coarse (táctil/móvil)  → 0.5 (glow atenuado, aún reconocible)
//   - desktop (pointer: fine)         → 1  (se conserva el look de cada skin)
//
// SSR-safe: sin `window`/`matchMedia` devuelve 1 (desktop) para no romper el
// render en servidor; el motor solo corre en cliente, donde ya hay matchMedia.
export function glowScale(): number {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return 1;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  if (window.matchMedia("(pointer: coarse)").matches) return 0.5;
  return 1;
}
