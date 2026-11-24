# SPEC 01 (game-jam/contramisil) — "CONTRAMISIL" clásico: Missile Command con catálogo, leaderboard y motor

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16
> **Date:** 2026-11-24
> **Objective:** Dar de alta `contramisil` (CONTRAMISIL, un Missile Command fiel al arcade) en `games` + `scores`, construir su prototipo vanilla, portarlo a `app/lib/games/contramisil/engine.ts` como `createContramisilGame: GameFactory` (con un módulo `shared.ts` reutilizable por la variante `contramisil-reflejo`) y registrarlo, de modo que `/jugar/contramisil` sea jugable con ratón, teclado y táctil y sus puntuaciones entren en el leaderboard.

---

## Por qué existe esta spec

`references/game-suggestions-todo.md` propone **contramisil** (CONTRAMISIL · SHOOTER/magenta) en el carril de shooters: un **Missile Command** (Atari, 1980). Es el único "no-nave" de ese carril: el jugador no pilota nada, **defiende** seis ciudades y tres silos disparando contramisiles hacia un punto del cielo, donde detonan en una explosión circular que destruye lo que la cruce. Es defensa por **trayectorias**: hay que anticipar dónde estará la ojiva cuando la explosión crezca.

Encaja en el catálogo por cuatro motivos verificados contra el estado actual:

- **Hueco de mecánica.** Los motores existentes (`rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria` en `app/lib/games/registry.ts`) se controlan todos por teclado con un avatar que se mueve; ninguno usa **apuntar con el puntero** como input principal. CONTRAMISIL estrena ese input.
- **Hueco de catálogo.** En SHOOTER solo hay `rocas` (motor) e `invasores` (maqueta), ambos de nave; `magenta` solo lo usa `caida`. Ningún slug del catálogo, del registro, de las maquetas (`gloton`, `invasores`, `duelo-pixel`) ni del To-Do colisiona con `contramisil`.
- **Encaja en el contrato de motor sin forzarlo.** Ciudades supervivientes → `onLives`, oleada → `onLevel`, puntuación nativa del arcade → `onScore`, sin ciudades → `onGameOver`. El HUD compartido nunca queda incoherente.
- **Es el mejor candidato táctil del catálogo.** "Toca donde quieres que explote" es nativo en móvil; no necesita D-pad virtual.

**No existe prototipo portable:** `references/started-games/` solo contiene `02-asteroids`, `03-tetris`, `04-arkanoid` y `05-snake`, ya portados. Esta spec **necesita prototipo nuevo**, que se construye en `references/started-games/09-missile-command` y se porta desde ahí (como la SPEC 09 hizo con `05-snake`). Los números `06`–`08` quedan reservados por las jams previas (`ranaria`, `turbovia`, `patrulla-lunar`).

Esta es la **variante 1 (clásica)** del juego. La variante 2 (`02-contramisil-reflejo.md`) es un juego hermano con un twist mecánico real (barreras de reflexión dibujadas en lugar de contramisiles) y reutiliza el `shared.ts` que crea esta spec. Ver Decisions para la convivencia de ambas en el catálogo.

---

## Scope

**In:**

- **Catálogo + leaderboard (patrón SPEC 06):** migración que inserta la fila `contramisil` en `public.games` y siembra 12 filas en `public.scores`; portada `.cover-contramisil` en `app/globals.css` diseñada con `/frontend-design`.
- **Prototipo vanilla** en `references/started-games/09-missile-command/` (`index.html` + `game.js`), jugable abriendo el HTML, como fuente verificable del port.
- **Módulo compartido** `app/lib/games/contramisil/shared.ts`: constantes de mundo (resolución, suelo, posiciones de ciudades y silos), mapeo puntero→canvas, generador de oleadas, actualización/dibujo de explosiones, dibujo de suelo/ciudades/cielo y paleta. Sin estado de módulo: solo constantes y funciones puras o que reciben el estado por parámetro.
- **Motor** `app/lib/games/contramisil/engine.ts` como `createContramisilGame: GameFactory`, sin estado global, canvas por parámetro, `800×600`, con los callbacks y el ciclo de vida del contrato de `app/lib/games/types.ts`.
- **Input nativo por Pointer Events** sobre el canvas (ratón, táctil y lápiz con el mismo código) + teclado (mira con flechas, disparo por silo).
- **Registro** en `app/lib/games/registry.ts`: `contramisil: createContramisilGame`.
- **Rendimiento según SPEC 16:** `getContext("2d", { alpha: false })`, relleno completo por frame, `glowScale()` y presupuesto de entidades.

**Out of scope (para futuras specs):**

- La variante `contramisil-reflejo` (va en `02-contramisil-reflejo.md`).
- Skins (`clasico`/`neon`/`retro`): el motor centraliza sus colores en una paleta para que `skin-designer` lo pueda tematizar después, pero **ignora** el parámetro `skin` y no se añade a `SKINNED_GAMES`.
- Sonido, anti-cheat / validación server-side del score, auth real.
- Entrada en `app/lib/games/touch-map.ts` / cambios en `TouchControls.tsx` (no hacen falta: ver Decisions).
- Tocar otros motores, `CanvasGame.tsx`, `GamePlayer.tsx`, `types.ts` o el esquema de BD.

---

## Data model

### Catálogo (Supabase, patrón SPEC 06)

No se crean tablas: `games` y `scores` existen desde la SPEC 06 con sus `check` (`cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green, `name` 1–10 chars, `score` 0..100000000) y sus políticas RLS (`games_public_read`, `scores_public_read`, `scores_public_insert`).

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'contramisil',
  'CONTRAMISIL',
  'Defiende seis ciudades de la lluvia de misiles.',
  'Desde tres silos con diez contramisiles cada uno, apunta y detona en el cielo antes de que las ojivas toquen suelo. Las explosiones atrapan todo lo que cruza su radio: anticipa la trayectoria, encadena detonaciones y cuida la munición. Ojivas que se dividen, bombarderos y bombas inteligentes endurecen cada oleada; cada 10.000 puntos recuperas una ciudad.',
  'SHOOTER',
  'cover-contramisil',
  'magenta',
  87650,
  '6.3K',
  <MAX(position)+1>
);

insert into public.scores (game_id, name, score) values
  ('contramisil', 'PX_KAI',    87650),
  ('contramisil', 'NEONFOX',   79200),
  ('contramisil', 'DROID_X',   71450),
  ('contramisil', 'VAULT_07',  63800),
  ('contramisil', 'GLITCHA',   55125),
  ('contramisil', 'SCANLINE',  47600),
  ('contramisil', 'ARKADYA',   39875),
  ('contramisil', 'M00NRYU',   32250),
  ('contramisil', 'RETROVIRA', 25400),
  ('contramisil', 'BIT_LORD',  18725),
  ('contramisil', 'JOY_STK',   12300),
  ('contramisil', 'MAGENTA88',  6850);
```

Las puntuaciones son múltiplos de 25 coherentes con el scoring del arcade y decrecientes desde `best = 87650`.

**Portada** `.cover-contramisil` (base `.cover-bg` + pseudo-elementos, neón `var(--magenta)`): horizonte oscuro con seis siluetas de ciudad, tres estelas de ojiva magenta en diagonal descendente y una explosión circular cian a media altura cortándolas. Valores exactos con `/frontend-design`.

**Integración del leaderboard (sin código nuevo):** al acabar la partida el motor llama `onGameOver(finalScore)`; `GamePlayer.tsx` abre el modal de fin y `saveScore()` hace `POST /api/scores` con `{ gameId: "contramisil", name, score }`; `app/api/scores/route.ts` valida y delega en `insertScore` (`app/lib/db/scores.ts`). El ranking se lee con `getTopScores` en `/juego/contramisil` y en la pestaña de `/salon`.

### Contrato de motor (de `app/lib/games/types.ts`, no se redefine)

```ts
// app/lib/games/contramisil/engine.ts → cumple GameFactory
export const createContramisilGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* estado en el closure: cities[6], silos[3], reserveCities, enemies[],
     interceptors[], explosions[], wave, mult, score, nextBonusAt, crosshair,
     keys, state, stateTimer, lastTime, rafId, last emitted values */
};
```

**Mapeo de mecánicas → callbacks:**

- `onScore(score)` — puntuación acumulada (tabla de scoring abajo). Se emite solo al cambiar.
- `onLives(lives)` — `lives = ciudadesVivas + ciudadesDeReserva` (0..9). Arranca en `6`. Baja al destruirse una ciudad; sube al ganar una ciudad bonus. `0` solo cuando la partida está perdida, así el HUD nunca muestra "—" con el juego en marcha.
- `onLevel(level)` — número de oleada (`1`, `2`, …).
- `onGameOver(finalScore)` — una sola vez, al terminar la animación de fin (ver Estados).

### Mundo y constantes

- Canvas interno `800×600`; el motor fija `canvas.width/height`. Encaja 1:1 en el `.crt-screen` 4:3 (`CanvasGame` lo estira al 100%).
- Suelo: `GROUND_Y = 560`, con colinas bajo los silos.
- **Silos** (3): `x = 60, 400, 740`, `y = 548`. `AMMO_PER_SILO = 10` por oleada. Velocidad de contramisil: laterales `300 px/s`, central `520 px/s` (el central es el rápido, como el arcade).
- **Ciudades** (6): `x = 150, 215, 280, 520, 585, 650`, `y = 556`, ancho 44.
- **Contramisiles en vuelo:** máximo `MAX_INTERCEPTORS = 8` simultáneos.
- **Explosión del jugador:** radio máx `BLAST_R = 40`; crece `0.40 s`, se mantiene `0.25 s`, se encoge `0.35 s` (vida `1.0 s`). Destruye toda entidad enemiga cuyo punto de cabeza (o círculo, en aviones) quede dentro del radio actual. Sin fuego amigo: no daña ciudades ni silos.
- **Oleada `w`:**
  - Ojivas totales: `min(10 + 2·(w−1), 30)`.
  - Velocidad de ojiva: `min(45 + 9·(w−1), 160) px/s`.
  - Salvas de 2–4 ojivas cada `max(3.2 − 0.15·(w−1), 1.4) s`, desde `x` aleatoria en `y = 0` hacia un objetivo vivo (70% ciudades, 30% silos; si el objetivo ya cayó, impactan en el suelo).
  - **MIRV** desde `w ≥ 2`: probabilidad `min(0.15 + 0.03·w, 0.4)` por ojiva; se divide en 2–3 cabezas entre `y = 150` y `y = 300`.
  - **Bombarderos/satélites** desde `w ≥ 2`: uno cada ~8 s, cruzan horizontalmente a `y ∈ [120, 220]` a `70 px/s` y sueltan 1–2 ojivas (cuentan dentro del total de la oleada).
  - **Bombas inteligentes** desde `w ≥ 6`: `min(1 + floor((w−6)/2), 4)` por oleada. Esquivan: si el borde de una explosión del jugador está a < 30 px, se desplazan perpendicularmente a su trayectoria a `1.5×` velocidad; vuelven a su rumbo al alejarse.
- Una ojiva que llega a su objetivo genera una explosión enemiga de radio 24 que destruye esa ciudad o silo (el silo pierde la munición restante de la oleada; se reconstruye en la siguiente).

### Scoring (fiel al arcade)

Multiplicador `mult = min(1 + floor((w−1)/2), 6)` (×1 oleadas 1–2, ×2 en 3–4, … tope ×6 desde la 11).

| Evento                                     | Puntos           |
| ------------------------------------------ | ---------------- |
| Ojiva o cabeza MIRV destruida              | `25 × mult`      |
| Bombardero / satélite                      | `100 × mult`     |
| Bomba inteligente                          | `125 × mult`     |
| Fin de oleada: por contramisil sin usar    | `5 × mult`       |
| Fin de oleada: por ciudad superviviente    | `100 × mult`     |

Ciudad bonus cada `BONUS_CITY_EVERY = 10000` puntos: va a la reserva (máx. 3) y se reconstruye al terminar la oleada en el hueco de una ciudad destruida. La munición de silos destruidos no puntúa.

### Controles

| Entrada                     | Acción                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Ratón: mover                | La mira sigue al cursor (`pointermove`, solo `pointerType === "mouse"`/`"pen"`).                             |
| Ratón: clic izquierdo       | Dispara al punto desde el **silo con munición más cercano en `x`** (empate → central, el más rápido).        |
| Táctil: tocar               | Igual que el clic: dispara al punto tocado y coloca allí la mira. Multitáctil: cada dedo es un disparo.      |
| `←` `→` `↑` `↓` (mantener)  | Mueven la mira a `420 px/s`.                                                                                 |
| `A` / `S` / `D` (o `1/2/3`) | Disparan a la mira desde el silo izquierdo / central / derecho (si tiene munición y está en pie).            |
| `Espacio`                   | Dispara a la mira desde el silo más cercano con munición.                                                    |

- Todo el input de puntero va por **Pointer Events** (`pointerdown`/`pointermove`) sobre el canvas, que unifican ratón, táctil y lápiz. Coordenadas: `x = (clientX − rect.left) · 800 / rect.width`, `y = (clientY − rect.top) · 600 / rect.height`, con `rect = canvas.getBoundingClientRect()` leído **en cada evento** (sobrevive a cambios de layout/orientación de SPEC 15).
- El punto objetivo se recorta a `y ≤ GROUND_Y − 24` y `x ∈ [8, 792]`.
- Teclado por `e.code` (convención de `rocas`/`caida`/`serpentina`), `preventDefault` en flechas y `Espacio`.
- Coherencia con SPEC 13: el overlay de `TouchControls` solo existe para motores de teclado; aquí el canvas recibe el toque directamente, así que **no se añade entrada a `TOUCH_MAP`** (sin entrada, `TouchControls` no renderiza nada y no tapa el canvas). El motor fija `canvas.style.touchAction = "none"` al arrancar (lo restaura en `destroy()`) y cancela `contextmenu` sobre el canvas para que la pulsación larga en móvil no abra menús.
- `blur` de ventana y `visibilitychange` vacían el set de teclas mantenidas (sin flechas "pegadas").

### Estados del juego

| Estado    | Qué pasa                                                                                                                                                                     | Sale a                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `intro`   | Banner "OLEADA n · ×mult" 1.6 s; silos recargados; la mira se mueve pero no se dispara.                                                                                      | `playing`                                 |
| `playing` | Salvas, disparo, colisiones.                                                                                                                                                 | `tally` / `ending`                        |
| `tally`   | Cuando no quedan enemigos por lanzar ni en pantalla **y** no hay explosiones vivas: recuento animado (~2.5 s) de munición y ciudades, reconstrucción desde la reserva.       | `intro` (oleada+1)                        |
| `ending`  | `lives` llega a 0 (sin ciudades vivas ni en reserva): gran explosión "FIN" de 1.5 s sin input.                                                                               | `over`                                    |
| `over`    | Loop detenido; `onGameOver(score)` emitido una vez.                                                                                                                          | `restart()` → `intro` oleada 1            |

`paused` es una bandera ortogonal controlada por `pause()/resume()` (botones PAUSA/REANUDAR de `GamePlayer`): congela cualquier estado, incluido el recuento. Si las ciudades vivas llegan a 0 pero hay reserva, la oleada sigue (los enemigos apuntan a silos) y al `tally` se reconstruye.

Todos los temporizadores (`stateTimer`, cadencia de salvas, vida de explosiones) se miden en **tiempo de simulación** acumulado con `dt`, nunca con `setTimeout`, para que pausa y `destroy()` no dejen callbacks colgados.

### Render en canvas (estética neón/CRT)

- Fondo: gradiente vertical azul-noche → negro creado **una vez** al instanciar y reutilizado; campo de ~60 estrellas precalculado. Relleno completo del canvas en cada frame (requisito de `alpha: false`).
- Suelo y colinas en magenta oscuro con borde neón; ciudades como siluetas de rectángulos con ventanas cian; silos con su munición como pirámide de 10 marcas (rótulo "BAJO" con ≤ 3, "VACÍO" con 0).
- Ojivas: estela recta (una sola línea `moveTo(origen)→lineTo(cabeza)` por ojiva) magenta y cabeza blanca de 2 px. Contramisiles: estela cian y marca "X" amarilla en su destino.
- Explosiones: círculo relleno cuyo color transita suavemente cian → magenta → amarillo → blanco a lo largo de su vida (sin estrobo; ver Edge cases).
- Mira: cruz amarilla con hueco central.
- HUD dentro del canvas limitado a lo que el HUD de React no muestra: multiplicador `×n` arriba a la derecha, reserva de ciudades bonus, banner de oleada y pantalla de recuento. Score/vidas/nivel los muestra `.player-hud` vía callbacks.
- Colores en un objeto `PALETTE` en `shared.ts` (preparado para skins futuras).

### Rendimiento (SPEC 16)

- `canvas.getContext("2d", { alpha: false })` y relleno total por frame.
- `GLOW = glowScale()` (de `app/lib/games/perf.ts`) leído una vez; `shadowBlur` solo en explosiones y mira, multiplicado por `GLOW`, y fijado **una vez por grupo** de dibujo (no por entidad). Las estelas se dibujan sin `shadowBlur`.
- Presupuesto: ≤ 30 ojivas, ≤ 8 contramisiles, ≤ 40 explosiones. Las listas se compactan **in situ** (swap-remove) para no generar basura por frame; sin `createRadialGradient` dentro del loop.
- Colisiones por distancia al cuadrado (sin `Math.sqrt`); 40 × 30 comprobaciones/frame como peor caso.
- `dt` con tope `DT_CAP = 0.05` y `lastTime` reseteado en `start()`/`resume()`/`restart()`.
- `syncReactState()` emite `onScore/onLives/onLevel` solo ante cambios (patrón de `ranaria`).

### Edge cases

- **Clic/toque sin munición** (todos los silos vacíos o destruidos): no dispara; la mira parpadea en rojo 0.3 s.
- **`MAX_INTERCEPTORS` alcanzado:** el disparo se ignora (no consume munición).
- **Clic por debajo del suelo o sobre un silo:** el objetivo se recorta a `GROUND_Y − 24`.
- **Silo designado por tecla (`A/S/D`) destruido o vacío:** no hace nada (no redirige a otro silo, para que la tecla sea predecible).
- **Ojiva cuyo objetivo ya fue destruido:** sigue su trayectoria e impacta en el suelo sin daño extra.
- **MIRV destruido antes de dividirse:** cuenta una sola ojiva (25 × mult), no sus cabezas.
- **Bomba inteligente atrapada entre dos explosiones:** la esquiva se limita a un desplazamiento máximo por frame y no puede salir de `x ∈ [0, 800]`; si dos explosiones la cubren, muere.
- **Varias explosiones destruyen la misma entidad en el mismo frame:** se marca como muerta en la primera; puntúa una vez.
- **Fin de oleada con explosiones vivas:** el `tally` espera a que terminen (pueden aún destruir enemigos rezagados).
- **Ciudad bonus con todas las ciudades en pie:** queda en reserva (máx. 3; por encima, no se acumula más).
- **Pausa a mitad de explosión / recuento / animación de fin:** todo se congela; al reanudar no hay salto (`lastTime` reseteado).
- **Pestaña oculta:** el RAF se detiene; al volver, `DT_CAP` evita el salto. El set de teclas se vacía en `visibilitychange`.
- **`restart()` durante `ending` o `tally`:** reinicia limpio (oleada 1, 6 ciudades, score 0) y nunca emite el `onGameOver` pendiente.
- **`destroy()` en cualquier estado:** cancela RAF, quita listeners (`pointerdown`, `pointermove`, `contextmenu` del canvas; `keydown`, `keyup`, `blur`, `visibilitychange` de window), restaura `touchAction`.
- **Cambio de skin en `GamePlayer`:** recrea el motor (comportamiento ya existente); el motor nuevo arranca limpio.
- **Fotosensibilidad:** ningún destello a pantalla completa; las explosiones cambian de color de forma continua, no a más de 3 cambios bruscos por segundo. Con `prefers-reduced-motion` (`glowScale() === 0`) se usa un color fijo por explosión.
- **Score máximo:** muy por debajo del tope `100000000` del `check`; no requiere clamp.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. **Migración Supabase** (MCP `apply_migration`): leer `MAX(position)` real de `games`, insertar la fila `contramisil` con `position = MAX+1` y las 12 filas de `scores` del Data model. Revisar `get_advisors` (RLS limpio). No hace falta `generate_typescript_types` (no cambia el esquema).
2. **Portada.** Añadir `.cover-contramisil` (+ pseudo-elementos) en `app/globals.css` con `/frontend-design`. Hasta el paso 6, `/jugar/contramisil` muestra la maqueta.
3. **Prototipo vanilla.** Crear `references/started-games/09-missile-command/` (`index.html` + `game.js`) con todas las reglas, constantes, estados y controles de esta spec en canvas `800×600`. Verificable abriendo el HTML.
4. **Módulo compartido.** Crear `app/lib/games/contramisil/shared.ts` con: constantes de mundo (`W`, `H`, `GROUND_Y`, `CITY_X`, `SILO_X`, `BLAST_R`, tiempos de explosión, `DT_CAP`), `PALETTE`, `toCanvasPoint(canvas, clientX, clientY)`, `waveParams(w)` (total, velocidad, cadencia, probabilidades MIRV/aviones/smart), `spawnSalvo(...)`, `updateExplosion(e, dt)` / `explosionRadius(e)`, `drawSky`, `drawGround`, `drawCities`, `drawEnemyTrails`, `drawExplosions`, `drawCrosshair`. Sin estado de módulo salvo constantes inmutables.
5. **Motor.** Crear `app/lib/games/contramisil/engine.ts` exportando `createContramisilGame: GameFactory`, portado del prototipo: estado en el closure; `getContext("2d", { alpha: false })`; `canvas.width = 800; canvas.height = 600`; listeners añadidos en `start()` y quitados en `destroy()`; RAF cancelable (`rafId` nullable, `startLoop/stopLoop`); máquina de estados `intro/playing/tally/ending/over`; `syncReactState()`; `pause()` detiene el loop, `resume()` resetea `lastTime`, `restart()` reinicia estado y loop. El parámetro `skin` se ignora.
6. **Registrar.** En `app/lib/games/registry.ts`: `import { createContramisilGame } from "./contramisil/engine";` + `contramisil: createContramisilGame`, y actualizar el comentario de cabecera. No se tocan `CanvasGame.tsx` ni `GamePlayer.tsx`.
7. **Referencia rápida.** Añadir la fila de `contramisil` a `references/implemented-games.md`.
8. **Verificación manual** en desktop y emulación móvil (ver Acceptance criteria), con `?debug=perf` para el frame-time.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores; `npm run lint` pasa.
- [ ] Existe la fila `games` `contramisil` (`cat = 'SHOOTER'`, `color = 'magenta'`, `cover = 'cover-contramisil'`) y 12 filas en `scores`; `get_advisors` sin avisos nuevos.
- [ ] CONTRAMISIL aparece en `/`, `/games`, `/salon` y `/juego/contramisil` con su portada `.cover-contramisil`.
- [ ] Existe `references/started-games/09-missile-command/` jugable abriendo su `index.html`.
- [ ] `engine.ts` exporta `createContramisilGame`, no usa estado global de módulo ni `document.getElementById`, y fija el canvas a `800×600` con contexto `alpha: false`.
- [ ] `getGameEngine("contramisil")` devuelve el motor; los motores existentes siguen jugables y las maquetas siguen como maqueta.
- [ ] En `/jugar/contramisil`, el clic dispara desde el silo con munición más cercano; la explosión crece, se mantiene y se encoge y destruye las ojivas que la cruzan; el silo central es visiblemente más rápido.
- [ ] Flechas mueven la mira; `A/S/D` (y `1/2/3`) disparan desde el silo correspondiente; `Espacio` desde el más cercano; ni flechas ni `Espacio` hacen scroll.
- [ ] En emulación táctil (`pointer: coarse`), tocar dispara al punto tocado; no aparece overlay de botones; la pulsación larga no abre menú contextual ni hace scroll/zoom.
- [ ] Cada silo tiene 10 contramisiles por oleada y nunca hay más de 8 en vuelo.
- [ ] MIRV (desde oleada 2), bombarderos/satélites (desde 2) y bombas inteligentes que esquivan (desde 6) aparecen según la tabla.
- [ ] El HUD de React muestra score real (múltiplos de 25 × mult), vidas = ciudades vivas + reserva (arranca en 6) y nivel = oleada.
- [ ] El recuento de fin de oleada suma `5 × mult` por contramisil sin usar y `100 × mult` por ciudad; cada 10.000 puntos se gana una ciudad que se reconstruye al terminar la oleada.
- [ ] Sin ciudades vivas ni en reserva, tras la animación de fin se abre el modal con el score real; "JUGAR DE NUEVO" reinicia limpio (oleada 1, 6 ciudades, score 0).
- [ ] Guardar desde el modal hace `POST /api/scores` con `{ gameId: "contramisil", name, score }` y la fila aparece en `/juego/contramisil` y `/salon`.
- [ ] PAUSA/REANUDAR no provoca salto; con la partida en pausa ni clics ni teclas disparan.
- [ ] Al salir de la ruta, `destroy()` cancela el RAF y quita todos los listeners; reentrar no duplica el loop ni acelera el juego.
- [ ] Con `?debug=perf`, la oleada 10+ con pantalla llena se mantiene en ~16 ms/frame en desktop y sin bajar de forma sostenida de 30 fps en emulación móvil.

---

## Decisions

- **Sí:** spec única de **catálogo + motor** (y no `01-catalogo` + `02-motor` separadas) porque la jam pide una spec por variante, completa. El paso 1–2 deja el juego como maqueta funcional, igual que haría una spec de catálogo aislada.
- **Sí:** la variante clásica ocupa el slug del To-Do, **`contramisil`**, como entrada de catálogo propia; la variante con twist es **otra entrada** (`contramisil-reflejo`) con su propio leaderboard. Se descarta un "modo" dentro del mismo `id`: el contrato `GameFactory` no recibe modo, `GamePlayer` no tiene selector de modo, y `scores` no tiene columna `mode`; mezclar dos escalas de puntuación en un leaderboard sería injusto y separarlas exigiría cambiar esquema y contrato. Dos `id` = cero cambios de contrato.
- **Sí:** `shared.ts` en `app/lib/games/contramisil/` para que la variante 2 reutilice mundo, oleadas, explosiones y dibujo sin duplicar; los dos motores siguen siendo fábricas independientes.
- **Sí:** construir el prototipo `09-missile-command` antes del port (no existe ninguno), como la SPEC 09.
- **Sí:** **Pointer Events nativos en el motor** en vez del overlay de SPEC 13. SPEC 13 prohibió tocar motores *existentes* y su `canvasDrag` solo sintetiza `clientX` (sin `clientY`), así que no sirve para apuntar. Un motor nuevo puede leer `pointerdown` directamente y cubre ratón, táctil y lápiz con un solo camino. Sin entrada en `TOUCH_MAP`.
- **Sí (supuesto documentado):** `onLives = ciudades vivas + reserva`. Fiel a "ciudades → onLives" del To-Do y evita un HUD con "—" mientras la partida sigue gracias a una ciudad de reserva.
- **Sí (supuesto documentado):** scoring del arcade (25/100/125, multiplicador cada 2 oleadas hasta ×6, ciudad bonus cada 10.000). Las fuentes discrepan en el bonus por ciudad (50 o 100 × mult); se toma `100 × mult`, que es el que se deduce del desensamblado.
- **Sí (supuesto documentado):** el disparo por clic/toque elige el silo más cercano con munición (el arcade tenía 3 botones). Con un solo puntero es la traducción natural; el teclado conserva la elección explícita con `A/S/D`.
- **Sí (supuesto documentado):** la partida acaba en cuanto `lives = 0` (con animación de 1.5 s), en lugar de esperar al final de la oleada como el arcade: el resto de la oleada no podría cambiar el resultado.
- **Sí:** explosiones sin estrobo y sin destellos a pantalla completa (accesibilidad), a diferencia del ciclado por frame del arcade.
- **No:** fuego amigo en la variante clásica (el arcade no lo tiene; sí lo tendrá la variante 2).
- **No:** skins, sonido, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                               | Mitigación                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No hay prototipo: el feel (velocidades, radio de explosión) puede quedar lejos del arcade.          | Construir `09-missile-command` y afinarlo jugando antes de portar; constantes centralizadas en `shared.ts` y portadas 1:1.                                          |
| El mapeo puntero→canvas falla si el canvas cambia de tamaño (responsive SPEC 15, rotación).         | Leer `getBoundingClientRect()` en cada evento, nunca cachearlo.                                                                                                    |
| En móvil el `.crt-screen` es pequeño y apuntar con el dedo es impreciso.                            | El radio de explosión (40 px internos) ya es tolerante; el dedo no tapa el punto porque la explosión crece en torno a él. Ajuste fino de radio en `coarse` si hace falta tras medir. |
| El toque hace scroll/zoom o abre el menú contextual.                                                 | `touchAction = "none"` en el canvas, `preventDefault` en `pointerdown` y cancelar `contextmenu`.                                                                    |
| Picos de entidades en oleadas altas bajan los fps en móvil.                                          | Presupuesto de entidades, compactación in situ, `shadowBlur` por grupo × `glowScale()`, colisiones con distancia al cuadrado; medir con `?debug=perf`.             |
| Dos entradas de catálogo casi homónimas confunden en la biblioteca.                                  | Títulos y `short` claramente distintos; la variante 2 explica su twist en la descripción.                                                                          |
| `INSERT` público en `scores` permite spam.                                                           | `check` de rango/longitud (SPEC 06); sin `UPDATE/DELETE`. Anti-cheat en otra spec.                                                                                 |

---

## Qué **no** está en esta spec

- La variante `contramisil-reflejo` (va en `02-contramisil-reflejo.md`).
- Skins del juego (se delega a `skin-designer` en su propia spec).
- Sonido y efectos de audio.
- Cambios en `TouchControls.tsx`, `touch-map.ts`, `CanvasGame.tsx`, `GamePlayer.tsx` o `types.ts`.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
