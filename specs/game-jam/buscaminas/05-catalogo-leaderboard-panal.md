# SPEC 05 (game-jam/buscaminas) — Catálogo + leaderboard de "PANAL" (Buscaminas hexagonal)

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-27
> **Objective:** Dar de alta el juego `panal` (PANAL, un Buscaminas sobre rejilla hexagonal) en la tabla `games` y sembrar su leaderboard en `scores`, reusando el patrón de la SPEC 06, dejándolo listo para el motor de la spec hermana `06-motor-panal`.

---

## Por qué existe esta spec

La game jam del 2026-11-27 toma el **Buscaminas** como juego base y propone tres variantes (razonamiento en `00-jam.md`). **PANAL** es la variante **geométrica**: el campo es un gran hexágono formado por celdas hexagonales, cada una con **6 vecinas** en lugar de 8. Ese cambio rompe los patrones de deducción aprendidos en el clásico (el "1-2-1", las esquinas) y obliga a leer el tablero de otra forma, así que no es un reskin. Además, para que la curva sea distinta a la del clásico, PANAL da **3 vidas por partida**: pisar una mina no acaba la partida, la deja marcada y cuesta una vida; limpiar un tablero sin fallos devuelve una vida.

Va en **PUZZLE** (deducción pura, sin presión de scroll) con color **yellow**, el color del panal, que lo distingue de BUSCAMINAS (green) y ZAPADOR (cyan).

Esta spec entrega solo el **alta en el catálogo y la siembra del leaderboard** (patrón SPEC 06). El **motor jugable** va en `06-motor-panal`; hasta entonces, `/jugar/panal` muestra la maqueta genérica.

---

## Scope

**In:**

- Alta del juego `panal` en la tabla `games` de Supabase vía migración (todos los campos del Data model), respetando los `check` de `cat` y `color`.
- Siembra de 12 filas en `scores` para `game_id = 'panal'`.
- Clase de portada `.cover-panal` en `app/globals.css`, diseñada con `/frontend-design`.

**Out of scope (para futuras specs):**

- El motor jugable real: hasta `06-motor-panal`, `panal` queda como maqueta (sin entrada en `registry.ts`).
- Las variantes `buscaminas` y `zapador`.
- Sonido, anti-cheat, auth real / vincular scores a usuario, skins.
- Tocar los motores existentes ni los contratos de SPEC 06.

---

## Data model

Esta spec no crea tablas nuevas. Añade **datos** y una **portada**.

**Fila a insertar en `games`** (`position` = siguiente libre, calculado en la propia sentencia):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'panal',
  'PANAL',
  'Buscaminas de seis lados: nuevas reglas, nuevos trucos.',
  'Un campo minado con forma de panal: cada celda hexagonal toca seis vecinas, y los números cuentan las minas a su alrededor. Olvida los patrones del buscaminas de siempre y aprende a leer el hexágono. Tienes tres vidas por partida: una mina no te elimina, pero te cuesta caro. Limpia un panal sin fallos para recuperar una vida y salta al siguiente, más grande y más minado.',
  'PUZZLE',
  'cover-panal',
  'yellow',
  52400,
  '2.7K',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

**Siembra de `scores`** (nombres 1–10 chars, score entero `0..100000000`, decrecientes y coherentes con `best = 52400`):

```sql
insert into public.scores (game_id, name, score) values
  ('panal', 'RGB_QUEEN', 52400),
  ('panal', 'VECTORX',   47310),
  ('panal', 'M00NRYU',   42260),
  ('panal', 'PX_KAI',    37080),
  ('panal', 'JOY_STK',   31950),
  ('panal', 'NEONFOX',   26640),
  ('panal', 'CYBER_LU',  21470),
  ('panal', 'SCANLINE',  16820),
  ('panal', 'BIT_LORD',  12230),
  ('panal', 'Z3R0COOL',   8040),
  ('panal', 'PIXEL_DAD',  4570),
  ('panal', 'ATARI_KID',  2110);
```

**Coherencia de la siembra con el motor** (`06-motor-panal`): limpiar perfectamente el panal 1 da ≈ 3 300 pts, el 2 ≈ 7 400, el 3 ≈ 12 500 y el 4 ≈ 18 600 (acumulado ≈ 41 800). `best = 52 400` equivale a completar los cuatro primeros panales y avanzar en el 5: alto pero alcanzable. La fila más baja (2 110) es una partida que cae en el panal 1.

**Portada** `.cover-panal` en `app/globals.css` (base `.cover-bg` + `::before`/`::after`, color neón `var(--yellow)`). Diseño: un mosaico de hexágonos ámbar/amarillo neón en forma de panal, unos tapados con brillo de miel y otros abiertos con números, una celda con una mina pulsante y otra con bandera. _El diseño real se hace con `/frontend-design` (los hexágonos pueden resolverse con `clip-path` o gradientes cónicos)._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (vía MCP `apply_migration`, nombre `seed_panal`): `insert into public.games (...)` con la fila de PANAL (`position` con `MAX+1` en la sentencia) e `insert into public.scores (...)` con las 12 filas. Respetar los `check`. Tras aplicar, revisar `get_advisors`.
2. **Portada.** Añadir `.cover-panal` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`.
3. **Tipos.** No se regenera `database.types.ts` (son inserts).
4. **Verificación manual** (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = 'panal'`, `cat = 'PUZZLE'`, `color = 'yellow'` y `cover = 'cover-panal'`, con `position` = máximo previo + 1; RLS sigue habilitado.
- [ ] `scores` tiene 12 filas para `game_id = 'panal'` con puntuaciones decrecientes; la primera es `52 400`.
- [ ] PANAL aparece en `/`, `/games` (también al filtrar por PUZZLE), `/salon` (tab) y `/juego/panal` leyendo desde la BD, con la portada `.cover-panal`.
- [ ] `POST /api/scores` con `{ gameId: "panal", name, score }` válido inserta y aparece en `/salon` y en el detalle; con datos inválidos responde `{ ok:false }` 400.
- [ ] Mientras no exista `06-motor-panal`, `/jugar/panal` muestra la maqueta genérica; ningún otro juego se rompe.
- [ ] `get_advisors` no reporta tablas sin RLS ni políticas peligrosas.

---

## Decisions

- **Sí:** patrón SPEC 06 y separación catálogo (esta spec) / motor (`06-motor-panal`).
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS.
- **Sí:** `best = 52400` y `plays = '2.7K'` sembrados como display y calibrados con la fórmula de `06-motor-panal`.
- **Sí:** portada con `/frontend-design`.
- **Sí (supuesto documentado):** slug `panal` (5 letras, ASCII, evocador del hexágono), sin colisión con catálogo, registry ni To-Do.
- **Sí (supuesto documentado):** `cat = PUZZLE` y `color = yellow`. PUZZLE solo tiene hoy `caida` (magenta); yellow da a la jam su tercer color y casa con la metáfora del panal.
- **No:** sonido, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                  | Mitigación                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `position` colisiona si otra variante de la jam se da de alta a la vez. | `MAX+1` calculado dentro de la sentencia; las migraciones se aplican de una en una.                 |
| El `best` sembrado no es alcanzable con la fórmula real.               | Calibrado con `06-motor-panal`; si cambian constantes, ajustar `best` y la siembra en la misma PR.   |
| `INSERT` público en `scores` permite spam.                              | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`.                                           |
| Los hexágonos en CSS puro se ven dentados o pesados en la tarjeta.     | Diseñar con `/frontend-design` y probar en los tamaños reales; preferir pocas celdas grandes.       |

---

## Qué **no** está en esta spec

- El motor jugable de `panal` (va en `06-motor-panal`).
- Las variantes `buscaminas` y `zapador`.
- Sonido, skins, anti-cheat, auth real.

Cada uno de esos, si llega, va en su propia spec.
