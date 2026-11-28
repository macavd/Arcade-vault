# SPEC 03 (game-jam/aleteo) — Catálogo + leaderboard de "ALETEO INVERSO" (variante de gravedad invertida)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-28
> **Objective:** Dar de alta el juego `aleteo-inverso` (ALETEO INVERSO, volador de un botón en el que cada pulsación invierte la gravedad) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de catálogo/scores de la SPEC 06, dejándolo listo para el motor de la spec hermana `04-motor-aleteo-inverso`.

---

## Por qué existe esta spec

Esta game jam toma el juego base **`aleteo`** (volador de un botón estilo Flappy, sugerido por el game-planner el 2026-10-21) y produce dos variantes jugables **mecánicamente distintas**. La primera, ALETEO (`01`/`02` de esta carpeta), es el clásico: la gravedad siempre tira hacia abajo y la pulsación es un **impulso** hacia arriba. Esta segunda, **ALETEO INVERSO**, cambia el verbo del botón: la pulsación **no impulsa, invierte la gravedad**. Es la familia de *Gravity Guy* y *VVVVVV*, trasladada al formato de vuelo continuo.

Las diferencias jugables son de fondo, no cosméticas:

- **Inercia en lugar de impulso.** Al invertir la gravedad, la velocidad vertical se conserva y el pájaro tarda en frenar y cambiar de sentido. Hay que anticipar, no reaccionar.
- **Los dos bordes son mortales.** Un riel eléctrico arriba y otro abajo sustituyen al "techo seguro y suelo mortal" del clásico.
- **Obstáculos asimétricos.** En vez de tuberías con hueco, hay barras que cuelgan del techo, barras que suben del suelo y bloques flotantes que obligan a elegir si pasar por arriba o por abajo.
- **Recolección con riesgo.** Hay chispas (puntos extra) colocadas en la trayectoria más arriesgada, de modo que la puntuación premia la ambición y no solo la supervivencia.

Cada variante tiene su propio slug, su fila de catálogo y su leaderboard. Son **independientes**: la usuaria puede implementar solo esta, solo la clásica o las dos.

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06). El **motor jugable** va en `04-motor-aleteo-inverso`. Hasta que exista, `/jugar/aleteo-inverso` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `aleteo-inverso` en la tabla `games` de Supabase mediante una migración con todos los campos del Data model, respetando los `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green).
- Siembra de 12 filas en `scores` con `game_id = 'aleteo-inverso'`.
- Clase de portada `.cover-aleteo-inverso` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real. Hasta `04-motor-aleteo-inverso`, el juego queda como maqueta, sin entrada en `registry.ts`.
- La variante clásica `aleteo` (`01-catalogo-leaderboard-aleteo`).
- Skins, sonido, anti-cheat, auth real y vincular scores a un usuario.
- Tocar otros motores o los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas: `games` y `scores` ya existen desde SPEC 06. Añade **datos** y una **portada**.

**Fila a insertar en `games`.** `position` se calcula como `MAX(position)+1` en el momento de la migración.

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'aleteo-inverso',
  'ALETEO INVERSO',
  'Un toque invierte la gravedad: esquiva los rieles y caza chispas.',
  'Aquí no se aletea: se le da la vuelta al mundo. Cada pulsación invierte la gravedad y tu pájaro de neón sale disparado hacia el techo o hacia el suelo, y los dos están electrificados. Esquiva barras que cuelgan, barras que suben y bloques flotantes que te obligan a elegir camino. Las chispas valen mucho, pero siempre están donde más duele.',
  'ARCADE',
  'cover-aleteo-inverso',
  'magenta',
  2840,
  '6.7K',
  <next_position>
);
```

**Siembra de `scores`** (nombres de 1 a 10 caracteres, `score` entre 0 y 100000000, decrecientes). La escala es coherente con el motor de `04-motor-aleteo-inverso`: +10 por obstáculo superado y +25 por chispa, así que `2840` equivale aproximadamente a 180 obstáculos y 42 chispas.

```sql
insert into public.scores (game_id, name, score) values
  ('aleteo-inverso', 'PX_KAI',    2840),
  ('aleteo-inverso', 'NEONFOX',   2610),
  ('aleteo-inverso', 'VECTORX',   2395),
  ('aleteo-inverso', 'Z3R0COOL',  2170),
  ('aleteo-inverso', 'SCANLINE',  1960),
  ('aleteo-inverso', 'CYBER_LU',  1745),
  ('aleteo-inverso', 'M00NRYU',   1530),
  ('aleteo-inverso', 'BIT_LORD',  1320),
  ('aleteo-inverso', 'RGB_QUEEN', 1105),
  ('aleteo-inverso', 'JOY_STK',    890),
  ('aleteo-inverso', 'ATARI_KID',  680),
  ('aleteo-inverso', 'PIXEL_DAD',  470);
```

**Portada** `.cover-aleteo-inverso` en `app/globals.css`, sobre la base `.cover-bg` más pseudo-elementos y con el color neón `var(--magenta)`. Diseño: dos rieles eléctricos horizontales (arriba y abajo) que chisporrotean, un pájaro magenta **boca abajo** pegado a la mitad superior y una trayectoria punteada en zigzag que rebota entre ambas mitades rodeando un bloque flotante. Dos o tres chispas brillantes salpican la ruta. Debe leerse como "lo mismo que ALETEO, pero al revés" sin confundirse con su portada amarilla. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (MCP `apply_migration`). Leer `MAX(position)` de `games`, hacer `insert into public.games (...)` con la fila de ALETEO INVERSO (`position = MAX+1`) e `insert into public.scores (...)` con las 12 filas. Respetar los `check` de `cat`/`color`/`name`/`score` y revisar `get_advisors` tras aplicar.
2. **Portada.** Añadir `.cover-aleteo-inverso` y sus pseudo-elementos en `app/globals.css` con `/frontend-design`, probando en tarjeta, home y detalle. Si `aleteo` ya está implementado, comprobar que las dos portadas se distinguen de un vistazo en la rejilla de `/games`.
3. **Tipos.** No hace falta `generate_typescript_types` (son inserts). Verificación manual según los Acceptance criteria.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'aleteo-inverso'`, `title = 'ALETEO INVERSO'`, `cat = 'ARCADE'`, `color = 'magenta'`, `cover = 'cover-aleteo-inverso'` y `best = 2840`. RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas con `game_id = 'aleteo-inverso'` y puntuaciones decrecientes (2840 → 470).
- [ ] ALETEO INVERSO aparece en `/`, `/games` (también con el filtro ARCADE), `/salon` y `/juego/aleteo-inverso` leyendo desde la BD, con su portada en magenta.
- [ ] La ruta `/juego/aleteo-inverso` y `/jugar/aleteo-inverso` resuelven bien con el guion del slug (sin 404).
- [ ] `POST /api/scores` con `{ gameId: "aleteo-inverso", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle. Con `name` vacío o de más de 10 caracteres, o con `score` inválido, responde `{ ok:false }` con 400.
- [ ] Mientras no exista `04-motor-aleteo-inverso`, `/jugar/aleteo-inverso` muestra la maqueta genérica y ningún otro juego se rompe.
- [ ] `get_advisors` no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** reusar el patrón SPEC 06 y separar el catálogo (esta spec) del motor (`04-motor-aleteo-inverso`).
- **Sí (supuesto documentado):** el slug `aleteo-inverso` y el título `ALETEO INVERSO`. Es kebab-case ASCII, no colisiona con ningún id del catálogo, del registry ni del To-Do, y deja clara la relación con `aleteo` sin depender de él. Se descartan `aleteo-gravedad` (largo y menos evocador) y un nombre totalmente distinto (perdería el vínculo de "variante" que pidió la jam).
- **Sí (supuesto documentado):** `cat = ARCADE` y `color = magenta`. Sigue siendo un arcade de habilidad de un botón. El magenta contrasta con el amarillo de la variante clásica, para que en `/games` se distingan aunque estén juntas, y ARCADE solo tiene un juego magenta propuesto (`trepador`, pendiente).
- **Sí (supuesto documentado):** una escala de puntos **mayor** que la del clásico (`best = 2840`), porque la puntuación combina obstáculos (+10) y chispas (+25). Así la recolección arriesgada pesa en el ranking, que es precisamente el twist.
- **Sí:** `plays = '6.7K'`, menor que el del clásico, porque una variante se presenta como menos jugada (columna de display sembrada).
- **Sí:** portada con `/frontend-design` (regla de CLAUDE.md).
- **No:** compartir fila o leaderboard con `aleteo`. Son juegos distintos con escalas de puntuación distintas, y mezclar ambos rankings no tendría sentido.
- **No:** sonido, anti-cheat ni auth real.

---

## Risks

| Riesgo                                                                       | Mitigación                                                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Un `position` fijado a mano colisiona si el catálogo cambió.                 | `MAX(position)+1` leído en la migración.                                                                              |
| La portada se confunde con la de `aleteo` (mismo pájaro).                    | Color distinto (magenta frente a amarillo), pájaro boca abajo y rieles en vez de tuberías; se verifica en la rejilla de `/games`. |
| El título largo (`ALETEO INVERSO`, 14 caracteres) desborda la tarjeta en móvil. | Verificarlo en `/games` a 320 px. Si desborda, `/frontend-design` ajusta el tamaño del título de tarjeta sin cambiar el dato. |
| El `INSERT` público en `scores` permite spam.                                | `check` de rango y longitud (SPEC 06), sin `UPDATE/DELETE`. Se endurece en otra spec.                                 |

---

## Qué **no** está en esta spec

- El motor jugable de `aleteo-inverso` (va en `04-motor-aleteo-inverso`).
- La variante clásica `aleteo` (specs `01`/`02` de esta carpeta).
- Skins, sonido y efectos de audio.
- Anti-cheat y verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
