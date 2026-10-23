# SPEC 01 (game-jam/turbovia) — Catálogo + leaderboard de "TURBOVÍA" (Road Fighter)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-10-23
> **Objective:** Dar de alta el juego `turbovia` (TURBOVÍA, un Road Fighter) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-turbovia`.

---

## Por qué existe esta spec

La game jam "Cruzar obstáculos sin morir en el intento" reúne juegos donde el jugador atraviesa un escenario peligroso esquivando peligros en movimiento. Junto a RANARIA (Frogger, a pie) entra **TURBOVÍA**, un **Road Fighter** (Konami, 1984): conduces un bólido en una carretera con scroll vertical y debes **esquivar el tráfico y los bordes** a toda velocidad para avanzar lo máximo posible sin estrellarte. Es el mismo tema —cruzar/esquivar sin morir— pero con una mecánica distinta a la de Frogger: control continuo de un vehículo veloz en vez de saltos por rejilla. No duplica ningún juego del catálogo (ni ROCAS, ni INVASORES, ni DUELO PIXEL, ni RANARIA).

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06), de modo que TURBOVÍA aparezca ya en la home, la biblioteca, el salón y el detalle con su portada y puntuaciones. El **motor jugable** va en `02-motor-turbovia`; hasta que ese se implemente, `/jugar/turbovia` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `turbovia` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de ~12 filas en `scores` para `game_id = 'turbovia'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-turbovia` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `02-motor-turbovia`, `turbovia` queda como maqueta (sin entrada en `registry.ts`).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar el motor de ROCAS (SPEC 05) ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre tras los juegos actuales; se concreta en implementación leyendo el `MAX(position)` real):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'turbovia',
  'TURBOVÍA',
  'Esquiva el tráfico a 300 por hora sin rozar un parachoques.',
  'Pilotas un bólido de neón por una autopista infinita con scroll vertical. Zigzaguea entre coches lentos, camiones y los bordes de la pista: un solo roce a toda velocidad y revientas en mil pixeles. Cuanto más lejos llegues y más tráfico adelantes, más alto marcas.',
  'ARCADE',
  'cover-turbovia',
  'cyan',
  87600,
  '8.3K',
  <next_position>
);
```

**Siembra de `scores`** (nombres 1–10 chars del set del prototipo, score 0..100000000, decrecientes y plausibles respecto al `best = 87600`):

```sql
insert into public.scores (game_id, name, score) values
  ('turbovia', 'PX_KAI',   87600),
  ('turbovia', 'NEONFOX',  81240),
  ('turbovia', 'VECTORX',  75900),
  ('turbovia', 'Z3R0COOL', 69850),
  ('turbovia', 'SCANLINE', 63400),
  ('turbovia', 'CYBER_LU', 57120),
  ('turbovia', 'M00NRYU',  51300),
  ('turbovia', 'BIT_LORD', 45680),
  ('turbovia', 'RGB_QUEEN',39900),
  ('turbovia', 'JOY_STK',  33450),
  ('turbovia', 'ATARI_KID',27800),
  ('turbovia', 'PIXEL_DAD',21200);
```

**Portada** `.cover-turbovia` en `app/globals.css` (base `.cover-bg` + pseudo-elementos, color neón `var(--cyan)`). Diseño: una autopista en perspectiva/vertical con líneas divisorias cian desplazándose, dos o tres coches rivales y el bólido del jugador abajo. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`): leer el `MAX(position)` actual de `games` y hacer `insert into public.games (...)` con la fila de TURBOVÍA (`position = MAX+1`) y `insert into public.scores (...)` con las ~12 filas sembradas. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio: `games` solo lectura, `scores` lectura + insert validado).
2. **Portada.** Añadir `.cover-turbovia` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
3. **Verificación** de que `generate_typescript_types` no hace falta (son inserts, no cambia el esquema), y verificación manual (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'turbovia'`, `cat = 'ARCADE'`, `color = 'cyan'` y `cover = 'cover-turbovia'`; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene ~12 filas para `game_id = 'turbovia'` con puntuaciones decrecientes; el leaderboard de `turbovia` no sale vacío.
- [ ] TURBOVÍA aparece en `/` (home), `/games` (biblioteca), `/salon` (tab) y `/juego/turbovia` (detalle) leyendo desde la BD, con la portada `.cover-turbovia`.
- [ ] `POST /api/scores` con `{ gameId: "turbovia", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] Mientras no exista `02-motor-turbovia`, `/jugar/turbovia` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motor (`02-motor-turbovia`), para que el juego exista en la plataforma aunque el motor llegue después.
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best = 87600` y `plays = '8.3K'` como columnas de display sembradas, no derivadas en vivo; la siembra de `scores` es coherente con ese `best`.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **Sí (supuesto documentado):** `cat = ARCADE` y `color = cyan`. Road Fighter es un arcade de conducción/esquiva (no SHOOTER ni VERSUS); el cyan da variedad de color dentro de la tanda (RANARIA es green, PATRULLA LUNAR es yellow).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                      | Mitigación                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `position` codificado a mano colisiona o deja huecos si el catálogo cambió. | Calcular `position = MAX(position)+1` en la migración leyendo el valor real, no asumir un número.       |
| `INSERT` público en `scores` permite spam.                                  | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec. |
| La portada CSS se ve recargada en el tamaño de tarjeta.                     | Diseñar con `/frontend-design` probando en los tamaños reales de `/games`, `/` y el detalle.            |

---

## Qué **no** está en esta spec

- El motor jugable de `turbovia` (va en `02-motor-turbovia`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
