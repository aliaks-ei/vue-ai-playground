---
name: ci-fix
description: >
  Diagnose and fix a failing GitHub Actions CI job for this Vue 3 + Vite + TypeScript
  weather dashboard. Use this skill whenever the user shares a GitHub Actions URL, run ID,
  job ID, or PR link and asks why CI failed, what the issue is, or how to fix it. Also
  triggers on phrases like "CI is failing", "fix the failing test", "what's wrong with CI",
  "build is broken", "job failed", "why is this check red", "lint error", or "type-check
  failed". The skill fetches failure logs via `gh`, explains the root cause clearly,
  proposes the most concise fix, and applies it if the user confirms.
model: sonnet
---

# CI Fix

## Project context

This is a Vue 3 + Vite + TypeScript client-side weather dashboard. The CI pipeline
typically runs these checks (matching the project's npm scripts):

```bash
npm run lint        # ESLint (flat config with typescript-eslint)
npm run type-check  # vue-tsc --noEmit
npm run test        # Vitest (jsdom environment, globals enabled)
npm run build       # Vite production build
```

Tests live in two places:
- `src/lib/*.test.ts` — unit tests for shared logic
- `src/components/*.test.ts` — component tests using @vue/test-utils

Test files use `.test.ts` (not `.spec.ts`). The testing framework is Vitest with jsdom.
Read `agent_docs/testing.md` before modifying any test.

## Input formats

The user may provide any of the following — all are valid:
- Full GitHub Actions URL: `https://github.com/org/repo/actions/runs/12345/job/67890`
- Run URL with `?pr=N` query param
- Just a run ID: `12345`
- A job ID alongside a run ID
- A PR URL or PR number (fetch the latest run from it)
- No ID at all — just "CI is failing" (resolve from the current branch)

## Step 1 — Fetch failure information

Parse the identifier from the user's message. Extract `run_id` and optionally `job_id`.

Run these in parallel:

```bash
# Summary with annotations
gh run view <run_id> [--job <job_id>] 2>&1

# Failed log lines only (most useful)
gh run view <run_id> [--job <job_id>] --log-failed 2>&1 | head -300
```

If you only have a PR number and no run ID, resolve it first:
```bash
gh pr checks <pr_number> 2>&1
```

If you have no identifier at all, find the latest run for the current branch:
```bash
gh run list --limit 5 --branch $(git branch --show-current) 2>&1
```

If the run is still in progress, report that to the user and offer to wait or analyze the most recent failed run.

## Step 2 — Diagnose the failure

Read the log output carefully. Identify the **failure category** — this shapes how you search for the fix:

| Category | Signals | Where to look |
|---|---|---|
| **Failing test** | `AssertionError`, `expected ... to`, `✗`, `FAIL` + `.test.ts` path | The test file + the source it tests |
| **Type error** | `TS2345`, `Type 'X' is not assignable`, `vue-tsc` output | The `.vue` or `.ts` file at the error path |
| **Lint error** | `eslint`, rule name like `@typescript-eslint/...` | The file at the error path |
| **Build error** | `Cannot find module`, `SyntaxError`, Vite/Rollup output | Import paths, tsconfig, vite.config.ts |
| **SFC compile error** | `[@vue/compiler-sfc]`, template expression error | The `.vue` file's `<template>` or `<script>` block |
| **Missing dependency** | `npm ERR!`, `ERESOLVE`, `not found` | package.json |

### Common patterns in this project

- **vue-tsc stricter than IDE**: `vue-tsc --noEmit` catches template type errors that VS Code may not flag. Look at the `<template>` section of the `.vue` file for prop type mismatches or missing reactive unwrapping.
- **Discriminated union narrowing**: The project uses `idle | loading | success | error` state types. Type errors often come from not narrowing the state before accessing fields like `.data` or `.error`.
- **jsdom limitations**: Tests run in jsdom, which lacks some browser APIs. If a test fails with `ReferenceError: X is not defined`, the fix is usually a mock or polyfill, not changing production code.
- **ESLint flat config**: This project uses `eslint.config.js` (flat config), not `.eslintrc`. If you need to check or adjust rules, look there.

For each failure, note:
1. **What** failed (file, line, assertion)
2. **Why** it failed — what changed that broke it

Read the relevant source files to confirm your diagnosis. Don't guess — look at the actual code.

## Step 3 — Explain the issue

Write a short, plain-English explanation:
- **What broke**: one sentence
- **Why**: one sentence explaining the root cause

Keep it under 5 sentences total. Quote only the key log snippet that shows the problem.

## Step 4 — Propose fix(es)

Propose the **most concise fix**. If there are genuine trade-offs (e.g., fixing the test vs. changing production code), list 2–3 options briefly and let the user choose.

Prefer fixing the right thing:
- If the production code is correct and the test is stale → fix the test
- If the test is correct and production code regressed → fix the production code
- If it's ambiguous → say so and ask

## Step 5 — Apply the fix (with confirmation)

Ask: "Want me to apply this fix?"

If the user confirms, apply the fix using Edit. Then run the relevant check to verify:

```bash
# For a failing test:
npm run test

# For a type error:
npm run type-check

# For lint:
npm run lint

# For a build error:
npm run build
```

Report the result. If the fix didn't work, re-diagnose from the new output.
