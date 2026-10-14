# SPEC 06 — Base de datos: catálogo de juegos y leaderboard persistente

> **Status:** Implementado
> **Depends on:** SPEC 04 (cimientos de Supabase: clientes browser/server ya existen)
> **Date:** 2026-10-14
> **Objective:** Crear las primeras tablas reales en Supabase — `games` (catálogo) y `scores` (puntuaciones) — con RLS, migraciones y datos sembrados; convertir la tabla `games` en la **fuente de verdad del catálogo** (la biblioteca, la home, el detalle y el reproductor dejan de leer `data.ts`) y hacer el **leaderboard persistente**: el modal de "GUARDAR PUNTUACIÓN" inserta de verdad y `/salon` + el detalle leen esas puntuaciones reales, reemplazando `seededScores()`.

---

## Por qué existe esta spec

Hasta ahora Arcade Vault es una réplica visual con datos en memoria: el catálogo de 8 juegos está hardcodeado en `app/lib/data.ts` (`GAMES`), y **todos** los leaderboards (biblioteca, `/salon`, detalle `/juego/[id]`) se generan con `seededScores()` — números deterministas pero ficticios. Guardar una puntuación en `/jugar/[id]` es un `setSaved(true)` que no persiste nada. La SPEC 04 montó los cimientos de Supabase (clientes browser y server, variables de entorno, endpoint de salud) pero **no creó ninguna tabla**, y dejó explícitamente aplazado para "la spec de base de datos" todo lo relativo a tablas, SQL, migraciones, RLS y leaderboards reales. La SPEC 05 repitió ese aplazamiento para la persistencia de puntuaciones del juego real (ROCAS).

Esta es esa spec de base de datos. Entrega dos cosas que van juntas porque comparten esquema y migraciones:

1. **Catálogo en Supabase** (`games`): se migran los 8 juegos de `data.ts` a una tabla y las páginas pasan a leer el catálogo desde la base de datos. `data.ts` deja de ser el origen de datos del catálogo (conserva solo tipos estáticos y `CATS`).
2. **Leaderboard persistente** (`scores`): una tabla de puntuaciones referenciada a `games`, con lectura pública y escritura desde el flujo de fin de partida. `/salon` y el detalle leen puntuaciones reales; el modal de `/jugar/[id]` las inserta.

La auth sigue siendo mock (`SessionProvider` en memoria, aplazada a su propia spec), así que las puntuaciones se guardan de forma **anónima con iniciales de texto** — igual que el prototipo, pero ahora persistidas.

---

## Scope

**In:**

- **Dos tablas nuevas en Supabase** vía migraciones versionadas:
  - `games` — catálogo (id slug, título, descripciones, categoría, clase de portada, color, mejor marca y partidas de display, posición de orden).
  - `scores` — puntuaciones (id, `game_id` FK → `games`, nombre/iniciales, puntuación, fecha de creación).
- **RLS activado en ambas tablas** con políticas:
  - `games`: `SELECT` público; sin `INSERT/UPDATE/DELETE` para el cliente (el catálogo se siembra por migración).
  - `scores`: `SELECT` público e `INSERT` público validado (nombre 1–10 chars, score entero en rango razonable, `game_id` existente). Sin `UPDATE/DELETE` desde el cliente.
- **Migración de siembra (seed):** insertar los 8 juegos actuales de `GAMES` con exactamente sus valores (id, textos, `cat`, `cover`, `color`, `best`, `plays`) y un `position` que preserve el orden actual del array; además sembrar ~10–12 filas de `scores` por juego (reutilizando el estilo de `PLAYERS` del prototipo) para que los leaderboards no salgan vacíos de inicio.
- **Capa de acceso a datos server** en `app/lib/db/` (p. ej. `games.ts` y `scores.ts`): funciones `async` que usan el cliente **server** de SPEC 04 — `getGames()`, `getGameById(id)`, `getTopScores(gameId, limit)`, `insertScore({ gameId, name, score })`. Devuelven tipos derivados del esquema.
- **Tipos TypeScript del esquema** generados con `generate_typescript_types` en `app/lib/supabase/database.types.ts`, usados por la capa de acceso (desaplaza lo que SPEC 04 dejó fuera por no haber tablas).
- **Catálogo leído desde la BD** (fuente de verdad):
  - `/juego/[id]` (ya es Server Component `async`): obtiene el juego con `getGameById` y sus puntuaciones con `getTopScores`; `notFound()` si no existe.
  - `/games`, `/` (home) y `/salon` (hoy Client Components): se convierten al patrón **Server Component que obtiene datos → Client Component hijo interactivo**. La UI interactiva (búsqueda/filtro de `/games`, rail de la home, tabs del `/salon`) se extrae a componentes cliente que reciben los datos por props. La página de ruta pasa a ser server y hace el fetch.
  - `/jugar/[id]` (Client Component): necesita solo el `game` por `id`; se le pasa desde un wrapper server o se obtiene el dato mínimo necesario (título, color) sin reintroducir `data.ts`.
- **Leaderboard persistente (lectura):** `/salon` y la columna "MEJORES PUNTUACIONES" del detalle muestran filas reales de `scores` (ordenadas por puntuación desc), reemplazando `seededScores()`.
- **Leaderboard persistente (escritura):** Route Handler `POST /api/scores` (patrón de SPEC 04 para `/api/...`) que valida el payload (`gameId`, `name`, `score`) e inserta vía la capa de acceso. El modal de fin de partida de `/jugar/[id]` deja de hacer `setSaved(true)` a secas: llama a `/api/scores`, muestra "GUARDADO" al confirmar e informa error si falla. Tras guardar, la nueva marca es visible al volver a `/salon` o al detalle (lectura fresca).
- **Retiro de los mocks de catálogo/scores en `data.ts`:** eliminar `GAMES`, `PLAYERS` y `seededScores`. Conservar los tipos estáticos (`Game`/`ScoreRow`/`GameCategory`/`NeonColor`) y `CATS` como constante de UI (o reubicarlos), ya que las categorías del filtro son estáticas y no necesitan tabla.

**Out of scope (para futuras specs):**

- **Autenticación real** (login, registro, OAuth, invitado): sigue el `SessionProvider` mock en memoria. Las puntuaciones se guardan anónimas con iniciales; vincular un score a un usuario autenticado (columna `user_id`, RLS por dueño) entra con la spec de auth.
- **Anti-cheat / verificación de puntuaciones server-side:** `POST /api/scores` valida formato y rango, pero no verifica que el score sea alcanzable. La confianza en el cliente es aceptable en esta fase (igual que el prototipo).
- **Derivar `best` y `plays` en vivo desde `scores`:** en esta spec son columnas de display sembradas con los valores actuales; recalcular `best` como `MAX(score)` y `plays` como conteo real queda para después (evita triggers/vistas materializadas ahora).
- **"TU MEJOR MARCA" real en `/salon`:** el bloque del jugador logueado (`you`) depende de identidad real; mientras la auth sea mock, se mantiene su comportamiento actual o se oculta. No se persiste una marca por usuario.
- **Paginación, filtros avanzados o realtime** en los leaderboards: lectura simple top-N por juego.
- **Panel de administración** del catálogo (CRUD de `games` desde la UI): el catálogo se gestiona por migraciones.
- **Tocar el motor de juego** (ROCAS/SPEC 05), el salón visual (estilos), la auth o `SessionProvider`.

---

## Data model

Dos tablas con RLS. SQL orientativo (los nombres de política y detalles finales se fijan en implementación):

```sql
-- games: catálogo, fuente de verdad. Siembra por migración.
create table public.games (
  id        text primary key,              -- slug estable: "rocas", "caida", ...
  title     text not null,
  short     text not null,                 -- descripción de tarjeta
  long      text not null,                 -- descripción de detalle
  cat       text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover     text not null,                 -- clase CSS de portada: "cover-rocas"
  color     text not null check (color in ('cyan','magenta','yellow','green')),
  best      integer not null default 0,    -- mejor marca de display (sembrada)
  plays     text not null default '0',     -- "15.6K" (display)
  position  integer not null,              -- orden en la biblioteca
  created_at timestamptz not null default now()
);

-- scores: leaderboard persistente.
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 10),
  score      integer not null check (score >= 0 and score <= 100000000),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

-- games: solo lectura pública.
create policy "games_public_read"  on public.games  for select using (true);

-- scores: lectura pública + inserción pública validada (anónima por ahora).
create policy "scores_public_read"   on public.scores for select using (true);
create policy "scores_public_insert" on public.scores for insert with check (
  char_length(name) between 1 and 10 and score >= 0 and score <= 100000000
);
```

Contratos TypeScript derivados (la capa de acceso devuelve estos tipos; se generan con `generate_typescript_types`):

```ts
// app/lib/db/games.ts (forma)
export async function getGames(): Promise<Game[]>; // orden por position
export async function getGameById(id: string): Promise<Game | null>;

// app/lib/db/scores.ts (forma)
export async function getTopScores(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]>;
export async function insertScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

`CATS` (`["TODOS","ARCADE","PUZZLE","SHOOTER","VERSUS"]`) permanece como constante estática de UI: es el conjunto de filtros, no datos de negocio.

---

## Implementation plan

Cada paso deja la app compilando y navegable. El catálogo y los leaderboards no deben quedar rotos entre pasos: se crea la BD y la capa de acceso **antes** de arrancar a quitar `data.ts`.

1. **Migración de esquema.** Crear la migración con las tablas `games` y `scores`, sus `check`, el índice `(game_id, score desc)`, `enable row level security` y las políticas `games_public_read`, `scores_public_read`, `scores_public_insert`. Aplicar al proyecto. Revisar los advisories de seguridad de Supabase tras aplicar (RLS habilitado, sin tablas expuestas sin política).
2. **Migración de siembra.** Insertar los 8 juegos con los valores exactos de `GAMES` (incluidos `best` y `plays` de display) y `position` 1..8 según el orden actual del array. Sembrar ~10–12 filas de `scores` por juego con nombres del set del prototipo (`PX_KAI`, `NEONFOX`, …) y puntuaciones decrecientes plausibles, para que los leaderboards se vean poblados.
3. **Tipos del esquema.** Generar `app/lib/supabase/database.types.ts` con `generate_typescript_types` y tiparlos en los helpers del cliente.
4. **Capa de acceso.** Crear `app/lib/db/games.ts` (`getGames`, `getGameById`) y `app/lib/db/scores.ts` (`getTopScores`, `insertScore`) usando el cliente **server** de SPEC 04. `insertScore` valida en server (nombre 1–10, score entero ≥ 0) antes de insertar y traduce errores de Supabase a `{ ok:false, error }`.
5. **Detalle `/juego/[id]` (ya server).** Reemplazar `GAMES.find` por `getGameById(id)` (+ `notFound()`), y `seededScores(...)` por `getTopScores(id, 10)`. Mantener el mismo markup/estilos.
6. **Biblioteca `/games`.** Convertir la ruta en Server Component que llama `getGames()` y renderiza un Client Component hijo (p. ej. `GamesBrowser`) con la UI de búsqueda/filtro actual, recibiendo `games` por props. `CATS` se queda estático. `GameCard` no cambia (sigue recibiendo un `game`).
7. **Home `/`.** Igual patrón: la ruta pasa a server, obtiene `getGames()` y pasa los 6 primeros al rail cliente existente (extraer la parte interactiva a un Client Component que reciba `games`).
8. **Salón `/salon`.** Ruta server que obtiene la lista de juegos (para las tabs) y renderiza un Client Component (`HallOfFame`) que, al cambiar de tab, muestra las puntuaciones reales del juego. Reemplazar `seededScores()` por datos de `scores` (cargados por juego: todos de inicio por props, o fetch por tab vía un pequeño endpoint/acción — elegir lo más simple). El bloque "TU MEJOR MARCA" se mantiene/oculta sin persistencia (auth mock).
9. **Reproductor `/jugar/[id]`.** Dejar de importar `GAMES`; obtener el `game` mínimo por `id` (wrapper server o prop). El modal de fin: al "GUARDAR PUNTUACIÓN", hacer `POST /api/scores` con `{ gameId: id, name, score }`; en éxito mostrar "▸ PUNTUACIÓN GUARDADA_", en error un mensaje y permitir reintento. Conservar el resto del flujo (JUGAR DE NUEVO / VOLVER AL VAULT) y la integración con el motor (SPEC 05) intactos.
10. **Route Handler `POST /api/scores`.** Crear `app/api/scores/route.ts`: parsea el body, valida (`gameId` string, `name` 1–10 tras `trim().toUpperCase()`, `score` entero en rango), llama `insertScore` y responde `{ ok:true }` (201) o `{ ok:false, error }` (400/500). Mismo patrón que `/api/health/supabase`.
11. **Retirar mocks.** Eliminar `GAMES`, `PLAYERS` y `seededScores` de `data.ts`; conservar tipos y `CATS`. Verificar que no queda ningún import de los símbolos retirados (grep `seededScores`, `GAMES`).
12. **Verificación.** `npm run build` compila. En `npm run dev`: la biblioteca, la home y el detalle muestran los 8 juegos desde la BD con el mismo aspecto; `/salon` muestra puntuaciones reales por tab; jugar a `/jugar/rocas`, perder y "GUARDAR PUNTUACIÓN" inserta una fila (verificable en `/salon`/detalle y vía SQL). Con `name` vacío o `score` inválido, `POST /api/scores` responde `{ ok:false }` 400. Confirmar vía advisories que RLS está activo y no hay tablas sin política.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existen las tablas `games` y `scores` en Supabase, creadas por migración versionada, con RLS **habilitado** en ambas.
- [ ] `games` tiene `SELECT` público y **no** permite `INSERT/UPDATE/DELETE` desde el cliente; `scores` tiene `SELECT` e `INSERT` públicos (validado) y **no** `UPDATE/DELETE`.
- [ ] `games` está sembrada con los 8 juegos actuales, con los mismos `id`, textos, `cat`, `cover`, `color`, `best` y `plays`, y un `position` que preserva el orden de la biblioteca.
- [ ] `scores` está sembrada con varias filas por juego, de modo que los leaderboards no aparecen vacíos.
- [ ] Existe `app/lib/supabase/database.types.ts` generado del esquema, y la capa de acceso `app/lib/db/` (`getGames`, `getGameById`, `getTopScores`, `insertScore`) lo usa.
- [ ] La biblioteca (`/games`), la home (`/`), el detalle (`/juego/[id]`) y el reproductor (`/jugar/[id]`) obtienen el catálogo desde Supabase; **ninguno** importa `GAMES` de `data.ts`.
- [ ] `/salon` y la columna "MEJORES PUNTUACIONES" del detalle muestran puntuaciones reales de `scores`; **no** se usa `seededScores()` en ningún sitio.
- [ ] `GAMES`, `PLAYERS` y `seededScores` ya no existen en `data.ts`; sí permanecen los tipos y `CATS`.
- [ ] `POST /api/scores` inserta una puntuación válida y responde `{ ok:true }`; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` con 400.
- [ ] En `/jugar/[id]`, "GUARDAR PUNTUACIÓN" persiste de verdad (la fila aparece al volver a `/salon` o al detalle del juego), muestra confirmación en éxito y error recuperable en fallo.
- [ ] Las categorías del filtro (`CATS`) siguen funcionando y el aspecto visual de biblioteca, home, detalle y salón no cambia.
- [ ] No se tocan el motor de ROCAS (SPEC 05), `SessionProvider`, la auth ni los estilos; la búsqueda/filtro/tabs siguen siendo interactivos.
- [ ] Los advisories de seguridad de Supabase no reportan tablas sin RLS ni políticas peligrosas tras los cambios.

---

## Decisions

- **Sí:** `games` como fuente de verdad del catálogo (migrar `GAMES` y leer desde la BD). Es el objetivo que pediste y evita tener el catálogo duplicado entre `data.ts` y la BD. Se descarta mantener `data.ts` como catálogo con `games` solo de FK, porque dejaría dos orígenes de verdad que se desincronizan.
- **Sí:** convertir las páginas cliente afectadas al patrón Server Component (fetch) → Client Component hijo (interactividad). Es el patrón idiomático del App Router de Next 16 y mantiene el acceso a datos en el server (donde ya vive el cliente de SPEC 04). Se descarta hacer fetch client-side con `createBrowserClient` para no esparcir lógica de datos por componentes cliente ni dependencia de `useEffect` para la carga inicial.
- **Sí:** escritura de puntuaciones vía Route Handler `POST /api/scores` con validación server. Reusa el patrón `/api/...` de SPEC 04 y centraliza la validación. Se descarta insertar directamente desde el cliente con el browser client, para validar en un único punto y no depender de la UI para la integridad.
- **Sí:** puntuaciones **anónimas con iniciales** e `INSERT` público validado por RLS mientras la auth sea mock. Mantiene el flujo del prototipo funcionando hoy. Se descarta exigir usuario autenticado (bloquearía la feature hasta la spec de auth); la columna `user_id` y RLS por dueño se añaden cuando llegue la auth.
- **Sí:** `best` y `plays` como columnas de display sembradas, no derivadas en vivo. Conserva el feel del catálogo sin triggers ni vistas. Se descarta recalcularlas desde `scores` ahora por complejidad que no aporta a esta fase.
- **Sí:** sembrar `scores` con el set de nombres del prototipo. Los leaderboards se ven poblados desde el primer arranque. Se descarta dejarlos vacíos (se verían rotos hasta que alguien juegue).
- **No:** anti-cheat, auth real, derivación en vivo de stats y "tu mejor marca" por usuario. Cada uno depende de identidad o de infraestructura adicional y va en su propia spec.

---

## Risks

| Riesgo                                                                                                                       | Mitigación                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSERT` público en `scores` permite spam/puntuaciones falsas.                                                               | Política con `check` de rango y longitud; sin `UPDATE/DELETE` públicos. Se acepta como riesgo de esta fase (prototipo); el endurecimiento (auth + anti-cheat) va en specs posteriores.    |
| Convertir páginas cliente a server rompe la interactividad (búsqueda/filtro/tabs) o el `"use client"`.                       | Extraer la parte interactiva a Client Components que reciben datos por props; la ruta server solo hace el fetch. Criterio de aceptación verifica que filtros/tabs siguen vivos.           |
| Olvidar habilitar RLS o dejar una tabla sin política → datos expuestos.                                                      | `enable row level security` explícito en la migración y revisión obligatoria de advisories de Supabase tras aplicar (criterio de aceptación).                                             |
| Desincronización entre el `game_id` sembrado y los `id` del catálogo (FK rota).                                              | La siembra de `scores` referencia los mismos slugs de la siembra de `games`; la FK `on delete cascade` garantiza integridad.                                                              |
| Quitar `GAMES`/`seededScores` de `data.ts` deja imports colgando y rompe el build.                                           | Hacer la retirada como último paso, tras migrar todos los consumidores; grep de `GAMES`/`seededScores` antes de dar por cerrado.                                                          |
| Variables de entorno de Supabase ausentes en el entorno de ejecución → fetch del catálogo falla y la biblioteca queda vacía. | Reusa los cimientos de SPEC 04 (`.env.local`/`.env.template`); la capa de acceso propaga el error y, para páginas, se puede mostrar un estado de "sin conexión" en vez de un crash opaco. |

---

## What is **not** in this spec

- Autenticación real y el reemplazo del `SessionProvider` mock; vincular puntuaciones a un `user_id`.
- Anti-cheat / verificación server-side de que una puntuación es alcanzable.
- Derivar `best`/`plays` en vivo desde `scores` (triggers, vistas, conteos reales).
- "TU MEJOR MARCA" persistente por usuario en `/salon`.
- Paginación, realtime o filtros avanzados de leaderboards; panel de administración del catálogo.
- Cambios al motor de ROCAS (SPEC 05), a los estilos o a la estructura visual de las páginas.

Cada uno de esos, si llega, va en su propia spec.
