# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault is a planned platform for playing games online and competing for high scores (see `README.md`). The codebase is currently the unmodified `create-next-app` scaffold — no game/domain code exists yet, so most work here means building features from scratch on this base.

## Commands

- `npm run dev` — start the dev server (Next.js, http://localhost:3000)
- `npm run build` — production build
- `npm start` — serve the production build
- `npm run lint` — run ESLint

No test runner is configured yet.

## Stack & conventions

- **Next.js 16** with the App Router (`app/` directory). There is no `src/` or `pages/` directory.
- **React 19** and **TypeScript** in strict mode.
- **Tailwind CSS v4** — configured via `@tailwindcss/postcss` in `postcss.config.mjs`; there is no `tailwind.config.js`. Global styles and theme live in `app/globals.css`.
- Import alias `@/*` maps to the repository root (see `tsconfig.json`).
- Next 16 route-typed props: `layout.tsx` uses the generated `LayoutProps<"/">` type rather than a hand-written props interface. Follow this pattern for new layouts/pages.

## Development workflow

Per `README.md`, this project follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from the [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) collection. Prefer writing/updating a spec before implementing features.
