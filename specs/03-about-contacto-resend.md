# SPEC 03 — Página "Acerca de" y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 02
> **Date:** 2026-09-24
> **Objective:** Portar la pantalla `references/templates/home-about/about.jsx` a la ruta `/about` y hacer que su formulario de contacto envíe correos reales vía Resend.

---

## Por qué existe esta spec

La SPEC 02 dejó fuera, de forma explícita, la pantalla "Acerca de" y su formulario de contacto (`about.jsx`), y por eso el enlace "Acerca de" no se añadió al `Nav`. Esta spec completa esa parte del prototipo: porta la pantalla como réplica visual (misión, highlights, divider) y convierte el formulario de contacto —que en el prototipo solo simulaba el envío con una terminal de éxito— en un envío de correo real usando Resend. Es la primera spec del proyecto que introduce lógica de servidor.

---

## Scope

**In:**

- Nueva ruta `/` → no; nueva ruta `/about` → pantalla "Acerca de", portando `references/templates/home-about/about.jsx` con todas sus secciones:
  - Hero "ACERCA DE" (`about-hero`): kicker, título, misión y `highlight-row` con 3 `highlight` e iconos pixel SVG (`HighlightIcon`: `HEART`, `BROWSER`, `PLANT`).
  - Divider animado (`about-divider` con `div-bar` y 24 `div-pixels`).
  - Sección de contacto (`about-contact`): intro (`contact-intro` con `contact-tips`) y formulario (`contact-form`).
- Formulario de contacto (`"use client"`) con los campos `name`, `email`, `msg`, portando la validación de campos vacíos (efecto `shake`) del prototipo.
- Estados del envío real: `idle` (formulario), `sending` (botón deshabilitado con texto "ENVIANDO…"), `error` (mensaje inline, formulario conservado para reintentar) y `sent` (terminal de éxito `terminal-success` del prototipo).
- Route Handler `app/api/contact/route.ts` (`POST`) que valida los campos en servidor y envía el correo con Resend.
- Envío con Resend usando el SDK `resend`; `reply_to` apuntando al correo del remitente para que el equipo pueda responder directamente.
- Direcciones y clave configuradas por variables de entorno: `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`. Añadir un `.env.example` documentándolas.
- Portar a `app/globals.css` las clases de la pantalla desde `references/templates/home-about/styles.css` (`about-*`, `highlight*`, `hl-*`, `div-*`, `contact-*`, `terminal-success`, `term-*`, y los keyframes de `shake`/`caret` si no existen ya).
- Reutilizar el hook `useReveal()` (SPEC 02) para las animaciones on-scroll de `.reveal`.
- Añadir el enlace "Acerca de" (`/about`) al `Nav` (escritorio y panel móvil), activo en `/about`.

**Out of scope (para futuras specs):**

- Protección anti-spam: honeypot, rate limiting por IP, CAPTCHA. Solo se hace validación básica de campos en servidor.
- Guardar los mensajes en base de datos o cualquier persistencia; solo se envían por correo.
- Plantilla de correo enriquecida con React Email; el cuerpo del correo es texto/HTML simple.
- Correo de confirmación automático al usuario que escribe.
- Internacionalización de los textos del correo.
- Tests automatizados (no hay runner configurado).

---

## Data model

Esta feature no introduce estructuras de datos persistentes. El único "modelo" es el payload del formulario que viaja al Route Handler:

```ts
// payload POST a /api/contact
type ContactPayload = {
  name: string;
  email: string;
  msg: string;
};
```

Variables de entorno (en `.env.local`, documentadas en `.env.example`):

```bash
RESEND_API_KEY=re_xxxxxxxx
CONTACT_TO=hola@arcadevault.gg          # destinatario de los mensajes
CONTACT_FROM=Arcade Vault <onboarding@resend.dev>  # remitente verificado en Resend
```

---

## Implementation plan

Cada paso deja la app compilando y navegable.

1. Instalar la dependencia `resend` (`npm install resend`).
2. Crear `.env.example` con `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` documentadas. Confirmar que `.env.local` está en `.gitignore` (Next lo incluye por defecto).
3. Portar a `app/globals.css` las clases de la pantalla "Acerca de" desde `references/templates/home-about/styles.css` (`about`, `about-hero`, `about-title`, `about-mission`, `highlight-row`, `highlight`, `hl-icon`, `hl-text`, `about-divider`, `div-bar`, `div-pixels`, `about-contact`, `contact-grid`, `contact-intro`, `contact-title`, `contact-sub`, `contact-tips`, `tip`, `tip-led`, `contact-form`, `terminal-success`, `term-bar`, `term-body`, `dot`, `caret`, más los keyframes de `shake` si no existen). No tocar clases existentes.
4. Crear `app/api/contact/route.ts` con un `POST` que: parsea el JSON, valida que `name`, `email` y `msg` no estén vacíos y que `email` tenga formato válido (responde `400` si no), instancia Resend con `RESEND_API_KEY`, envía el correo (`from: CONTACT_FROM`, `to: CONTACT_TO`, `reply_to: email`, asunto con el nombre, cuerpo con los datos) y responde `{ ok: true }` o `500` en error. Probar con `curl`.
5. Crear la página `app/about/page.tsx` (`"use client"`): hero + `HighlightIcon` + `highlight-row`, divider animado, e invocar `useReveal()`. Compila y muestra la pantalla sin el formulario funcional aún.
6. Añadir en `app/about/page.tsx` el formulario de contacto con estado `idle | sending | error | sent`: portar la validación `shake` de campos vacíos; en submit hacer `fetch("/api/contact", { method: "POST" })`; mostrar "ENVIANDO…" con el botón deshabilitado en `sending`, la terminal `terminal-success` en `sent`, y un mensaje de error inline en `error` conservando lo escrito.
7. Actualizar `app/components/Nav.tsx`: añadir `{ href: "/about", label: "Acerca de", match: (p) => p.startsWith("/about") }` al array `LINKS` (aparece en escritorio y panel móvil automáticamente).
8. Repaso de fidelidad: abrir `/about` y comparar sección a sección con el prototipo (`arcade-vault-standalone.html`); enviar un mensaje real de prueba y verificar que llega a `CONTACT_TO`; forzar un fallo (clave inválida) y comprobar el estado de error.

---

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de tipos de ruta.
- [ ] `/about` carga la pantalla (hero + misión + highlights + divider + contacto) sin errores en consola.
- [ ] El `Nav` muestra "Acerca de" como enlace separado, activo en `/about`, en escritorio y en el panel móvil.
- [ ] Enviar el formulario con algún campo vacío no hace la petición y dispara el efecto `shake`.
- [ ] Al enviar un formulario válido, el botón muestra "ENVIANDO…" y queda deshabilitado durante la petición.
- [ ] Un envío exitoso muestra la terminal `terminal-success` con el nombre en mayúsculas y el botón "ENVIAR OTRO MENSAJE" reinicia el formulario.
- [ ] El correo llega a la dirección `CONTACT_TO` con el contenido del mensaje y `reply_to` igual al correo del remitente.
- [ ] Si el envío falla (p. ej. clave inválida), se muestra un mensaje de error inline y el formulario conserva lo escrito para reintentar.
- [ ] `POST /api/contact` con campos vacíos o email inválido responde `400`; con Resend caído responde `500`.
- [ ] `RESEND_API_KEY`, `CONTACT_TO` y `CONTACT_FROM` no están hardcodeadas en el código; se leen de entorno y están documentadas en `.env.example`.
- [ ] Las secciones con `.reveal` se animan una sola vez al hacer scroll.

---

## Decisions

- **Sí:** ruta `/about` para la pantalla "Acerca de". Coincide con el enlace "Acerca de" del nav del prototipo, diferido en SPEC 02.
- **Sí:** envío vía Route Handler `app/api/contact/route.ts`. Da un endpoint HTTP explícito, testeable con `curl` y desacoplado del componente. Se descarta Server Action por preferencia de tener el endpoint visible y probable reutilización.
- **Sí:** direcciones y clave por variables de entorno (`RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`). Evita hardcodear correos y filtrar la clave en el repo. Se descarta hardcodear.
- **Sí:** `reply_to` = correo del remitente, para que el equipo responda directamente desde su bandeja. Se descarta un correo de confirmación automático al usuario (otra spec).
- **Sí:** estados `sending` y `error` además del `sent` del prototipo. Un envío real puede tardar o fallar y el usuario necesita feedback. Se descarta el "solo éxito" del prototipo por ocultar fallos.
- **No:** anti-spam (honeypot, rate limiting, CAPTCHA). Añade complejidad no justificada para el MVP; va en su propia spec.
- **No:** persistir los mensajes ni plantilla React Email. El correo simple cubre la necesidad; enriquecerlo es otra spec.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Exponer `RESEND_API_KEY` en el cliente. | La clave solo se usa en `app/api/contact/route.ts` (servidor); nunca se importa en componentes `"use client"`. |
| Dominio remitente no verificado en Resend → los correos rebotan. | `CONTACT_FROM` usa un remitente verificado (o `onboarding@resend.dev` en pruebas); documentado en `.env.example`. |
| Sin anti-spam, el formulario puede recibir envíos automatizados. | Aceptado para el MVP; queda registrado como fuera de scope para una spec de anti-spam. |
| Colisión de nombres de clase al portar CSS (p. ej. `dot`, `field`, `btn`). | El paso 3 revisa clases existentes antes de añadir; el paso 8 comprueba que no se degradan otras rutas. |

---

## What is **not** in this spec

- Protección anti-spam (honeypot, rate limiting, CAPTCHA).
- Persistencia de los mensajes en base de datos.
- Plantilla de correo con React Email o correo de confirmación al usuario.
- Internacionalización de los textos del correo.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
