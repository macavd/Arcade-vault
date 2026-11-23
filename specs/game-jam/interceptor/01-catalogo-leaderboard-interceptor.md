# SPEC 01 (game-jam/interceptor) — Catálogo + leaderboard de "INTERCEPTOR" (Spy Hunter)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-23
> **Objective:** Dar de alta el juego `interceptor` (INTERCEPTOR, un Spy Hunter) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-interceptor`.

---

## Por qué existe esta spec

Esta mini game jam parte de la esencia de Road Fighter (TURBOVÍA): un vehículo a toda velocidad en una vía con scroll vertical, control continuo, sin morir en el intento. INTERCEPTOR lleva esa esencia a **Spy Hunter** (Bally Midway, 1983): un coche espía armado por una autopista de varios carriles, perseguido por agentes rivales que intentan embestirlo, dispararlo o bloquearle el paso. A diferencia de TURBOVÍA (esquive puro) y de CAUDAL (disparo a objetivos fijos/depósitos), aquí el peligro es **activo y persigue al jugador**: los rivales maniobran para interceptarlo, lo que encaja con la categoría VERSUS del catálogo (carreras/combate contra la CPU, mismo encaje que ASFALTO/Pole Position en el to-do). No duplica ningún juego del catálogo.

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06), de modo que INTERCEPTOR aparezca ya en la home, la biblioteca, el salón y el detalle con su portada y puntuaciones. El **motor jugable** va en `02-motor-interceptor`; hasta que ese se implemente, `/jugar/interceptor` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `interceptor` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de 12 filas en `scores` para `game_id = 'interceptor'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-interceptor` en `app/globals.css` (se diseñará con `/frontend-design` en la implementación).

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `02-motor-interceptor`, `interceptor` queda como maqueta (sin entrada en `registry.ts`).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar el motor de ROCAS (SPEC 05) ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre tras los juegos actuales; se concreta en implementación leyendo el `MAX(position)` real):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'interceptor',
  'INTERCEPTOR',
  'Autopista de alto riesgo: dispara y embiste a los agentes rivales antes de que te cacen.',
  'Conduces un coche espia armado por una autopista de varios carriles con scroll vertical, perseguido por una oleada de agentes rivales que intentan embestirte, dispararte o cerrarte el paso. Alterna entre esquivar el trafico civil y enfrentarte a los coches enemigos con ametralladora y aceite para la calzada; una furgoneta de apoyo te repone armamento si la alcanzas a tiempo. Un choque a fondo o quedarte sin blindaje te saca de la carretera. Cuantos mas agentes derribes y mas lejos llegues, mas alto marcas.',
  'VERSUS',
  'cover-interceptor',
  'yellow',
  68900,
  '5.8K',
  <next_position>
);
```

**Siembra de `scores`** (nombres 1–10 chars del set del prototipo, score 0..100000000, decrecientes y plausibles respecto al `best = 68900`):

```sql
insert into public.scores (game_id, name, score) values
  ('interceptor', 'PX_KAI',    68900),
  ('interceptor', 'NEONFOX',   63200),
  ('interceptor', 'VECTORX',   57800),
  ('interceptor', 'Z3R0COOL',  52400),
  ('interceptor', 'SCANLINE',  47100),
  ('interceptor', 'CYBER_LU',  41900),
  ('interceptor', 'M00NRYU',   36700),
  ('interceptor', 'BIT_LORD',  31500),
  ('interceptor', 'RGB_QUEEN', 26300),
  ('interceptor', 'JOY_STK',   21100),
  ('interceptor', 'ATARI_KID', 16400),
  ('interceptor', 'PIXEL_DAD', 11800);
```

**Portada** `.cover-interceptor` en `app/globals.css` (base `.cover-bg` + pseudo-elementos, color neón `var(--yellow)`). Diseño: autopista de varios carriles en perspectiva vertical, el coche espía amarillo del jugador abajo y siluetas de agentes rivales convergiendo desde arriba. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`): leer el `MAX(position)` actual de `games` y hacer `insert into public.games (...)` con la fila de INTERCEPTOR (`position = MAX+1`) y `insert into public.scores (...)` con las 12 filas sembradas. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio: `games` solo lectura, `scores` lectura + insert validado).
2. **Portada.** Añadir `.cover-interceptor` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
3. **Verificación** de que `generate_typescript_types` no hace falta (son inserts, no cambia el esquema), y verificación manual (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'interceptor'`, `cat = 'VERSUS'`, `color = 'yellow'` y `cover = 'cover-interceptor'`; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas para `game_id = 'interceptor'` con puntuaciones decrecientes; el leaderboard de `interceptor` no sale vacío.
- [ ] INTERCEPTOR aparece en `/` (home), `/games` (biblioteca), `/salon` (tab) y `/juego/interceptor` (detalle) leyendo desde la BD, con la portada `.cover-interceptor`.
- [ ] `POST /api/scores` con `{ gameId: "interceptor", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] Mientras no exista `02-motor-interceptor`, `/jugar/interceptor` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motor (`02-motor-interceptor`), para que el juego exista en la plataforma aunque el motor llegue después.
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best = 68900` y `plays = '5.8K'` como columnas de display sembradas, no derivadas en vivo; la siembra de `scores` es coherente con ese `best`.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **Sí (supuesto documentado, decidido de forma autónoma sin entrevista):** `cat = VERSUS` y `color = yellow`. Spy Hunter enfrenta al jugador a rivales de la CPU que maniobran activamente para interceptarlo (combate vehicular dirigido, no solo esquive ni disparo a objetivos fijos), igual que ASFALTO (Pole Position) está catalogado VERSUS en el to-do; el yellow da variedad de color dentro de la tanda (RESISTENCIA magenta, CAUDAL green).
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

- El motor jugable de `interceptor` (va en `02-motor-interceptor`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
