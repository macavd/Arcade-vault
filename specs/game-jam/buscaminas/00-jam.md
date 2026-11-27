# Game jam 2026-11-27 — tema "buscaminas" (tres variantes de un mismo juego base)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16
> **Date:** 2026-11-27
> **Objective:** Documentar por qué el Buscaminas encaja en Arcade Vault y proponer tres variantes jugables distintas (clásica, scroll infinito y hexagonal), cada una con su slug, sus specs de catálogo+leaderboard y de motor, para que la usuaria elija cuál(es) implementar.

---

## Por qué existe este documento

Esta jam no parte de un tema abstracto sino de **un juego base** elegido al azar entre las entradas `- [ ]` de "Pendientes de spec" de `references/game-suggestions-todo.md`: **`buscaminas`** (BUSCAMINAS · PUZZLE/green · 2026-10-21, "Minesweeper: deducción lógica event-driven, primer clic seguro"). En vez de proponer tres juegos distintos, se proponen **tres variantes jugables del mismo juego base**, que no son duplicados: cada una cambia el eje de la mecánica (rejilla, tiempo, geometría) y tiene su propio slug, color y portada.

Este fichero es el índice y el razonamiento de la jam. Las specs ejecutables (las que se pasan a `/spec-impl`) son las seis de abajo.

---

## Inventario previo (Paso 0)

- **Slugs con motor** (`app/lib/games/registry.ts`): `rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria`.
- **Slugs en catálogo sin motor (maqueta)**: `gloton`, `invasores`, `duelo-pixel`.
- **To-Do de sugerencias**: 23 slugs ya usados (incluido `buscaminas`, que es el juego base de esta jam). Ninguna de las variantes nuevas (`zapador`, `panal`) aparece en él.
- **Carpetas de jam existentes**: `frogger/`, `ranaria/`, `turbovia/`, `patrulla-lunar/`. No se pisan.
- **Prototipos** en `references/started-games/`: solo `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake` (todos portados). **No hay prototipo de Buscaminas**: las tres variantes **necesitan prototipo nuevo**. Los números `06`, `07` y `08` ya están reservados por las specs de jam de Frogger, Road Fighter y Moon Patrol, así que se reservan `09-buscaminas`, `10-zapador` y `11-panal`.
- **Contrato de leaderboard**: `insertScore` (`app/lib/db/scores.ts`) exige `score` **entero** en `0..100 000 000` y `getTopScores` ordena **descendente**. El Buscaminas clásico mide "menos tiempo = mejor", así que las tres variantes deben traducir su resultado a un **score ascendente** (ver "Criterio común de puntuación").

---

## Por qué el Buscaminas encaja en la plataforma

| Criterio            | Encaje                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un jugador          | Sí: es solitario por definición.                                                                                                                                                                                                                                          |
| Puntuable           | Sí, con traducción: casillas seguras reveladas + bonus por tablero limpio + bonus por tiempo. Score siempre ascendente y entero.                                                                                                                                          |
| Canvas 2D           | Sí: rejilla de casillas, números y glifos; sin física. Cabe en `800×600`.                                                                                                                                                                                                 |
| Categoría / color   | PUZZLE es la categoría natural (hoy solo `caida` la ocupa). Las variantes reparten color: green, cyan, yellow.                                                                                                                                                            |
| Estética neón/CRT   | Sí: casillas tapadas como teclas iluminadas, números en colores neón, minas como núcleos con glow.                                                                                                                                                                       |
| Hueco que llena     | Es el primer juego **dirigido por puntero** del catálogo (clic/toque sobre una casilla concreta) y el primero de **deducción pura**: no hay reflejos en la variante clásica. Ningún juego actual (Asteroids, Tetris, Arkanoid, Snake, Frogger) cubre ese eje.             |
| Alcance             | Bajo para la clásica (lógica discreta, sin física ni sprites); medio para la hexagonal (geometría axial); medio-alto para la de scroll (rejilla que se desplaza y se genera sin fin).                                                                                   |

---

## Las tres variantes

| Slug         | Título     | Cat/color      | Twist                                                                                                                                             | Specs                                                                         |
| ------------ | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `buscaminas` | BUSCAMINAS | PUZZLE/green   | **Clásico**: rejilla rectangular, campaña de tableros crecientes (Principiante → Intermedio → Experto → Experto+), primer clic seguro, una vida. | `01-catalogo-leaderboard-buscaminas.md`, `02-motor-buscaminas.md`             |
| `zapador`    | ZAPADOR    | ARCADE/cyan    | **Scroll infinito contrarreloj**: el campo desciende sin parar; cada fila que cruza la línea de detonación con casillas seguras sin abrir cuesta una vida. | `03-catalogo-leaderboard-zapador.md`, `04-motor-zapador.md`                   |
| `panal`      | PANAL      | PUZZLE/yellow  | **Hexagonal**: tablero en forma de gran hexágono de celdas hexagonales (6 vecinos), tableros crecientes, 3 vidas por partida (una mina no acaba la partida). | `05-catalogo-leaderboard-panal.md`, `06-motor-panal.md`                       |

Por qué son variantes y no duplicados:

- **BUSCAMINAS** es la referencia fiel: deducción sin presión de tiempo más allá del bonus, y un error termina la partida.
- **ZAPADOR** cambia el **eje temporal**: la deducción se hace bajo presión (el campo avanza), la partida es infinita y se pierde por desgaste (vidas), no por un único error. Por eso pasa a **ARCADE**: el núcleo es reflejo + lectura rápida.
- **PANAL** cambia la **geometría**: 6 vecinos en vez de 8 cambian por completo los patrones de deducción (no sirven los "1-2-1" clásicos) y obligan a otra lectura del tablero; las 3 vidas lo hacen más amable y distinto en su curva.

Las tres comparten la familia de mecánicas (revelar, banderas, chording, relleno por inundación, primer clic seguro), pero cada motor es **autocontenido** en su carpeta (`app/lib/games/<slug>/engine.ts`), igual que el resto de motores de la plataforma.

---

## Criterio común de puntuación (score ascendente)

El leaderboard ordena de mayor a menor, así que ninguna variante publica "segundos" como score. Reglas comunes:

1. **El score nunca baja** durante una partida (ni por banderas erróneas ni por minas). Así, lo que muestra el HUD en cualquier momento es una puntuación válida si la usuaria pulsa **FIN** en React a mitad de partida (el botón FIN guarda el último `onScore` emitido).
2. **Se puntúa por progreso real**: cada casilla segura revelada suma **una sola vez** (nunca se puede "farmear" revelando dos veces ni poniendo/quitando banderas).
3. **El tiempo solo suma**: un bonus `max(0, PAR − segundos)` al limpiar un tablero; tardar más reduce el bonus pero nunca resta.
4. Siempre **entero** y muy por debajo del tope `100 000 000` de `insertScore`.

---

## Criterio común de controles (teclado + puntero + táctil, SPEC 13)

El Buscaminas necesita **input posicional** (elegir una casilla concreta), que el overlay de la SPEC 13 no puede sintetizar con teclas. Por eso, y solo para esta familia de juegos:

- El motor escucha **Pointer Events** (`pointerdown`/`pointerup`/`pointermove`/`pointercancel`) y `contextmenu` **sobre su propio `<canvas>`**, no sobre `window`. Los Pointer Events unifican ratón y dedo, así que no hay listeners `touch*` específicos. Es el mismo principio que ya usa `bloque-buster` con `mousemove` sobre el canvas.
- Ratón: clic izquierdo revela, clic derecho pone/quita bandera, clic central o clic izquierdo sobre un número hace *chording*.
- Táctil: toque corto revela, **pulsación larga** (350 ms) pone/quita bandera.
- Teclado: cursor de casilla con flechas/WASD, `Space`/`Enter` revela, `F`/`X` bandera, `M` alterna el **modo bandera**.
- El overlay de la SPEC 13 **solo** añade (vía `app/lib/games/touch-map.ts`) un botón `⚑` que sintetiza `KeyM` para alternar el modo bandera, que es la alternativa accesible a la pulsación larga. ZAPADOR añade además un botón mantenido `▼` (avance rápido).

Esto **no contradice** la decisión de la SPEC 13 ("no tocar motores existentes"): son motores nuevos y su input posicional se diseña desde el principio dentro del motor.

---

## Recomendación de orden

Si la usuaria aprueba más de una variante, implementar **primero `buscaminas`** (la más pequeña y la que fija el feel, el render de casillas y el esquema de input) y después `panal` y `zapador` reutilizando ideas de su prototipo. Cada par de specs (catálogo + motor) es independiente: se puede aprobar una sola variante.

---

## Qué no está en esta jam

- Código, prototipos y cambios en Supabase: solo specs en `Draft`.
- Skins de las variantes (las hará `skin-designer`, un juego cada vez).
- Sonido, anti-cheat y auth real.
- Marcar o mover `buscaminas` en el To-Do: lo decide la usuaria tras revisar las specs.
