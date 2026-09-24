# SPEC 02 — Landing page (Inicio) de Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-24
> **Objective:** Portar la landing `references/templates/home-about/home.jsx` a una ruta real `/` del App Router, moviendo la Biblioteca actual a `/games`.

---

## Por qué existe esta spec

La SPEC 01 dejó `/` como la Biblioteca porque el prototipo no tenía landing separada. La plantilla `references/templates/home-about/` sí introduce una pantalla "Inicio" distinta de "Biblioteca" (el nav del prototipo lista ambas por separado). Esta spec incorpora esa landing como la home real `/` y reubica la Biblioteca en `/games`, ajustando los enlaces internos que la SPEC 01 apuntaba a `/`. Sigue siendo una réplica visual: sin lógica de juego ni datos reales.

---

## Scope

**In:**

- Nueva ruta `/` → Landing (Inicio), portando `references/templates/home-about/home.jsx` con todas sus secciones:
  - Hero con siluetas pixel flotantes (`FloatingSilhouettes`), eyebrow "INSERTA UNA MONEDA", título en tres líneas, subtítulo y dos CTAs (EXPLORAR JUEGOS → `/games`, CREAR CUENTA → `/auth`).
  - Sección "¿POR QUÉ ARCADE VAULT?" con grilla de 4 `feature-card` e iconos pixel SVG (`FeatureIcon`).
  - Sección "JUEGOS DISPONIBLES AHORA" con `mini-rail` de `MiniCard` usando `GAMES.slice(0, 6)`; cada tarjeta navega a `/juego/[id]`; botón "VER TODOS LOS JUEGOS →" → `/games`.
  - Bloque de stats (`home-stats`).
  - Sección "ACTIVIDAD EN VIVO": ticker de últimas puntuaciones y lista de top jugadores (botón "VER SALÓN →" → `/salon`).
  - Sección "PRECIOS" (`price-card` + `pricing-faq`), CTA "EMPEZAR GRATIS →" → `/auth`.
  - Sección final "¿LISTO PARA JUGAR?" con CTA "INSERTAR MONEDA →" → `/games`.
- Animación reveal on-scroll (`.reveal` → `.in`) vía `IntersectionObserver`, portada como hook `useReveal()`.
- Mover la Biblioteca actual de `app/page.tsx` a `app/games/page.tsx` sin cambios funcionales.
- Actualizar `Nav` para añadir el enlace "Inicio" (`/`) y reapuntar "Biblioteca" a `/games`.
- Reapuntar a `/games` los enlaces/redirects que la SPEC 01 dirigía a `/` (detalle "VOLVER AL VAULT", reproductor "VOLVER AL VAULT", salón "VOLVER A LA BIBLIOTECA", auth tras iniciar sesión / entrar como invitado).
- Portar a `app/globals.css` las clases de la landing desde `references/templates/home-about/styles.css` (`home-*`, `feature-*`, `mini-*`, `activity-*`, `pricing-*`, `price-*`, `faq-*`, `stat-*`, `.reveal`, `.silo`, etc.).

**Out of scope (para futuras specs):**

- La pantalla "Acerca de" y el formulario de Contacto (`about.jsx`): van en su propia spec. Por eso el enlace "Acerca de" **no** se añade al `Nav` todavía.
- Cualquier lógica de juego real.
- Datos reales o dinámicos en el ticker/top de "ACTIVIDAD EN VIVO": se copian tal cual del prototipo como mock estático.
- Persistencia, autenticación real y leaderboards reales (siguen fuera, como en SPEC 01).
- Tests automatizados (no hay runner configurado).

---

## Data model

Esta feature no introduce estructuras de datos nuevas persistentes. Reutiliza `GAMES` de `app/lib/data.ts` (SPEC 01) para el `mini-rail`.

Los datos de la sección "ACTIVIDAD EN VIVO" se copian tal cual del prototipo como constantes locales de la página, sin tipos exportados ni cálculo:

```ts
// dentro de app/page.tsx — mock estático, copiado de home.jsx
const LATEST_SCORES = [
  { p: "NEONFOX", g: "Caída", s: 184220, t: "hace 2 min", c: "magenta" },
  // …7 filas
];
const TOP_TODAY = [
  { r: 1, p: "NEONFOX", s: 312840 },
  // …5 filas
];
```

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. Portar a `app/globals.css` las clases de la landing desde `references/templates/home-about/styles.css` (secciones `home-*`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `pricing-*`/`price-*`/`faq-*`, `home-final`, `.reveal`, `.silo`/`home-silos`). No tocar clases ya existentes.
2. Mover la Biblioteca: crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` sin cambios. Verificar que `/games` renderiza la biblioteca completa.
3. Crear el hook `useReveal()` (en `app/components/useReveal.ts`, `"use client"`) que registra el `IntersectionObserver` sobre `.reveal` y añade `.in`; limpia con `disconnect()` al desmontar.
4. Reemplazar `app/page.tsx` por la landing (`"use client"`): estructura del hero + `FloatingSilhouettes`, con las CTAs usando `next/link` (o `useRouter`) hacia `/games` y `/auth`. Compila y muestra el hero.
5. Añadir en `app/page.tsx` los subcomponentes/secciones: `FeatureIcon` + grilla de features, `MiniCard` + `mini-rail` con `GAMES.slice(0, 6)` (navegación a `/juego/[id]`), y el bloque `home-stats`.
6. Añadir en `app/page.tsx` la sección "ACTIVIDAD EN VIVO" con las constantes `LATEST_SCORES` y `TOP_TODAY` (mock estático) y el enlace "VER SALÓN →" a `/salon`.
7. Añadir en `app/page.tsx` las secciones "PRECIOS" y "¿LISTO PARA JUGAR?" con sus CTAs (`/auth` y `/games`). Invocar `useReveal()` en el componente para activar las animaciones.
8. Actualizar `app/components/Nav.tsx`: añadir el enlace "Inicio" (`/`), reapuntar "Biblioteca" a `/games` (ajustar su `match` a `p === "/games" || p.startsWith("/juego")`) y dejar "Inicio" como activo solo en `/`. El logo sigue enlazando a `/`.
9. Reapuntar los enlaces a Biblioteca: `app/juego/[id]/page.tsx` ("VOLVER AL VAULT"), `app/jugar/[id]/page.tsx` ("VOLVER AL VAULT"), `app/salon/page.tsx` ("VOLVER A LA BIBLIOTECA") y `app/auth/page.tsx` (los dos `router.push`) → `/games`.
10. Repaso de fidelidad: abrir `/` y comparar sección a sección con el prototipo (`arcade-vault-standalone.html`); recorrer todas las rutas comprobando que la navegación no quedó rota tras el cambio `/` → `/games`.

---

## Acceptance criteria

- [ ] `npm run build` (o `next build`) compila sin errores de TypeScript ni de tipos de ruta.
- [ ] `/` carga la landing (hero + features + juegos + stats + actividad + precios + CTA final) sin errores en consola.
- [ ] `/games` carga la Biblioteca completa (hero, buscador, chips, grilla) idéntica a la que antes vivía en `/`.
- [ ] En el hero, "EXPLORAR JUEGOS" navega a `/games` y "CREAR CUENTA" navega a `/auth`.
- [ ] En "JUEGOS DISPONIBLES AHORA" se muestran 6 `MiniCard`; hacer click en una navega a `/juego/[id]` del juego correcto.
- [ ] "VER TODOS LOS JUEGOS →" y "INSERTAR MONEDA →" navegan a `/games`.
- [ ] "VER SALÓN →" navega a `/salon`; "EMPEZAR GRATIS →" navega a `/auth`.
- [ ] Al hacer scroll, las secciones con `.reveal` se animan (reciben la clase `.in`) una sola vez.
- [ ] El `Nav` muestra "Inicio" y "Biblioteca" como enlaces separados; "Inicio" queda activo en `/` y "Biblioteca" en `/games` y `/juego/[id]`.
- [ ] Desde `/juego/[id]` y `/jugar/[id]`, "VOLVER AL VAULT" navega a `/games` (no a la landing).
- [ ] Desde `/salon`, "VOLVER A LA BIBLIOTECA" navega a `/games`.
- [ ] En `/auth`, iniciar sesión o "JUGAR COMO INVITADO" redirige a `/games`.
- [ ] El menú hamburguesa sigue abriendo/cerrando el panel lateral en viewport ≤ 840px, ahora con "Inicio" incluido.

---

## Decisions

- **Sí:** `/` pasa a ser la landing (Inicio) y la Biblioteca se mueve a `/games`. Coincide con el nav del prototipo, que separa "Inicio" de "Biblioteca". Se descarta dejar Home en `/inicio`, porque una landing que no es la raíz es poco idiomática y confunde el enlace "Inicio".
- **Sí:** tras iniciar sesión o entrar como invitado, `/auth` redirige a `/games` (no a `/`). Preserva la intención original de la SPEC 01 ("entras y vas a jugar"). Se descarta redirigir a la landing.
- **Sí:** el logo del `Nav` enlaza a `/` (la landing). Coherente con el prototipo (`navigate({ name: "home" })`).
- **Sí:** ticker "ACTIVIDAD EN VIVO" y "TOP JUGADORES · HOY" como mock estático copiado del prototipo. Coherente con la réplica visual de la SPEC 01. Se descarta derivarlos de `data.ts` por añadir lógica sin valor para un MVP visual.
- **Sí:** `useReveal()` como hook cliente con `IntersectionObserver`, portando el comportamiento del prototipo. Se descarta animación pura CSS porque el prototipo dispara la clase al entrar en viewport.
- **No:** la pantalla "Acerca de" / Contacto y su enlace en el `Nav` no entran en esta spec; van en la suya. Evita dejar un enlace "Acerca de" apuntando a una ruta inexistente.
- **Sí:** portar el CSS de la landing a `app/globals.css` (mismo criterio que SPEC 01). Se descarta reescribir con utilidades Tailwind por coste y riesgo de perder efectos neón/pixel.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Mover `/` a `/games` deja enlaces internos rotos (detalle, reproductor, salón, auth). | Pasos 8-9 enumeran cada archivo a reapuntar; el paso 10 recorre todas las rutas. |
| `IntersectionObserver` en SSR: acceder a `document` en server rompe el render. | `useReveal()` es `"use client"` y solo corre en `useEffect`. |
| Colisión de nombres de clase al portar CSS (p. ej. `section-head`, `kicker` ya usados en otras pantallas). | Paso 1 revisa clases existentes antes de añadir; el paso 10 comprueba que no se degradan otras rutas. |

---

## What is **not** in this spec

- La pantalla "Acerca de" y el formulario de Contacto (`about.jsx`).
- El enlace "Acerca de" en el `Nav`.
- Datos dinámicos o reales en "ACTIVIDAD EN VIVO".
- Lógica de juego real, persistencia, autenticación real o leaderboards reales.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
