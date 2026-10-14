# SPEC 04 — Cimientos de Supabase: cliente y conexión

> **Status:** Aprobado
> **Depends on:** Ninguna
> **Date:** 2026-10-07
> **Objective:** Integrar el cliente de Supabase (`@supabase/ssr`) en el App Router con helpers de browser y server, configurado por variables de entorno y verificable con un endpoint de salud.

---

## Por qué existe esta spec

El proyecto es, hasta ahora, una réplica visual: la sesión vive solo en memoria (`SessionProvider`) y las puntuaciones del salón se generan con `seededScores()` (mock). Antes de construir autenticación real o leaderboards persistentes hace falta una base sólida: un cliente de Supabase bien conectado, con el patrón correcto para el App Router de Next 16 (helpers separados de browser y server) y las credenciales fuera del código. Esta spec entrega **solo esos cimientos** y nada más: deja el terreno listo para que las specs de auth y base de datos se apoyen en él sin reescribir la integración.

---

## Scope

**In:**

- Instalar las dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno en `.env.local`, documentadas en `.env.template`:
  - `NEXT_PUBLIC_SUPABASE_URL` → URL del proyecto.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → publishable key moderna (`sb_publishable_...`).
- Helper de cliente **browser** en `app/lib/supabase/client.ts` (`"use client"`-safe) usando `createBrowserClient` de `@supabase/ssr`, leyendo las dos variables `NEXT_PUBLIC_*`.
- Helper de cliente **server** en `app/lib/supabase/server.ts` usando `createServerClient` de `@supabase/ssr`, integrado con `cookies()` de `next/headers` (getAll/setAll), preparado para manejar sesión por cookies cuando llegue la auth.
- Route Handler de salud `app/api/health/supabase/route.ts` (`GET`) que instancia el cliente server, llama a `supabase.auth.getSession()` (sin tablas aún) y responde `{ ok: true, session: null }` si la conexión funciona, o `{ ok: false, error }` con `500` si falla.

**Out of scope (para futuras specs):**

- Autenticación real (login, registro, OAuth Google/GitHub, invitado): sigue el `SessionProvider` mock en memoria. Va en su propia spec.
- `middleware.ts` de refresco de sesión por cookies: sin auth real todavía no refresca nada; entra con la spec de auth.
- Cualquier tabla, esquema SQL, migración, RLS o leaderboard persistente: el salón sigue con `seededScores()`. Va en la spec de base de datos.
- Generación de tipos TypeScript del esquema (`generate_typescript_types`): no hay tablas que tipar aún.
- Uso de la `secret key` / service role o clientes con privilegios elevados.
- Reemplazar o tocar `SessionProvider`, `/auth`, `/salon` o `data.ts`.

---

## Data model

Esta feature no introduce estructuras de datos ni tablas. El único "modelo" son las variables de entorno (en `.env.local`, documentadas en `.env.template`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ushuwtnpvqhybgjmtyae.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Ambas son `NEXT_PUBLIC_*` a propósito: la publishable key está diseñada para exponerse en el cliente y es la que usarán tanto el helper browser como el server en esta fase (sin sesión todavía).

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. Instalar dependencias: `npm install @supabase/supabase-js @supabase/ssr`.
2. Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` reales del proyecto. Añadir las mismas claves (con valores de ejemplo) a `.env.template` (archivo de ejemplo que ya usa el repo desde SPEC 03). Confirmar que `.env.local` está en `.gitignore` (Next lo incluye por defecto).
3. Crear `app/lib/supabase/client.ts`: exporta `createClient()` que devuelve `createBrowserClient(url, key)` leyendo las dos variables `NEXT_PUBLIC_*`. Compila sin usarse aún.
4. Crear `app/lib/supabase/server.ts`: exporta una función `async createClient()` que obtiene `cookies()` de `next/headers` y devuelve `createServerClient(url, key, { cookies: { getAll, setAll } })`, con el `setAll` envuelto en try/catch (llamada desde Server Component sin escritura de cookies no debe romper). Compila sin usarse aún.
5. Crear `app/api/health/supabase/route.ts` (`GET`): instancia el cliente server, llama a `supabase.auth.getSession()`, y responde `{ ok: true, session: data.session }` (será `null`) o, si lanza/da error, `{ ok: false, error: message }` con status `500`. Probar con `curl http://localhost:3000/api/health/supabase`.
6. Verificación: `npm run build` compila; `curl` al endpoint de salud devuelve `{ ok: true }`; comprobar que con una variable de entorno ausente/vacía `createServerClient` lanza y el endpoint responde `{ ok: false }` con `500` (la mala configuración es el caso de fallo real; `getSession()` es local y una key inválida bien formada no lo dispara).

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`.
- [ ] `app/lib/supabase/client.ts` exporta un helper que crea el cliente browser con `createBrowserClient`.
- [ ] `app/lib/supabase/server.ts` exporta un helper `async` que crea el cliente server con `createServerClient` integrado con `cookies()` de `next/headers`.
- [ ] `GET /api/health/supabase` responde `{ ok: true }` (con `session: null`) cuando las credenciales son válidas.
- [ ] Con una variable de entorno ausente o vacía (p. ej. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `createServerClient` lanza y `GET /api/health/supabase` responde `{ ok: false }` con status `500`.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no están hardcodeadas en el código; se leen de entorno y están documentadas en `.env.template`.
- [ ] `.env.local` no queda trackeado por git.
- [ ] No se crean tablas ni migraciones, y `SessionProvider`, `/auth`, `/salon` y `data.ts` quedan intactos.

---

## Decisions

- **Sí:** `@supabase/ssr` con helpers separados de browser y server. Es el patrón oficial para el App Router y evita reescribir la integración cuando llegue la auth por cookies. Se descarta usar solo `@supabase/supabase-js` con un singleton, porque no maneja sesión por cookies en server y obligaría a migrar después.
- **Sí:** publishable key moderna (`sb_publishable_...`) en lugar de la legacy anon key (JWT). Supabase la recomienda para apps nuevas por mejor seguridad y rotación independiente. Se descarta la legacy anon key salvo necesidad de compatibilidad.
- **Sí:** nombre `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para la clave. Refleja que es una publishable key (no una anon JWT) y es segura de exponer en cliente. Se descarta `NEXT_PUBLIC_SUPABASE_ANON_KEY` por nombrar algo que ya no usamos.
- **Sí:** verificación mediante Route Handler de salud + `curl`, mismo criterio que SPEC 03. Da un punto de prueba explícito sin depender de tablas. Se descarta un Server Component temporal (hay que acordarse de borrarlo) y el "solo compila" (no prueba que la conexión responda).
- **No:** `middleware.ts` de refresco de sesión en esta spec. Sin auth real no refresca nada; entra con la spec de auth para no añadir código muerto.
- **No:** tablas, migraciones ni RLS. Son el objeto de la spec de base de datos; aquí solo se conecta el cliente.

---

## Risks

| Riesgo                                                                                                          | Mitigación                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Confundir publishable key con la secret key y exponer una clave con privilegios en el cliente.                  | Esta spec solo usa la publishable key (segura en cliente); la secret key/service role queda explícitamente fuera de scope.   |
| `cookies()` de `next/headers` llamado fuera de un contexto de request (p. ej. en build) rompe el helper server. | El helper server es `async` y solo se invoca dentro del Route Handler (contexto de request); el `setAll` va en try/catch.    |
| Falta `.env.local` en el entorno → el endpoint falla al arrancar.                                               | `.env.template` documenta las variables; el endpoint de salud devuelve `{ ok: false }` con `500` en lugar de un crash opaco. |

---

## What is **not** in this spec

- Autenticación real (login, registro, OAuth, invitado) y el reemplazo del `SessionProvider` mock.
- `middleware.ts` de refresco de sesión.
- Tablas, migraciones, RLS, leaderboards persistentes y el reemplazo de `seededScores()`.
- Generación de tipos TypeScript del esquema.
- Uso de la secret key / service role.

Cada uno de esos, si llega, va en su propia spec.
