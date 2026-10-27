# SPEC 10 — Sistema de skins para ROCAS (`rocas`)

> **Status:** Implementado
> **Depends on:** SPEC 05 (motor de Asteroids "ROCAS" en `app/lib/games/asteroids/engine.ts`). Primera spec de skins del proyecto: introduce además el **sistema transversal de skins** (paletas, cambio de `GameFactory`, hilo UI→motor) que heredarán los demás juegos.
> **Date:** 2026-10-26
> **Objective:** Dotar al juego `rocas` de al menos 3 skins seleccionables — `clasico` (default), `neon` y `retro` — todas legibles sobre el tema oscuro CRT, extrayendo los colores hoy incrustados en el motor a un sistema de paletas nombradas. Los valores hex/glow exactos se delegan a `/frontend-design` durante `/spec-impl`.

---

## Por qué existe esta spec

Hoy **no existe sistema de skins**. El motor de Asteroids (`app/lib/games/asteroids/engine.ts`) tiene todos sus colores _hardcodeados_ dentro de sus funciones `draw*`: el fondo del canvas (`#000`), los trazos vectoriales de nave, asteroides, balas, iconos de vida y texto del HUD (`#fff`), la llama del propulsor (`rgba(255,130,0,0.85)`), el acento del power-up y del indicador `3x` (`#0ff`), las partículas de explosión (`rgba(255,255,255,a)`) y el subtítulo del overlay (`rgba(255,255,255,0.65)`).

Un skin es una **paleta nombrada** que agrupa esos colores por rol (fondo, vector primario, empuje, acento, glow, texto atenuado) para que el motor los lea en vez de incrustarlos. Esta spec extrae ese inventario a un módulo de paletas, amplía el contrato `GameFactory` para que el motor reciba el skin elegido, y define los 3 arquetipos de `rocas`. Como es la primera spec de skins, también fija el **sistema transversal** que reusarán `caida`, `bloque-buster` y `serpentina`.

### Hallazgo de auditoría (estado de partida de los skins de `rocas`)

Inventario de colores por rol en `engine.ts` (lo que cada skin debe cubrir):

| Rol                                                                                  | Valor actual incrustado                           | Dónde                                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Fondo de canvas                                                                      | `#000`                                            | `draw()` fillRect                                                                     |
| Vector primario (nave, asteroides, balas, iconos de vida, texto HUD, título overlay) | `#fff`                                            | `Bullet.draw`, `Asteroid.draw`, `Ship.draw`, `drawLifeIcon`, `drawHUD`, `drawOverlay` |
| Llama del propulsor                                                                  | `rgba(255,130,0,0.85)`                            | `Ship.draw`                                                                           |
| Acento (power-up `3x` e indicador HUD)                                               | `#0ff`                                            | `PowerUp.draw`, `drawHUD`                                                             |
| Partículas de explosión                                                              | `rgba(255,255,255,a)`                             | `Particle.draw`                                                                       |
| Texto atenuado (subtítulo overlay)                                                   | `rgba(255,255,255,0.65)`                          | `drawOverlay`                                                                         |
| Glow / `shadowColor`                                                                 | **No existe** (vectores planos, sin `shadowBlur`) | —                                                                                     |
| Rejilla                                                                              | **No existe** (campo negro, sin grid)             | —                                                                                     |

Conclusión: a diferencia de otros motores con glow neón, `rocas` pinta **vectores blancos planos sobre negro puro, sin glow ni rejilla** — exactamente el look del arcade original. Por tanto los colores actuales **siembran el skin `clasico`**, no el `neon`. El skin `neon` deberá **añadir** glow (`shadowColor`/`shadowBlur`) y teñir los vectores con el acento del catálogo (ver abajo); el `retro` reinterpreta todo en fósforo vintage.

Estado por skin al arrancar esta spec: `clasico` ⬜ · `neon` ⬜ · `retro` ⬜ (ninguno existe como paleta; el motor solo tiene colores sueltos que se parecen a `clasico`).

---

## Scope

**In:**

- **Sistema transversal de skins** (primera vez): un tipo `GameSkin = "clasico" | "neon" | "retro"` y la forma de una **paleta por rol**, viviendo en un módulo por juego. Para `rocas`: `app/lib/games/asteroids/skins.ts`.
- **Ampliación del contrato `GameFactory`** (`app/lib/games/types.ts`) para que el motor reciba el skin elegido como parámetro **opcional con default `clasico`**. Cambio de contrato transversal: lo heredan todos los motores.
- **Hilo UI → motor**: `app/components/games/CanvasGame.tsx` pasa el skin elegido a la fábrica.
- **Los 3 skins de `rocas`** (`clasico` default, `neon`, `retro`) cubriendo el inventario de roles de la tabla de auditoría, legibles sobre el fondo oscuro CRT.
- **Refactor del motor de `rocas`**: sustituir cada color incrustado en los `draw*` por la lectura del rol correspondiente de la paleta activa. No cambia ninguna mecánica, constante ni _feel_.

**Out of scope (para futuras specs):**

- Los skins de `caida`, `bloque-buster` y `serpentina` (un juego por spec; esta solo cubre `rocas`).
- El **selector de skin en la UI** (`/jugar/[id]` o `/juego/[id]`): su diseño e interacción se difieren. Mientras no exista, el default `clasico` se aplica siempre y el sistema queda preparado para recibir el skin elegido. Añadir el selector es trabajo de una spec posterior con `/frontend-design`.
- Persistir la preferencia de skin del usuario (Supabase / almacenamiento local).
- Cualquier cambio en `globals.css`, portadas `.cover-*` o motores de otros juegos.

---

## Data model / contrato

**Forma de la paleta** (en `app/lib/games/asteroids/skins.ts`, nombres orientativos; hex delegados a `/frontend-design`):

```
type GameSkin = "clasico" | "neon" | "retro";   // vivirá en types.ts (transversal)

interface AsteroidsPalette {
  bg: string;          // fondo del canvas (oscuro propio del skin)
  vector: string;      // trazo de nave, asteroides, balas, iconos de vida, texto HUD, título overlay
  thrust: string;      // llama del propulsor
  accent: string;      // power-up 3x e indicador HUD
  particle: string;    // base de partículas (el alpha lo sigue aplicando el motor)
  textDim: string;     // subtítulo del overlay
  glowColor: string;   // color del shadowColor (igual a vector/accent según skin)
  glowBlur: number;    // shadowBlur en px; 0 en clasico (sin glow), >0 en neon
}

const SKINS: Record<GameSkin, AsteroidsPalette> = { clasico: {...}, neon: {...}, retro: {...} };
export function getAsteroidsSkin(skin: GameSkin = "clasico"): AsteroidsPalette { ... }
```

**Cambio de contrato (`app/lib/games/types.ts`)** — transversal:

```
export type GameSkin = "clasico" | "neon" | "retro";

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin?: GameSkin,        // nuevo, opcional, default "clasico"
) => GameEngine;
```

El parámetro es **opcional con default `clasico`** para que ningún motor existente se rompa al no pasarlo. El motor de `rocas` resuelve su paleta una vez con `getAsteroidsSkin(skin)` y lee los roles en sus `draw*`. El `shadowBlur`/`shadowColor` se aplica según `glowBlur`/`glowColor` (0 = sin glow, preserva el look plano de `clasico`).

---

## Implementation plan

1. **Tipo transversal**: añadir `GameSkin` y el parámetro opcional `skin?: GameSkin` (default `"clasico"`) a `GameFactory` en `app/lib/games/types.ts`. Verificar que compila sin tocar los demás motores (el default cubre a quien no lo pase).
2. **Módulo de paletas** `app/lib/games/asteroids/skins.ts`: definir `AsteroidsPalette`, el mapa `SKINS` con las tres claves y `getAsteroidsSkin(skin = "clasico")`. Dejar los hex/glow como marcadores a afinar en el paso 5.
3. **Refactor del motor** `app/lib/games/asteroids/engine.ts`: aceptar el tercer parámetro `skin`, resolver la paleta al inicio del closure y reemplazar **cada** color incrustado (tabla de auditoría) por el rol de la paleta. Aplicar `ctx.shadowColor = glowColor` / `ctx.shadowBlur = glowBlur` donde proceda, reseteando el glow para elementos que no deban brillar. No alterar mecánicas, constantes ni _feel_.
4. **Hilo UI → motor** en `app/components/games/CanvasGame.tsx`: aceptar una prop de skin (opcional, default `clasico`) y pasarla como tercer argumento a la fábrica. Sin selector aún: el default se aplica siempre.
5. **Afinado de paletas con `/frontend-design`** (paso explícito delegado): diseñar los hex, glows y grosores de los 3 skins respetando las reglas de contraste de la sección siguiente. `/frontend-design` fija los valores exactos; esta spec solo fija los arquetipos y las reglas.
6. **Verificación visual** de `rocas` en los 3 skins sobre el tema oscuro: nave, asteroides, balas, HUD, power-up y overlay legibles; glow que realza sin quemar; `clasico` como default cuando no se elige skin.

### Arquetipos de skin + reglas de contraste (para `/frontend-design`)

Regla dura común: el sitio es **íntegramente oscuro** (`--bg: #0a0a0f`, canvas sobre fondo CRT). Cada skin aporta **su propio fondo oscuro** y todo elemento y acento debe mantener contraste y legibilidad sobre ese fondo. Prohibido el blanco quemado por bloom y los acentos que se pierden contra el fondo.

- **`clasico` (default)** — fiel al arcade de Asteroids: vectores claros (casi blancos) sobre negro profundo, **sin glow** (`glowBlur: 0`), sobrio y nítido. Es el estado de partida del motor; el acento del power-up puede ser un cian o ámbar discreto. Contraste: trazo claro legible sobre `bg` casi negro; nada debe quemar.
- **`neon` — look CRT vibrante de la plataforma**: vectores teñidos con el acento de catálogo de `rocas` (**amarillo**, coherente con `.cover-rocas` que usa `--yellow: #f5ff00` para la nave) y **glow activo** (`shadowBlur > 0`), con un acento complementario cian/magenta para el power-up. Contraste: el glow debe realzar sin producir halo que borre la silueta vectorial; el fondo se mantiene muy oscuro para que el neón resalte.
- **`retro` — vintage apagado**: fósforo ámbar o verde desaturado sobre un fondo oscuro cálido (CRT desgastado), glow tenue o nulo, carácter contenido. Contraste: aun apagado, el trazo fósforo debe leerse claramente sobre su fondo; evitar que ámbar sobre marrón oscuro baje de contraste suficiente.

En los tres: el fondo es oscuro propio del skin, el vector primario contrasta con el fondo, el acento se distingue del vector, y el glow (si lo hay) realza sin quemar.

---

## Acceptance criteria

- [x] `rocas` expone exactamente los 3 skins `clasico`, `neon` y `retro` vía `getAsteroidsSkin`.
- [x] El skin por defecto es `clasico`: al no pasar skin a la fábrica, el motor pinta con `clasico`.
- [x] El motor de `rocas` ya no tiene ningún color incrustado en sus `draw*`: todos provienen de la paleta activa (fondo, vector, empuje, acento, partículas, texto atenuado, glow).
- [x] `GameFactory` acepta `skin?: GameSkin` con default `clasico` sin romper la compilación de los demás motores.
- [x] `CanvasGame.tsx` pasa el skin (default `clasico`) a la fábrica.
- [x] Cada skin es legible sobre el fondo oscuro CRT: nave, asteroides, balas, HUD, power-up `3x` y overlay distinguibles; sin blancos quemados ni acentos que desaparezcan contra el fondo.
- [x] `neon` aplica glow (`shadowBlur > 0`); `clasico` mantiene el look plano (`glowBlur: 0`).
- [x] Ninguna mecánica, constante ni _feel_ del motor cambia respecto a SPEC 05.

---

## Decisions

- **Sí:** El módulo de paletas vive junto al motor (`app/lib/games/asteroids/skins.ts`), no en un mapa central, coherente con la arquitectura de "cada juego en su carpeta". Un mapa central se consideraría solo si aparecieran roles compartidos entre juegos.
- **Sí:** `clasico` es el default y se siembra con los colores actuales del motor (vectores blancos sobre negro, sin glow), porque el motor de `rocas` nunca tuvo glow: su look de partida ES el clásico.
- **Sí:** El acento de `neon` parte del amarillo (`--yellow`), que es el color de catálogo de `rocas` reflejado en `.cover-rocas`.
- **Sí:** El parámetro `skin` de `GameFactory` es opcional con default `clasico`, para introducir el contrato transversal sin tocar los motores que aún no lo usan.
- **No:** No se implementa el selector de skin en la UI en esta spec; sin él, el default `clasico` se aplica siempre y el sistema queda listo. (Supuesto: el afinado del selector merece su propia pasada de `/frontend-design`.)
- **No:** No se fijan hex/glow/grosores aquí; los diseña `/frontend-design` en `/spec-impl` respetando las reglas de contraste.
- **No:** No se persiste la preferencia de skin todavía.

---

## Risks

| Riesgo                                                                                         | Mitigación                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor de colores altera accidentalmente mecánicas o _feel_ del motor                     | Tocar solo `strokeStyle`/`fillStyle`/`shadow*` dentro de los `draw*`; no modificar `update`, constantes ni geometría; verificar partida tras el cambio. |
| Contraste insuficiente de algún skin sobre el fondo oscuro (p. ej. ámbar `retro` sobre marrón) | Reglas de contraste duras en la spec; `/frontend-design` valida legibilidad de cada rol sobre el `bg` de su propio skin antes de cerrar valores.        |
| Glow de `neon` que quema la silueta vectorial (bloom excesivo)                                 | Fijar `glowBlur` moderado y resetear `shadowBlur` en elementos que no deban brillar; verificación visual del paso 6.                                    |
| El nuevo parámetro `skin` rompe la compilación de otros motores                                | Parámetro opcional con default `clasico`; el resto de fábricas lo ignoran sin cambios.                                                                  |
| Regresión visual respecto al look actual de `rocas`                                            | `clasico` reproduce exactamente los colores actuales (vectores blancos sobre negro, sin glow) y es el default.                                          |

---

## Qué no está en esta spec

- Skins de `caida`, `bloque-buster` y `serpentina` (una spec por juego).
- El selector de skin en la UI y la persistencia de la preferencia.
- Valores exactos de color, glow y grosores (los diseña `/frontend-design` en `/spec-impl`).
- Cualquier cambio en `globals.css`, portadas `.cover-*` o Supabase.
