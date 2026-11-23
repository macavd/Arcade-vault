---
name: spec-impl-game
description: Implements an approved GAME spec of Arcade Vault just like /spec-impl (validates the state means "Approved", creates the spec-NN-slug branch, switches to it, implements step by step with diff pauses), and when the implementation is finished chains two project subagents sequentially — first skin-designer, then mobile-porter — to prepare the skins and mobile-responsive specs in Draft.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Task, Read, Glob, Grep, Edit, Write, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(if:*), Bash(Test-Path:*), Bash(Get-ChildItem:*), Bash(Get-Content:*)
---

# /spec-impl-game — Implementer of approved GAME specs (+ skin & mobile chaining)

This command is the **game-oriented variant of `/spec-impl`**. Phases 1–4 are
**identical** to `/spec-impl`: it implements an approved spec exactly as written,
step by step. The difference is **Phase 5**: once the game is implemented and its
acceptance criteria are verified, it **chains two Arcade Vault subagents, one after
the other (never in parallel)** — first `skin-designer`, then `mobile-porter` — so
that a single invocation leaves the new game implemented **and** the skins and
mobile-responsive specs drafted and ready for `/spec-impl`.

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`Get-ChildItem specs -Name -ErrorAction SilentlyContinue`

Branch-creation config:
!`Get-Content specs/.spec-config.yml -ErrorAction SilentlyContinue`

---

## Instructions

Follow these five phases in strict order. **Do not advance to the next phase if the previous one did not complete correctly.** Phases 1–4 are the same as `/spec-impl`; Phase 5 is the game-specific chaining.

---

### Phase 1 — Identify the spec

The received argument is: `$ARGUMENTS`

If `$ARGUMENTS` is empty:

- List the files available in `specs/` (you already have them above).
- Ask the user to specify the exact name of the spec.
- Stop and wait for an answer. Do not continue.

If `$ARGUMENTS` has a value:

- Look for the file in `specs/`. The user may have written the full name (`01-mvp-arkanoid`), only the number (`01`), or only the slug (`mvp-arkanoid`). Try to find the correct file in any of those cases.
- If you do not find the file, show the available specs and ask the user to correct the name.
- If you do find it, continue to Phase 2.

---

### Phase 2 — Validate the spec's state

Read the spec file you located in Phase 1 using the Read tool or `cat`.

In the file's contents, look for the line that contains the spec's state. The header label is typically `**Status:**` (English) or `**Estado:**` (Spanish), but it may use any language. Match by position (status line near the top of the spec) and by the surrounding state machine, not by the exact label.

**Absolute rule:** You can only continue if the state **means "Approved"** — regardless of the language used.

Treat any of the following (and their equivalents in other languages) as the **Approved** state and continue:

- English: `Approved`
- Spanish: `Aprobado`
- Portuguese: `Aprovado`
- French: `Approuvé`
- German: `Genehmigt`
- Italian: `Approvato`
- …or any other language's word that clearly means "approved"

Anything else (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete / Obsoleto, or any unrecognized value) means **stop** and show the error message below.

| State category                            | Examples (any language)                           | Action                                                                     |
| ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Approved                                  | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continue to Phase 3.                                                       |
| Draft                                     | `Draft`, `Borrador`, …                            | Stop. Show the error message below.                                        |
| In review                                 | `In review`, `En revisión`, …                     | Stop. Show the error message below.                                        |
| Implemented                               | `Implemented`, `Implementado`, …                  | Stop. Show the error message below.                                        |
| Obsolete                                  | `Obsolete`, `Obsoleto`, …                         | Stop. Show the error message below.                                        |
| State line not found / unrecognized value | —                                                 | Stop. The file does not follow the expected format. Tell this to the user. |

If you are unsure whether a value means "approved", **do not assume**. Stop and ask the user to clarify or to update the spec to the canonical wording.

**Standard error message when the state does not mean Approved:**

```
❌ I cannot implement this spec.

Current state: [STATE FOUND]
I only work with specs whose state means "Approved" (e.g. `Approved`, `Aprobado`,
or the equivalent in another language).

To continue you have two options:
  1. If the spec is ready to be implemented, open it and change the state
     to "Approved" (or the equivalent term your team uses) manually.
     That change is made by the human, not the agent.
  2. If the spec still needs work, use /spec [name] to resume it.
```

Do not offer alternatives, do not suggest "I can still start if you want". The block is intentional.

---

### Phase 3 — Create the git branch and switch to it

Once you have confirmed the state means `Approved`:

0. **Check the working tree first.** Look at the `git status --short` output in the session context above. If it is **not empty**, stop and show the pending changes, then ask:

   ```
   ⚠️ There are uncommitted changes in the working tree.
   Switching branches would carry them over. What do you want to do?
     1. Commit or stash them yourself, then re-run this command  (recommended)
     2. Continue anyway — the changes travel to the new branch
   ```

   Wait for the answer. **Do not stash or commit on the user's behalf** unless they explicitly ask for it. If the working tree is clean, skip straight to step 1 without mentioning it.

1. Derive the branch name from the spec file's full name, without the extension. Format: `spec-NN-slug`. Examples:

   - `01-mvp-arkanoid.md` → branch `spec-01-mvp-arkanoid`
   - `02-powerups.md` → branch `spec-02-powerups`

2. Read the `AutoCreateBranch` flag from the **Branch-creation config** shown in the session context above.

   - If the config file does not exist, the value is missing, or the value is unrecognized → treat it as `true` (the default).
   - Only an explicit `false` (in any capitalization) disables automatic branch creation.

   **If `AutoCreateBranch` is `true` (default):** proceed without asking.

   - If the branch **does not exist**: create it with `git checkout -b spec-NN-slug`.
   - If it **already exists**: this means previous work is being resumed. Switch to it, read `git log --oneline` on the branch, and tell the user which steps of the plan already look done and which step you propose to resume from. Wait for confirmation on the resume point before implementing anything.
   - In both cases: switch to the branch with `git checkout spec-NN-slug` and confirm the change was successful before continuing.

   **If `AutoCreateBranch` is `false`:** ask before touching git. Show:

   ```
   AutoCreateBranch is set to false.
   Create and switch to the branch spec-NN-slug? [y/N]
   ```

   - If the user answers **yes**: create/switch to the branch exactly as in the `true` case above.
   - If the user answers **no** or leaves it empty: **do not create any branch.** Tell the user you will implement on the current branch (the one shown in the session context above) and ask for explicit confirmation to continue there. Do not improvise — wait for the answer.

3. Visually confirm to the user the spec is ready and which branch is active:

   ```
   ✅ Ready to implement.

   Spec:   specs/NN-slug.md
   Branch: spec-NN-slug  (active)   (← or the current branch, if no new branch was created)
   State:  Approved   (← echo back the actual value found in the spec)
   ```

4. **Do not start implementing yet.** First show the spec summary to the user so they have it fresh. Extract and show:
   - The **objective** (the line after `**Objective:**` / `**Objetivo:**` / equivalent label).
   - The **scope** (the `## Scope` / `## Alcance` / equivalent section).
   - The **implementation plan** (the section with the numbered steps — `## Implementation plan` / `## Plan de implementación` / equivalent).
   - The **acceptance criteria** (the checklist — `## Acceptance criteria` / `## Criterios de aceptación` / equivalent).

Match section headings by meaning, not by exact wording — the spec may be authored in any language.

---

### Phase 4 — Implement step by step

After showing the spec summary, tell the user:

```
I am going to implement the spec following the implementation plan exactly.
I will pause after each step so you can review the diff.

Shall we start with Step 1?
```

Wait for explicit confirmation ("yes", "go ahead", "go", or equivalent). Do not start without it.

Once confirmed, follow these rules during the entire implementation:

**Never commit automatically.** Not per step, not at the end. You write the code and show the diff; committing is the user's decision and the user's command. Only commit if they explicitly ask you to.

**One rule above all:** implement what the spec says. If something in the spec looks suboptimal to you, mention it as an observation but implement what was agreed. Changes to the spec go into the spec, not into the code by surprise.

**Work rhythm:**

- Implement one step of the plan.
- Show a summary of which files you touched and what you did.
- Say: `Step N completed. Could you review the diff and let me know if I continue with Step N+1?`
- Wait for confirmation before continuing.

**If during the implementation you find an ambiguity** the spec does not resolve:

- Stop.
- Describe the ambiguity exactly.
- Present two or three concrete options.
- Wait for the user's decision.
- Do not improvise.

**If the user asks for something that is out of the spec's scope:**

- Remind them that it is out of this spec's scope.
- Suggest noting it down for the next spec.
- Do not implement it on this branch.

**When finishing the last step:**

```
✅ All steps of the plan are implemented.

Next step: verify the spec's acceptance criteria one by one.
If they all pass, update the spec's state to "Implemented" (or the equivalent
in your repo's language) and make the final commit before merging this branch.
```

**Do not end here.** Verify the acceptance criteria with the user and, once the spec's state has been updated to `Implemented` (the human makes that change, or you confirm it with the user), **continue to Phase 5**. If the criteria do not pass, fix what the spec requires and re-verify before moving on — do not trigger the subagents on a half-finished game.

---

### Phase 5 — Chain the game subagents (what makes this command different)

This phase runs **only after** the game is implemented **and** its acceptance criteria are verified / the spec is marked `Implemented`. It launches two project subagents **sequentially and automatically — never in parallel, and without asking for confirmation between them**. Neither subagent writes product code, CSS, engines or Supabase: each only audits and writes **a spec in `Draft`**.

1. **Derive the game.** From the implemented spec, work out the game it is about:
   its slug (from the file name `NN-<slug>`, usually the catalog slug) and its
   title (from the objective / scope). You will name this game explicitly to the
   subagents. **If the spec is not about a game of the Arcade Vault catalog**
   (e.g. it is an infra or site-wide spec), stop here, tell the user this command
   is meant for game specs, and do not launch the subagents.

2. **Launch `skin-designer` first and wait for it to finish.** Use the Task tool
   with `subagent_type: skin-designer`, naming the game explicitly in the prompt —
   e.g. _"Diseña los skins del juego `<slug>` (`<título>`), recién implementado. Garantiza ≥3 temas (neon, retro y clásico/default) legibles en el CRT oscuro y el selector de temas en la UI; escribe su spec en Draft y actualiza `references/game-with-theme.md`."_
   **Do not continue until it returns.** Then relay a short summary of its result
   (the path of the `specs/NN-skins-<slug>.md` spec it left in `Draft`).

3. **Then, and only then, launch `mobile-porter`.** Use the Task tool with
   `subagent_type: mobile-porter` to audit the mobile experience and create/update
   the deferred responsive spec in `Draft` — e.g. _"Audita la experiencia móvil de Arcade Vault (foco en el reproductor del juego `<slug>` recién añadido y el sitio) y escribe/actualiza en Draft la spec de layout responsive/orientación que SPEC 13 difirió; actualiza `references/mobile-review.md`."_
   **Never run this in parallel with skin-designer** — it starts only after
   skin-designer has closed. Then relay a short summary (the path of the
   responsive spec it left in `Draft`).

4. **Final summary to the user.** Report:
   - the game implemented and the active branch,
   - the two new specs left in `Draft` (skins and responsive), with their paths,
   - a reminder that both are in `Draft`: re-read them, change the state to
     `Approved`, and run `/spec-impl` on each when ready.

   **Do not implement what those subagents specced** — they only leave `Draft`
   specs for a later `/spec-impl`. Stop after the summary.

---

## Summary of expected behavior

```
/spec-impl-game 14-pacman   (state: Approved / Aprobado)

  Phase 1  →  Finds specs/14-pacman.md
  Phase 2  →  Reads the state → "Aprobado" → ✅ continues
  Phase 3  →  git checkout -b spec-14-pacman → git checkout spec-14-pacman
              Shows objective, scope, plan and criteria
  Phase 4  →  Implements step by step with pauses; verifies acceptance criteria;
              spec marked "Implementado"
  Phase 5  →  Launches skin-designer (game "pacman") → waits → relays its Draft spec
              Then launches mobile-porter → waits → relays its Draft spec
              Final summary: implemented game + two Draft specs to review/approve

/spec-impl-game 02-powerups  (state: Draft / Borrador)

  Phase 1  →  Finds specs/02-powerups.md
  Phase 2  →  Reads the state → "Draft" → ❌ stops
              Shows the standard error message
              Does not create branch, does not touch code, does not run subagents
```

**Branch creation is controlled by the `AutoCreateBranch` flag** in `specs/.spec-config.yml` (defaults to `true`), exactly like `/spec-impl`.

## Environment notes

- Windows / PowerShell. If you use shell commands, avoid braces `{ }` that contain quotes in the `!` preambles (the permission checker blocks them) — the snippets above already comply.
- When in doubt about the spec content or the game's slug/title, **read the files** (`specs/`, `references/implemented-games.md`, the catalog) rather than guessing.
- The two subagents are project-local (`.claude/agents/skin-designer.md`, `.claude/agents/mobile-porter.md`). They only audit and write `Draft` specs — no product code, no Supabase.
