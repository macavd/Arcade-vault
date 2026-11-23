# SPEC 14 — Sistema de skins para RANARIA (`ranaria`)

> **Status:** Draft
> **Depends on:** SPEC 10 (sistema transversal de skins ya **Implementado**: `GameSkin` en `app/lib/games/types.ts`, parámetro `skin?` en `GameFactory`, hilo UI→motor en `CanvasGame.tsx`, selector genérico en `GamePlayer.tsx` dirigido por `SKINNED_GAMES` de `app/lib/games/skins.ts`) y SPEC game-jam/ranaria/01-motor-ranaria (motor de Frogger "RANARIA" en `app/lib/games/ranaria/engine.ts`, ya **Implementado** y registrado en `app/lib/games/registry.ts`).
> **Date:** 2026-11-04
> **Objective:** Dotar al juego `ranaria` de al menos 3 skins seleccionables — `clasico` (default), `neon` y `retro` — todas legibles sobre el tema oscuro CRT, extrayendo los colores hoy incrustados en el motor (fondos por zona, rana, vehículos, troncos, tortugas, nenúfares, barra de tiempo, HUD) a una paleta nombrada por rol, y exponiendo el selector de tema genérico en la UI igual que `rocas`/`serpentina`/`bloque-buster`. Reusa el sistema transversal de SPEC 10 sin redefinirlo. Los valores hex/glow exactos se delegan a `/frontend-design` durante `/spec-impl`.

---

## Por qué existe esta spec

El sistema de skins ya existe (SPEC 10, aplicado a `rocas`, `serpentina` y `bloque-buster`): hay un tipo `GameSkin = "clasico" | "neon" | "retro"`, `GameFactory` acepta `skin?: GameSkin` con default `clasico`, `CanvasGame.tsx` y `GamePlayer.tsx` ya hilan el skin elegido hasta la fábrica, y el selector de tema de la UI (`.theme-select` / `.theme-opt`) se renderiza automáticamente para cualquier juego listado en `SKINNED_GAMES` (`app/lib/games/skins.ts`). Lo que falta es que **`ranaria` participe**: su motor recién portado (game-jam/ranaria) **acepta** el tercer parámetro `skin` pero lo **ignora** (lo recibe como `_skin`), tiene todos los colores _hardcodeados_ en sus funciones `draw*` y en `LANE_DEFS`, y el juego **no figura** en `SKINNED_GAMES` (`getAvailableSkins("ranaria")` devuelve `null`), por lo que hoy **no ofrece skins ni aparece el selector de tema** en `/jugar/ranaria`.

Un skin es una **paleta nombrada** que agrupa esos colores por rol (fondos por zona, rana, vehículos, troncos, tortugas, nenúfares, divisorias, barra de tiempo, HUD) para que el motor los lea en vez de incrustarlos. Esta spec extrae ese inventario a `app/lib/games/ranaria/skins.ts`, refactoriza el motor para leer la paleta activa, y registra `ranaria` en `SKINNED_GAMES` para que el selector aparezca. No introduce ni modifica el contrato transversal: lo hereda tal cual de SPEC 10.

### Hallazgo de auditoría (estado de partida de los skins de `ranaria`)

Inventario de colores por rol en `app/lib/games/ranaria/engine.ts` (lo que cada skin debe cubrir):

| Rol (zona / elemento)                         | Valor(es) actual(es) incrustado(s)                      | Dónde                                                 |
| --------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Fondo general del canvas                      | `#05070a`                                               | `drawZones()` fillRect base                           |
| Franja de HUD (fila 0)                        | `#0a0a14`                                               | `drawZones()`                                         |
| Franja de nenúfares (fila 1)                  | `#07160f`                                               | `drawZones()`                                         |
| Río (filas 2–5)                               | `#07243a`                                               | `drawZones()`                                         |
| Zonas seguras (mediana fila 6, acera fila 11) | `#123a24`                                               | `drawZones()`                                         |
| Carretera / asfalto (filas 7–10)              | `#121216`                                               | `drawZones()`                                         |
| Divisorias discontinuas de carril             | `rgba(255,255,255,0.12)`                                | `drawZones()` strokeStyle dashed                      |
| Rana — cuerpo                                 | `#00ff88` + glow `shadowColor #00ff88`, `shadowBlur 10` | `drawFrog()`                                          |
| Rana — patas                                  | `#06c56a`                                               | `drawFrog()`                                          |
| Rana — ojos / pupilas                         | `#fff` / `#04120b`                                      | `drawFrog()`                                          |
| Coches (2 variantes de color)                 | `#ff4d6d` (fila 10), `#ffd23f` (fila 8)                 | `LANE_DEFS[*].color` → `Entity.color`, `drawEntity()` |
| Ruedas de coche                               | `#111`                                                  | `drawEntity()`                                        |
| Camiones — carrocería / cabina                | `#8a8f98` / `#5b6069`                                   | `LANE_DEFS` / `drawEntity()`                          |
| Troncos (2 variantes) / vetas                 | `#7a4a24`, `#8a5528` / `rgba(0,0,0,0.25)`               | `LANE_DEFS` / `drawEntity()`                          |
| Tortugas — caparazón / contorno               | `#2fae6b` / `rgba(0,0,0,0.3)`                           | `LANE_DEFS` / `drawEntity()`                          |
| Tortugas sumergidas — contorno tenue          | `rgba(120,220,170,0.35)`                                | `drawEntity()`                                        |
| Nenúfar vacío / ocupado / borde               | `#0a241a` / `#0e3a24` / `#d9a441` (dorado)              | `drawHomes()`                                         |
| Rana alojada en nenúfar                       | `#00ff88`                                               | `drawHomes()`                                         |
| Barra de tiempo (3 tramos)                    | `#00ff88` / `#ffd23f` / `#ff4d6d`                       | `drawTimerBar()`                                      |
| HUD — texto                                   | `#e8f6ff`                                               | `drawHUD()`                                           |
| HUD — icono de vida / pupila                  | `#00ff88` / `#04120b`                                   | `drawHUD()`                                           |

**Hallazgo arquitectónico clave:** a diferencia de `serpentina`, los colores de las entidades móviles **no están en las funciones `draw*`** sino en el campo `color` de cada `LaneDef` de `LANE_DEFS` (copiado a `Entity.color` en `buildLanes`). Además **hay variantes**: dos colores de coche (`#ff4d6d`/`#ffd23f`) y dos de tronco (`#7a4a24`/`#8a5528`). El refactor debe **sacar los hex de `LANE_DEFS`** y resolver el color por **rol de entidad** (p. ej. `carA`/`carB`, `truck`, `logA`/`logB`, `turtle`) desde la paleta en tiempo de dibujo, preservando que los dos carriles de coche y los dos de tronco conserven tonos distinguibles. `LANE_DEFS` conserva solo los datos estructurales del carril (fila, tipo, ancho, cantidad, sentido, velocidad) más una **clave de rol de color** en vez del hex.

**Conclusión del estado de partida:** el look actual del motor es **híbrido** — un entorno **naturalista y sobrio** (asfalto gris muy oscuro, río azul profundo, troncos marrones, camiones grises, tortugas verdes, zonas seguras verde oscuro) que ya es muy fiel al Frogger de arcade, **más una rana verde fosforescente con glow** (`#00ff88`, el acento CRT de la plataforma y color de catálogo de `ranaria`, que es `green`). Por tanto el entorno actual **siembra el skin `clasico`** (al que solo hay que quitarle/atenuar el glow de la rana para dejarlo plano y fiel), mientras que el glow verde de la rana **apunta al skin `neon`**, que amplificará la saturación y el brillo de toda la escena. Ninguno de los 3 skins existe todavía como paleta nombrada.

Estado por skin al arrancar esta spec: `clasico` ⬜ · `neon` ⬜ · `retro` ⬜ (ninguno existe como paleta; el motor solo tiene colores sueltos, con el entorno parecido a `clasico` y la rana parecida a `neon`).

---

## Scope

**In:**

- **Módulo de paletas** `app/lib/games/ranaria/skins.ts`: una interfaz `RanariaPalette` con un rol por cada fila de la tabla de auditoría (agrupados por zona/elemento), el mapa `SKINS: Record<GameSkin, RanariaPalette>` con las 3 claves y `getRanariaSkin(skin = "clasico")`, calcando la forma de `app/lib/games/asteroids/skins.ts` y `serpentina/skins.ts`.
- **Los 3 skins de `ranaria`** (`clasico` default, `neon`, `retro`) cubriendo el inventario completo de roles, legibles sobre el fondo oscuro CRT.
- **Refactor del motor** `app/lib/games/ranaria/engine.ts`: dejar de ignorar el parámetro `skin` (`_skin` → `skin`), resolver `const palette = getRanariaSkin(skin)` al inicio del closure y reemplazar **cada** color incrustado de la tabla por el rol correspondiente en `drawZones()`, `drawFrog()`, `drawEntity()`, `drawHomes()`, `drawTimerBar()` y `drawHUD()`. Sacar los hex de `LANE_DEFS` y resolver el color de cada entidad por su rol (variantes de coche/tronco incluidas) desde la paleta en el dibujo. El glow de la rana (`shadowColor`/`shadowBlur`) pasa a leerse de la paleta.
- **Registrar `ranaria`** en `SKINNED_GAMES` de `app/lib/games/skins.ts` (`ranaria: ["clasico", "neon", "retro"]`), con lo que el selector de tema ya existente en `GamePlayer.tsx` aparece automáticamente para este juego — **paso obligatorio y criterio de aceptación**.

**Out of scope (para futuras specs):**

- Los skins de cualquier otro juego (un juego por spec; esta solo cubre `ranaria`). `caida` sigue pendiente.
- Cualquier cambio en el **sistema transversal** de SPEC 10 (`GameSkin`, firma de `GameFactory`, `CanvasGame.tsx`, estructura del selector y clases `.theme-opt.is-*` de `GamePlayer.tsx`/`globals.css`): se reusa intacto. **El selector de tema NO es un diferible: forma parte del alcance (alta en `SKINNED_GAMES`).**
- Persistir la preferencia de skin del usuario (Supabase / almacenamiento local).
- Cualquier cambio en `globals.css`, en la portada `.cover-rana`, en Supabase o en otros motores.
- Cambiar mecánicas, geometría, ritmo o _feel_ del motor de Frogger (solo se tocan colores/glow).

---

## Data model / contrato

El contrato transversal **no cambia** (vive ya en `app/lib/games/types.ts` desde SPEC 10):

```
export type GameSkin = "clasico" | "neon" | "retro";
export type GameFactory = (canvas, callbacks, skin?: GameSkin) => GameEngine;  // default "clasico"
```

**Forma de la paleta** (nueva, en `app/lib/games/ranaria/skins.ts`; nombres orientativos, hex/glow delegados a `/frontend-design`). Roles agrupados por zona/elemento:

```
interface RanariaPalette {
  // Fondos por zona
  bgBase: string;       // fondo general del canvas
  bgHud: string;        // franja de HUD (fila 0)
  bgGoals: string;      // franja de nenúfares (fila 1)
  bgRiver: string;      // río (filas 2–5)
  bgSafe: string;       // zonas seguras (mediana fila 6, acera fila 11)
  bgRoad: string;       // asfalto (filas 7–10)
  laneDivider: string;  // divisorias discontinuas (rgba con su alpha)

  // Rana
  frogBody: string;
  frogLegs: string;
  frogEye: string;
  frogPupil: string;
  frogGlowColor: string;
  frogGlowBlur: number; // 0 = sin glow (clasico plano)

  // Vehículos (dos variantes de coche + camión)
  carA: string;         // coche carril 10
  carB: string;         // coche carril 8 (tono distinto de carA)
  wheel: string;
  truckBody: string;
  truckCabin: string;

  // Río: troncos (dos variantes) y tortugas
  logA: string;
  logB: string;         // tono distinto de logA
  logGrain: string;     // vetas (rgba)
  turtleShell: string;
  turtleOutline: string;         // contorno de tortuga visible (rgba)
  turtleSubmergedOutline: string; // contorno tenue de tortuga sumergida (rgba)

  // Nenúfares
  homeEmpty: string;
  homeOccupied: string;
  homeBorder: string;   // borde (dorado en clasico)
  homeFrog: string;     // silueta de rana alojada (suele igualar frogBody)

  // Barra de tiempo (3 tramos) y HUD
  timerHigh: string;    // > 50%
  timerMid: string;     // 25–50%
  timerLow: string;     // < 25%
  hudText: string;
  lifeIcon: string;     // icono de vida (suele igualar frogBody)
  lifePupil: string;
}

const SKINS: Record<GameSkin, RanariaPalette> = { clasico: {...}, neon: {...}, retro: {...} };
export function getRanariaSkin(skin: GameSkin = "clasico"): RanariaPalette { ... }
```

El motor resuelve su paleta una vez con `getRanariaSkin(skin)` y lee los roles en los `draw*`. La barra de tiempo mantiene su lógica de tres tramos (`> 0.5` / `> 0.25` / resto) leyendo `timerHigh`/`timerMid`/`timerLow`. El glow de la rana aplica `ctx.shadowColor = frogGlowColor` y `ctx.shadowBlur = frogGlowBlur`, reseteando `shadowBlur = 0` tras pintar el cuerpo (como hoy). `clasico` fija `frogGlowBlur = 0` para el look plano.

---

## Implementation plan

1. **Módulo de paletas** `app/lib/games/ranaria/skins.ts`: definir `RanariaPalette`, el mapa `SKINS` con las tres claves y `getRanariaSkin(skin = "clasico")`, importando `GameSkin` de `../types`. Dejar los hex/glow como marcadores a afinar en el paso 4. (Compilable por sí solo.)
2. **Refactor del motor** `app/lib/games/ranaria/engine.ts`:
   - Renombrar `_skin` → `skin` y resolver `const palette = getRanariaSkin(skin)` al inicio del closure.
   - **Sacar los hex de `LANE_DEFS`**: sustituir el campo `color: string` de cada `LaneDef` (y de `Entity`) por una **clave de rol** (p. ej. `"carA" | "carB" | "truck" | "logA" | "logB" | "turtle"`), y resolver el color real desde `palette` dentro de `drawEntity()`. Esto conserva las dos variantes de coche y de tronco como roles distintos.
   - Reemplazar **cada** color incrustado de la tabla de auditoría por su rol de paleta en `drawZones()` (fondos por zona + divisorias), `drawFrog()` (cuerpo, patas, ojos, pupilas, glow), `drawEntity()` (coches+ruedas, camiones+cabina, troncos+vetas, tortugas visibles/sumergidas), `drawHomes()` (vacío/ocupado/borde/rana alojada), `drawTimerBar()` (3 tramos) y `drawHUD()` (texto, iconos de vida, pupilas).
   - **No alterar** ninguna mecánica, constante, geometría ni ritmo: rejilla 16×12, zonas por fila, ciclo de inmersión de tortugas, colisiones, soporte de río, temporizador, puntuación (+10/fila, +50+bonus, +1000 ronda), animación de salto. Solo cambian `fillStyle`/`strokeStyle`/`shadow*` y de dónde sale el color de la entidad.
3. **Registrar el juego** en `app/lib/games/skins.ts`: añadir `ranaria: ["clasico", "neon", "retro"]` a `SKINNED_GAMES` (y actualizar el comentario de módulos implementados). Con esto el selector de tema de `GamePlayer.tsx` se muestra para `ranaria` sin tocar la UI. No hace falta modificar `CanvasGame.tsx` ni `GamePlayer.tsx` (ya hilan `skin` genéricamente desde SPEC 10).
4. **Afinado de paletas con `/frontend-design`** (paso explícito delegado): diseñar los hex, glows y grosores de los 3 skins respetando las reglas de contraste de la sección siguiente. `/frontend-design` fija los valores exactos; esta spec solo fija los arquetipos y las reglas. Anclaje de catálogo: la portada `.cover-rana` y el color `green` (`--green #00ff88`) de `ranaria` orientan el acento del skin `neon`.
5. **Verificación visual** de `ranaria` en los 3 skins sobre el tema oscuro: rana (cuerpo/patas/ojos) legible incluso sobre las zonas seguras verdes y sobre el río azul; coches, camiones, troncos y tortugas distinguibles entre sí y de su fondo de zona; tortugas sumergidas perceptibles pero claramente "sin soporte"; borde de nenúfar y rana alojada legibles; barra de tiempo con sus tres tramos distinguibles; HUD legible; `clasico` como default; selector de tema conmutando los 3 skins en vivo.

### Arquetipos de skin + reglas de contraste (para `/frontend-design`)

Regla dura común: el sitio es **íntegramente oscuro** (tema CRT en `:root`, canvas sobre fondo oscuro). Cada skin aporta **sus propios fondos de zona oscuros** y todo elemento debe mantener contraste y legibilidad sobre el fondo de **su** zona. Prohibido el blanco/verde quemado por bloom y los tonos que se pierden contra su fondo. Reglas específicas de Frogger:

- La **rana** debe contrastar sobre **las tres zonas** por las que pasa: asfalto oscuro, río azul, **y** las zonas seguras verdes (mediana/acera). Ojo con rana verde sobre fondo verde: la separación debe venir del **brillo** (rana clara sobre verde-zona más oscuro) o del glow, no solo del matiz.
- Los **cinco carriles** deben distinguirse por color de entidad: los dos coches entre sí (`carA`≠`carB`), coches vs camiones, los dos troncos entre sí, y troncos vs tortugas, todos sobre su fondo (asfalto o río).
- Las **tortugas sumergidas** deben verse lo justo para situarlas pero leerse claramente como "sin soporte" (contorno tenue, nunca igual que la visible).
- El **borde del nenúfar** y la **rana alojada** deben leerse sobre la franja de nenúfares oscura; las bocas vacía/ocupada deben distinguirse entre sí.
- Los **tres tramos de la barra de tiempo** deben ser inequívocos (alerta creciente); no colapsar dos tramos en tonos casi iguales.

Arquetipos:

- **`clasico` (default)** — Frogger de arcade, sobrio y fiel: **reproduce el entorno naturalista actual del motor** (asfalto gris muy oscuro, río azul profundo, troncos marrones, camiones grises, tortugas verdes, zonas seguras verde oscuro, borde de nenúfar dorado), con una **rana verde brillante pero sin glow** (`frogGlowBlur = 0`) para dejar el look plano y clásico. Es el default seguro y el que más se parece al motor hoy, solo que apagando el halo de la rana.
- **`neon` — look CRT vibrante de la plataforma**: parte del **glow verde actual de la rana** y lo extiende a toda la escena: rana verde fosforescente con **glow activo** (`frogGlowBlur > 0`, p. ej. ~10 como hoy), vehículos en neón saturado (p. ej. coches magenta/amarillo eléctrico, camiones en gris-cian frío), río azul eléctrico profundo, tortugas verde neón, borde de nenúfar dorado/verde brillante, todo sobre fondos de zona casi negros. Acento anclado en el **verde** de catálogo (`--green`, `.cover-rana`). El glow debe realzar la rana sin que el bloom la funda con el fondo ni borre los ojos.
- **`retro` — vintage apagado**: fósforo de CRT desgastado en clave **ámbar + verde** sobre fondos de zona oscuros y cálidos. Resuelve la riqueza cromática de Frogger como **duotono contenido**: zonas seguras y rana en verde fósforo, carretera y vehículos en ámbar (coches ámbar claro/oscuro para las dos variantes), río en cian-verde muy atenuado, troncos en ámbar tostado, nenúfares con borde ámbar. Glow tenue o nulo. Aun apagado, deben mantenerse las distinciones de carril y el contraste de la rana sobre cada zona; evitar que ámbar sobre fondo marrón baje de contraste suficiente.

En los tres: fondos de zona oscuros propios del skin, la rana contrasta sobre asfalto, río y zonas seguras, las entidades de cada carril se distinguen entre sí y de su fondo, las tortugas sumergidas se leen como "sin soporte", y el glow (si lo hay) realza sin quemar.

---

## Acceptance criteria

- [ ] `ranaria` expone exactamente los 3 skins `clasico`, `neon` y `retro` vía `getRanariaSkin`.
- [ ] El skin por defecto es `clasico`: al no pasar skin a la fábrica, el motor pinta con `clasico`.
- [ ] El motor de `ranaria` ya no tiene ningún color incrustado: fondos por zona, divisorias, rana (cuerpo/patas/ojos/glow), vehículos (coches de ambas variantes, ruedas, camión+cabina), troncos (ambas variantes + vetas), tortugas (visible/sumergida), nenúfares (vacío/ocupado/borde/rana alojada), barra de tiempo (3 tramos) y HUD (texto/iconos) provienen de la paleta activa. `LANE_DEFS` ya no contiene hex.
- [ ] `ranaria` figura en `SKINNED_GAMES` y **el selector de tema de `GamePlayer.tsx` aparece en `/jugar/ranaria` igual que en `rocas`/`serpentina`/`bloque-buster` y conmuta los 3 skins en vivo** (cambia el render), sin cambios en `CanvasGame.tsx` ni en la estructura del selector.
- [ ] Cada skin es legible sobre el fondo oscuro CRT: la rana contrasta sobre asfalto, río y zonas seguras; los cinco carriles y sus entidades se distinguen entre sí; las tortugas sumergidas se leen como "sin soporte"; nenúfares y barra de tiempo distinguibles; sin tonos quemados ni que desaparezcan contra su fondo.
- [ ] `neon` aplica glow en la rana (`frogGlowBlur > 0`); `clasico` mantiene el look plano (`frogGlowBlur = 0`).
- [ ] Ninguna mecánica, constante, geometría ni _feel_ del motor cambia respecto al motor de game-jam/ranaria.

---

## Decisions

- **Sí:** El módulo de paletas vive junto al motor (`app/lib/games/ranaria/skins.ts`), coherente con el precedente de `rocas`, `serpentina` y `bloque-buster`.
- **Sí:** El entorno **naturalista actual** del motor (asfalto/río/troncos/camiones/tortugas/zonas) siembra el skin `clasico`; solo se le apaga el glow de la rana para dejarlo plano y fiel al arcade.
- **Sí:** El **glow verde de la rana** (hoy ya presente) apunta al skin `neon`, que amplifica la saturación de toda la escena. El acento de `neon` parte del verde (`--green`), color de catálogo de `ranaria` reflejado en `.cover-rana`.
- **Sí:** Los colores de entidad salen de `LANE_DEFS` y pasan a resolverse por **rol de entidad** desde la paleta en `drawEntity()`, preservando las **dos variantes de coche y de tronco** como roles distintos (`carA`/`carB`, `logA`/`logB`). (Supuesto: es la forma mínima de permitir que varíen por skin sin tocar la lógica de carriles.)
- **Sí:** La barra de tiempo mantiene sus tres tramos (`timerHigh`/`timerMid`/`timerLow`) y el icono de vida y la rana alojada suelen igualar `frogBody`.
- **No:** No se fijan hex/glow/grosores aquí; los diseña `/frontend-design` en `/spec-impl` respetando las reglas de contraste.
- **No:** No se toca el sistema transversal (SPEC 10): `GameSkin`, firma de `GameFactory`, `CanvasGame.tsx`, clases `.theme-opt.is-*` y la estructura del selector se reusan intactos.
- **No:** No se persiste la preferencia de skin todavía; no se tocan Supabase ni la portada `.cover-rana`.

---

## Risks

| Riesgo                                                                                          | Mitigación                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sacar los colores de `LANE_DEFS` rompe `buildLanes`/`drawEntity` o el _feel_ de los carriles    | Sustituir el hex por una clave de rol sin tocar velocidades, anchos, cantidades ni sentidos; resolver el color solo en `drawEntity()`; verificar una partida completa. |
| La rana verde se funde con las zonas seguras verdes (mediana/acera)                             | Regla dura: la rana se separa por brillo (rana clara sobre verde-zona más oscuro) o glow, no solo por matiz; `/frontend-design` valida la rana sobre las tres zonas.   |
| Contraste insuficiente de algún skin sobre su fondo de zona (p. ej. ámbar `retro` sobre marrón) | Reglas de contraste por zona en la spec; `/frontend-design` valida cada rol sobre el `bg` de su zona antes de cerrar valores.                                          |
| Glow de `neon` que quema la rana o borra los ojos (bloom excesivo)                              | Mantener `frogGlowBlur` moderado (~10 como hoy) y resetear `shadowBlur = 0` tras el cuerpo; verificación visual del paso 5.                                            |
| Los cinco carriles dejan de distinguirse al retiñir (dos coches iguales, tortuga ≈ tronco)      | Exigir roles distintos (`carA`≠`carB`, `logA`≠`logB`, tortuga ≠ troncos) y verificar la separación a simple vista en cada skin.                                        |
| Tortuga sumergida indistinguible de la visible (riesgo de jugabilidad)                          | Mantener el contorno tenue como rol propio (`turtleSubmergedOutline`), nunca igual a la visible; verificar el ciclo de inmersión.                                      |
| Regresión visual respecto al look actual de `ranaria`                                           | El skin `clasico` reproduce el entorno actual (solo apaga el glow de la rana) y `neon` conserva el glow verde; ambos quedan seleccionables.                            |

---

## Qué no está en esta spec

- Skins de cualquier otro juego (una spec por juego; `caida` sigue pendiente).
- Persistir la preferencia de skin del usuario.
- Cualquier cambio en el sistema transversal de skins (SPEC 10), en `globals.css`, en la portada `.cover-rana` o en Supabase.
- Cambios de mecánica, geometría, ritmo o _feel_ del motor de Frogger.
- Valores exactos de color, glow y grosores (los diseña `/frontend-design` en `/spec-impl`).
