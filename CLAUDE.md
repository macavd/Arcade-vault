# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault is a platform for playing classic arcade games online and competing for high scores (see `README.md`). It is a working application, not a scaffold: a neon/CRT-themed Next.js site with a Supabase-backed game catalog and persistent leaderboard, a Resend-powered contact form, and three playable canvas game engines. Features are built spec-first (see `specs/`); specs 01–08 are all `Implementado`.

## Skills

- **Usa siempre `/frontend-design` para diseñar la interfaz de usuario** (UI, portadas `.cover-*`, estética neón/CRT).
- **`/spec` + `/spec-impl`** (from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills)) drive the spec-first workflow. Specs live in `specs/NN-slug.md`; `.agents/skills/spec/` holds the vendored copies.
- **`/spec-juego`** (project-local, `.claude/skills/spec-juego/`) — generates a spec (no code) for adding a new game with a leaderboard, combining the engine pattern of SPEC 05 with the catalog/leaderboard pattern of SPEC 06. Use it to add or port a game from `references/started-games/`; it leaves the spec in `Draft` for `/spec-impl`.
- **`game-planner`** subagent (project-local, `.claude/agents/game-planner.md`) — recommended upstream step before `/spec-juego`. It decides _which_ game to add (slug, category, color, descriptions, port candidate, pitfalls, rationale) validated against the catalog, and logs each suggestion to `references/game-suggestions-todo.md` so it doesn't repeat. It only recommends — no spec, no code.
- **`skin-designer`** subagent (project-local, `.claude/agents/skin-designer.md`) — designs the **skin** system for **one game at a time, only the game you name** (never the whole catalog). It ensures that game offers at least 3 themes (`neon`, `retro`, and `clasico`/default) legible on the dark CRT theme, writes that game's spec in `Draft` (`specs/NN-skins-<slug>.md`, palette archetypes + contrast rules, exact colors delegated to `/frontend-design` at `/spec-impl` time), and maintains the `references/game-with-theme.md` ledger of which games already have skins. Invoke it naming the target game. It only audits and specs — no engine/CSS code, no Supabase.
- **`game-jam`** subagent (project-local, `.claude/agents/game-jam.md`) — given a **theme**, runs a mini game jam: proposes 3 fitting games and writes complete specs for each (catalog+leaderboard and engine) under `specs/game-jam/<slug>/` in `Draft`, ready for `/spec-impl`. Use it to explore several games from a theme at once. It runs autonomously (no interview), logs each to `references/game-suggestions-todo.md`, and writes no code or Supabase changes.
- **`mobile-porter`** subagent (project-local, `.claude/agents/mobile-porter.md`) — reviews how Arcade Vault looks **on mobile** across the whole site (the player `.crt`/`.crt-screen`, nav, home, `/games`, hall of fame, about, leaderboard) by **static code analysis**, and writes in `Draft` the responsive-layout/orientation spec that **SPEC 13 explicitly deferred** (`specs/NN-responsive-movil.md`), ready for `/spec-impl`. It maintains the `references/mobile-review.md` ledger of which surfaces have been audited. Invoke it to prepare the mobile responsive work. It only audits and specs — no CSS/engine code, no Supabase, no browser.

Note (from memory): the `/spec*` skills were adapted to PowerShell; avoid braces inside quotes in their shell snippets (the permission checker blocks them).

No test runner is configured. `npm run lint` runs ESLint; Prettier formats on save via the `PostToolUse` hook in `.claude/settings.json` (`node .claude/hooks/format-file.mjs` after every Write/Edit).

## Stack & conventions

- **Next.js 16** with the App Router (`app/` directory). There is no `src/` or `pages/` directory.
- **React 19** and **TypeScript** in strict mode.
- **Tailwind CSS v4** — configured via `@tailwindcss/postcss` in `postcss.config.mjs`; there is no `tailwind.config.js`. Global styles, the neon/CRT theme, and the `.cover-<slug>` game cover classes live in `app/globals.css`.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) for the catalog and leaderboard; **Resend** for contact emails.
- Import alias `@/*` maps to the repository root (see `tsconfig.json`).
- Next 16 route-typed props: pages/layouts use the generated `LayoutProps<"/">` / `PageProps<"/juego/[id]">` types rather than hand-written interfaces. Follow this pattern for new routes. `cookies()` is async in Next 16.

## Architecture

- **Routes** (`app/`): `/` (home), `/games` (biblioteca), `/juego/[id]` (game detail + leaderboard), `/jugar/[id]` (player), `/salon` (hall of fame), `/about` (+ contact form), `/auth`. API routes: `POST /api/scores`, `POST /api/contact` (Resend), `GET /api/health/supabase`.
- **Data layer**: Supabase is the source of truth for the catalog. `app/lib/db/games.ts` (`getGames`, `getGameById`) and `app/lib/db/scores.ts` (`getTopScores`, `insertScore`) are server-only accessors over the `games` and `scores` tables. `app/lib/supabase/{server,client}.ts` create the SSR clients; `database.types.ts` holds generated types. `app/lib/data.ts` now only holds shared types (`Game`, `ScoreRow`, `GameCategory`, `NeonColor`) and static filter categories — **not** the catalog.
- **Game engines** — the main extension point. Each game is a `GameFactory` in `app/lib/games/<slug>/engine.ts` (vanilla canvas logic ported from `references/started-games/`) that returns a `GameEngine` (`start/pause/resume/restart/destroy`) wired to `GameCallbacks` (`onScore/onLives/onLevel/onGameOver`) — see `app/lib/games/types.ts`. Engines are registered by catalog slug in `app/lib/games/registry.ts`; `app/components/games/CanvasGame.tsx` mounts the engine generically by `id`. Slugs without an engine resolve to `null` and stay a mockup. Implemented: `rocas` (Asteroids, SPEC 05), `caida` (Tetris, SPEC 07), `bloque-buster` (Arkanoid, SPEC 08) — see `references/implemented-games.md` for the quick-reference table (ID, title, category, short description, engine path).
- **Session**: `app/components/SessionProvider.tsx` is in-memory only (name in uppercase, lost on reload); real Supabase auth is not wired yet.

## Development workflow

This project follows **Spec Driven Design**: write/update a spec in `specs/` before implementing. Specs are written in Spanish with a header (`**Status:** / **Depends on:** / **Date:** / **Objective:**`) and statuses in Spanish (`Borrador`/`Draft` → `Approved` → `Implementado`). `specs/.spec-config.yml` sets `AutoCreateBranch: true` so `/spec-impl` creates the `spec-NN-slug` branch automatically. To add a game, prefer `/spec-juego` then `/spec-impl`.

The **Supabase MCP** server is configured in `.mcp.json` (project `ushuwtnpvqhybgjmtyae`). Env vars are documented in `.env.template` (copy to `.env.local`, never commit): `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
