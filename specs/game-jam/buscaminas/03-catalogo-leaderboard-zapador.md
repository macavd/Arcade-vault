# SPEC 03 (game-jam/buscaminas) — Catálogo + leaderboard de "ZAPADOR" (Buscaminas de scroll infinito)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-27
> **Objective:** Dar de alta el juego `zapador` (ZAPADOR, un Buscaminas contrarreloj con campo que desciende sin fin) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de la SPEC 06, dejándolo listo para el motor de la spec hermana `04-motor-zapador`.

---

## Por qué existe esta spec

La game jam del 2026-11-27 toma el **Buscaminas** como juego base y propone tres variantes (razonamiento en `00-jam.md`). **ZAPADOR** es la variante de **presión de tiempo**: el campo de minas desciende sin parar hacia una **línea de detonación**; cada fila que la cruza con casillas seguras sin descubrir cuesta una vida. La deducción es la del Buscaminas, pero el ritmo es de arcade: hay que leer rápido, priorizar las filas de abajo y decidir cuándo arriesgar. La partida es infinita y se pierde por desgaste (3 vidas), no por un único error.

Por eso va en **ARCADE** y no en PUZZLE: el núcleo es lectura rápida bajo presión. El color **cyan** la separa visualmente de BUSCAMINAS (green) y PANAL (yellow).

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06). El **motor jugable** va en `04-motor-zapador`; hasta entonces, `/jugar/zapador` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `zapador` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` de `cat` y `color`.
- Siembra de 12 filas en `scores` para `game_id = 'zapador'`.
- Clase de portada `.cover-zapador` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `04-motor-zapador`, `zapador` queda como maqueta (sin entrada en `registry.ts`).
- Las variantes `buscaminas` y `panal` (tienen sus propias specs en esta carpeta).
- Sonido, anti-cheat, auth real / vincular scores a usuario, skins.
- Tocar los motores existentes ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas. Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre, calculado en la propia sentencia):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'zapador',
  'ZAPADOR',
  'El campo minado avanza. Despeja cada fila antes de que cruce la línea.',
  'Un Buscaminas que no se detiene: el campo baja sin parar hacia la línea de detonación. Lee los números, marca las minas y descubre todas las casillas seguras de cada fila antes de que la cruce, o perderás una vida. Encadena filas limpias para multiplicar el bonus, pisa el turbo si te atreves y aguanta mientras la velocidad y la densidad de minas suben. Tres vidas, campo infinito.',
  'ARCADE',
  'cover-zapador',
  'cyan',
  74300,
  '3.9K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

**Siembra de `scores`** (nombres 1–10 chars, score entero `0..100000000`, decrecientes y coherentes con `best = 74300`):

```sql
insert into public.scores (game_id, name, score) values
  ('zapador', 'NEONFOX',   74300),
  ('zapador', 'SCANLINE',  68150),
  ('zapador', 'PX_KAI',    61420),
  ('zapador', 'CYBER_LU',  55080),
  ('zapador', 'VECTORX',   48630),
  ('zapador', 'BIT_LORD',  41970),
  ('zapador', 'Z3R0COOL',  35260),
  ('zapador', 'RGB_QUEEN', 28740),
  ('zapador', 'M00NRYU',   22110),
  ('zapador', 'JOY_STK',   15480),
  ('zapador', 'PIXEL_DAD',  9320),
  ('zapador', 'ATARI_KID',  4060);
```

**Coherencia de la siembra con el motor** (`04-motor-zapador`): una fila media aporta ≈ 105 pts por casillas (≈ 10,5 seguras × 10) más un bonus de fila de `50 × nivel × multiplicador de racha` (hasta ×2). Una partida que aguanta ~60 filas (nivel 4–5) ronda 20 000–25 000 pts; `best = 74 300` equivale a ~140–150 filas con rachas largas y algo de turbo: alto pero alcanzable.

**Portada** `.cover-zapador` en `app/globals.css` (base `.cover-bg` + `::before`/`::after`, color neón `var(--cyan)`). Diseño: columna de casillas en perspectiva que cae hacia una línea horizontal roja/magenta brillante (la línea de detonación), con estelas de scroll vertical cian, números neón en las filas de abajo y una fila a punto de cruzar la línea parpadeando. _El diseño real se hace con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`, nombre `seed_zapador`): `insert into public.games (...)` con la fila de ZAPADOR (`position` con `MAX+1` en la sentencia) e `insert into public.scores (...)` con las 12 filas. Respetar los `check`. Tras aplicar, revisar `get_advisors`.
2. **Portada.** Añadir `.cover-zapador` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`.
3. **Tipos.** No se regenera `database.types.ts` (son inserts).
4. **Verificación manual** (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'zapador'`, `cat = 'ARCADE'`, `color = 'cyan'` y `cover = 'cover-zapador'`, con `position` = máximo previo + 1; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene 12 filas para `game_id = 'zapador'` con puntuaciones decrecientes; la primera es `74 300`.
- [ ] ZAPADOR aparece en `/`, `/games` (también al filtrar por ARCADE), `/salon` (tab) y `/juego/zapador` leyendo desde la BD, con la portada `.cover-zapador`.
- [ ] `POST /api/scores` con `{ gameId: "zapador", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] Mientras no exista `04-motor-zapador`, `/jugar/zapador` muestra la maqueta genérica; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** patrón SPEC 06 y separación catálogo (esta spec) / motor (`04-motor-zapador`).
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS.
- **Sí:** `best = 74300` y `plays = '3.9K'` sembrados como display, calibrados con la fórmula de `04-motor-zapador`. `plays` más bajo que BUSCAMINAS porque es la variante "nueva" y más exigente.
- **Sí:** portada con `/frontend-design`.
- **Sí (supuesto documentado):** slug `zapador` (el zapador es el soldado que despeja campos minados): kebab-case, ASCII, sin colisión con catálogo, registry ni To-Do.
- **Sí (supuesto documentado):** `cat = ARCADE` y `color = cyan`. Coincide en cat/color con la sugerencia pendiente `turbovia`; se acepta porque son juegos de géneros distintos y ninguno está aún en el catálogo.
- **No:** sonido, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                  | Mitigación                                                                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `position` colisiona si otra variante de la jam se da de alta a la vez. | `MAX+1` calculado dentro de la sentencia; las migraciones se aplican de una en una.                      |
| El `best` sembrado no es alcanzable con la fórmula real.               | Calibrado con `04-motor-zapador`; si cambian constantes, ajustar `best` y la siembra en la misma PR.      |
| `INSERT` público en `scores` permite spam.                              | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`.                                                |
| La portada con scroll animado se ve recargada o pesa en la biblioteca. | Diseñar con `/frontend-design`; animación solo en hover o respetando `prefers-reduced-motion` (SPEC 16). |

---

## Qué **no** está en esta spec

- El motor jugable de `zapador` (va en `04-motor-zapador`).
- Las variantes `buscaminas` y `panal`.
- Sonido, skins, anti-cheat, auth real.

Cada uno de esos, si llega, va en su propia spec.
