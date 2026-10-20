# Plantilla de spec — Juego nuevo + leaderboard (Arcade Vault)

Esta es la forma que debe respetar la spec que genera `/spec-juego`. **No es texto para copiar literal**: es el esqueleto a rellenar con las respuestas de la entrevista, concretando nombres reales (`<slug>`, `<Nombre>`, `<ref>`, valores del catálogo). Las partes marcadas _(si jugable)_ se incluyen solo cuando el juego tiene motor; si es maqueta, se omiten y se dice explícitamente.

Sigue el mismo esqueleto que `C:\Users\Equipo\.claude\skills\spec\template.md`, especializado a este dominio.

---

## Cabecera

```markdown
# SPEC NN — <Título corto del juego> ("<TÍTULO EN CAPS>") con leaderboard

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** YYYY-MM-DD
> **Objective:** Añadir "<TÍTULO>" (id `<slug>`) al catálogo de Arcade Vault como juego <jugable|maqueta> con su leaderboard persistente, reusando el patrón de motor de la SPEC 05 y el de catálogo/scores de la SPEC 06.
```

Estados válidos (usa el idioma del repo): `Draft`/`Borrador`, `In review`/`En revisión`, `Approved`/`Aprobado`, `Implemented`/`Implementado`, `Obsolete`/`Obsoleto`.

El objetivo es **una sola frase**. Si necesita dos, el juego es demasiado grande.

---

## Por qué existe esta spec

Breve: qué juego se añade, de dónde sale (referencia en `references/started-games/<ref>` o diseño propio), y por qué encaja en los patrones ya `Implementado` (SPEC 05 motor, SPEC 06 catálogo/leaderboard). Si es maqueta, aclarar que se añade al catálogo y leaderboard ahora y el motor jugable queda para una spec futura.

---

## Scope

```markdown
**In:**

- Alta del juego `<slug>` en la tabla `games` de Supabase vía migración (todos los campos del Data model).
- Siembra de ~10–12 filas en `scores` para `game_id = '<slug>'`, para que el leaderboard no salga vacío.
- Clase de portada `.cover-<slug>` en `app/globals.css`, diseñada con `/frontend-design`.
- (si jugable) Motor portado en `app/lib/games/<slug>/engine.ts` como `create<Nombre>Game: GameFactory`, registrado en `app/lib/games/registry.ts`.

**Out of scope (para futuras specs):**

- (si maqueta) El motor jugable real: `<slug>` queda como maqueta.
- Sonido, controles táctiles/móviles, anti-cheat, auth real / vincular scores a usuario.
- Tocar el motor de ROCAS (SPEC 05) o los contratos de SPEC 06.
```

El bloque **Out** es obligatorio: captura lo que salió en la entrevista pero se decidió aplazar.

---

## Data model

Esta spec no crea tablas nuevas (ya existen `games` y `scores` de SPEC 06). Añade **datos** y, si es jugable, **un contrato de motor**.

**Fila a insertar en `games`** (los `check` de la BD: `cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values ('<slug>', '<TÍTULO>', '<short>', '<long>', '<CAT>', 'cover-<slug>', '<color>', <best>, '<plays>', <position>);
```

**Siembra de `scores`** (nombres 1–10 chars, score 0..100000000, decrecientes):

```sql
insert into public.scores (game_id, name, score) values
  ('<slug>', 'PX_KAI', <n1>),
  ('<slug>', 'NEONFOX', <n2>),
  -- … ~10–12 filas
  ('<slug>', '<NAME>', <nN>);
```

**Portada** `.cover-<slug>` en `app/globals.css` (base `.cover-bg` + `::after`/`::before`, color neón `var(--<color>)`). Diseño: `<frase del usuario>`. _El diseño real se hace con `/frontend-design`._

_(si jugable)_ **Contrato de motor** (de `app/lib/games/types.ts`, no se redefine):

```ts
// app/lib/games/engine → cumple GameFactory
const create<Nombre>Game: GameFactory = (canvas, callbacks): GameEngine => { /* ... */ };
// Mapeo de mecánicas: onScore=<...>, onLives=<...>, onLevel=<...>, onGameOver=<...>
// Resolución interna del canvas: <W>×<H>.
```

Si es maqueta, escribe: _"Este juego no introduce motor: no hay entrada en `registry.ts`; `/jugar/<slug>` muestra la maqueta genérica."_

---

## Implementation plan

Cada paso deja la app compilando y navegable. Numera y concreta nombres. Omite 1–2 si es maqueta.

```markdown
1. (si jugable) Portar `references/started-games/<ref>/game.js` → `app/lib/games/<slug>/engine.ts` como `create<Nombre>Game: GameFactory`, SIN estado global de módulo: encapsular todo el estado en el closure, recibir `canvas`/`ctx` por parámetro (no `getElementById`), fijar `canvas.width/height` a <W>×<H>. Mover clases de entidad dentro. Listeners de teclado añadidos en `start()` (con `preventDefault` para las teclas del juego) y quitados en `destroy()`. RAF cancelable (`rafId` nullable, `startLoop`/`stopLoop`), `dt` cap 0.05, `lastTime` reseteado al (re)arrancar. `syncReactState()` que difunde `onScore/onLives/onLevel` al cambiar y `onGameOver` una vez. Exponer `start/pause/resume/restart/destroy`. Quitar el "pulsa tecla para reiniciar" del original. Preservar constantes y feel.
2. (si jugable) Registrar en `app/lib/games/registry.ts`: `import { create<Nombre>Game }` + línea `"<slug>": create<Nombre>Game`. (El reproductor ya lo recoge por `id`; no se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.)
3. Migración Supabase (vía MCP `apply_migration`/`execute_sql`): `insert into public.games (...)` con la fila del Data model y `insert into public.scores (...)` con la siembra. Respetar los `check`. Tras aplicar, revisar `get_advisors` (RLS sigue limpio).
4. Añadir `.cover-<slug>` (+ pseudo-elementos) en `app/globals.css` usando `/frontend-design`. El `cover` de la fila de `games` apunta a esta clase.
5. Regenerar `app/lib/supabase/database.types.ts` con `generate_typescript_types` SOLO si cambió el esquema (normalmente no: son inserts).
6. Verificación manual (ver Acceptance criteria).
```

Reglas: cada paso commiteable por sí solo; el último paso del plan no es "probar todo" (eso son los criterios).

---

## Acceptance criteria

Checklist booleano. Deriva de SPEC 05 + SPEC 06. Ejemplos a concretar:

```markdown
- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Existe la fila `games` con `id = '<slug>'`, `cat`/`color` válidos y `cover = 'cover-<slug>'`; RLS sigue habilitado en `games` y `scores`.
- [ ] `scores` tiene varias filas para `game_id = '<slug>'`; el leaderboard de `<slug>` no sale vacío.
- [ ] El juego aparece en `/` (home), `/games` (biblioteca), `/salon` (tab) y `/juego/<slug>` (detalle) leyendo desde la BD, con la portada `.cover-<slug>`.
- [ ] `POST /api/scores` con `{ gameId: "<slug>", name, score }` válido inserta y la fila aparece en `/salon` y en el detalle; con `name` vacío/>10 o `score` inválido responde `{ ok:false }` 400.
- [ ] (si jugable) En `/jugar/<slug>` se juega el juego real en canvas; el HUD de React (`.player-hud`) refleja score/vidas/nivel reales; PAUSA/REANUDAR no provoca salto de simulación; al perder se abre el modal con la puntuación real y "JUGAR DE NUEVO" reinicia limpio.
- [ ] (si jugable) `engine.ts` no usa estado global ni `document.getElementById`; al navegar fuera, `destroy()` cancela el RAF y quita listeners; reentrar no duplica el loop.
- [ ] (si maqueta) `/jugar/<slug>` muestra la maqueta genérica sin motor; ningún otro juego se rompe.
- [ ] `get_advisors` de Supabase no reporta tablas sin RLS ni políticas peligrosas.
```

Evita criterios no verificables ("que funcione bien", "buena UX").

---

## Decisions

Hereda y concreta las decisiones clave de SPEC 05/06:

```markdown
- **Sí:** reusar los patrones SPEC 05 (motor por `GameFactory` + registro) y SPEC 06 (catálogo en `games`, leaderboard en `scores`). Evita reinventar y mantiene un único origen de verdad.
- **Sí:** puntuaciones anónimas con iniciales e `INSERT` público validado por RLS (auth sigue mock).
- **Sí:** `best`/`plays` como columnas de display sembradas, no derivadas en vivo.
- **Sí:** portada diseñada con `/frontend-design` (regla de CLAUDE.md).
- **No:** sonido, táctil, anti-cheat, auth real — cada uno en su propia spec.
- <decisiones específicas del motor elegido, p. ej. mapeo de "líneas"→nivel en Tetris, o carga de assets en Arkanoid>
```

---

## Risks

Solo si hay riesgos no obvios. Tabla simple:

```markdown
| Riesgo                                                             | Mitigación                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| El port a TS introduce regresiones de feel (velocidades, splits).  | Portar preservando constantes y mecánica 1:1; verificación manual jugando en `/jugar/<slug>`.     |
| Fugas de RAF/listeners al montar/desmontar en el App Router.       | `destroy()` cancela el RAF y quita listeners; el `useEffect` de `CanvasGame` retorna ese cleanup. |
| <riesgo del motor concreto: Tetris sin vidas / assets de Arkanoid> | <mitigación>                                                                                      |
| `INSERT` público en `scores` permite spam.                         | `check` de rango/longitud; sin `UPDATE/DELETE`. Endurecer con auth + anti-cheat en otra spec.     |
```

Para juegos simples, omite riesgos irrelevantes.

---

## Qué **no** está en esta spec

```markdown
- Sonido y efectos de audio.
- Controles táctiles / móviles.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.
- (si maqueta) El motor jugable de `<slug>`.

Cada uno de esos, si llega, va en su propia spec.
```
