# SPEC 02 (game-jam/ranaria) — Rediseño de la portada `.cover-rana` de RANARIA

> **Status:** Draft
> **Depends on:** SPEC 06, 01-motor-ranaria
> **Date:** 2026-10-23
> **Objective:** Rediseñar la portada CSS `.cover-rana` de RANARIA con `/frontend-design` para que comunique el pitch "cruzar carretera y río" ahora que el juego pasa a ser jugable, sin tocar el catálogo ni el leaderboard.

---

## Por qué existe esta spec

La portada actual `.cover-rana` (en `app/globals.css`) es un marcador de posición mínimo: un degradado azulado con bandas horizontales y un círculo verde central (la rana). Fue suficiente mientras RANARIA era maqueta, pero con el motor jugable que entrega `01-motor-ranaria` conviene que la carta del catálogo **lea el concepto de un vistazo**: carriles de carretera y agua que la rana debe cruzar. Esta spec es puro acabado visual: una portada CSS más expresiva, siguiendo la regla de CLAUDE.md de usar siempre `/frontend-design` para la UI y las portadas `.cover-*`. No toca datos ni motor.

---

## Scope

**In:**

- Rediseñar la clase `.cover-rana` (y sus pseudo-elementos `::before`/`::after`) en `app/globals.css`, diseñada con `/frontend-design`, respetando la estética neón/CRT y el color base verde (`var(--green)`) del juego.

**Out of scope (para futuras specs):**

- Cambiar la fila `games` de `ranaria` (título, textos, `cat`, `color`, `cover`, `best`, `plays`, `position`): el valor `cover = 'cover-rana'` no cambia, solo su definición CSS.
- Tocar el motor (`01-motor-ranaria`) ni cualquier otra portada `.cover-*`.
- Imágenes/sprites externos para la portada: se mantiene CSS puro, como el resto de portadas.

---

## Data model

Esta spec **no toca Supabase**. No hay inserts ni migraciones: la fila `games` de `ranaria` ya apunta a `cover = 'cover-rana'` (SPEC 06) y ese valor no cambia; solo se reescribe la **definición CSS** de esa clase.

**Portada** `.cover-rana` en `app/globals.css` (base `.cover-bg` + pseudo-elementos, color neón `var(--green)`). Diseño propuesto: un escenario de arriba-abajo con una **franja de agua** (bandas cian con troncos horizontales), una **franja de carretera** (bandas oscuras con coches/trazos de neón en movimiento sugerido) y una **rana verde** brillante a medio cruce, con nenúfares arriba. _El diseño real y el ajuste fino se hacen con `/frontend-design`._

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. Rediseñar `.cover-rana` y sus pseudo-elementos en `app/globals.css` con `/frontend-design`: componer (vía gradients/`background` en capas) la franja de carretera, la franja de río con troncos y la rana neón verde, manteniendo `filter: drop-shadow` para el glow y coherencia con las demás portadas. El `cover` de la fila `games` sigue siendo `cover-rana` (no se toca la BD).
2. Verificar visualmente en `/games` (tarjeta), `/` (home, si aparece en el rail) y `/juego/ranaria` (detalle) que la portada se ve correcta en los tamaños usados y no rompe el layout de la tarjeta.

> No se regenera `database.types.ts` (no cambia el esquema) ni se corre `get_advisors` (no se toca Supabase).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores y la app arranca en `npm run dev`.
- [ ] `.cover-rana` en `app/globals.css` muestra una portada neón/CRT que comunica "cruzar carretera y río" (carretera + agua con troncos + rana verde), no el marcador mínimo anterior.
- [ ] La portada se ve correcta sin desbordes ni artefactos en la tarjeta de `/games`, en el rail de `/` y en el detalle `/juego/ranaria`.
- [ ] Ninguna otra portada `.cover-*` cambia; la fila `games` de `ranaria` sigue con `cover = 'cover-rana'` (no se toca la BD).
- [ ] No se toca el motor de `ranaria` ni ningún otro juego.

---

## Decisions

- **Sí:** diseñar la portada con `/frontend-design` (regla de CLAUDE.md) y en CSS puro, como todas las portadas `.cover-*`.
- **Sí:** mantener el nombre de clase `cover-rana` y el valor `cover` en la BD; solo cambia su definición CSS, evitando cualquier migración.
- **Sí (supuesto documentado):** color base verde (`var(--green)`) para la rana, coherente con el `color` del juego en el catálogo.
- **No:** imágenes/sprites externos, cambios de datos o de otras portadas.

---

## Risks

| Riesgo                                                                         | Mitigación                                                                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Una portada CSS muy recargada se ve mal en el tamaño reducido de la tarjeta.   | Diseñar con `/frontend-design` probando en los tamaños reales de `/games`, `/` y el detalle; mantener formas simples de alto contraste. |
| Tocar `globals.css` rompe por accidente otra portada o un selector compartido. | Editar solo el bloque `.cover-rana` y sus pseudo-elementos; verificar visualmente el resto de tarjetas.                                 |

---

## Qué **no** está en esta spec

- El motor jugable de `ranaria` (va en `01-motor-ranaria`).
- Cambios a la fila `games` o a `scores` de `ranaria`.
- Rediseño de otras portadas `.cover-*`.
- Sonido, controles táctiles, anti-cheat, auth real.

Cada uno de esos, si llega, va en su propia spec.
