# Juegos con skins (skin-designer)

> Registro de qué juegos del catálogo ya tienen aplicado el sistema de 3 skins
> (`clasico` = default, `neon`, `retro`), todos legibles sobre el tema oscuro CRT.
> Lo mantiene el subagente `@skin-designer`, que trabaja **un juego a la vez** y
> **solo sobre el juego que la usuaria le indique** — nunca sobre todo el catálogo.
>
> Estado por skin: `✅` aplicado · `⬜` pendiente · `—` no aplica (juego sin motor).
> Un juego cuenta como **completo** cuando tiene los 3 skins en `✅`.
> `✅` refleja skins **aplicados en el motor**, no solo especificados: una spec en
> `Draft` deja el estado en `⬜` hasta que `/spec-impl` la implemente.

## Juegos con motor (en alcance)

| Juego (slug)     | Título        | `clasico` | `neon` | `retro` | Completo | Última fecha |
| ---------------- | ------------- | --------- | ------ | ------- | -------- | ------------ |
| `rocas`          | ROCAS         | ✅        | ✅     | ✅      | Sí       | 2026-10-26   |
| `caida`          | CAÍDA         | ⬜        | ⬜     | ⬜      | No       | —            |
| `bloque-buster`  | BLOQUE BUSTER | ✅        | ✅     | ✅      | Sí       | 2026-10-27   |
| `serpentina`     | SERPENTINA    | ✅        | ✅     | ✅      | Sí       | 2026-10-27   |

## Juegos sin motor (fuera de alcance hasta que tengan motor)

Maquetas sin canvas que pintar; recibirán skins cuando aterrice su motor.

| Juego (slug)   | Título      | Nota            |
| -------------- | ----------- | --------------- |
| `gloton`       | GLOTÓN      | Maqueta, sin motor |
| `invasores`    | INVASORES   | Maqueta, sin motor |
| `ranaria`      | RANARIA     | Maqueta, sin motor |
| `duelo-pixel`  | DUELO PÍXEL | Maqueta, sin motor |

## Historial

Append-only: una línea por cada vez que se aplica un skin a un juego.

<!-- - YYYY-MM-DD · <slug> · <skin aplicado> · <nota> -->

- 2026-10-26 · rocas · spec specs/10-skins-rocas.md creada (Draft) · clasico (default), neon, retro + sistema transversal de skins (GameSkin en GameFactory, módulo skins.ts por juego). Skins aún ⬜: se marcarán ✅ al implementar con /spec-impl.
- 2026-10-26 · rocas · spec specs/10-skins-rocas.md implementada (/spec-impl) · 3 skins aplicados en el motor (skins.ts + refactor de engine.ts, hilo skin en CanvasGame.tsx). Valores afinados con /frontend-design (neon amarillo+glow anclado en .cover-rocas, retro ámbar/verde). Verificado visualmente en los 3 skins. clasico/neon/retro → ✅.
- 2026-10-27 · bloque-buster · spec specs/12-skins-bloque-buster.md creada (Draft) · clasico (default), neon, retro reusando el sistema transversal de SPEC 10. Hallazgo: el motor pinta desde un spritesheet PNG (colores horneados), así que la paleta recolorea con ctx.filter + shadow* y fija el fondo (forma distinta de AsteroidsPalette). Skins aún ⬜: se marcarán ✅ al implementar con /spec-impl.
- 2026-10-27 · serpentina · spec specs/11-skins-serpentina.md creada (Draft) · clasico (default, verde sobrio sin glow), neon (verde fosforescente con glow, el look actual del motor), retro (fósforo ámbar/verde) reusando el sistema transversal de SPEC 10. El motor hoy ya pinta el look neon; el clasico se diseña nuevo. El sprite de la fruta no se retiñe. Skins aún ⬜: se marcarán ✅ al implementar con /spec-impl.
- 2026-10-27 · serpentina · 3 skins aplicados en el motor · app/lib/games/serpentina/skins.ts (SerpentinaPalette: bg, grid, head, body, eye, foodFallback, glow head/body) + refactor de engine.ts para leer la paleta + alta en SKINNED_GAMES. El selector genérico de GamePlayer.tsx ya aparece. clasico/neon/retro → ✅.
- 2026-10-27 · bloque-buster · 3 skins aplicados en el motor · app/lib/games/bloque-buster/skins.ts (BloqueBusterPalette: bg + spriteFilter con ctx.filter + glow shadow*, porque el atlas PNG trae los colores horneados) + refactor de engine.ts (filter/glow envuelven el dibujo del atlas, reset al final del frame) + alta en SKINNED_GAMES. clasico/neon/retro → ✅.
