# SPEC 01 (game-jam/patrulla-lunar) — Catálogo + leaderboard de "PATRULLA LUNAR" (Moon Patrol)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-10-23
> **Objective:** Dar de alta el juego `patrulla-lunar` (PATRULLA LUNAR, un Moon Patrol) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-patrulla-lunar`.

---

## Por qué existe esta spec

La game jam "Cruzar obstáculos sin morir en el intento" agrupa juegos de atravesar un escenario peligroso esquivando peligros en movimiento. El tercer título, complementario a RANARIA (a pie) y TURBOVÍA (conduciendo), es **PATRULLA LUNAR**, un **Moon Patrol** (Irem, 1982): pilotas un buggy lunar que avanza por un terreno hostil con scroll horizontal y debes **saltar cráteres y minas** mientras **disparas** rocas que caen y OVNIs que te bombardean, para cruzar la ruta sin reventar. Encaja de lleno en el tema —cruzar un terreno peligroso sin morir— pero aporta una mecánica distinta a las otras dos: auto-runner con **salto + disparo**, lo que además mete una pizca de SHOOTER y color yellow para dar variedad a la tanda.

No duplica ningún juego del catálogo: ROCAS e INVASORES son shooters estáticos de nave; aquí el eje es el avance y la esquiva saltando. Esta spec entrega solo el **alta en catálogo y la siembra del leaderboard** (patrón SPEC 06); el **motor jugable** va en `02-motor-patrulla-lunar` y hasta entonces `/jugar/patrulla-lunar` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `patrulla-lunar` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de ~12 filas en `scores` para `game_id = 'patrulla-lunar'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-patrulla-lunar` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `02-motor-patrulla-lunar`, `patrulla-lunar` queda como maqueta (sin entrada en `registry.ts`).
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar el motor de ROCAS (SPEC 05) ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre tras los juegos actuales; se concreta en implementación leyendo el `MAX(position)` real):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'patrulla-lunar',
  'PATRULLA LUNAR',
  'Salta cráteres y revienta rocas cruzando la Luna.',
  'Tu buggy avanza imparable por un suelo lunar lleno de cráteres y minas. Salta los hoyos, dispara hacia delante a las rocas y hacia arriba a los OVNIs que te bombardean, y encadena checkpoints sin que el casco se haga chatarra. El terreno se vuelve más cruel en cada tramo.',
  'SHOOTER',
  'cover-patrulla-lunar',
  'yellow',
  64250,
  '7.1K',
  <next_position>
);
```

**Siembra de `scores`** (nombres 1–10 chars del set del prototipo, score 0..100000000, decrecientes y plausibles respecto al `best = 64250`):

```sql
insert into public.scores (game_id, name, score) values
  ('patrulla-lunar', 'PX_KAI',   64250),
  ('patrulla-lunar', 'DROID_X',  59800),
  ('patrulla-lunar', 'NEONFOX',  54120),
  ('patrulla-lunar', 'VAULT_07', 48900),
  ('patrulla-lunar', 'GLITCHA',  43600),
  ('patrulla-lunar', 'M00NRYU',  38750),
  ('patrulla-lunar', 'SCANLINE', 33400),
  ('patrulla-lunar', 'ARKADYA',  28200),
  ('patrulla-lunar', 'RETROVIRA',23100),
  ('patrulla-lunar', 'BIT_LORD', 18400),
  ('patrulla-lunar', 'JOY_STK',  13600),
  ('patrulla-lunar', 'MAGENTA88',9200);
```

**Portada** `.cover-patrulla-lunar` en `app/globals.css` (base `.cover-bg` + pseudo-elementos, color neón `var(--yellow)`). Diseño: un horizonte lunar amarillo-neón con cráteres, un buggy de ruedas grandes a la izquierda saltando y un OVNI pequeño arriba. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`): leer el `MAX(position)` actual de `games` y hacer `insert into public.games (...)` con la fila de PATRULLA LUNAR (`position = MAX+1`) y `insert into public.scores (...)` con las ~12 filas sembradas. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio).
2. **Portada.** Añadir `.cover-patrulla-lunar` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
3. **Verificación** de que `generate_typescript_types` no hace falta (son inserts, no cambia el esquema), y verificación manual (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'patrulla-lunar'`, `cat = 'SHOOTER'`, `color = 'yellow'` y `cover = 'cover-patrulla-lunar'`; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene ~12 filas para `game_id = 'patrulla-lunar'` con puntuaciones decrecientes; el leaderboard no sale vacío.
- [ ] PATRULLA LUNAR aparece en `/` (home), `/games` (biblioteca), `/salon` (tab) y `/juego/patrulla-lunar` (detalle) leyendo desde la BD, con la portada `.cover-patrulla-lunar`.
- [ ] `POST /api/scores` con `{ gameId: "patrulla-lunar", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] Mientras no exista `02-motor-patrulla-lunar`, `/jugar/patrulla-lunar` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motor (`02-motor-patrulla-lunar`).
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best = 64250` y `plays = '7.1K'` como columnas de display sembradas, no derivadas en vivo; la siembra de `scores` es coherente con ese `best`.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **Sí (supuesto documentado):** `cat = SHOOTER` y `color = yellow`. Moon Patrol combina esquiva (saltar cráteres) con disparo (rocas/OVNIs); se clasifica como SHOOTER para dar variedad de categoría a la tanda (RANARIA y TURBOVÍA son ARCADE) y el yellow completa el reparto de color (green/cyan/yellow).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                                                        | Mitigación                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `position` codificado a mano colisiona o deja huecos si el catálogo cambió.                                                   | Calcular `position = MAX(position)+1` en la migración leyendo el valor real, no asumir un número.       |
| El slug `patrulla-lunar` con guion debe casar exactamente con `cover-patrulla-lunar` y con la clave del `registry.ts` futuro. | Usar el mismo slug kebab-case en los tres sitios; verificar en el detalle que la portada resuelve.      |
| `INSERT` público en `scores` permite spam.                                                                                    | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec. |

---

## Qué **no** está en esta spec

- El motor jugable de `patrulla-lunar` (va en `02-motor-patrulla-lunar`).
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
