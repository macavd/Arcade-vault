# SPEC 01 — MVP visual de las pantallas de Arcade Vault

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-08-24
> **Objective:** Portar el prototipo estático de `references/templates/` a Next.js 16 App Router como cinco pantallas navegables y visualmente fieles, sin implementar ningún juego real.

---

## Por qué existe esta spec

El prototipo de `references/templates/` es un SPA de React vía CDN + Babel con enrutado por hash y un único componente `App`. Ese formato no es desplegable ni idiomático en el stack del proyecto (Next.js 16, React 19, TS estricto, Tailwind v4). Esta spec traslada las pantallas al App Router con rutas reales y componentes tipados, reutilizando el trabajo de scaffolding ya presente (`app/layout.tsx`, tema en `app/globals.css`, `Nav`, `ArcadeBackground`). No hay lógica de juego: el reproductor es una réplica visual.

---

## Scope

**In:**

- Las cinco pantallas del prototipo como rutas reales del App Router:
  - `/` → Biblioteca (hero + buscador + chips de categoría + grilla de tarjetas).
  - `/juego/[id]` → Detalle del juego (portada, descripción, stats, leaderboard).
  - `/jugar/[id]` → Reproductor (HUD, marco CRT con animación, pausa, modal FIN).
  - `/auth` → Acceso (pestañas iniciar sesión / crear cuenta, invitado, social).
  - `/salon` → Salón de la Fama (pestañas por juego, podio, tabla, fila "tú").
- Módulo de datos mock `app/lib/data.ts` con `GAMES`, `CATS`, `seededScores` y tipos TypeScript.
- Estado de sesión **solo en memoria** vía React Context (`SessionProvider`): usuario actual compartido entre rutas, se pierde al recargar.
- Buscador y filtro por categoría funcionales en la Biblioteca (filtrado en cliente).
- Réplica visual del reproductor: puntuación que sube por un timer, vidas/nivel, botones PAUSA/FIN/SALIR y modal "FIN DEL JUEGO" con campo de iniciales y toast de guardado (sin persistir).
- Fidelidad visual con el prototipo reutilizando las clases ya portadas a `app/globals.css` (tema, efectos neón/CRT, portadas CSS, animaciones).
- Responsividad equivalente a la del prototipo (breakpoints ya presentes en `globals.css`).

**Out of scope (para futuras specs):**

- Cualquier lógica de juego real (motores, física, colisiones, controles).
- Persistencia real (localStorage, IndexedDB, backend) de usuario o puntuaciones.
- Autenticación real (OAuth Google/GitHub; los botones son decorativos).
- Leaderboards reales o cálculo de rankings a partir de partidas reales.
- Contador de créditos funcional (es un adorno fijo "CRÉDITOS · 03").
- Tests automatizados (no hay runner configurado).
- i18n / cambio de idioma (la UI queda en español, como el prototipo).

---

## Data model

Todo el modelo es mock y vive en `app/lib/data.ts`. No hay base de datos ni persistencia.

```ts
// app/lib/data.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;        // slug estable, ej. "bloque-buster"
  title: string;
  short: string;     // descripción de tarjeta
  long: string;      // descripción de detalle
  cat: GameCategory;
  cover: string;     // clase CSS de portada, ej. "cover-bricks"
  color: NeonColor;  // color del botón JUGAR
  best: number;      // mejor puntuación global
  plays: string;     // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;      // "DD/MM/2026"
}

export const GAMES: Game[];              // los 8 juegos del prototipo
export const CATS: readonly string[];    // ["TODOS","ARCADE","PUZZLE","SHOOTER","VERSUS"]
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de sesión en memoria (`app/components/SessionProvider.tsx`):

```ts
interface SessionUser { name: string }   // nombre en mayúsculas, máx 10 chars
interface SessionValue {
  user: SessionUser | null;
  signIn: (name: string) => void;        // guarda { name } en memoria
  signOut: () => void;
}
```

Convenciones: los datos de `GAMES`, los nombres de `PLAYERS` y el generador `seededScores` se copian tal cual del prototipo (`references/templates/data.jsx`), preservando semillas para que los rankings salgan idénticos.

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. Crear `app/lib/data.ts` portando `GAMES`, `CATS`, `PLAYERS` y `seededScores` desde `references/templates/data.jsx`, con los tipos de arriba. Sin `window.*`; usar `export`.
2. Crear `app/components/SessionProvider.tsx` (`"use client"`) con el Context y el hook `useSession()`; envolver `{children}` con el provider en `app/layout.tsx`.
3. Conectar `Nav` a la sesión: mostrar `user.name ▾` con `signOut` cuando hay usuario, o el enlace "Iniciar Sesión" a `/auth` cuando no. (Ajustar el `Nav` existente, que hoy siempre enlaza a `/auth`.)
4. Crear `app/components/GameCard.tsx` (`"use client"`) con la tarjeta y el efecto tilt del ratón; el click navega a `/juego/[id]`.
5. Reemplazar el placeholder de `app/page.tsx` por la Biblioteca completa (`"use client"`): hero, buscador, chips de `CATS`, grilla filtrada con `GameCard` y estado vacío "NO HAY RESULTADOS".
6. Crear `app/juego/[id]/page.tsx` (server component con `params` asíncrono, tipado `PageProps<"/juego/[id]">`): portada, tags, descripción, `stat-strip`, `leaderboard` con `seededScores`, y botones "JUGAR AHORA" (→ `/jugar/[id]`) y "VOLVER AL VAULT" (→ `/`). Usar `notFound()` si el `id` no existe.
7. Crear `app/jugar/[id]/page.tsx` (`"use client"`): HUD (jugador desde `useSession`, puntuación, vidas, nivel), marco CRT con arena animada, botones PAUSA/FIN/SALIR, timer que incrementa el score, subida de nivel, y modal "FIN DEL JUEGO" con input de iniciales + toast de guardado (sin persistir).
8. Crear `app/auth/page.tsx` (`"use client"`): tarjeta con pestañas iniciar/crear, campos, botón que llama `signIn` y navega a `/`, botón "JUGAR COMO INVITADO", divisor y botones sociales decorativos.
9. Crear `app/salon/page.tsx` (`"use client"`): cabecera, pestañas por juego (`GAMES`), podio (top 3), tabla con `seededScores`, y fila "tú" cuando hay usuario en sesión; botón "VOLVER A LA BIBLIOTECA".
10. Repaso de fidelidad: recorrer las cinco rutas y comparar con el prototipo abierto en el navegador; ajustar clases donde difiera.

---

## Acceptance criteria

- [ ] `npm run build` (o `next build`) compila sin errores de TypeScript ni de tipos de ruta.
- [ ] Las rutas `/`, `/juego/bloque-buster`, `/jugar/bloque-buster`, `/auth` y `/salon` cargan sin errores en consola.
- [ ] En `/`, escribir en el buscador filtra las tarjetas por título en tiempo real.
- [ ] En `/`, hacer click en una chip de categoría muestra solo los juegos de esa categoría; "TODOS" las muestra todas.
- [ ] Con la búsqueda sin coincidencias, aparece el bloque "NO HAY RESULTADOS".
- [ ] Click en una tarjeta (o en "JUGAR") navega a `/juego/[id]` del juego correcto.
- [ ] `/juego/[id]` con un id inexistente responde con la página 404 (`notFound()`).
- [ ] En `/juego/[id]`, "JUGAR AHORA" navega a `/jugar/[id]` y "VOLVER AL VAULT" navega a `/`.
- [ ] En `/jugar/[id]`, la puntuación sube sola mientras no está en pausa ni terminado; "PAUSA" la detiene y muestra el overlay "EN PAUSA".
- [ ] En `/jugar/[id]`, "FIN" abre el modal "FIN DEL JUEGO"; "GUARDAR PUNTUACIÓN" muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] En `/auth`, enviar el formulario o "JUGAR COMO INVITADO" lleva a `/` y (si se envió con usuario) la Nav pasa a mostrar el nombre del usuario.
- [ ] Estando logueado, "cerrar sesión" desde la Nav vuelve a mostrar "Iniciar Sesión".
- [ ] En `/salon`, cambiar de pestaña de juego cambia el podio y la tabla; con usuario en sesión aparece la fila "▸ TU MEJOR MARCA".
- [ ] La sesión se pierde al recargar la página (comportamiento esperado de estado en memoria).
- [ ] El menú hamburguesa abre y cierra el panel lateral en viewport ≤ 840px.

---

## Decisions

- **Sí:** rutas reales del App Router (`/`, `/juego/[id]`, `/jugar/[id]`, `/auth`, `/salon`). Idiomático en Next 16 y da URLs por pantalla. Se descarta replicar el enrutado por hash del prototipo.
- **Sí:** nombres de ruta `/auth` y `/juego/[id]` para alinearse con el `Nav` ya existente (que ya usa `startsWith("/juego")` y enlaza a `/auth`). Se descarta `/entrar` para no reescribir el `Nav`.
- **Sí:** portar el CSS del prototipo a `app/globals.css` (ya hecho) y usar esas clases en los componentes. Máxima fidelidad. Se descarta reescribir todo con utilidades Tailwind por coste y riesgo de perder los efectos CRT/neón.
- **Sí:** estado de sesión **solo en memoria** vía Context. Suficiente para un MVP visual. Se descarta localStorage/backend (el prototipo usaba `av_user`/`av_scores`, aquí no se persiste).
- **Sí:** reproductor como réplica visual con score falso por timer, incluidos pausa y modal FIN. Se descarta cualquier motor de juego.
- **Sí:** botones sociales (Google/GitHub) y contador de créditos como adornos no funcionales. Se descarta implementar OAuth o créditos reales.
- **Sí:** `next/font` para las tipografías (ya configurado en `layout.tsx`). Se descarta el `<link>` a Google Fonts del prototipo.
- **Sí:** guardar puntuación en el modal solo muestra el toast, sin persistir. Coherente con "estado en memoria".

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Componentes cliente vs. server: el detalle puede ser server pero biblioteca/reproductor/salón/auth necesitan `"use client"` por estado/timers. | El plan marca explícitamente qué archivo lleva `"use client"`. |
| `params` es asíncrono en Next 16; olvidarlo rompe el build de rutas tipadas. | El paso 6 exige `params` asíncrono y el tipo `PageProps<"/juego/[id]">`. |
| Divergencias visuales sutiles frente al prototipo (paddings, sombras). | Paso 10 de repaso comparando pantalla a pantalla contra `references/templates/`. |

---

## What is **not** in this spec

- Lógica de juego real (cualquier juego jugable).
- Persistencia real de usuario o puntuaciones (localStorage / backend).
- Autenticación real (OAuth Google/GitHub).
- Leaderboards o rankings calculados a partir de partidas reales.
- Contador de créditos funcional.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
