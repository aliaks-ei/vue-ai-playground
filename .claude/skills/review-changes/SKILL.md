---
name: review-changes
description: Reviews current branch changes in this Vue 3 + Vite + TypeScript weather dashboard for correctness, approach, scalability, readability, performance, and maintainability. Use this skill whenever the user asks to review their changes, check their code, get refactoring suggestions, do a code quality review, or asks "what can I improve". Also triggers on phrases like "look over my branch", "anything I'm missing before I merge", "pre-PR review", "sanity check my diff", or any request to evaluate code changes before opening or merging a PR, even if they don't use the word "review".
model: opus
---

# Review Changes

Code reviewer for this Vue 3 + TypeScript weather dashboard — analyzes branch changes for correctness, approach quality, and maintainability, then interactively applies approved suggestions.

## Core Principles

1. **Understand before critiquing** - Never suggest changes without first demonstrating you understand the intent
2. **Approach over style** - 70% on architecture/approach, 30% on style/conventions

---

## Phase 0: Load Project Rules

Before analyzing anything, read the project's coding standards so suggestions don't violate them:

- [ ] Read `CLAUDE.md` in the repo root for project conventions and architecture constraints
- [ ] Read `agent_docs/testing.md` if the changes touch test files
- [ ] Read any other relevant `agent_docs/` files if changes touch a specific area

**Key rules to internalize:**
- State orchestration lives in `App.vue` — no global store (Pinia, Vuex, etc.)
- API and persistence logic stays in `src/lib/`, never in components
- Async state uses the discriminated union: `idle | loading | success | error` (see `WeatherEntry` in `src/lib/types.ts`)
- Use `type` not `interface` for TypeScript definitions

**Never suggest code that violates these constraints.**

---

## Phase 1: Understanding the Changes

**CRITICAL: Complete this phase before making ANY suggestions.**

### 1.1 Gather Context

- [ ] `git log --oneline -10` - Recent commits
- [ ] `git log -1 --format="%B"` - Full HEAD commit message
- [ ] `git branch --show-current` - Current branch name
- [ ] `git diff --stat main...HEAD` - Change surface
- [ ] `git status --porcelain` - Uncommitted changes

### 1.2 Read the Diffs

- [ ] `git diff main...HEAD` - Full diff against base
- [ ] If uncommitted changes exist, also check `git diff --cached` and `git diff`
- [ ] This is a small codebase (~8 source files) — read all changed files fully rather than skimming

### 1.3 Understand Related Code

- [ ] Read full files where diff lacks context
- [ ] Use `Grep` to trace integration points
- [ ] Use `Glob` to find related files (e.g., composable consumers)

### 1.4 Verify Understanding

Before proceeding, you MUST answer:
- [ ] What problem is this PR solving?
- [ ] What approach was chosen?
- [ ] What are the key components?
- [ ] How does this integrate with existing code?

**Do not proceed to Phase 2 until all boxes are checked.**

---

## Phase 2: Approach Analysis

Evaluate the implementation strategy. See `checklists/approach-evaluation.md` for detailed evaluation questions.

Key categories:
- **Correctness** - Does it solve the problem? Edge cases handled?
- **Right layer** - Is the change at the correct abstraction layer? Don't suggest frontend fixes for backend problems or vice versa. Trace through the full stack before proposing a fix.
- **Scalability** - Works at 10x scale? Algorithm complexity?
- **Readability** - Can a new dev understand it? Appropriate abstraction?
- **Maintainability** - Easy to modify? Testable? Follows existing patterns?
- **Performance** - Unnecessary computations? Reactivity efficient?

---

## Phase 3: Present Numbered Suggestions

Present suggestions as a **numbered list** so the user can selectively approve them.

### Format

```
## Understanding Summary
[Brief summary proving comprehension of the changes]

## Suggestions

1. **[Critical]** file.ts:42 — Description of the issue
   Current: `code snippet`
   Suggested: `improved code`
   Why: reasoning

2. **[Important]** other.vue:15-20 — Description
   Current: `code snippet`
   Suggested: `improved code`
   Why: reasoning

3. **[Minor]** utils.ts:8 — Description
   Current: `code snippet`
   Suggested: `improved code`
   Why: reasoning
```

### Rules for suggestions

- Every suggestion MUST include current code and concrete suggested improvement
- Categorize each as **Critical**, **Important**, or **Minor**
- Include file path and line number
- Vague advice ("extract to a composable") is not acceptable — show the code
- See `style-guide.md` for recommendation constraints

### After presenting

Ask the user:
> Which suggestions to apply? (e.g., "1, 3, 5" or "all" or "all except 2")

**Wait for the user's response. Do NOT proceed without explicit approval.**

---

## Phase 4: Apply and Verify

After receiving approval:

1. **Apply** only the approved suggestions using the Edit tool
2. **Search** for all instances of modified patterns using Grep — don't miss duplicates
3. **Run verification**:
   - `npm run lint` — no lint errors
   - `npm run type-check` — no type errors
   - `npm run test` — tests pass (if component or test files changed)
4. **Re-read** every modified file end-to-end and check for:
   - Missing or unused imports
   - Duplicate HTML/template attributes
   - Incorrect or missing optional chaining
   - Type errors from changed signatures
   - State logic leaking into components (should be in `App.vue` or `src/lib/`)
   - Violations of `CLAUDE.md` rules
5. **Fix** any issues found in step 3-4 before reporting
6. **Report** results:

```
## Applied
- #1 file.ts:42 — description
- #3 utils.ts:8 — description

## Skipped
- #2 other.vue:15 — (user declined)

## Verification
- Tests: PASS
- Lint: PASS
```

---

## Success Criteria

- [ ] Understanding Summary demonstrates comprehension of intent
- [ ] Every suggestion includes actual code snippet and concrete improvement
- [ ] Suggestions are numbered and prioritized (Critical/Important/Minor)
- [ ] User explicitly approved before any changes were made
- [ ] All approved changes verified with tests and lint
- [ ] No missed instances of modified patterns

---

## Supporting Files

| File | Use When |
|------|----------|
| `checklists/approach-evaluation.md` | Detailed evaluation questions for Phase 2 |
| `style-guide.md` | Constraints for making recommendations |
| `examples.md` | Example review scenarios and good vs bad patterns |

Note: output format is defined inline in Phase 3 (numbered suggestions) and Phase 4 (apply & verify report).
