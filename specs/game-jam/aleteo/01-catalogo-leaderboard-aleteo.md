# SPEC 01 (game-jam/aleteo) — Catálogo + leaderboard de "ALETEO" (Flappy clásico)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-28
> **Objective:** Dar de alta el juego `aleteo` (ALETEO, volador de un botón estilo Flappy) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `02-motor-aleteo`.

---

## Por qué existe esta spec

El catálogo jugable de Arcade Vault cubre disparos (ROCAS), apilado (CAÍDA), rompeladrillos (BLOQUE BUSTER), serpiente por rejilla (SERPENTINA) y cruce por rejilla (RANARIA). Falta el género **one-button reflex**: un juego que se controla con una sola tecla y en el que todo depende del ritmo y de la precisión del jugador. **ALETEO** es ese hueco. Se trata de un volador estilo _Flappy Bird_ (2013), heredero directo de los arcades de habilidad "fácil de aprender, imposible de dominar". El pájaro de neón cae por la gravedad y cada pulsación le da un aletazo hacia arriba. Hay que colarlo por los huecos de una sucesión infinita de tuberías. El game-planner lo propuso el 2026-10-21 en `references/game-suggestions-todo.md` como "género one-button reflex ausente, barato de implementar, timestep fijo".

Esta game jam toma `aleteo` como juego base y produce **dos variantes independientes**: esta (ALETEO, el clásico) y ALETEO INVERSO (`03-…`/`04-…` de esta misma carpeta, con inversión de gravedad). Cada variante tiene su propio slug, su fila de catálogo y su leaderboard, así que la usuaria puede implementar una sola, las dos o ninguna.

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06). Con ella, ALETEO aparece ya en la home, la biblioteca, el salón y el detalle con su portada y sus puntuaciones. El **motor jugable** va en `02-motor-aleteo`. Hasta que ese motor se implemente, `/jugar/aleteo` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `aleteo` en la tabla `games` de Supabase mediante una migración que rellene todos los campos del Data model. Debe respetar los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de 12 filas en `scores` con `game_id = 'aleteo'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-aleteo` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real. Hasta `02-motor-aleteo`, `aleteo` queda como maqueta, sin entrada en `registry.ts`.
- La variante `aleteo-inverso`: tiene su propia spec de catálogo (`03-catalogo-leaderboard-aleteo-inverso`).
- Skins (`clasico`/`neon`/`retro`): se encargan al agente `skin-designer` cuando exista el motor.
- Sonido, anti-cheat, auth real y vincular scores a un usuario.
- Tocar otros motores o los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas: `games` y `scores` ya existen desde SPEC 06. Añade **datos** y una **portada**.

**Fila a insertar en `games`.** `position` es la siguiente libre tras los juegos actuales y se concreta en implementación leyendo el `MAX(position)` real.

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'aleteo',
  'ALETEO',
  'Un botón, mil tuberías: aletea por el hueco o estréllate.',
  'Un pájaro de neón, la gravedad tirando de él y una hilera infinita de tuberías con el hueco cada vez más traicionero. Cada pulsación es un aletazo: demasiado pronto y te comes el techo, demasiado tarde y besas el suelo. Cada tubería superada suma un punto y la velocidad no perdona. ¿Cuántas cruzas antes de caer?',
  'ARCADE',
  'cover-aleteo',
  'yellow',
  214,
  '15.2K',
  <next_position>
);
```

**Siembra de `scores`.** Nombres de 1 a 10 caracteres del set del prototipo y `score` entre 0 y 100000000, en orden decreciente y plausible respecto a `best = 214`. Como en el Flappy original, la escala es de **tuberías cruzadas**, no de miles de puntos:

```sql
insert into public.scores (game_id, name, score) values
  ('aleteo', 'PX_KAI',    214),
  ('aleteo', 'NEONFOX',   197),
  ('aleteo', 'VECTORX',   181),
  ('aleteo', 'Z3R0COOL',  166),
  ('aleteo', 'SCANLINE',  149),
  ('aleteo', 'CYBER_LU',  133),
  ('aleteo', 'M00NRYU',   118),
  ('aleteo', 'BIT_LORD',  102),
  ('aleteo', 'RGB_QUEEN',  87),
  ('aleteo', 'JOY_STK',    71),
  ('aleteo', 'ATARI_KID',  58),
  ('aleteo', 'PIXEL_DAD',  44);
```

**Portada** `.cover-aleteo` en `app/globals.css`, sobre la base `.cover-bg` más pseudo-elementos y con el color neón `var(--yellow)`. Diseño: silueta de pájaro de neón amarillo en pleno aletazo, con una estela de tres o cuatro "fantasmas" que dibuja su parábola. Lo encuadran dos tuberías de contorno brillante, una desde arriba y otra desde abajo, con el hueco entre ambas. Debajo, un suelo con franjas en diagonal. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (MCP `apply_migration`). Leer el `MAX(position)` actual de `games`. Después, `insert into public.games (...)` con la fila de ALETEO (`position = MAX+1`) e `insert into public.scores (...)` con las 12 filas sembradas, respetando los `check` de `cat`/`color`/`name`/`score`. Tras aplicar, revisar `get_advisors`: el RLS debe seguir limpio (`games` solo lectura, `scores` lectura más insert validado).
2. **Portada.** Añadir `.cover-aleteo` y sus pseudo-elementos en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase. Comprobar que se lee en los tres tamaños reales: tarjeta de `/games`, destacado de `/` y cabecera de `/juego/aleteo`.
3. **Tipos.** Confirmar que no hace falta `generate_typescript_types`: son inserts y el esquema no cambia. Verificación manual según los Acceptance criteria.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'aleteo'`, `title = 'ALETEO'`, `cat = 'ARCADE'`, `color = 'yellow'`, `cover = 'cover-aleteo'`, `best = 214` y `position = MAX+1` en el momento de la migración. RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas con `game_id = 'aleteo'` y puntuaciones decrecientes (214 → 44). El leaderboard de `aleteo` no sale vacío.
- [ ] ALETEO aparece en `/` (home), `/games` (biblioteca, también con el filtro ARCADE), `/salon` (tab) y `/juego/aleteo` (detalle) leyendo desde la BD, con la portada `.cover-aleteo` visible y en amarillo.
- [ ] `POST /api/scores` con `{ gameId: "aleteo", name, score }` válido inserta, y la fila aparece en `/salon` y en el detalle. Con `name` vacío o de más de 10 caracteres, o con `score` inválido, responde `{ ok:false }` con 400.
- [ ] Mientras no exista `02-motor-aleteo`, `/jugar/aleteo` muestra la maqueta genérica sin motor y ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 (catálogo en `games`, leaderboard en `scores`) y separar el catálogo (esta spec) del motor (`02-motor-aleteo`), para que el juego exista en la plataforma aunque el motor llegue después.
- **Sí (supuesto documentado):** `cat = ARCADE` y `color = yellow`, tal como lo registró el game-planner. Es un arcade de habilidad: no dispara (no es SHOOTER), no es de lógica (no es PUZZLE) y no hay rival (no es VERSUS). El amarillo evoca al pájaro clásico y distingue a ALETEO de BLOQUE BUSTER (cyan) y SERPENTINA/RANARIA (green) dentro de ARCADE.
- **Sí (supuesto documentado):** una puntuación en **escala de tuberías** (`best = 214`, una tubería = 1 punto), fiel al Flappy original. Se descarta inflarla ×10 o ×100 para parecerse a los miles de otros juegos: cada leaderboard es por juego y un "214" de Flappy se lee al instante como una hazaña. La siembra es coherente con el `score` del motor de `02-motor-aleteo`.
- **Sí:** `plays = '15.2K'` como columna de display sembrada, no derivada en vivo (criterio de SPEC 06).
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (la auth sigue siendo mock).
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **No:** dar de alta aquí la variante `aleteo-inverso`. Cada variante es independiente y la usuaria decide cuál implementar.
- **No:** sonido, anti-cheat ni auth real. Cada uno va en su propia spec.

---

## Risks

| Riesgo                                                                           | Mitigación                                                                                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Un `position` codificado a mano colisiona o deja huecos si el catálogo cambió.   | Calcular `position = MAX(position)+1` en la migración leyendo el valor real, sin asumir un número.                                 |
| Si se implementan las dos variantes, el orden en la biblioteca queda arbitrario. | Cada migración toma `MAX+1` en su momento. Si se quieren contiguas, se aplican seguidas (aleteo primero) y se verifica en `/games`. |
| Los valores pequeños (decenas/cientos) parecen "pobres" junto a otros juegos.    | Decisión documentada: la escala nativa de Flappy. El salón y el detalle muestran leaderboards por juego, nunca mezclados.          |
| El `INSERT` público en `scores` permite spam.                                    | `check` de rango y longitud (SPEC 06), sin `UPDATE/DELETE`. Se endurece con auth y anti-cheat en otra spec.                        |
| La portada CSS se ve recargada en el tamaño de tarjeta.                          | Diseñar con `/frontend-design` probando en los tamaños reales de `/games`, `/` y el detalle.                                       |

---

## Qué **no** está en esta spec

- El motor jugable de `aleteo` (va en `02-motor-aleteo`).
- La variante `aleteo-inverso` (va en `03-…` y `04-…` de esta carpeta).
- Skins del juego.
- Sonido y efectos de audio.
- Anti-cheat y verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
