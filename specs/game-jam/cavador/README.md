# Game jam 2026-11-26 — tema "cavador" (Dig Dug)

Juego base sorteado de `references/game-suggestions-todo.md` (entrada `cavador`, tanda 2026-10-21): **Dig Dug**. Consiste en excavar túneles e inflar bichos sobre terreno destructible: el jugador crea el laberinto mientras juega.

En este jam salen **dos variantes jugables distintas** del mismo juego base. Cada una tiene su propio slug de catálogo y una spec completa: catálogo + leaderboard + motor + táctil. Las dos están en `Draft`.

| #   | Spec                                                     | Slug               | Título           | Cat / color    | Variante                                                                                                                                                          |
| --- | -------------------------------------------------------- | ------------------ | ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [`01-cavador-clasico.md`](./01-cavador-clasico.md)       | `cavador`          | CAVADOR          | ARCADE/yellow  | **Clásico** fiel al arcade: tiempo real, bomba de aire (4 estadios de inflado), dragones con fuego, modo fantasma, rocas, verdura de bonus y rondas infinitas con RNG sembrado. |
| 02  | [`02-cavador-derrumbe.md`](./02-cavador-derrumbe.md)     | `cavador-derrumbe` | CAVADOR DERRUMBE | PUZZLE/cyan    | **Twist**: por turnos y determinista, **sin bomba** (solo se mata aplastando con rocas, con empuje y cascadas), presupuesto de pico, deshacer y 12 niveles a mano con solución verificable. |

## Dependencias y orden sugerido

- La spec 02 **reutiliza** los módulos compartidos que crea la 01 (`app/lib/games/cavador/{constants,palette,terrain,draw}.ts`). Si solo se aprueba la 02, los pasos 2 y 4 de la 01 pasan a ser su paso 0.
- No hay prototipo de Dig Dug en `references/started-games/`: las dos variantes **necesitan prototipo nuevo** en `references/started-games/09-dig-dug/` (`game.js` para el clásico y `derrumbe.js` para la variante). El número `09` evita chocar con `06`–`08`, reservados por otras specs de game-jam.

## Siguiente paso

Revisar las specs, pasar a `Approved` la que se elija (o las dos, primero la 01) y ejecutar `/spec-impl` sobre ella.
