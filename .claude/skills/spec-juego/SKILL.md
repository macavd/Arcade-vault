---
name: spec-juego
description: Genera una spec (sin escribir código) para añadir un juego nuevo con leaderboard a Arcade Vault, combinando el patrón de motor de la SPEC 05 y el de catálogo/leaderboard de la SPEC 06. Úsalo cuando el usuario quiera "añadir un juego", "crear una spec de juego", "dar de alta un juego nuevo" o portar un juego de references/started-games. No implementa: deja la spec en Draft para /spec-impl.
disable-model-invocation: true
argument-hint: "nombre o descripción del juego (o el slug del catálogo)"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, PowerShell(Get-Date:*), PowerShell(Get-ChildItem:*), PowerShell(Get-Content:*)
---

# /spec-juego — Diseñador de specs para juegos nuevos de Arcade Vault

## Contexto de sesión

Fecha de hoy (úsala para el campo `**Date:**` de la spec, nunca la inventes):
!`Get-Date -Format yyyy-MM-dd`

Specs que ya existen:
!`if (Test-Path specs) { Get-ChildItem specs -Name } else { "No existe la carpeta specs/ todavía" }`

Juegos de referencia disponibles para portar:
!`if (Test-Path references/started-games) { Get-ChildItem references/started-games -Name } else { "No hay references/started-games" }`

Slugs de juego ya ocupados en el registro de motores (no los reutilices):
!`if (Test-Path app/lib/games/registry.ts) { Get-Content app/lib/games/registry.ts } else { "No existe app/lib/games/registry.ts" }`

---

Este skill produce **una spec** para añadir un juego nuevo con su leaderboard a Arcade Vault. **No escribes código aquí ni tocas Supabase.** Tu trabajo es entrevistar al usuario, resolver ambigüedades y escribir un `.md` en `specs/` que combine dos patrones que ya están `Implementado` en el proyecto:

- **SPEC 05** (motor): portar un `game.js` vanilla de `references/started-games/` a `app/lib/games/<slug>/engine.ts` como fábrica `GameFactory` sin estado global, y registrarlo en `app/lib/games/registry.ts`. El reproductor (`app/components/GamePlayer.tsx` + `app/components/games/CanvasGame.tsx`) lo recoge genéricamente por `id`.
- **SPEC 06** (catálogo + leaderboard): alta del juego en la tabla `games` de Supabase, clase CSS `.cover-<slug>` en `app/globals.css`, siembra de la tabla `scores`, y lectura automática desde `getGames()`/`getGameById()`/`getTopScores()` en home, biblioteca, salón y detalle; escritura vía `POST /api/scores`.

La spec que generes queda en estado `Draft`. El usuario la revisa, la pasa a `Approved` y la implementa con `/spec-impl`. **Tú no implementas.**

## Filosofía

Una spec es el contrato que guía la ejecución posterior. Si la spec es vaga, el código improvisa. Por eso este flujo es **lento en la definición y rápido en la escritura**. Lee `plantilla-juego.md` (en el mismo directorio que este skill) para ver la forma exacta de la spec que vas a producir; apóyate en ella en cada paso.

## Flujo del comando

- Sigue las cuatro fases en orden. **Nunca te saltes la Fase 2** — las preguntas son el punto del comando.
- Responde siempre en el idioma del prompt inicial (normalmente español, como las specs del repo).

### Fase 1 — Entender el contexto

Antes de preguntar por el juego, asegura el contexto del proyecto:

1. **Lee el skill `/spec` como referencia canónica.** Localiza su carpeta (prueba en orden: `.agents/skills/spec/`, `.claude/skills/spec/`, `~/.claude/skills/spec/`) y lee tanto su `SKILL.md` como su `template.md`. Es la fuente de verdad del método spec-driven de este proyecto: de ahí tomas el orden de secciones, el formato exacto de la cabecera, los estados válidos y las reglas de redacción. `plantilla-juego.md` (junto a este skill) es la especialización de dominio de ese `template.md`; si entran en conflicto, la **estructura** manda `/spec` y los **contenidos del dominio** mandan `plantilla-juego.md`.
2. Lee `CLAUDE.md` (regla obligatoria: **usar `/frontend-design` para diseñar interfaz** — la portada CSS del juego cae ahí).
3. Mira el listado de `specs/` del contexto de sesión y lee las **dos specs más recientes** para copiar convención: idioma, etiquetas de cabecera (`**Status:** / **Depends on:** / **Date:** / **Objective:**`) y el valor exacto de los estados en el idioma del repo (`Implementado`, `Borrador`, etc.).
4. Lee **SPEC 05** (`specs/05-rocas-juego-asteroides.md`) y **SPEC 06** (`specs/06-base-datos-juegos-y-puntuaciones.md`): son los patrones que la spec nueva replica. La spec que generes debe apuntarlas en `**Depends on:**`.
5. Lee los contratos vigentes para no inventar nombres ni valores:
   - `app/lib/data.ts` — interfaz `Game` y las uniones **`GameCategory` = `"ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"`** y **`NeonColor` = `"cyan" | "magenta" | "yellow" | "green"`**. Los valores de `cat` y `color` de la spec deben caer en esas uniones (coinciden con los `check` de la BD).
   - `app/lib/games/registry.ts` — slugs ya ocupados (ver contexto de sesión), para no colisionar.
   - `app/lib/games/types.ts` — `GameCallbacks` (`onScore/onLives/onLevel/onGameOver`), `GameEngine` (`start/pause/resume/restart/destroy`), `GameFactory`.
   - `app/globals.css` — las clases `.cover-*` existentes (patrón de la portada a crear).

Si `$ARGUMENTS` viene vacío, pide al usuario una descripción en **una sola frase** del juego. Si no cabe en una frase, es la primera señal de que es demasiado grande: propón partirlo.

### Fase 2 — Entrevista (lo más importante)

Detecta ambigüedades y **pregunta**, no asumas. Haz preguntas en bloques de 3 a 5, concretas (no abiertas). Si tu agente tiene `AskUserQuestion`, úsalo y pon tu recomendación primero y etiquetada. Espera respuesta antes de seguir.

Cubre estas categorías del dominio:

- **Identidad del catálogo.** `id`/slug estable en kebab-case (valida que **no** choca con los slugs del registro ni con el catálogo); `title`; `short` (texto de tarjeta, una línea); `long` (texto de detalle, 1–2 frases).
- **Clasificación y display.** `cat` (una de las 4 de `GameCategory`); `color` neón (una de las 4 de `NeonColor`); `plays` (string de display tipo `"12.4K"`); `best` (entero de display); `position` (siguiente entero del catálogo).
- **¿Jugable o maqueta?** ¿Viene de `references/started-games/`? Si sí, ¿cuál (`02-asteroids` / `03-tetris` / `04-arkanoid` / otro) y qué archivo(s) de motor? Anota los escollos conocidos del portado:
  - **Tetris (`03-tetris`)**: canvas id `board` (300×600) + `next-canvas`, HUD en el DOM, **no tiene vidas** (usa "líneas") — hay que decidir qué reporta `onLives`.
  - **Arkanoid (`04-arkanoid`)**: multi-archivo (`spritesheet.js`, `levels.js`, `game.js`), depende de sprites + sonidos (assets), y tiene estado `'win'` sin callback directo.
  - Si **no** hay motor, el juego queda como maqueta: **sin** entrada en `registry.ts`, pero sí con catálogo y leaderboard reales.
- **Mapeo motor → callbacks** (solo si jugable). Cómo se traducen las mecánicas a `onScore/onLives/onLevel/onGameOver`. Resolución interna del canvas (Asteroids 800×600; Tetris 300×600; Arkanoid 800×600).
- **Portada.** Una frase describiendo el arte de la portada `.cover-<slug>` (se diseñará con `/frontend-design` en `/spec-impl`, no ahora).
- **Siembra de `scores`.** Cuántas filas (~10–12) y si reutilizar el set de nombres del prototipo (`PX_KAI`, `NEONFOX`, …) con puntuaciones decrecientes plausibles.

**Cuándo parar:** cuando puedas responder sin asumir nada (1) qué archivos aparecen/cambian, (2) cuál es el primer y el último paso ejecutable, (3) cómo se verifica que está terminado. Si falta uno, sigue preguntando.

Si una respuesta abre una caja de Pandora (sonido, táctil, multijugador, anti-cheat), señala que merece su propia spec y pregunta si lo dejamos fuera de alcance.

### Fase 3 — Escribir la spec

Cuando la Fase 2 esté cerrada:

- Toma la **estructura y las reglas de redacción del `template.md` del skill `/spec`** que leíste en la Fase 1 (orden de secciones, formato de cabecera, estados válidos, "una frase por idea", nombres concretos, sin TODOs). Sobre esa estructura, rellena `plantilla-juego.md` (en el mismo directorio que este skill) con las respuestas, concretando nombres reales (`app/lib/games/<slug>/engine.ts`, `create<Nombre>Game`, `.cover-<slug>`, tablas `games`/`scores`). Si no leíste el `/spec` en la Fase 1, hazlo ahora antes de escribir.
- **Si tienes toda la información** (puedes responder las 3 preguntas de arriba sin asumir), escribe la spec **entera de una vez** y pasa a Fase 4. No vayas sección por sección ni muestres borrador para aprobar: el usuario revisa el archivo guardado.
- **Solo si falta información** (el usuario cortó la Fase 2 o una respuesta fue vaga), desarrolla las secciones **una a una**, mostrando cada una y esperando confirmación.

La spec sigue el orden de `plantilla-juego.md`: Cabecera → Por qué existe → Scope (In/Out) → Data model → Implementation plan → Acceptance criteria → Decisions → Risks → Qué **no** está en la spec.

Errores a evitar: criterios de aceptación no verificables ("que funcione bien"); meter en el plan cosas que no están en el scope; asumir nombres que el usuario no confirmó; saltarse la sección de decisiones.

### Fase 4 — Guardar la spec

1. Determina el siguiente número desde el listado de `specs/`: coge el mayor número existente y súmale uno, con cero a la izquierda (si el último es `06-...`, este es `07-`). Si `specs/` está vacío o no existe, empieza en `01-`.
2. Genera un slug kebab-case corto a partir del objetivo. Si `$ARGUMENTS` ya es un único token kebab-case sin espacios, úsalo como slug y como semilla de la descripción.
3. Usa la fecha del contexto de sesión en `**Date:**`. **Nunca escribas una fecha que no leíste de ahí.**
4. Escribe el archivo directamente en `specs/NN-slug.md` con todas las secciones. **No pidas permiso para escribirlo** — anuncia la ruta en la confirmación final. Solo pregunta si el archivo ya existe.
5. Marca el estado como `Draft` (o el equivalente que usen las specs del repo, p. ej. `Borrador`). **No lo marques `Approved` automáticamente** — eso lo hace el usuario tras releerla.
6. Comprueba que las dependencias del encabezado existen: `**Depends on:** SPEC 05, SPEC 06` deben corresponder a archivos reales en `specs/`. Si alguna no existe, dilo en vez de dejar una referencia colgando.
7. **Siembra el archivo de config si no existe.** Comprueba `specs/.spec-config.yml`. Si **falta**, créalo con el contenido de abajo. Si **ya existe, no lo toques.**

   ```yaml
   # spec workflow configuration
   #
   # AutoCreateBranch — controla si /spec-impl crea la rama git automáticamente.
   #   true  (default) → /spec-impl crea y cambia a spec-NN-slug sin preguntar
   #   false           → /spec-impl pide confirmación [y/N] antes de crear la rama
   AutoCreateBranch: true
   ```

8. Confirma al usuario:
   - Ruta del archivo creado.
   - Recordatorio: la spec está en `Draft`; cámbiala a `Approved` cuando la hayas releído.
   - Si acabas de crear `specs/.spec-config.yml`, menciónalo y que `AutoCreateBranch` vale `true` por defecto.
   - Siguiente paso: una vez revisada y aprobada, correr `/spec-impl NN-slug` para implementarla.
   - **Para aquí.** No propongas implementar la spec, escribir código ni ninguna otra acción.

## Reglas duras

- **Nunca escribas código durante este comando.** Solo el `.md` de la spec al final. Nada de Supabase, `globals.css`, ni motores.
- **Nunca propongas implementar la spec después de guardarla.** Tu trabajo acaba al escribir el archivo. El usuario corre `/spec-impl` cuando quiera.
- **Nunca asumas decisiones que el usuario no confirmó.** Si falta información, pregunta en la Fase 2.
- **No re-preguntes en la Fase 3 lo ya respondido en la Fase 2.** Si la info está completa, escribe la spec entera y guárdala.
- **Valida contra el código real:** `cat` y `color` deben estar en las uniones de `app/lib/data.ts`; el slug no debe chocar con `registry.ts`.
- **Si el juego es demasiado** (pide motor + sonido + táctil + multijugador, o toca más de tres áreas), propón partirlo en varias specs antes de continuar.

## Argumentos

`$ARGUMENTS` es **la descripción del juego**, no el nombre de archivo. Es el punto de partida de la Fase 1; el slug se deriva del objetivo en la Fase 4. Excepción: si `$ARGUMENTS` ya es un único token kebab-case sin espacios (p. ej. `/spec-juego laberinto-neon`), úsalo como slug **y** como semilla de la descripción, sin pedir confirmación. Si se invoca sin argumentos, empieza pidiendo la descripción de una frase.
