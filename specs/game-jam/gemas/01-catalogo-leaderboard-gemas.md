# SPEC 01 (game-jam/gemas) — Catálogo + leaderboard de "GEMAS" y "GEMAS BOMBA" (Match-3)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-25
> **Objective:** Dar de alta en `games` las dos variantes del Match-3 —`gemas` (GEMAS, clásico) y `gemas-bomba` (GEMAS BOMBA, con bombas de cuenta atrás)— y sembrar un leaderboard independiente para cada una en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolas listas para los motores de `02-motor-gemas-clasico` y `03-motor-gemas-bomba`.

---

## Por qué existe esta spec

El game-planner propuso **GEMAS** (tanda 2026-10-21, carril puzzle) como Match-3 al estilo Bejeweled: intercambiar dos gemas adyacentes para alinear 3 o más del mismo tipo, con cascadas que se resuelven en bucle hasta que el tablero se estabiliza. Esta game jam lo desarrolla en **dos variantes jugables del mismo juego base**:

- **GEMAS** (`gemas`) — el Match-3 clásico sin límite de tiempo ni de movimientos: la partida termina cuando no queda ningún intercambio válido en el tablero.
- **GEMAS BOMBA** (`gemas-bomba`) — mismo núcleo, pero aparecen **gemas bomba con cuenta atrás** que restan una vida si llegan a cero, y alinear 4+ crea una **gema nova** que explota en 3×3 y sirve para desactivarlas. Aquí el tablero sin movimientos se baraja en vez de acabar la partida.

Las dos variantes comparten motor (un núcleo Match-3 común parametrizado por reglas), pero **no comparten leaderboard**: una partida sin fin que muere por bloqueo y una partida a 3 vidas contra bombas producen puntuaciones de escala y significado distintos, así que mezclarlas en un mismo ranking sería injusto. Por eso cada variante es **un slug propio** con su fila en `games` y sus filas en `scores`.

Esta spec entrega solo el **alta en el catálogo y la siembra de los dos leaderboards** (patrón SPEC 06), de modo que ambas variantes aparezcan ya en la home, la biblioteca, el salón y el detalle con su portada y puntuaciones. Los motores van en las specs hermanas; hasta que se implementen, `/jugar/gemas` y `/jugar/gemas-bomba` muestran la maqueta genérica.

---

## Scope

**In:**

- Alta de **dos filas** en la tabla `games` vía migración (`gemas` y `gemas-bomba`, campos del Data model), respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de **12 filas** en `scores` para `game_id = 'gemas'` y otras **12** para `game_id = 'gemas-bomba'`, para que ninguno de los dos leaderboards salga vacío.
- Dos clases de portada en `app/globals.css`: `.cover-gemas` y `.cover-gemas-bomba`, diseñadas con `/frontend-design`.
- Documentar el **flujo de puntuaciones** de las variantes: el reproductor guarda con el `id` de la ruta, así que cada variante escribe y lee su propio leaderboard sin cambios en `POST /api/scores`, `insertScore` ni `getTopScores`.

**Out of scope (para futuras specs):**

- Los motores jugables: `02-motor-gemas-clasico` (`gemas`) y `03-motor-gemas-bomba` (`gemas-bomba`). Hasta entonces ninguno de los dos slugs tiene entrada en `registry.ts`.
- Una tercera variante contrarreloj (estilo Bejeweled Blitz) u otras: irían con su propio slug y su propia spec.
- Un selector de modo dentro de una única ficha de juego (ver Decisions).
- Sonido, anti-cheat, auth real / vincular scores a usuario, derivar `best`/`plays` en vivo.
- Tocar los contratos de la SPEC 06, la API de scores o los motores existentes.

---

## Data model

Esta spec **no crea tablas nuevas** (ya existen `games` y `scores` de la SPEC 06) y **no cambia el esquema**. Añade **datos** y **dos portadas**.

**Registro de variantes: un slug por variante.**

| Variante  | `id` (slug)   | Título      | `cat`  | `color`   | Portada              | Motor (spec)                                          |
| --------- | ------------- | ----------- | ------ | --------- | -------------------- | ----------------------------------------------------- |
| Clásico   | `gemas`       | GEMAS       | PUZZLE | `magenta` | `.cover-gemas`       | `createGemasGame` (`02-motor-gemas-clasico`)          |
| Con twist | `gemas-bomba` | GEMAS BOMBA | PUZZLE | `yellow`  | `.cover-gemas-bomba` | `createGemasBombaGame` (`03-motor-gemas-bomba`)       |

Ambos slugs son kebab-case ASCII y no colisionan con ningún `id` de catálogo, motor del registry (`rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria`), maqueta (`gloton`, `invasores`, `duelo-pixel`) ni entrada del To-Do de sugerencias.

**Filas a insertar en `games`** (`position` = siguientes libres; se concretan en implementación leyendo el `MAX(position)` real):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values
(
  'gemas',
  'GEMAS',
  'Intercambia gemas, alinea tres y desata cascadas de neón.',
  'Un tablero de 8×8 gemas brillantes. Intercambia dos vecinas para alinear tres o más del mismo tipo y verlas estallar; las de arriba caen, llegan nuevas y cada reacción en cadena multiplica tus puntos. No hay reloj: la partida solo termina cuando el tablero se queda sin ningún movimiento posible.',
  'PUZZLE',
  'cover-gemas',
  'magenta',
  74350,
  '5.2K',
  <max_position + 1>
),
(
  'gemas-bomba',
  'GEMAS BOMBA',
  'Desactiva las bombas antes de que su cuenta atrás llegue a cero.',
  'El mismo tablero de gemas, ahora minado. Entre las piezas que caen aparecen bombas con una cuenta atrás que baja con cada movimiento: alinéalas para desactivarlas o pierdes una vida al estallar. Alinea cuatro o más para forjar una gema nova que revienta todo lo que la rodea. Tres vidas, ni una más.',
  'PUZZLE',
  'cover-gemas-bomba',
  'yellow',
  48620,
  '3.7K',
  <max_position + 2>
);
```

**Siembra de `scores`** (nombres 1–10 chars del set de la SPEC 06, score entero 0..100000000, decrecientes y coherentes con cada `best`):

```sql
insert into public.scores (game_id, name, score) values
  ('gemas', 'PX_KAI',    74350),
  ('gemas', 'NEONFOX',   69120),
  ('gemas', 'VECTORX',   63480),
  ('gemas', 'Z3R0COOL',  58900),
  ('gemas', 'SCANLINE',  52240),
  ('gemas', 'CYBER_LU',  47610),
  ('gemas', 'M00NRYU',   41350),
  ('gemas', 'BIT_LORD',  36080),
  ('gemas', 'RGB_QUEEN', 30470),
  ('gemas', 'JOY_STK',   24900),
  ('gemas', 'ATARI_KID', 19260),
  ('gemas', 'PIXEL_DAD', 14830),

  ('gemas-bomba', 'NEONFOX',   48620),
  ('gemas-bomba', 'M00NRYU',   45110),
  ('gemas-bomba', 'PX_KAI',    41790),
  ('gemas-bomba', 'SCANLINE',  37450),
  ('gemas-bomba', 'VECTORX',   33980),
  ('gemas-bomba', 'BIT_LORD',  29620),
  ('gemas-bomba', 'Z3R0COOL',  25340),
  ('gemas-bomba', 'CYBER_LU',  21870),
  ('gemas-bomba', 'JOY_STK',   17460),
  ('gemas-bomba', 'RGB_QUEEN', 13920),
  ('gemas-bomba', 'PIXEL_DAD', 10150),
  ('gemas-bomba', 'ATARI_KID',  7380);
```

Coherencia con el scoring de los motores: en el clásico, alcanzar el nivel 10 ronda los ~58.000 puntos (metas de nivel crecientes + bonus de subida), así que un `best` de 74.350 corresponde a una partida larga que llega al nivel 11–12. En GEMAS BOMBA la partida es más corta (3 vidas contra bombas) pero suma bonus de desactivación y de nova, de ahí un techo menor.

**Flujo de puntuaciones a Supabase (sin cambios de código):**

1. El motor emite `onGameOver(finalScore)` (siempre entero ≥ 0).
2. `GamePlayer.tsx` abre el modal de fin y, al pulsar GUARDAR, hace `POST /api/scores` con `{ gameId: id, name, score }`, donde `id` es el slug de la ruta (`/jugar/gemas` → `"gemas"`, `/jugar/gemas-bomba` → `"gemas-bomba"`).
3. `insertScore` valida (`gameId` no vacío, `name` 1–10 chars en mayúsculas, `score` entero 0..100000000) e inserta en `scores`; la FK `game_id → games.id` exige que la fila de esta spec exista.
4. `getTopScores(gameId)` lee el top-12 de cada slug por separado para `/salon` y `/juego/<slug>`.

**Portadas** en `app/globals.css` (base `.cover-bg` + pseudo-elementos):

- `.cover-gemas` — color neón `var(--magenta)`: una rejilla de gemas facetadas (rombos, círculos, hexágonos) en diagonal con una fila de tres alineadas brillando como a punto de estallar.
- `.cover-gemas-bomba` — color neón `var(--yellow)`: la misma rejilla en penumbra con una gema bomba central con su mecha y un contador grande, y un destello de onda 3×3 alrededor.

_El diseño real de ambas se hace con `/frontend-design`, manteniendo que se reconozcan como familia (misma rejilla) pero se distingan de un vistazo (color dominante y la bomba)._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`): leer el `MAX(position)` actual de `games` y hacer el `insert into public.games (...)` de las dos filas (`gemas` en `MAX+1`, `gemas-bomba` en `MAX+2`) y el `insert into public.scores (...)` con las 24 filas sembradas, en la misma migración para que la FK de `scores` encuentre las filas de `games`. Respetar los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio: `games` solo lectura, `scores` lectura + insert validado).
2. **Portada clásica.** Añadir `.cover-gemas` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`.
3. **Portada bomba.** Añadir `.cover-gemas-bomba` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`, reutilizando la base visual de `.cover-gemas` si conviene (variables CSS compartidas), sin duplicar reglas enteras.
4. **Verificación** de que `generate_typescript_types` no hace falta (son inserts, no cambia el esquema) y verificación manual (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existen las filas `games` con `id = 'gemas'` (`cat = 'PUZZLE'`, `color = 'magenta'`, `cover = 'cover-gemas'`) e `id = 'gemas-bomba'` (`cat = 'PUZZLE'`, `color = 'yellow'`, `cover = 'cover-gemas-bomba'`), con `position` consecutivos tras el máximo previo; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas para `game_id = 'gemas'` y 12 para `game_id = 'gemas-bomba'`, decrecientes; ninguno de los dos leaderboards sale vacío y no se mezclan entre sí.
- [ ] GEMAS y GEMAS BOMBA aparecen en `/` (home), `/games` (biblioteca, también al filtrar por PUZZLE), `/salon` (una tab cada una) y en `/juego/gemas` y `/juego/gemas-bomba`, leyendo desde la BD, cada una con su portada.
- [ ] `POST /api/scores` con `{ gameId: "gemas", name, score }` válido inserta y la fila aparece solo en el leaderboard de GEMAS; lo mismo con `"gemas-bomba"` solo en el de GEMAS BOMBA. Con `name` vacío o `score` no entero/negativo responde `{ ok:false }` 400.
- [ ] Mientras no existan los motores, `/jugar/gemas` y `/jugar/gemas-bomba` muestran la maqueta genérica; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar catálogo (esta spec) de motores (02 y 03), para que el juego exista en la plataforma aunque los motores lleguen después. Es la misma división de las jams previas (`turbovia`, `patrulla-lunar`).
- **Sí: un slug por variante (`gemas`, `gemas-bomba`), no un slug con modo.** El registry resuelve un `GameFactory` por `id`, `GamePlayer.tsx` no tiene selector de modo (solo de skin, y cambiarlo reinstancia el motor) y `POST /api/scores` guarda por `gameId` sin columna de modo. Con dos slugs, cada variante tiene ficha, portada y leaderboard propios **sin tocar** `GamePlayer.tsx`, la API, `insertScore`/`getTopScores` ni el esquema. Se descarta un único slug con modo porque obligaría a añadir una columna `mode` a `scores` (cambio de esquema + RLS + tipos) y un selector en el reproductor, y mezclaría rankings incomparables.
- **Sí: leaderboards separados.** Una partida sin límite que acaba por bloqueo y una a 3 vidas contra bombas no son comparables; un único ranking premiaría siempre la variante de escala mayor.
- **Sí (supuesto documentado):** ambas `cat = PUZZLE`. Son puzzles de patrón sobre rejilla, no de reflejos; encaja con la propuesta original (PUZZLE/magenta).
- **Sí (supuesto documentado):** `gemas` en `magenta` (respeta la sugerencia del To-Do) y `gemas-bomba` en `yellow` (mecha/explosión; da variedad dentro de PUZZLE, donde solo existe `caida` en magenta).
- **Sí (supuesto documentado):** `best = 74350` / `plays = '5.2K'` (clásico) y `best = 48620` / `plays = '3.7K'` (bomba) como columnas de display sembradas, no derivadas en vivo, coherentes con el scoring de las specs 02 y 03.
- **Sí:** las dos filas y sus 24 scores en una sola migración: el catálogo de la familia aparece entero o no aparece.
- **Sí:** portadas diseñadas con `/frontend-design` (regla de CLAUDE.md), como familia visual reconocible.
- **No:** sonido, anti-cheat, auth real: cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                          | Mitigación                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `position` codificado a mano colisiona o deja huecos si el catálogo cambió (otras jams en vuelo). | Calcular `MAX(position)+1` y `+2` en la migración leyendo el valor real, no asumir números.                                                      |
| Dos fichas casi iguales confunden en la biblioteca.                                             | Títulos, `short`, color y portada claramente distintos (magenta vs. amarillo, bomba visible en la portada de la variante).                      |
| Insertar `scores` antes que `games` rompe la FK.                                                | Misma migración, `games` primero.                                                                                                                |
| `INSERT` público en `scores` permite spam.                                                      | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.                                          |
| Las portadas CSS se ven recargadas en tamaño tarjeta.                                           | Diseñar con `/frontend-design` probando en los tamaños reales de `/games`, `/` y el detalle.                                                     |

---

## Qué **no** está en esta spec

- Los motores jugables de `gemas` y `gemas-bomba` (van en `02-motor-gemas-clasico` y `03-motor-gemas-bomba`).
- Una variante contrarreloj u otras variantes adicionales.
- Selector de modo en el reproductor o columna `mode` en `scores`.
- Sonido y efectos de audio.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
