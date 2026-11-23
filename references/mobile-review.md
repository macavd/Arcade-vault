# Registro de revisión móvil — Arcade Vault

Qué superficies del sitio se han auditado para móvil y su estado.
`✅` = sin problemas de móvil (o ya corregido en código) · `⬜` = pendiente de arreglo.

| Superficie                             | Ficheros clave                                          | Estado | Notas                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Viewport / meta                        | app/layout.tsx                                          | ⬜     | No existe `export const viewport`; falta `width=device-width` + `viewportFit` para el área de juego. Lo cubre SPEC 15.             |
| Reproductor (.crt / .crt-screen)       | app/globals.css, app/components/GamePlayer.tsx          | ⬜     | `.crt` con `padding:24px`, `border-radius:28px` y anillos `box-shadow` fijos; `.crt-screen` 4/3 sin override en portrait. SPEC 15. |
| Overlay táctil (.touch-controls)       | app/globals.css, app/components/games/TouchControls.tsx | ⬜     | `--tc-size:58px` e `inset:24px` atados al padding de `.crt`; en pantallas chicas los botones tapan el juego. SPEC 15.              |
| Esquema táctil de ranaria              | app/lib/games/touch-map.ts                              | ⬜     | `ranaria` NO está en `TOUCH_MAP`: hoy sin botones en móvil. Falta d-pad de 4 direcciones en `tap` (como serpentina). SPEC 15.     |
| Orientación (aviso girar a horizontal) | app/components/GamePlayer.tsx                           | ⬜     | No existe aviso portrait→landscape; SPEC 13 lo difirió explícitamente. SPEC 15.                                                   |
| Leaderboard detalle (.lb-row)          | app/globals.css                                         | ⬜     | `grid-template-columns:36px 1fr 110px` sin override pequeño; apretado en portrait. SPEC 15.                                       |
| Footer                                 | app/layout.tsx                                          | ⬜     | `padding:20px 32px` inline sin reducción en móvil. Retoque menor en SPEC 15.                                                      |
| Nav                                    | app/components/Nav.tsx, app/globals.css                 | ✅     | Hamburguesa `≤840px` con panel + backdrop (SPEC 01/02). Funciona.                                                                 |
| Home                                   | app/components/HomeContent.tsx, app/globals.css         | ✅     | Títulos con `clamp()`; breakpoints 600/720/980/1100px. Sin desbordes detectados.                                                  |
| Biblioteca (/games)                    | app/components/GamesBrowser.tsx, app/globals.css        | ✅     | `.av-grid` auto-fill `minmax(280px,1fr)` + `padding` reducido a `≤720px`. OK (revisar min-col en pantallas <300px).               |
| Salón de la fama                       | app/components/HallOfFame.tsx, app/globals.css          | ✅     | `.hall-table` con override a `≤720px` (columnas y fuente reducidas). OK.                                                          |
| About / contacto                       | app/about, app/globals.css                              | ✅     | Breakpoints 820/900px cubren el formulario y las columnas. Sin desbordes detectados.                                              |

## Historial

- 2026-11-04 · spec specs/15-responsive-movil.md creada (Draft) · viewport, rescalado del reproductor (.crt/.crt-screen) coordinado con overlay táctil, aviso de orientación, esquema táctil de ranaria, retoques menores (.lb-row, footer). Nav/home/games/salón/about auditados ✅.
</content>
