# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault is a planned platform for playing games online and competing for high scores (see `README.md`). The codebase is currently the unmodified `create-next-app` scaffold — no game/domain code exists yet, so most work here means building features from scratch on this base.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario 

No test runner is configured yet.

## Stack & conventions

- **Next.js 16** with the App Router (`app/` directory). There is no `src/` or `pages/` directory.
- **React 19** and **TypeScript** in strict mode.
- **Tailwind CSS v4** — configured via `@tailwindcss/postcss` in `postcss.config.mjs`; there is no `tailwind.config.js`. Global styles and theme live in `app/globals.css`.
- Import alias `@/*` maps to the repository root (see `tsconfig.json`).
- Next 16 route-typed props: `layout.tsx` uses the generated `LayoutProps<"/">` type rather than a hand-written props interface. Follow this pattern for new layouts/pages.

## Development workflow

Per `README.md`, this project follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from the [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) collection. Prefer writing/updating a spec before implementing features.

## Hola Mundo

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
