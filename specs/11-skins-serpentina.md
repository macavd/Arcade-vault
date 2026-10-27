# SPEC 11 — Sistema de skins para SERPENTINA (`serpentina`)

> **Status:** Draft
> **Depends on:** SPEC 09 (motor de Snake "SERPENTINA" en `app/lib/games/serpentina/engine.ts`) y SPEC 10 (sistema transversal de skins ya **Implementado**: `GameSkin` en `app/lib/games/types.ts`, parámetro `skin?` en `GameFactory`, hilo UI→motor en `CanvasGame.tsx`, selector genérico en `GamePlayer.tsx` dirigido por `SKINNED_GAMES` de `app/lib/games/skins.ts`).
> **Date:** 2026-10-27
> **Objective:** Dotar al juego `serpentina` de al menos 3 skins seleccionables — `clasico` (default), `neon` y `retro` — todas legibles sobre el tema oscuro CRT, extrayendo los colores hoy incrustados en el motor a una paleta nombrada por rol. Reusa el sistema transversal de SPEC 10 sin redefinirlo. Los valores hex/glow exactos se delegan a `/frontend-design` durante `/spec-impl`.

---

## Por qué existe esta spec

El sistema de skins ya existe (SPEC 10, aplicado a `rocas`): hay un tipo `GameSkin = "clasico" | "neon" | "retro"`, `GameFactory` acepta `skin?: GameSkin` con default `clasico`, `CanvasGame.tsx` y `GamePlayer.tsx` ya hilan el skin elegido hasta la fábrica, y el selector de tema de la UI se renderiza automáticamente para cualquier juego listado en `SKINNED_GAMES` (`app/lib/games/skins.ts`). Lo que falta es que **`serpentina` participe**: su motor todavía tiene los colores _hardcodeados_ en sus funciones `draw*` y el juego no figura en `SKINNED_GAMES`, así que no ofrece skins ni selector.

Un skin es una **paleta nombrada** que agrupa esos colores por rol (fondo del canvas, rejilla, cuerpo y cabeza de la serpiente, glow, ojos, fruta de reserva) para que el motor los lea en vez de incrustarlos. Esta spec extrae ese inventario a `app/lib/games/serpentina/skins.ts`, refactoriza el motor para leer la paleta activa y registra `serpentina` en `SKINNED_GAMES`. No introduce ni modifica el contrato transversal: lo hereda tal cual de SPEC 10.

### Hallazgo de auditoría (estado de partida de los skins de `serpentina`)

Inventario de colores por rol en `app/lib/games/serpentina/engine.ts` (lo que cada skin debe cubrir):

| Rol                           | Valor actual incrustado                      | Dónde                                              |
| ----------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Fondo de canvas               | `#05080a`                                    | `draw()` fillRect                                  |
| Rejilla tenue                 | `rgba(0, 255, 160, 0.05)`                    | `draw()` strokeStyle de la cuadrícula              |
| Serpiente — cabeza            | `#5dffb0`                                    | `drawSnake()` fillStyle cuando `head`              |
| Serpiente — cuerpo            | `#17c98a`                                    | `drawSnake()` fillStyle resto de segmentos         |
| Glow / `shadowColor`          | `#00ffa0`, `shadowBlur` 16 cabeza / 8 cuerpo | `drawSnake()`                                      |
| Ojos de la cabeza             | `#05080a` (recorte sobre la cabeza)          | `drawSnake()` fillStyle de los ojos                |
| Fruta de reserva (sin sprite) | `#ff3b6b`                                    | `drawFood()` círculo cuando el atlas no ha cargado |

Nota sobre la fruta: la fruta se pinta desde un **atlas de sprites** (`./sprites`, `FRUITS`/`getFruitsImage`), no con un color; por tanto el skin **no retiñe el sprite de la fruta**, solo el **círculo de reserva** que se dibuja mientras la imagen carga. Los ojos usan hoy el mismo valor que el fondo para "recortarse" sobre la cabeza, así que en la paleta el rol `eye` debe seguir al `bg` del skin (o a un tono coherente con él) para preservar ese efecto.

Conclusión: a diferencia de `rocas` (vectores blancos planos ≈ `clasico`), el look actual de `serpentina` es **verde fosforescente con glow sobre fondo casi negro** — exactamente el look CRT vibrante de la plataforma. Por tanto los colores actuales **siembran el skin `neon`**, no el `clasico`. El `clasico` deberá reinterpretar Snake en clave sobria (monocromo verde apagado, glow nulo o mínimo, fiel al arcade original); el `retro` lo lleva a fósforo ámbar/verde vintage de CRT desgastado.

Estado por skin al arrancar esta spec: `clasico` ⬜ · `neon` ⬜ · `retro` ⬜ (ninguno existe como paleta; el motor solo tiene colores sueltos que se parecen a `neon`).

---

## Scope

**In:**

- **Módulo de paletas** `app/lib/games/serpentina/skins.ts`: una interfaz `SerpentinaPalette` con un rol por cada fila de la tabla de auditoría, el mapa `SKINS: Record<GameSkin, SerpentinaPalette>` con las 3 claves y `getSerpentinaSkin(skin = "clasico")`.
- **Los 3 skins de `serpentina`** (`clasico` default, `neon`, `retro`) cubriendo el inventario de roles, legibles sobre el fondo oscuro CRT.
- **Refactor del motor** `app/lib/games/serpentina/engine.ts`: aceptar el tercer parámetro `skin` (ya previsto por `GameFactory`), resolver la paleta al inicio del closure y reemplazar **cada** color incrustado de la tabla por el rol correspondiente. Conservar la proporción de glow cabeza/cuerpo (p. ej. `glowBlur` base para el cuerpo y mayor para la cabeza) leyéndola de la paleta.
- **Registrar `serpentina`** en `SKINNED_GAMES` de `app/lib/games/skins.ts` (`serpentina: ["clasico", "neon", "retro"]`), con lo que el selector de tema ya existente en `GamePlayer.tsx` aparece automáticamente para este juego.

**Out of scope (para futuras specs):**

- Los skins de `caida` y `bloque-buster` (un juego por spec; esta solo cubre `serpentina`).
- **Retintar el sprite de la fruta** (atlas de imagen): queda como está; el skin solo cubre el círculo de reserva. Un sistema de frutas por skin sería otra spec.
- Cualquier cambio en el **sistema transversal** (`GameSkin`, firma de `GameFactory`, `CanvasGame.tsx`, estructura del selector en `GamePlayer.tsx`): se reusa intacto de SPEC 10.
- Persistir la preferencia de skin del usuario (Supabase / almacenamiento local).
- Cualquier cambio en `globals.css`, portadas `.cover-*` o motores de otros juegos.

---

## Data model / contrato

El contrato transversal **no cambia** (vive ya en `app/lib/games/types.ts` desde SPEC 10):

```
export type GameSkin = "clasico" | "neon" | "retro";
export type GameFactory = (canvas, callbacks, skin?: GameSkin) => GameEngine;  // default "clasico"
```

**Forma de la paleta** (nueva, en `app/lib/games/serpentina/skins.ts`; nombres orientativos, hex/glow delegados a `/frontend-design`):

```
interface SerpentinaPalette {
  bg: string;          // fondo del canvas (oscuro propio del skin)
  grid: string;        // rejilla tenue, con su alpha bajo incluido
  snakeHead: string;   // segmento cabeza
  snakeBody: string;   // resto de segmentos
  glowColor: string;   // shadowColor de la serpiente
  glowBlurBody: number; // shadowBlur del cuerpo (0 = sin glow en clasico)
  glowBlurHead: number; // shadowBlur de la cabeza (>= glowBlurBody)
  eye: string;         // ojos de la cabeza; sigue al bg para recortarse
  foodFallback: string; // círculo de reserva mientras carga el sprite de fruta
}

const SKINS: Record<GameSkin, SerpentinaPalette> = { clasico: {...}, neon: {...}, retro: {...} };
export function getSerpentinaSkin(skin: GameSkin = "clasico"): SerpentinaPalette { ... }
```

El motor resuelve su paleta una vez con `getSerpentinaSkin(skin)` y lee los roles en `draw()`/`drawSnake()`/`drawFood()`. Aplica `ctx.shadowColor = glowColor` y `ctx.shadowBlur = glowBlurHead|glowBlurBody` según el segmento, reseteando `shadowBlur = 0` antes de pintar los ojos (como hoy). `clasico` fija `glowBlurBody = glowBlurHead = 0` para el look plano.

---

## Implementation plan

1. **Módulo de paletas** `app/lib/games/serpentina/skins.ts`: definir `SerpentinaPalette`, el mapa `SKINS` con las tres claves y `getSerpentinaSkin(skin = "clasico")`, importando `GameSkin` de `../types`. Dejar los hex/glow como marcadores a afinar en el paso 4.
2. **Refactor del motor** `app/lib/games/serpentina/engine.ts`: añadir el tercer parámetro `skin` a la fábrica, resolver `const palette = getSerpentinaSkin(skin)` al inicio del closure y reemplazar **cada** color incrustado de la tabla de auditoría por el rol de la paleta (fondo, rejilla, cabeza, cuerpo, glow con su par cabeza/cuerpo, ojos = `palette.eye`, círculo de reserva de la fruta). No alterar ninguna mecánica, constante, geometría ni _feel_ (rejilla 32×24, muros mortales, +10 por fruta, aceleración por tramos). No tocar el atlas de sprites de la fruta.
3. **Registrar el juego** en `app/lib/games/skins.ts`: añadir `serpentina: ["clasico", "neon", "retro"]` a `SKINNED_GAMES`. Con esto el selector de tema ya existente en `GamePlayer.tsx` se muestra para `serpentina` sin tocar la UI. No hace falta modificar `CanvasGame.tsx` ni `GamePlayer.tsx` (ya hilan `skin` genéricamente desde SPEC 10).
4. **Afinado de paletas con `/frontend-design`** (paso explícito delegado): diseñar los hex, glows y grosores de los 3 skins respetando las reglas de contraste de la sección siguiente. `/frontend-design` fija los valores exactos; esta spec solo fija los arquetipos y las reglas.
5. **Verificación visual** de `serpentina` en los 3 skins sobre el tema oscuro: serpiente (cabeza/cuerpo), ojos, rejilla, fruta (sprite y círculo de reserva) legibles; glow que realza sin quemar; `clasico` como default; selector de tema conmutando los 3 skins en vivo.

### Arquetipos de skin + reglas de contraste (para `/frontend-design`)

Regla dura común: el sitio es **íntegramente oscuro** (tema CRT en `:root`, canvas sobre fondo oscuro). Cada skin aporta **su propio fondo oscuro** y todo elemento y acento debe mantener contraste y legibilidad sobre ese fondo. Prohibido el blanco/verde quemado por bloom y los tonos que se pierden contra el fondo. Los ojos (`eye`) deben leerse como recorte sobre la cabeza, así que seguirán al `bg` del skin (o a un tono muy próximo).

- **`clasico` (default)** — fiel al Snake de arcade: serpiente en un **verde sobrio y nítido** (o monocromo contenido) sobre fondo oscuro profundo, **sin glow** (`glowBlurBody = glowBlurHead = 0`), rejilla apenas perceptible. Cabeza ligeramente más clara que el cuerpo para distinguirla. Contraste: cuerpo y cabeza legibles sobre `bg` casi negro, sin halo.
- **`neon` — look CRT vibrante de la plataforma**: es el **punto de partida del motor actual** — verde fosforescente (cabeza `#5dffb0`/cuerpo `#17c98a` como referencia), glow verde activo (`glowBlurHead > glowBlurBody > 0`, p. ej. 16/8) sobre fondo casi negro, coherente con el acento de catálogo de `serpentina` (**verde**, `--green #00ff88`, el mismo de `.cover-snake`). Contraste: el glow debe realzar la serpiente sin que el bloom funda cabeza y cuerpo ni borre los ojos; rejilla tenue verde como hoy.
- **`retro` — vintage apagado**: fósforo **ámbar o verde desaturado** sobre un fondo oscuro cálido (CRT desgastado), glow tenue o nulo, carácter contenido. Rejilla en el mismo fósforo muy atenuada. Contraste: aun apagado, cabeza y cuerpo deben distinguirse entre sí y leerse sobre su fondo; evitar que ámbar sobre marrón oscuro baje de contraste suficiente.

En los tres: el fondo es oscuro propio del skin, la serpiente contrasta con el fondo, cabeza y cuerpo se distinguen entre sí, los ojos se recortan sobre la cabeza, y el glow (si lo hay) realza sin quemar.

---

## Acceptance criteria

- [ ] `serpentina` expone exactamente los 3 skins `clasico`, `neon` y `retro` vía `getSerpentinaSkin`.
- [ ] El skin por defecto es `clasico`: al no pasar skin a la fábrica, el motor pinta con `clasico`.
- [ ] El motor de `serpentina` ya no tiene ningún color incrustado en sus `draw*`: fondo, rejilla, cabeza, cuerpo, glow, ojos y círculo de reserva de la fruta provienen de la paleta activa.
- [ ] `serpentina` figura en `SKINNED_GAMES` y el selector de tema de `GamePlayer.tsx` aparece y conmuta los 3 skins en vivo, sin cambios en `CanvasGame.tsx` ni en la estructura del selector.
- [ ] Cada skin es legible sobre el fondo oscuro CRT: cabeza, cuerpo, ojos, rejilla y fruta distinguibles; sin verdes/blancos quemados ni tonos que desaparezcan contra el fondo.
- [ ] `neon` aplica glow (`glowBlurHead > glowBlurBody > 0`); `clasico` mantiene el look plano (`glowBlur... = 0`).
- [ ] Ninguna mecánica, constante ni _feel_ del motor cambia respecto a SPEC 09; el sprite de la fruta no se retiñe.

---

## Decisions

- **Sí:** El módulo de paletas vive junto al motor (`app/lib/games/serpentina/skins.ts`), coherente con "cada juego en su carpeta" y con el precedente de `rocas` (SPEC 10).
- **Sí:** El look **actual** del motor (verde fosforescente con glow) siembra el skin `neon`, no el `clasico`, porque ese es precisamente el look CRT vibrante de la plataforma. El `clasico` se diseña nuevo como versión sobria sin glow.
- **Sí:** El acento de `neon` parte del verde (`--green`), color de catálogo de `serpentina` reflejado en `.cover-snake`.
- **Sí:** El rol `eye` sigue al `bg` del skin para preservar el recorte de los ojos sobre la cabeza que hace hoy el motor (`#05080a`).
- **Sí:** El glow se modela con dos valores (`glowBlurBody`/`glowBlurHead`) para conservar la proporción cabeza/cuerpo (16/8) del motor actual.
- **No:** No se retiñe el sprite de la fruta (atlas de imagen); el skin solo cubre el círculo de reserva. (Supuesto: retintar frutas por skin merece su propia spec.)
- **No:** No se toca el sistema transversal (SPEC 10): `GameSkin`, firma de `GameFactory`, `CanvasGame.tsx` y la estructura del selector se reusan intactos.
- **No:** No se fijan hex/glow/grosores aquí; los diseña `/frontend-design` en `/spec-impl` respetando las reglas de contraste.
- **No:** No se persiste la preferencia de skin todavía.

---

## Risks

| Riesgo                                                                                         | Mitigación                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El refactor de colores altera mecánicas o _feel_ del motor                                     | Tocar solo `fillStyle`/`strokeStyle`/`shadow*` dentro de los `draw*`; no modificar `stepSnake`, `loop`, constantes ni geometría; verificar partida tras el cambio. |
| Contraste insuficiente de algún skin sobre el fondo oscuro (p. ej. ámbar `retro` sobre marrón) | Reglas de contraste duras en la spec; `/frontend-design` valida cada rol sobre el `bg` de su propio skin antes de cerrar valores.                                  |
| Glow de `neon` que funde cabeza y cuerpo o borra los ojos (bloom excesivo)                     | Mantener `glowBlurHead`/`glowBlurBody` moderados y resetear `shadowBlur = 0` antes de los ojos (como hoy); verificación visual del paso 5.                         |
| Cabeza y cuerpo indistinguibles en `clasico`/`retro` sin glow                                  | Exigir que la cabeza sea un tono más claro que el cuerpo en la paleta; verificar que ambos se separan a simple vista.                                              |
| Los ojos dejan de recortarse si `eye` no sigue al `bg`                                         | Fijar `eye` al `bg` del skin (o tono muy próximo) como regla de paleta.                                                                                            |
| Regresión visual respecto al look actual de `serpentina`                                       | El skin `neon` reproduce el verde fosforescente con glow actual; es seleccionable aunque el default pase a ser `clasico`.                                          |

---

## Qué no está en esta spec

- Skins de `caida` y `bloque-buster` (una spec por juego).
- Retintar el sprite de la fruta y la persistencia de la preferencia de skin.
- Cualquier cambio en el sistema transversal de skins (SPEC 10), en `globals.css`, portadas `.cover-*` o Supabase.
- Valores exactos de color, glow y grosores (los diseña `/frontend-design` en `/spec-impl`).
