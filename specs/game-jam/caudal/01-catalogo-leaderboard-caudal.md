# SPEC 01 (game-jam/caudal) — Catálogo + leaderboard de "CAUDAL" (River Raid)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-23
> **Objective:** Dar de alta el juego `caudal` (CAUDAL, un River Raid) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-caudal`.

---

## Por qué existe esta spec

Esta mini game jam parte de la esencia de Road Fighter (TURBOVÍA): un vehículo a toda velocidad en scroll vertical, control continuo, esquivando el entorno sin morir. CAUDAL lleva esa esencia a **River Raid** (Activision, 1982): en vez de un coche en carretera, el jugador pilota un caza ligero río abajo, esquivando las orillas, puentes e islas, y debe además **disparar** depósitos de combustible para repostar en vuelo y a enemigos (barcos, helicópteros) que le cierran el paso. El control sigue siendo continuo (no saltos por rejilla), pero añade un eje de combate y de gestión de combustible que lo distingue de TURBOVÍA y de RESISTENCIA. No duplica ningún juego del catálogo.

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06), de modo que CAUDAL aparezca ya en la home, la biblioteca, el salón y el detalle con su portada y puntuaciones. El **motor jugable** va en `02-motor-caudal`; hasta que ese se implemente, `/jugar/caudal` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `caudal` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de 12 filas en `scores` para `game_id = 'caudal'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-caudal` en `app/globals.css` (se diseñará con `/frontend-design` en la implementación).

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `02-motor-caudal`, `caudal` queda como maqueta (sin entrada en `registry.ts`).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar el motor de ROCAS (SPEC 05) ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre tras los juegos actuales; se concreta en implementación leyendo el `MAX(position)` real):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'caudal',
  'CAUDAL',
  'Pilota un reactor rio abajo: dispara depositos de combustible y esquiva las orillas.',
  'Vuelas un caza ligero sobre un rio infinito con scroll vertical. El cauce se estrecha y se abre entre puentes, islas y orillas que no perdonan un roce; dispara a los depositos de combustible para repostar en pleno vuelo y a los barcos y helicopteros rivales que salen a tu paso. Quedarte sin combustible o chocar contra la orilla, un puente o un enemigo te hace estallar. Cuanta mas distancia recorras y mas objetivos destruyas, mas alto marcas.',
  'SHOOTER',
  'cover-caudal',
  'green',
  71300,
  '7.4K',
  <next_position>
);
```

**Siembra de `scores`** (nombres 1–10 chars del set del prototipo, score 0..100000000, decrecientes y plausibles respecto al `best = 71300`):

```sql
insert into public.scores (game_id, name, score) values
  ('caudal', 'PX_KAI',    71300),
  ('caudal', 'NEONFOX',   65900),
  ('caudal', 'VECTORX',   60200),
  ('caudal', 'Z3R0COOL',  55100),
  ('caudal', 'SCANLINE',  49800),
  ('caudal', 'CYBER_LU',  44300),
  ('caudal', 'M00NRYU',   39600),
  ('caudal', 'BIT_LORD',  34700),
  ('caudal', 'RGB_QUEEN', 29900),
  ('caudal', 'JOY_STK',   25100),
  ('caudal', 'ATARI_KID', 20300),
  ('caudal', 'PIXEL_DAD', 15600);
```

**Portada** `.cover-caudal` en `app/globals.css` (base `.cover-bg` + pseudo-elementos, color neón `var(--green)`). Diseño: un río sinuoso visto desde arriba con orillas verdes fosforescentes, un puente atravesándolo y el caza del jugador en la parte inferior. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`): leer el `MAX(position)` actual de `games` y hacer `insert into public.games (...)` con la fila de CAUDAL (`position = MAX+1`) y `insert into public.scores (...)` con las 12 filas sembradas. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio: `games` solo lectura, `scores` lectura + insert validado).
2. **Portada.** Añadir `.cover-caudal` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
3. **Verificación** de que `generate_typescript_types` no hace falta (son inserts, no cambia el esquema), y verificación manual (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'caudal'`, `cat = 'SHOOTER'`, `color = 'green'` y `cover = 'cover-caudal'`; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas para `game_id = 'caudal'` con puntuaciones decrecientes; el leaderboard de `caudal` no sale vacío.
- [ ] CAUDAL aparece en `/` (home), `/games` (biblioteca), `/salon` (tab) y `/juego/caudal` (detalle) leyendo desde la BD, con la portada `.cover-caudal`.
- [ ] `POST /api/scores` con `{ gameId: "caudal", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] Mientras no exista `02-motor-caudal`, `/jugar/caudal` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motor (`02-motor-caudal`), para que el juego exista en la plataforma aunque el motor llegue después.
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best = 71300` y `plays = '7.4K'` como columnas de display sembradas, no derivadas en vivo; la siembra de `scores` es coherente con ese `best`.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **Sí (supuesto documentado, decidido de forma autónoma sin entrevista):** `cat = SHOOTER` y `color = green`. River Raid combina esquive de terreno con disparo activo a depósitos/enemigos, lo que lo distingue de RESISTENCIA (ARCADE, puro esquive) y de TURBOVÍA (ARCADE, cyan); el green aporta variedad de color y es consistente con que la fila sembrada original de RANARIA también usa green dentro de la familia "cruzar sin morir" sin colisionar (slugs distintos).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                      | Mitigación                                                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `position` codificado a mano colisiona o deja huecos si el catálogo cambió. | Calcular `position = MAX(position)+1` en la migración leyendo el valor real, no asumir un número.          |
| `INSERT` público en `scores` permite spam.                                  | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.    |
| La portada CSS se ve recargada en el tamaño de tarjeta.                     | Diseñar con `/frontend-design` probando en los tamaños reales de `/games`, `/` y el detalle.               |

---

## Qué **no** está en esta spec

- El motor jugable de `caudal` (va en `02-motor-caudal`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
