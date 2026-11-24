# SPEC 02 (game-jam/contramisil) — "CONTRAMISIL REFLEJO": Missile Command con barreras de reflexión dibujadas

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 13, SPEC 16, 01-contramisil-clasico
> **Date:** 2026-11-24
> **Objective:** Dar de alta `contramisil-reflejo` (CONTRAMISIL REFLEJO) en `games` + `scores` y construir su motor `createContramisilReflejoGame: GameFactory` en `app/lib/games/contramisil/reflejo-engine.ts`, reutilizando `shared.ts` de la variante clásica, de modo que `/jugar/contramisil-reflejo` sea una variante jugable del Missile Command donde se defiende **dibujando barreras que reflejan los misiles** en lugar de disparar contramisiles.

---

## Por qué existe esta spec

La jam "contramisil" pide al menos dos **variantes jugables distintas** del mismo juego base. La variante 1 (`01-contramisil-clasico.md`) es el Missile Command fiel: apuntar, disparar y que la explosión intercepte. Esta variante conserva **todo lo que define el arquetipo** —cielo con ojivas que caen en trayectoria recta, seis ciudades que proteger, oleadas crecientes, MIRV, bombarderos, ciudades = vidas— pero cambia el **verbo** del jugador:

- En la clásica la pregunta es **"¿dónde estará la ojiva?"** (timing de intercepción).
- En REFLEJO la pregunta es **"¿con qué ángulo la devuelvo?"** (geometría de reflexión).

No hay silos ni munición. El jugador **traza con el puntero segmentos de luz** (barreras) que cuestan energía y duran pocos segundos. Una ojiva que choca con una barrera rebota según la ley de reflexión (`v' = v − 2(v·n)n`) y pasa a ser **tuya**: destruye lo que toque, y cada destrucción provoca una explosión que puede encadenar más. Un mal ángulo la manda contra tus propias ciudades (fuego amigo). Las **ojivas perforantes** solo se reflejan con un **reflejo perfecto** (barrera trazada en el último instante). Es un twist mecánico real: cambia el input (arrastre en vez de clic), la habilidad (ángulo en vez de anticipación temporal), el riesgo (fuego amigo) y la puntuación (cadenas y carambolas). No es un reskin ni un cambio de números.

**Prototipo:** no existe en `references/started-games/`. Esta spec construye `references/started-games/10-missile-reflejo/`, que parte del `09-missile-command` de la variante 1 (mundo, oleadas, explosiones) y sustituye silos/contramisiles por barreras.

---

## Scope

**In:**

- **Catálogo + leaderboard (patrón SPEC 06):** fila `contramisil-reflejo` en `public.games`, 12 filas en `public.scores`, portada `.cover-contramisil-reflejo` en `app/globals.css` con `/frontend-design`.
- **Prototipo vanilla** `references/started-games/10-missile-reflejo/` (`index.html` + `game.js`).
- **Motor** `app/lib/games/contramisil/reflejo-engine.ts` exportando `createContramisilReflejoGame: GameFactory`, sin estado global, `800×600`, que importa de `app/lib/games/contramisil/shared.ts` (creado por la spec 01) mundo, ciudades, oleadas, explosiones y dibujo base.
- **Ampliación aditiva de `shared.ts`:** helpers geométricos puros `segmentIntersect(p0, p1, a, b)` y `reflect(v, a, b)`. No cambian nada de lo que usa el motor clásico.
- **Input nativo por Pointer Events** (arrastre con `setPointerCapture`) + teclado (trazado con mira y `Espacio` mantenido).
- **Registro** en `app/lib/games/registry.ts`: `"contramisil-reflejo": createContramisilReflejoGame`.
- **Rendimiento según SPEC 16.**

**Out of scope (para futuras specs):**

- Cualquier cambio de comportamiento del motor clásico `contramisil`.
- Skins, sonido, anti-cheat, auth real.
- Entrada en `touch-map.ts` / cambios en `TouchControls.tsx`, `CanvasGame.tsx`, `GamePlayer.tsx`, `types.ts` o el esquema de BD.
- Un selector de modo dentro de un único juego (ver Decisions).

---

## Data model

### Catálogo (Supabase, patrón SPEC 06)

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, position)
values (
  'contramisil-reflejo',
  'CONTRAMISIL REFLEJO',
  'Dibuja escudos de luz y devuelve los misiles.',
  'Sin munición: solo tienes energía para trazar barreras de luz en el cielo. Cada misil que choca contra ellas sale rebotado según el ángulo que dibujaste y revienta lo que encuentre a su paso, desatando reacciones en cadena. Pero un mal ángulo lo manda contra tus propias ciudades. Para las ojivas perforantes solo sirve el reflejo perfecto, en el último instante.',
  'SHOOTER',
  'cover-contramisil-reflejo',
  'cyan',
  52340,
  '2.8K',
  <MAX(position)+1>
);

insert into public.scores (game_id, name, score) values
  ('contramisil-reflejo', 'NEONFOX',   52340),
  ('contramisil-reflejo', 'GLITCHA',   47900),
  ('contramisil-reflejo', 'PX_KAI',    43150),
  ('contramisil-reflejo', 'SCANLINE',  38600),
  ('contramisil-reflejo', 'DROID_X',   33275),
  ('contramisil-reflejo', 'ARKADYA',   28850),
  ('contramisil-reflejo', 'VAULT_07',  24100),
  ('contramisil-reflejo', 'BIT_LORD',  19450),
  ('contramisil-reflejo', 'M00NRYU',   15200),
  ('contramisil-reflejo', 'RETROVIRA', 11025),
  ('contramisil-reflejo', 'JOY_STK',    7300),
  ('contramisil-reflejo', 'MAGENTA88',  3950);
```

`position` se calcula leyendo `MAX(position)` real (si la spec 01 ya se aplicó, quedará justo detrás de `contramisil`).

**Portada** `.cover-contramisil-reflejo` (neón `var(--cyan)`): mismo horizonte de ciudades que `.cover-contramisil` para que se lean como familia, pero con un segmento de luz cian en diagonal y una estela magenta que llega a él y sale rebotada hacia arriba en ángulo, rematada por una explosión pequeña. Valores con `/frontend-design`.

**Leaderboard:** idéntico flujo que la variante 1 con `gameId: "contramisil-reflejo"` (`onGameOver` → modal de `GamePlayer` → `POST /api/scores` → `insertScore`; lectura con `getTopScores` en `/juego/contramisil-reflejo` y `/salon`). Leaderboard propio, separado del clásico.

### Contrato de motor (de `app/lib/games/types.ts`, no se redefine)

```ts
// app/lib/games/contramisil/reflejo-engine.ts → cumple GameFactory
export const createContramisilReflejoGame: GameFactory = (canvas, callbacks): GameEngine => {
  /* estado en el closure: cities[6], reserveCities, energy, barriers[],
     draft (trazo en curso), enemies[], deflected[], explosions[], popups[],
     wave, mult, score, nextBonusAt, cursor, keys, state, stateTimer,
     lastTime, rafId, last emitted values */
};
```

**Mapeo de mecánicas → callbacks** (mismo criterio que la clásica para que ambas variantes lean igual en el HUD):

- `onScore(score)` — acumulado (tabla abajo), emitido solo al cambiar.
- `onLives(lives)` — ciudades vivas + reserva (0..9), arranca en `6`.
- `onLevel(level)` — oleada.
- `onGameOver(finalScore)` — una vez, tras la animación de fin.

### Mecánica núcleo: barreras

- **Energía:** `ENERGY_MAX = 100`, regenera `14/s`, arranca cada oleada al máximo.
- **Trazar:** del punto de inicio al de fin (arrastre). Longitud mínima `30 px`, máxima `180 px` (el trazo se recorta a la máxima mientras arrastras). Coste `0.35 × longitud` (180 px = 63 de energía). Si la energía no alcanza, la vista previa marca en rojo el tramo no pagable y al soltar se recorta a la longitud asequible; si no alcanza ni para `30 px`, no se puede empezar a trazar (la barra de energía parpadea).
- **Zona de trazado:** ambos extremos se recortan a `y ∈ [110, 450]` y `x ∈ [8, 792]`. Las ciudades (`y ≈ 556`) quedan fuera: no se puede tapiar el suelo.
- **Límite:** como máximo `MAX_BARRIERS = 3` activas; trazar una cuarta elimina la más antigua.
- **Vida:** `3.0 s`, con fundido en los últimos `0.5 s`. **Durabilidad:** 2 reflexiones; tras la segunda se rompe (animación de fragmentos).
- **Reflexión:** cada frame, para cada ojiva enemiga se prueba si el tramo `cabezaAnterior → cabezaActual` corta alguna barrera (`segmentIntersect`). Si corta: se coloca la cabeza en el punto de corte + `ε` a lo largo de la nueva dirección, la velocidad se refleja con `reflect(v, a, b)` y se multiplica por `1.25`, y la ojiva pasa a la lista `deflected` (es del jugador, estela cian). Si el impacto es en un extremo exacto, cuenta como corte (intervalo cerrado).
- **Reflejo perfecto:** si la barrera tiene `< 0.35 s` de vida al recibir el impacto, la reflexión es **perfecta**: puntos ×2 para todo lo que destruya esa ojiva y se devuelve la energía de la barrera.
- **Ojivas reflejadas (`deflected`):** pueden volver a rebotar en otras barreras (carambola). Al tocar una entidad enemiga (cabeza de ojiva a < 10 px, bombardero en radio 14, perforante en radio 10) ambas se destruyen y nace una **explosión de cadena** (radio 30, vida 0.7 s) que destruye a los enemigos que alcance; cada enemigo destruido por una explosión de cadena genera otra (generación +1). Al salir por arriba (`y < 0`): "DEVUELTO". Por los lados: desaparece sin puntos. Al llegar al suelo: explota (radio 30) y **destruye cualquier ciudad dentro del radio** (fuego amigo). Vida máxima `8 s` y máximo `6` rebotes; superado cualquiera, explota en el sitio sin puntuar.

### Enemigos por oleada

Se reutiliza `waveParams(w)` de `shared.ts` (total, velocidad, cadencia de salvas, MIRV desde oleada 2, bombarderos desde oleada 2) con dos diferencias:

- Las ojivas solo apuntan a **ciudades** (no hay silos).
- Las **bombas inteligentes** de la clásica se sustituyen por **ojivas perforantes** desde la oleada 5: `min(1 + floor((w−5)/2), 4)` por oleada, trazo de color distinto (blanco con halo). Atraviesan y **rompen** cualquier barrera salvo con reflejo perfecto, que las devuelve como una ojiva reflejada más.

Los bombarderos solo mueren por ojivas reflejadas o explosiones de cadena: obliga a apuntar los rebotes hacia arriba.

### Scoring

`mult = min(1 + floor((w−1)/2), 6)` (igual que la clásica). `gen` = generación de cadena (1 = impacto directo de la ojiva reflejada; +1 por cada explosión intermedia), con tope `×8`.

| Evento                                              | Puntos                      |
| --------------------------------------------------- | --------------------------- |
| Ojiva/cabeza MIRV destruida por reflejada o cadena  | `50 × gen × mult`           |
| Bombardero / satélite                               | `150 × gen × mult`          |
| Ojiva perforante                                    | `200 × gen × mult`          |
| Ojiva reflejada que sale por arriba ("DEVUELTO")    | `25 × mult`                 |
| Modificador reflejo perfecto                        | ×2 sobre lo que destruya    |
| Modificador carambola (ojiva con ≥ 2 rebotes)       | ×2 sobre su impacto directo |
| Fin de oleada: por ciudad superviviente             | `100 × mult`                |
| Fin de oleada: energía restante                     | `floor(energy) × mult`      |

Ciudad bonus cada `15000` puntos (reserva máx. 3, reconstrucción al terminar la oleada). El umbral es mayor que en la clásica porque las cadenas puntúan más rápido.

Las ojivas que no se reflejan ni destruyen no puntúan: proteger una ciudad desviando un misil hacia el cielo vale poco (25), destruir con él vale mucho. Ese es el incentivo a buscar ángulos agresivos con riesgo de fuego amigo.

### Controles

| Entrada                             | Acción                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Ratón: pulsar-arrastrar-soltar      | Traza una barrera del punto de pulsación al de suelta (vista previa discontinua con coste). |
| Táctil: tocar-arrastrar-soltar      | Igual. Un solo trazo a la vez: un segundo dedo mientras se traza se ignora.               |
| Clic o toque sin arrastre (< 30 px) | Se cancela sin coste (feedback "CORTO").                                                   |
| `←` `→` `↑` `↓` (mantener)          | Mueven el cursor a `420 px/s`.                                                             |
| `Espacio` (mantener)                | Al pulsar ancla el inicio en el cursor; mueve con flechas; al soltar confirma la barrera.  |
| `X`                                 | Cancela el trazo en curso sin coste.                                                       |

- Pointer Events sobre el canvas: `pointerdown` inicia el borrador y llama `canvas.setPointerCapture(e.pointerId)` (el trazo sigue aunque el dedo salga del canvas); `pointermove` actualiza el extremo; `pointerup` confirma; `pointercancel` y `lostpointercapture` cancelan sin coste.
- Mapeo de coordenadas y recortes con `toCanvasPoint` de `shared.ts` (rect leído en cada evento).
- Misma coherencia con SPEC 13 que la clásica: sin entrada en `TOUCH_MAP`, `touchAction = "none"` en el canvas (restaurado en `destroy()`), `contextmenu` cancelado, teclas vaciadas en `blur`/`visibilitychange`.

### Estados del juego

Mismos estados que la clásica (`intro` → `playing` → `tally` → `intro`… / `ending` → `over`) y bandera `paused`, con estas diferencias:

- `intro`: energía al máximo; se puede mover el cursor pero no trazar.
- `tally`: recuento de ciudades y energía; las barreras activas se desvanecen.
- `playing` tiene un sub-estado de input `drafting` (trazo en curso). **Pausar durante `drafting` cancela el trazo sin coste** y libera la captura de puntero.
- El fin de oleada espera a que no queden enemigos, ojivas reflejadas ni explosiones de cadena vivas.

### Render en canvas (estética neón/CRT)

- Cielo, estrellas, suelo y ciudades con los `draw*` de `shared.ts` (misma escena que la clásica, sin silos: en su lugar, en el centro del suelo, un emisor con la **barra de energía** horizontal).
- Barreras: línea cian de 4 px con glow (`shadowBlur × GLOW`), alfa según vida restante, dos muescas de durabilidad; al romperse, 6 fragmentos que caen 0.4 s.
- Vista previa del trazo: línea discontinua cian; tramo no pagable en rojo; coste numérico junto al cursor.
- Ojivas enemigas: estela magenta; perforantes: estela blanca con halo. Ojivas reflejadas: estela cian desde el punto de rebote, con un destello breve (no estroboscópico) en el punto de impacto; "PERFECTO" en amarillo si lo es.
- Explosiones de cadena: círculo que transita cian → amarillo → blanco; textos flotantes "+puntos" y "CADENA ×n" (pool máx. 20).
- Cursor: anillo amarillo (distinto de la cruz de la clásica para que se note la variante).
- HUD interno: multiplicador, reserva, banner de oleada, recuento. Score/vidas/nivel en `.player-hud`.

### Rendimiento (SPEC 16)

- `getContext("2d", { alpha: false })`, relleno completo por frame, `glowScale()` una vez.
- `shadowBlur` solo en barreras y explosiones, fijado una vez por grupo.
- Presupuesto: ≤ 30 ojivas enemigas, ≤ 30 reflejadas, ≤ 3 barreras, ≤ 40 explosiones, ≤ 20 textos flotantes; compactación in situ, sin gradientes creados en el loop.
- Coste de colisión acotado: 3 barreras × 30 ojivas de tests segmento-segmento + (30 reflejadas + 40 explosiones) × 30 enemigos por distancia al cuadrado por frame.
- Las cadenas se resuelven con una cola acotada por frame (máx. 40 explosiones nuevas/frame); el excedente se procesa en el siguiente frame en vez de recursión, para no bloquear el frame en una reacción enorme.
- `DT_CAP = 0.05`, `lastTime` reseteado en `start/resume/restart`, `syncReactState()` solo ante cambios.
- Túnel a alta velocidad evitado por construcción: la prueba de barrera usa el tramo barrido `anterior → actual`, no un punto.

### Edge cases

- **Ojiva paralela o casi paralela a la barrera:** si el valor absoluto de `v̂·n` es menor que `0.05` no hay corte geométrico estable; se ignora la barrera (la ojiva pasa rozando). Evita rebotes degenerados.
- **Ojiva atrapada en una "V" de barreras:** tope de 6 rebotes y durabilidad 2 por barrera; al superar el tope, explota sin puntuar.
- **Barrera trazada justo sobre una cabeza:** solo cuenta si el tramo barrido del frame siguiente la cruza; nunca se teletransporta una ojiva.
- **Dos ojivas cortan la misma barrera en el mismo frame:** se procesan en orden; si la primera agota la durabilidad, la segunda atraviesa.
- **Reflejada que vuelve hacia abajo y toca una ciudad:** la destruye (fuego amigo, intencionado); `onLives` baja.
- **Reflejada casi horizontal:** cruza el cielo hasta salir por un lado o caducar a los 8 s.
- **Perforante contra barrera no perfecta:** la barrera se rompe, la perforante sigue sin desviarse.
- **Energía insuficiente:** recorte a la longitud pagable; por debajo de 30 px no se crea barrera ni se cobra.
- **Cuarta barrera:** la más antigua desaparece al confirmar la nueva (no al empezar a trazar).
- **Segundo dedo mientras se traza / `pointercancel` / pérdida de captura:** se ignora / se cancela sin coste.
- **Pausa, pestaña oculta, `restart()` en `tally`/`ending`, `destroy()` en cualquier estado:** igual que la clásica; además `destroy()` libera la captura de puntero si estaba activa.
- **Fotosensibilidad:** sin destellos a pantalla completa ni ciclado estroboscópico; con `prefers-reduced-motion` colores fijos y sin fragmentos.
- **Score:** el peor caso de cadena (`200 × 8 × 6 × 2 × 2 = 38.400` por enemigo) queda muy lejos del tope `100000000`.

---

## Implementation plan

Cada paso deja la app compilando y navegable. Requiere `01-contramisil-clasico` implementada (usa su `shared.ts`).

1. **Migración Supabase** (MCP `apply_migration`): leer `MAX(position)`, insertar la fila `contramisil-reflejo` y sus 12 filas de `scores`. `get_advisors` limpio; sin regenerar tipos.
2. **Portada.** `.cover-contramisil-reflejo` en `app/globals.css` con `/frontend-design`, emparentada visualmente con `.cover-contramisil`.
3. **Prototipo vanilla.** Crear `references/started-games/10-missile-reflejo/` partiendo de `09-missile-command`: quitar silos/contramisiles, añadir energía, trazado por arrastre y teclado, reflexión, ojivas reflejadas, cadenas, fuego amigo, perforantes y reflejo perfecto. Verificable abriendo el HTML.
4. **Helpers geométricos.** Añadir a `app/lib/games/contramisil/shared.ts` `segmentIntersect` y `reflect` (puras, aditivas). Verificar que `contramisil` sigue jugable igual.
5. **Motor.** Crear `app/lib/games/contramisil/reflejo-engine.ts` exportando `createContramisilReflejoGame: GameFactory`, portado del prototipo con el mismo esqueleto de ciclo de vida que `engine.ts` (estado en closure, `alpha: false`, `800×600`, listeners en `start()`/`destroy()`, RAF cancelable, máquina de estados, `syncReactState()`, `skin` ignorado).
6. **Registrar.** En `app/lib/games/registry.ts`: `import { createContramisilReflejoGame } from "./contramisil/reflejo-engine";` + `"contramisil-reflejo": createContramisilReflejoGame`; actualizar el comentario de cabecera.
7. **Referencia rápida.** Añadir la fila a `references/implemented-games.md`.
8. **Verificación manual** en desktop y emulación móvil con `?debug=perf` (ver Acceptance criteria).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores; `npm run lint` pasa.
- [ ] Existe la fila `games` `contramisil-reflejo` (`cat = 'SHOOTER'`, `color = 'cyan'`, `cover = 'cover-contramisil-reflejo'`) y 12 filas en `scores`; `get_advisors` sin avisos nuevos.
- [ ] Aparece en `/`, `/games`, `/salon` y `/juego/contramisil-reflejo` con su portada, como entrada distinta de `contramisil` y con su propio leaderboard.
- [ ] Existe `references/started-games/10-missile-reflejo/` jugable abriendo su `index.html`.
- [ ] `reflejo-engine.ts` exporta la fábrica, no usa estado global ni `getElementById`, importa de `shared.ts` y no modifica el comportamiento de `contramisil` (que sigue jugable igual).
- [ ] Arrastrar con ratón o dedo traza una barrera con vista previa y coste; soltar la confirma y descuenta energía; clic sin arrastre no cuesta nada.
- [ ] Con teclado, `Espacio` mantenido + flechas traza y al soltar confirma; `X` cancela.
- [ ] Una ojiva que choca con una barrera rebota con ángulo de reflexión correcto (comprobable con una barrera horizontal: rebota simétrica en vertical), acelera y pasa a estela cian.
- [ ] Una ojiva reflejada destruye enemigos al tocarlos y las explosiones resultantes encadenan; el texto "CADENA ×n" y los puntos reflejan la generación.
- [ ] Una ojiva reflejada que cae sobre una ciudad la destruye y baja las vidas del HUD.
- [ ] Desde la oleada 5 aparecen ojivas perforantes que rompen barreras salvo con reflejo perfecto (barrera de < 0.35 s).
- [ ] Nunca hay más de 3 barreras; cada una dura 3 s y se rompe tras 2 reflexiones.
- [ ] El HUD muestra score real, vidas = ciudades + reserva (arranca en 6) y nivel = oleada; el recuento suma ciudades y energía con el multiplicador.
- [ ] Sin ciudades ni reserva se abre el modal tras la animación de fin; guardar hace `POST /api/scores` con `{ gameId: "contramisil-reflejo", name, score }` y aparece en su leaderboard.
- [ ] Pausar durante un trazo lo cancela sin coste; reanudar no provoca salto.
- [ ] En emulación táctil no aparece overlay de botones, el arrastre no hace scroll/zoom y un segundo dedo durante el trazo no interfiere.
- [ ] `destroy()` cancela RAF, quita listeners y libera la captura de puntero; reentrar no duplica el loop.
- [ ] Con `?debug=perf`, una cadena grande en oleada 10+ no baja de ~16 ms/frame sostenidos en desktop ni de 30 fps sostenidos en emulación móvil.

---

## Decisions

- **Sí:** entrada de catálogo **propia** (`contramisil-reflejo`, título CONTRAMISIL REFLEJO) en vez de un modo dentro de `contramisil`. Motivos: (1) las escalas de puntuación son distintas (cadenas ×gen) y un leaderboard mezclado sería injusto; (2) separar por modo exigiría una columna `mode` en `scores`, un parámetro de modo en `GameFactory` y un selector en `GamePlayer`, es decir, cambiar esquema y contrato compartido; (3) con dos `id` todo el pipeline existente (registry, `/jugar/[id]`, `/api/scores`, `/salon`) funciona sin tocarlo. Coste aceptado: dos tarjetas en la biblioteca, mitigado con título, portada emparentada y descripción que explica el twist.
- **Sí:** el slug lleva el prefijo `contramisil-` para que se lea como variante en catálogo y URL, y el motor vive en el mismo directorio `app/lib/games/contramisil/` compartiendo `shared.ts`.
- **Sí:** `cat = SHOOTER` (misma familia que la clásica) y `color = cyan` (el color de las barreras y de las ojivas reflejadas; además distingue la tarjeta de la magenta clásica).
- **Sí:** el twist es la **reflexión dibujada**, no un cambio de números: cambia input (arrastre), habilidad (ángulo), riesgo (fuego amigo) y puntuación (cadenas/carambolas). Se mantienen ciudades, oleadas, MIRV y bombarderos para que siga siendo reconocible como Missile Command.
- **Sí (supuesto documentado):** energía con regeneración + vida + durabilidad + máximo 3 barreras + zona de trazado `y ∈ [110, 450]`. Sin estos límites la estrategia dominante sería una barrera horizontal permanente sobre las ciudades.
- **Sí (supuesto documentado):** reflejo perfecto (< 0.35 s) con premio ×2 y devolución de energía, y ojivas perforantes que solo se paran así: añade una capa de timing "parry" para las oleadas altas.
- **Sí (supuesto documentado):** desviar un misil al cielo vale solo 25; la puntuación grande está en destruir con él. Empuja a ángulos agresivos con riesgo de fuego amigo.
- **Sí:** Pointer Events con `setPointerCapture`, sin entrada en `TOUCH_MAP` (mismo razonamiento que la clásica; el `canvasDrag` de SPEC 13 solo da `clientX`).
- **Sí:** resolver las cadenas con cola acotada por frame en vez de recursión.
- **No:** tercera variante. Se valoró una "orbital" (planeta central, misiles desde 360°), pero comparte el verbo de la clásica (apuntar y detonar) y aporta menos que esta; queda como idea, no como spec.
- **No:** skins, sonido, anti-cheat, auth real — cada uno en su propia spec.

---

## Risks

| Riesgo                                                                                       | Mitigación                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| La mecánica nueva no está probada: puede ser demasiado fácil (tapiar) o demasiado difícil.   | Construir y jugar el prototipo `10-missile-reflejo` antes del port; constantes de energía/vida/zona centralizadas para afinar sin tocar lógica.         |
| Rebotes degenerados (casi paralelos, extremos, "V") generan bucles o comportamientos raros.  | Umbral de casi-paralelismo (`abs(v̂·n) < 0.05`), intervalo cerrado en extremos, tope de 6 rebotes, vida máxima de 8 s y durabilidad 2.                 |
| Túnel: ojivas rápidas atraviesan barreras finas entre frames.                                | Prueba por segmento barrido `anterior → actual`, independiente de la velocidad; `DT_CAP` limita el barrido.                                             |
| Cadenas enormes bloquean un frame.                                                           | Cola acotada a 40 explosiones nuevas por frame y presupuesto global de 40 explosiones vivas.                                                           |
| Trazar con el dedo en un `.crt-screen` pequeño es impreciso o el dedo tapa el trazo.         | Vista previa con coste junto al cursor, longitud mínima 30 px y cancelación sin coste; captura de puntero para no perder el trazo al salir del canvas. |
| Cambios en `shared.ts` rompen la variante clásica.                                           | Solo se añaden funciones puras nuevas; criterio de aceptación exige verificar `contramisil` tras el cambio.                                             |
| Dos entradas de catálogo similares diluyen la biblioteca.                                    | Título, portada y `short` que explican el twist; la usuaria puede elegir implementar solo una de las dos specs.                                        |
| `INSERT` público en `scores` permite spam.                                                   | `check` de rango/longitud (SPEC 06); anti-cheat en otra spec.                                                                                           |

---

## Qué **no** está en esta spec

- Cambios de comportamiento del motor clásico `contramisil` (solo se añaden helpers a `shared.ts`).
- Selector de modo o columna `mode` en `scores`.
- Skins, sonido y efectos de audio.
- Cambios en `TouchControls.tsx`, `touch-map.ts`, `CanvasGame.tsx`, `GamePlayer.tsx` o `types.ts`.
- Anti-cheat / verificación server-side de puntuaciones.
- Auth real y vincular scores a un usuario.

Cada uno de esos, si llega, va en su propia spec.
