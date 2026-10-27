# SPEC 12 — Sistema de skins para BLOQUE BUSTER (`bloque-buster`)

> **Status:** Draft
> **Depends on:** SPEC 08 (motor de Arkanoid "BLOQUE BUSTER" en `app/lib/games/bloque-buster/engine.ts`) y SPEC 10 (sistema transversal de skins: `GameSkin`, parámetro `skin?` de `GameFactory`, hilo UI→motor por `CanvasGame.tsx`, selector genérico en `GamePlayer.tsx`, registro `app/lib/games/skins.ts`). Esta spec **reusa** ese sistema; no lo redefine.
> **Date:** 2026-10-27
> **Objective:** Dotar al juego `bloque-buster` de al menos 3 skins seleccionables — `clasico` (default), `neon` y `retro` — todas legibles sobre el tema oscuro CRT. A diferencia de `rocas`, este motor pinta desde un **spritesheet PNG** (colores horneados en los píxeles), así que el skin recolorea los sprites con `ctx.filter` + `shadow*` y fija el fondo del canvas. Los valores exactos (filtros, glow, fondo) se delegan a `/frontend-design` durante `/spec-impl`.

---

## Por qué existe esta spec

El sistema transversal de skins ya existe (SPEC 10): el tipo `GameSkin = "clasico" | "neon" | "retro"`, el parámetro opcional `skin?` de `GameFactory` (default `clasico`), el hilo UI→motor en `app/components/games/CanvasGame.tsx`, el selector de tema genérico en `app/components/GamePlayer.tsx` (se muestra solo si `getAvailableSkins(id)` no es `null`) y sus estilos `.theme-opt.is-{clasico,neon,retro}` ya en `app/globals.css`. Falta aplicar skins a `bloque-buster`, que hoy no tiene paleta: pinta con colores fijos.

**Diferencia clave con `rocas`.** El motor de Asteroids dibuja vectores con `strokeStyle`/`fillStyle`, así que su skin es una paleta de colores por rol. `bloque-buster` **no**: todos sus elementos visibles (bloques por color, paleta, pelota y los 4 frames de explosión por color) se pintan con `drawImage` desde un único spritesheet (`public/games/bloque-buster/spritesheet-breakout.png`, ver `sprites.ts`), con los colores **horneados en los píxeles de la imagen**. El único color que el motor fija directamente es el **fondo del canvas** (`ctx.fillStyle = "#000"` en `draw()`). Por tanto no se puede skinear cambiando colores por rol: hay que **recolorear el spritesheet en tiempo de dibujo** (vía `ctx.filter`) y aplicar glow con `ctx.shadowColor`/`ctx.shadowBlur` alrededor de los sprites, además de fijar el fondo.

### Hallazgo de auditoría (estado de partida de los skins de `bloque-buster`)

Inventario de lo que cada skin debe cubrir, leído de `engine.ts` y `sprites.ts`:

| Rol                                                             | Cómo se pinta hoy                                                              | Dónde                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| Fondo de canvas                                                 | `ctx.fillStyle = "#000"` + `fillRect` (color fijado directamente por el motor) | `draw()`                |
| Bloques (7 colores: red/yellow/cyan/magenta/hotpink/green/gray) | `drawImage` del sprite `block_<color>` (color horneado en el PNG)              | `draw()` → `drawSprite` |
| Paleta (paddle)                                                 | `drawImage` del sprite `paddle` (color horneado)                               | `draw()` → `drawSprite` |
| Pelota                                                          | `drawImage` del sprite `ball` (color horneado)                                 | `draw()` → `drawSprite` |
| Explosiones (4 frames por color)                                | `drawImage` del frame `EXPLOSION_FRAMES[color][i]` (color horneado)            | `draw()` → `drawFrame`  |
| Glow / `shadowColor`                                            | **No existe** (sprites planos, sin `shadowBlur`)                               | —                       |
| Rejilla / marco del campo                                       | **No existe** (campo negro liso)                                               | —                       |

Conclusión: el look actual son **sprites multicolor sobre negro puro, sin glow ni rejilla**. Ese multicolor de ladrillos es precisamente la identidad de catálogo del juego (ver la portada `.cover-bricks` en `globals.css`: muro `#ff006e` magenta / `#ffae00` ámbar / `#00f5ff` cian / `#00ff88` verde sobre `#15151f`) y es también fiel al Arkanoid arcade original, que tenía ladrillos de colores. Por tanto el look de partida **siembra el skin `clasico`** (ladrillos de colores, filtro identidad, sin glow, fondo negro). `neon` **realza** ese multicolor (saturación/brillo + glow, anclado en `.cover-bricks`); `retro` lo reinterpreta en fósforo monocromo ámbar/verde desgastado.

Estado por skin al arrancar esta spec: `clasico` ⬜ · `neon` ⬜ · `retro` ⬜ (no existe paleta; el motor solo fija el fondo y pinta el spritesheet tal cual). El registro `references/game-with-theme.md` ya refleja `bloque-buster` en `⬜/⬜/⬜`.

---

## Scope

**In:**

- **Reuso del sistema transversal de SPEC 10**: el tipo `GameSkin`, el parámetro `skin?` de `GameFactory`, el hilo `CanvasGame.tsx`→motor y el selector genérico de `GamePlayer.tsx` ya existen; esta spec solo los **consume**.
- **Módulo de paleta de `bloque-buster`**: `app/lib/games/bloque-buster/skins.ts`, con una forma **adaptada al spritesheet** (fondo + recoloreado de sprites vía filtro + glow), no una paleta por rol de color como `rocas`.
- **Los 3 skins** (`clasico` default, `neon`, `retro`) cubriendo el inventario de la tabla de auditoría, legibles sobre el fondo oscuro CRT.
- **Refactor del motor** `app/lib/games/bloque-buster/engine.ts`: aceptar el tercer parámetro `skin`, resolver la paleta una vez, pintar el fondo con `palette.bg`, y envolver el dibujo de sprites/explosiones con `ctx.filter = palette.spriteFilter` y `ctx.shadowColor/shadowBlur` según `palette.glowColor/glowBlur`, reseteando filtro y sombra tras pintar. No cambia ninguna mecánica, constante, nivel ni _feel_.
- **Registro del juego** en `app/lib/games/skins.ts`: añadir `"bloque-buster": ["clasico", "neon", "retro"]` a `SKINNED_GAMES` para que el selector de tema aparezca automáticamente en `/jugar/bloque-buster`.

**Out of scope (para futuras specs):**

- Los skins de `caida` y `serpentina` (un juego por spec; `rocas` ya está en SPEC 10, `serpentina` lo cubre su propia spec en paralelo).
- Cambios en el sistema transversal, en `CanvasGame.tsx`, en `GamePlayer.tsx` o en los estilos `.theme-opt.is-*` de `globals.css` (ya resueltos y genéricos en SPEC 10).
- Crear **variantes del spritesheet PNG** por skin (assets de arte nuevos): esta spec recolorea el único spritesheet existente con `ctx.filter`, sin arte adicional.
- Persistir la preferencia de skin del usuario (Supabase / almacenamiento local).
- Cualquier cambio en Supabase.

---

## Data model / contrato

El contrato transversal (`app/lib/games/types.ts`) **ya existe** y no se toca:

```
export type GameSkin = "clasico" | "neon" | "retro";
export type GameFactory = (canvas, callbacks, skin?: GameSkin) => GameEngine; // default "clasico"
```

**Forma de la paleta de `bloque-buster`** (en `app/lib/games/bloque-buster/skins.ts`, nombres orientativos; valores delegados a `/frontend-design`). Es distinta de `AsteroidsPalette`: no hay colores por rol porque los colores viven en el spritesheet; lo que el skin controla es el fondo, un **recoloreado global de los sprites** y el glow:

```
interface BloqueBusterPalette {
  bg: string;           // fondo del canvas (oscuro propio del skin; reemplaza el "#000" fijo)
  spriteFilter: string; // valor para ctx.filter aplicado a sprites y explosiones
                        //   ("none" en clasico = sprites tal cual; sepia/hue-rotate/saturate
                        //    en retro para fósforo monocromo; saturate/brightness en neon)
  glowColor: string;    // ctx.shadowColor alrededor de los sprites
  glowBlur: number;     // ctx.shadowBlur en px; 0 = sin glow (preserva el look plano de clasico)
}

const SKINS: Record<GameSkin, BloqueBusterPalette> = { clasico: {...}, neon: {...}, retro: {...} };
export function getBloqueBusterSkin(skin: GameSkin = "clasico"): BloqueBusterPalette { ... }
```

El motor resuelve `getBloqueBusterSkin(skin)` una vez en el closure. En `draw()`: pinta el fondo con `palette.bg`; antes de los `drawSprite`/`drawFrame` aplica `ctx.filter = palette.spriteFilter` y `ctx.shadowColor = palette.glowColor` / `ctx.shadowBlur = palette.glowBlur`; después restaura `ctx.filter = "none"` y `ctx.shadowBlur = 0`. Con `clasico` (`spriteFilter: "none"`, `glowBlur: 0`) el resultado es idéntico al look actual.

---

## Implementation plan

1. **Módulo de paletas** `app/lib/games/bloque-buster/skins.ts`: definir `BloqueBusterPalette`, el mapa `SKINS` con las tres claves y `getBloqueBusterSkin(skin = "clasico")`. Dejar `bg`/`spriteFilter`/`glowColor`/`glowBlur` como marcadores a afinar en el paso 4.
2. **Refactor del motor** `app/lib/games/bloque-buster/engine.ts`: aceptar el tercer parámetro `skin`, resolver la paleta al inicio del closure. En `draw()`: (a) sustituir `ctx.fillStyle = "#000"` por `palette.bg`; (b) antes de dibujar bloques, explosiones, paleta y pelota, fijar `ctx.filter = palette.spriteFilter`, `ctx.shadowColor = palette.glowColor`, `ctx.shadowBlur = palette.glowBlur`; (c) tras pintarlos, restaurar `ctx.filter = "none"` y `ctx.shadowBlur = 0`. No tocar `update`, constantes, `LEVELS`, colisiones, audio ni geometría.
3. **Registrar el juego** en `app/lib/games/skins.ts`: añadir la entrada `"bloque-buster": ["clasico", "neon", "retro"]` a `SKINNED_GAMES`. Con esto el selector genérico de `GamePlayer.tsx` se muestra automáticamente y el default (`clasico`, primer elemento) se aplica solo.
4. **Afinado de paletas con `/frontend-design`** (paso explícito delegado): diseñar los valores de `bg`, la cadena `spriteFilter` (filtros CSS para recolorear el spritesheet por skin), y `glowColor`/`glowBlur` de los 3 skins respetando las reglas de contraste de la sección siguiente. `/frontend-design` fija los valores exactos; esta spec solo fija los arquetipos y las reglas.
5. **Verificación visual** de `bloque-buster` en los 3 skins sobre el tema oscuro: bloques, paleta, pelota y explosiones legibles; `clasico` idéntico al look actual (sin filtro, sin glow, fondo negro); `neon` con glow que realza sin quemar la pelota (sprite pequeño); `retro` monocromo ámbar/verde con sprites aún distinguibles del fondo; el selector de tema aparece en `/jugar/bloque-buster` y `clasico` es el default.

### Arquetipos de skin + reglas de contraste (para `/frontend-design`)

Regla dura común: el sitio es **íntegramente oscuro** (canvas sobre fondo CRT). Cada skin aporta **su propio fondo oscuro** y todos los sprites recoloreados deben mantener contraste y legibilidad sobre ese fondo. Prohibido el blanco/brillo quemado por bloom y los sprites que se pierden contra el fondo. Ojo especial a la **pelota**, que es el sprite más pequeño: no debe desaparecer ni ser engullida por el glow.

- **`clasico` (default)** — fiel al Arkanoid arcade y al look actual del motor: ladrillos de colores, paleta y pelota **tal cual el spritesheet** (`spriteFilter: "none"`), **sin glow** (`glowBlur: 0`), fondo negro profundo (`bg` ≈ `#000`). Es el estado de partida; nada debe cambiar respecto a hoy. Contraste: los sprites multicolor ya contrastan con el negro.
- **`neon` — look CRT vibrante de la plataforma**: realza el multicolor de ladrillos (identidad de `.cover-bricks`: magenta `#ff006e`, cian `#00f5ff`, ámbar `#ffae00`, verde `#00ff88`) con un `spriteFilter` de mayor saturación/brillo y **glow activo** (`glowBlur > 0`, color anclado en el magenta/cian del cover) sobre un fondo muy oscuro ligeramente azulado para que el neón resalte. Contraste: el glow debe realzar sin producir halo que borre la silueta de los sprites —especialmente la pelota—; el fondo se mantiene muy oscuro.
- **`retro` — vintage apagado**: convierte el multicolor en **fósforo monocromo** ámbar o verde desgastado mediante un `spriteFilter` tipo `sepia()`/`hue-rotate()`/`saturate()`, glow tenue o nulo, sobre un fondo oscuro cálido (CRT gastado). Se pierde la variedad de color de los ladrillos a propósito (es el carácter vintage; la mecánica no depende del color). Contraste: aun apagado y monocromo, ladrillos, paleta y pelota deben leerse claramente sobre su fondo; evitar que ámbar sobre marrón oscuro baje de contraste suficiente.

En los tres: el fondo es oscuro propio del skin, los sprites recoloreados contrastan con él, y el glow (si lo hay) realza sin quemar ni tragarse la pelota.

---

## Acceptance criteria

- [ ] `bloque-buster` expone exactamente los 3 skins `clasico`, `neon` y `retro` vía `getBloqueBusterSkin`, y figura en `SKINNED_GAMES` de `app/lib/games/skins.ts`.
- [ ] El skin por defecto es `clasico`: al no pasar skin a la fábrica, el motor pinta con `clasico` (fondo negro, `spriteFilter: "none"`, sin glow) y el resultado es idéntico al look actual.
- [ ] El motor de `bloque-buster` deja de fijar el fondo con un `"#000"` literal: lo toma de `palette.bg`; el recoloreado de sprites se hace con `ctx.filter = palette.spriteFilter` y el glow con `ctx.shadowColor/shadowBlur`, restaurando filtro y sombra tras pintar.
- [ ] El selector de tema aparece en `/jugar/bloque-buster` (genérico de SPEC 10) con las opciones Clásico / Neón / Retro.
- [ ] Cada skin es legible sobre el fondo oscuro CRT: bloques, paleta, pelota y explosiones distinguibles; sin brillos quemados; la pelota no desaparece ni queda engullida por el glow.
- [ ] `neon` aplica glow (`glowBlur > 0`); `clasico` mantiene el look plano (`glowBlur: 0`, `spriteFilter: "none"`).
- [ ] Ninguna mecánica, constante, nivel (`LEVELS`), colisión, audio ni _feel_ del motor cambia respecto a SPEC 08.

---

## Decisions

- **Sí:** El módulo de paletas vive junto al motor (`app/lib/games/bloque-buster/skins.ts`), coherente con SPEC 10 y con "cada juego en su carpeta".
- **Sí:** La forma de la paleta de `bloque-buster` es **distinta** de `AsteroidsPalette` (fondo + `spriteFilter` + glow, no colores por rol), porque sus elementos se pintan desde un spritesheet con los colores horneados, no con `fillStyle`/`strokeStyle`. Es la consecuencia natural del contrato transversal, que fija `GameSkin` pero deja la forma de la paleta a cada juego.
- **Sí:** El recoloreado se hace con `ctx.filter` sobre el único spritesheet existente, no creando PNGs alternativos por skin. (Supuesto: evita arte nuevo y mantiene un solo asset; `/frontend-design` ajusta las cadenas de filtro.)
- **Sí:** `clasico` es el default y reproduce exactamente el look actual (ladrillos multicolor sobre negro, sin filtro ni glow), porque ese multicolor es la identidad de catálogo (`.cover-bricks`) y es fiel al Arkanoid arcade.
- **Sí:** `neon` se ancla en los colores de `.cover-bricks` (magenta/cian) para el glow y la saturación; `retro` colapsa el multicolor en fósforo monocromo ámbar/verde a propósito.
- **No:** No se redefine el sistema transversal (tipo, `GameFactory`, `CanvasGame`, selector, estilos): se reusan tal cual de SPEC 10.
- **No:** No se fijan los valores exactos (fondo, cadenas de filtro, glow) aquí; los diseña `/frontend-design` en `/spec-impl` respetando las reglas de contraste.
- **No:** No se persiste la preferencia de skin todavía.

---

## Risks

| Riesgo                                                                                     | Mitigación                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor de dibujo altera accidentalmente mecánicas, niveles o _feel_                   | Tocar solo `draw()` (fondo, `ctx.filter`, `ctx.shadow*`); no modificar `update`, `LEVELS`, colisiones, audio ni geometría; verificar partida tras el cambio.     |
| Contraste insuficiente de `retro` (sprites ámbar monocromos sobre marrón oscuro)           | Reglas de contraste duras en la spec; `/frontend-design` valida legibilidad de bloques/paleta/pelota sobre el `bg` del skin antes de cerrar la cadena de filtro. |
| Glow de `neon` que quema o se traga la pelota (sprite pequeño) por bloom excesivo          | `glowBlur` moderado y verificación visual específica de la pelota en el paso 5; resetear `shadowBlur` tras pintar.                                               |
| No restaurar `ctx.filter`/`ctx.shadowBlur` tras pintar deja estado residual en el contexto | Restaurar siempre `ctx.filter = "none"` y `ctx.shadowBlur = 0` al final de `draw()`; cubierto por acceptance criteria.                                           |
| Coste de rendimiento de `ctx.filter` por frame                                             | Filtro constante por partida (no cambia entre frames); si se midiera impacto, cachear a una capa offscreen es ampliación futura, fuera de esta spec.             |
| Regresión visual respecto al look actual de `bloque-buster`                                | `clasico` usa `spriteFilter: "none"`, `glowBlur: 0` y fondo negro: el default reproduce exactamente el look de partida.                                          |

---

## Qué no está en esta spec

- Skins de `caida` y `serpentina` (una spec por juego).
- Modificaciones del sistema transversal, del selector o de los estilos de tema (ya resueltos en SPEC 10).
- Variantes del spritesheet PNG por skin ni cualquier arte nuevo.
- Persistencia de la preferencia de skin.
- Valores exactos de fondo, cadenas de `ctx.filter` y glow (los diseña `/frontend-design` en `/spec-impl`).
- Cualquier cambio en Supabase.
