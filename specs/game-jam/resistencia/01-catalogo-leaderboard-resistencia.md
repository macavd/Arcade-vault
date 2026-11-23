# SPEC 01 (game-jam/resistencia) — Catálogo + leaderboard de "RESISTENCIA" (Enduro)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-23
> **Objective:** Dar de alta el juego `resistencia` (RESISTENCIA, un Enduro) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-resistencia`.

---

## Por qué existe esta spec

Esta mini game jam parte de la esencia de Road Fighter (TURBOVÍA): conducir a toda velocidad por una carretera con scroll vertical, esquivando tráfico sin morir, con control **continuo** de un vehículo (no saltos por rejilla como Frogger/RANARIA). RESISTENCIA lleva esa misma esencia a un arquetipo distinto: **Enduro** (Activision, 1983), una carrera de resistencia sin fin dividida en **jornadas**: cada jornada exige adelantar una cuota de coches antes de que se agote, mientras el ciclo día/noche, la lluvia, la nieve y la niebla reducen la visibilidad y la tracción. No duplica a TURBOVÍA (que es un esquive puro sin cuota ni ciclo climático) ni a ningún otro juego del catálogo.

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06), de modo que RESISTENCIA aparezca ya en la home, la biblioteca, el salón y el detalle con su portada y puntuaciones. El **motor jugable** va en `02-motor-resistencia`; hasta que ese se implemente, `/jugar/resistencia` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `resistencia` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de 12 filas en `scores` para `game_id = 'resistencia'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-resistencia` en `app/globals.css` (se diseñará con `/frontend-design` en la implementación).

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `02-motor-resistencia`, `resistencia` queda como maqueta (sin entrada en `registry.ts`).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar el motor de ROCAS (SPEC 05) ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre tras los juegos actuales; se concreta en implementación leyendo el `MAX(position)` real):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'resistencia',
  'RESISTENCIA',
  'Sobrevive una carrera sin fin: adelanta coches antes de que caiga la noche.',
  'Pilotas un bolido en una carretera infinita con scroll vertical que atraviesa dias y noches, lluvia y nieve. Cada jornada exige adelantar una cuota de coches antes de que se acabe; un roce contra el trafico o el arcen a toda velocidad te saca de la pista. La visibilidad cae de noche y en la niebla: solo ves los faros traseros del trafico. Cuantos mas dias de resistencia aguantes y mas coches adelantes, mas alto marcas.',
  'ARCADE',
  'cover-resistencia',
  'magenta',
  54200,
  '6.1K',
  <next_position>
);
```

**Siembra de `scores`** (nombres 1–10 chars del set del prototipo, score 0..100000000, decrecientes y plausibles respecto al `best = 54200`):

```sql
insert into public.scores (game_id, name, score) values
  ('resistencia', 'PX_KAI',    54200),
  ('resistencia', 'NEONFOX',   49800),
  ('resistencia', 'VECTORX',   45600),
  ('resistencia', 'Z3R0COOL',  41200),
  ('resistencia', 'SCANLINE',  37400),
  ('resistencia', 'CYBER_LU',  33100),
  ('resistencia', 'M00NRYU',   29300),
  ('resistencia', 'BIT_LORD',  25400),
  ('resistencia', 'RGB_QUEEN', 21600),
  ('resistencia', 'JOY_STK',   17800),
  ('resistencia', 'ATARI_KID', 14200),
  ('resistencia', 'PIXEL_DAD', 10500);
```

**Portada** `.cover-resistencia` en `app/globals.css` (base `.cover-bg` + pseudo-elementos, color neón `var(--magenta)`). Diseño: carretera en perspectiva vertical con un ciclo día/noche sugerido (mitad superior más oscura con faros traseros, mitad inferior iluminada), el bólido del jugador abajo. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`): leer el `MAX(position)` actual de `games` y hacer `insert into public.games (...)` con la fila de RESISTENCIA (`position = MAX+1`) y `insert into public.scores (...)` con las 12 filas sembradas. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio: `games` solo lectura, `scores` lectura + insert validado).
2. **Portada.** Añadir `.cover-resistencia` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
3. **Verificación** de que `generate_typescript_types` no hace falta (son inserts, no cambia el esquema), y verificación manual (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'resistencia'`, `cat = 'ARCADE'`, `color = 'magenta'` y `cover = 'cover-resistencia'`; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas para `game_id = 'resistencia'` con puntuaciones decrecientes; el leaderboard de `resistencia` no sale vacío.
- [ ] RESISTENCIA aparece en `/` (home), `/games` (biblioteca), `/salon` (tab) y `/juego/resistencia` (detalle) leyendo desde la BD, con la portada `.cover-resistencia`.
- [ ] `POST /api/scores` con `{ gameId: "resistencia", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] Mientras no exista `02-motor-resistencia`, `/jugar/resistencia` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motor (`02-motor-resistencia`), para que el juego exista en la plataforma aunque el motor llegue después.
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best = 54200` y `plays = '6.1K'` como columnas de display sembradas, no derivadas en vivo; la siembra de `scores` es coherente con ese `best`.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **Sí (supuesto documentado, decidido de forma autónoma sin entrevista):** `cat = ARCADE` y `color = magenta`. Enduro es un arcade de conducción/resistencia (no SHOOTER: no dispara; no VERSUS: no hay un rival directo, el reto es la cuota de jornada); el magenta da variedad de color frente a TURBOVÍA (cyan) dentro de la familia de conducción.
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

- El motor jugable de `resistencia` (va en `02-motor-resistencia`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
