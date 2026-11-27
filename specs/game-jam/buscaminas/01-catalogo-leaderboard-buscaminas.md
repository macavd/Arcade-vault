# SPEC 01 (game-jam/buscaminas) — Catálogo + leaderboard de "BUSCAMINAS" (Minesweeper clásico)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-27
> **Objective:** Dar de alta el juego `buscaminas` (BUSCAMINAS, un Minesweeper clásico) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-buscaminas`.

---

## Por qué existe esta spec

La game jam del 2026-11-27 toma como juego base el **Buscaminas** (entrada `buscaminas` de "Pendientes de spec" en `references/game-suggestions-todo.md`) y propone tres variantes; el razonamiento completo está en `00-jam.md`. Esta es la **variante clásica**: rejilla rectangular, minas ocultas, números que cuentan las minas vecinas, banderas, primer clic seguro y una sola vida. Es el primer juego del catálogo **dirigido por puntero** y de **deducción pura**, y el segundo de la categoría PUZZLE (tras `caida`).

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06), para que BUSCAMINAS aparezca en la home, la biblioteca, el salón y el detalle con su portada y puntuaciones. El **motor jugable** va en `02-motor-buscaminas`; hasta que ese se implemente, `/jugar/buscaminas` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `buscaminas` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de 12 filas en `scores` para `game_id = 'buscaminas'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-buscaminas` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `02-motor-buscaminas`, `buscaminas` queda como maqueta (sin entrada en `registry.ts`).
- Las variantes `zapador` y `panal` (tienen sus propias specs en esta carpeta).
- Sonido, anti-cheat, auth real / vincular scores a usuario, skins.
- Tocar los motores existentes ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre; se calcula en la migración con el `MAX(position)` real, no se asume un número):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'buscaminas',
  'BUSCAMINAS',
  'Despeja el campo sin pisar una sola mina.',
  'Cada número te dice cuántas minas rodean esa casilla: deduce, marca con banderas y despeja el campo entero. El primer clic siempre es seguro. Supera Principiante, Intermedio y Experto, y aguanta en Experto+ todo lo que puedas: cada casilla limpia suma, cada tablero completado da bonus y terminar rápido da más. Una sola mina y se acabó.',
  'PUZZLE',
  'cover-buscaminas',
  'green',
  48750,
  '6.2K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

**Siembra de `scores`** (nombres 1–10 chars del set del prototipo, score entero `0..100000000`, decrecientes y coherentes con `best = 48750`):

```sql
insert into public.scores (game_id, name, score) values
  ('buscaminas', 'PX_KAI',    48750),
  ('buscaminas', 'NEONFOX',   44120),
  ('buscaminas', 'VECTORX',   39860),
  ('buscaminas', 'Z3R0COOL',  35410),
  ('buscaminas', 'SCANLINE',  30980),
  ('buscaminas', 'CYBER_LU',  26350),
  ('buscaminas', 'M00NRYU',   21740),
  ('buscaminas', 'BIT_LORD',  17200),
  ('buscaminas', 'RGB_QUEEN', 12890),
  ('buscaminas', 'JOY_STK',    9460),
  ('buscaminas', 'ATARI_KID',  6130),
  ('buscaminas', 'PIXEL_DAD',  3270);
```

**Coherencia de la siembra con el motor** (`02-motor-buscaminas`): completar Principiante da ≈ 2 000 pts, Intermedio ≈ 7 800 y Experto ≈ 19 700 (acumulado ≈ 29 500 al terminar el tablero 3). Un `best` de 48 750 equivale a una partida que completa Experto y avanza bien en Experto+ (tablero 4): alto pero alcanzable. Las filas bajas (3 270, 6 130) son partidas que mueren en el tablero 2.

**Portada** `.cover-buscaminas` en `app/globals.css` (base `.cover-bg` + `::before`/`::after`, color neón `var(--green)`). Diseño: una rejilla de casillas tapadas en perspectiva leve con un claro abierto en el centro mostrando números neón (1, 2, 3), una bandera triangular verde clavada en una casilla y una mina con glow pulsante en una esquina. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`, nombre `seed_buscaminas`): `insert into public.games (...)` con la fila de BUSCAMINAS (`position` calculado con `MAX+1` en la propia sentencia) e `insert into public.scores (...)` con las 12 filas. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio: `games` solo lectura, `scores` lectura + insert validado).
2. **Portada.** Añadir `.cover-buscaminas` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
3. **Tipos.** No se regenera `app/lib/supabase/database.types.ts`: son inserts, el esquema no cambia.
4. **Verificación manual** (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'buscaminas'`, `cat = 'PUZZLE'`, `color = 'green'` y `cover = 'cover-buscaminas'`, con `position` = máximo previo + 1; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas para `game_id = 'buscaminas'` con puntuaciones decrecientes; el leaderboard de `buscaminas` no sale vacío y su primera fila es `48 750`.
- [ ] BUSCAMINAS aparece en `/` (home), `/games` (biblioteca, también al filtrar por PUZZLE), `/salon` (tab) y `/juego/buscaminas` (detalle) leyendo desde la BD, con la portada `.cover-buscaminas`.
- [ ] `POST /api/scores` con `{ gameId: "buscaminas", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` no entero/negativo responde `{ ok:false }` 400.
- [ ] Mientras no exista `02-motor-buscaminas`, `/jugar/buscaminas` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motor (`02-motor-buscaminas`), para que el juego exista en la plataforma aunque el motor llegue después.
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best = 48750` y `plays = '6.2K'` como columnas de display sembradas, no derivadas en vivo; la siembra de `scores` es coherente con ese `best` y con la fórmula del motor.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **Sí (supuesto documentado):** se conserva el slug `buscaminas` de la entrada original del To-Do (2026-10-21) y sus valores `PUZZLE/green`. Es la variante fiel; las otras dos variantes llevan slugs nuevos.
- **Sí (supuesto documentado):** `position` calculado en la misma sentencia (`select coalesce(max(position), 0) + 1`), porque varias variantes de esta jam podrían darse de alta en cualquier orden.
- **No:** usar el tiempo en segundos como score: el leaderboard ordena descendente; el tiempo entra como bonus (ver `02-motor-buscaminas`).
- **No:** sonido, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                         | Mitigación                                                                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `position` colisiona si otra variante de la jam se da de alta a la vez.        | `MAX+1` calculado dentro de la sentencia de la migración; las migraciones se aplican de una en una.                                |
| El `best` sembrado no es alcanzable con la fórmula real del motor.            | La siembra se calibró con la fórmula de `02-motor-buscaminas`; si el motor cambia constantes, ajustar `best` y la siembra en la misma PR. |
| `INSERT` público en `scores` permite spam.                                     | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                            |
| La portada (rejilla fina) se ve como ruido en el tamaño de tarjeta.            | Diseñar con `/frontend-design` probando en los tamaños reales de `/games`, `/` y el detalle; pocas casillas grandes, no muchas finas. |

---

## Qué **no** está en esta spec

- El motor jugable de `buscaminas` (va en `02-motor-buscaminas`).
- Las variantes `zapador` y `panal`.
- Sonido y efectos de audio.
- Skins del juego.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
