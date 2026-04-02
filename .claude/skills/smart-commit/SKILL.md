---
name: smart-commit
description: Analyzes changed or staged files, proposes a meaningful branch name and a Conventional Commits message, waits for user confirmation, then checks out to the branch, commits, and pushes. Use this skill whenever the user asks to "commit my changes", "push my work", "commit and push", "create a branch and commit", "stage and push", "smart commit", or any variation of wanting to commit and/or push their current changes. Also triggers on phrases like "wrap up my changes", "save my work to git", "commit this", "push this", or "ship this".
model: sonnet
allowed-tools: Bash(git *), Bash(gh *)
---

# Smart Commit

Turns uncommitted changes into a properly named branch + Conventional Commit, with user confirmation before touching git history.

## Phase 1: Gather Change Context

Run these in parallel:

```bash
git status --porcelain
git diff --stat HEAD
git diff HEAD
git diff --cached
git log --oneline -5
git branch --show-current
```

From the output, understand:
- Which files changed and how (additions, deletions, modifications)
- Whether changes are staged, unstaged, or mixed
- What the current branch is (you'll need this if already on a feature branch)
- What the recent commit history looks like (to stay consistent with the project's conventions)

## Phase 2: Analyze and Draft

Based on the diff, draft two things:

### Branch Name

First, check the current branch from Phase 1:
- If the user is **already on a feature branch** (anything other than `main`, `master`, or `develop`), **do not propose a branch name at all** — skip this entirely and commit directly to the current branch.
- If on `main`/`master`/`develop`, propose a new branch following these rules:
  - Format: `<type>/<short-description>` (e.g., `feat/weather-cache-refresh`, `fix/city-search-debounce`, `chore/add-prettier`)
  - Use kebab-case, no spaces
  - Keep it under 50 characters
  - `<type>` must match the commit type (see below)

### Commit Message

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Types** (pick the most specific one that fits):
- `feat` — new feature or capability
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting, no logic change
- `refactor` — restructuring without behavior change
- `perf` — performance improvement
- `test` — adding or fixing tests
- `chore` — tooling, config, dependencies
- `ci` — CI/CD changes
- `build` — build system changes

**Scope** (optional): the area of code affected, e.g., `feat(search): …` or `fix(storage): …`. Use a scope when the change is clearly isolated to one module.

**Description**: imperative mood, lowercase, no period. "add city refresh button" not "Added city refresh button."

**Body** (optional): include when the *why* isn't obvious from the description — motivation, trade-offs, or context a reviewer would want. Skip it for mechanical changes.

**Breaking changes**: add `!` after the type (`feat!:`) and a `BREAKING CHANGE:` footer if applicable.

**Examples:**
```
feat(search): add debounced city autocomplete

fix(storage): handle corrupted localStorage gracefully

chore: add prettier with format script

refactor(weather): extract normalization to openMeteo.ts
```

## Phase 3: Present Proposal and Wait for Confirmation

Print the proposal clearly.

**When on a feature branch** (no new branch needed):
```
## Smart Commit Proposal

**Branch:** already on `chore/smart-commit-skill` — no new branch needed
**Commit:** `chore(skills): add smart-commit skill`

---
Does this look right? Reply with:
- **yes** / **ok** / **lgtm** — proceed as-is
- A correction — e.g., "use fix not feat"
- **cancel** — abort
```

**When on main/master/develop** (new branch will be created):
```
## Smart Commit Proposal

**Branch:** `feat/weather-cache-refresh` ← will be created
**Commit:** `feat(weather): add cache refresh on city card`

---
Does this look right? Reply with:
- **yes** / **ok** / **lgtm** — proceed as-is
- A correction — e.g., "use fix not feat" or "branch should be fix/storage-key"
- **cancel** — abort
```

**Stop here. Do not run any git commands until the user responds.**

If the user suggests changes, update the proposal and present it again. Keep iterating until they confirm.

## Phase 4: Execute

Once confirmed, run all git steps in a **single bash command** so the user only needs to approve once.

Compose the command based on the situation:

**Standard case** (on main, new branch, simple commit message):
```bash
git checkout -b <branch-name> && git add -A && git commit -m "<commit message>" && git push -u origin <branch-name>
```

**Already on a feature branch** (skip checkout):
```bash
git add -A && git commit -m "<commit message>" && git push -u origin <branch-name>
```

**Commit with body**:
```bash
git checkout -b <branch-name> && git add -A && git commit -m "<subject>" -m "<body>" && git push -u origin <branch-name>
```

**Branch already exists locally** (use checkout instead of checkout -b):
```bash
git checkout <branch-name> && git add -A && git commit -m "<commit message>" && git push -u origin <branch-name>
```

**No remote configured**: omit the push step entirely.

If the overall command fails, report which step failed based on the error output and stop.

### 4b. Report

After the command completes, print a short summary:

```
## Done

- Checked out branch: `feat/weather-cache-refresh`
- Committed: `feat(weather): add cache refresh on city card`
- Pushed to origin

PR: run `gh pr create` to open a pull request.
```

If any step fails, report the error immediately and stop — don't proceed to the next step.

## Edge Cases

- **Nothing to commit**: if `git status` shows a clean working tree, tell the user and stop.
- **Already on main with prior commits**: if the user is on `main` and there are commits not on remote, suggest creating a branch before pushing.
- **Merge conflicts or unresolved state**: if `git status` shows conflicts, tell the user to resolve them first and stop.
- **No remote configured**: if `git remote` returns nothing, tell the user and skip the push step.
