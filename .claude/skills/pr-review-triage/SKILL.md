---
name: pr-review-triage
description: Triages and prioritizes PR review comments from GitHub — fetches all comments, classifies them by relevance and priority, suggests concrete fixes, and lets the user pick which ones to implement. Use this skill whenever the user wants to process PR feedback, handle review comments, triage a PR review, deal with reviewer requests, or asks things like "what do reviewers want me to fix", "go through PR comments", "handle PR feedback", "triage review", "process review comments", "what changes are requested", or shares a PR link/number and asks about the comments or feedback on it.
---

# PR Review Triage

Process incoming PR review comments: fetch, classify, prioritize, suggest fixes, and implement the ones the user approves.

## Why This Skill Exists

PR reviews can have dozens of comments — some critical bugs, some style nits, some outdated or resolved threads. Manually sorting through them wastes time. This skill reads all the comments, figures out which ones matter, suggests what to do about each one, and then implements whichever fixes the user wants.

## Phase 1: Fetch PR Comments

### Identify the PR

The user will provide a PR number, URL, or you may infer it from the current branch:

```bash
# If user gave a PR number or URL, use it directly
# Otherwise, find the PR for the current branch:
gh pr list --head "$(git branch --show-current)" --json number,title --jq '.[0]'
```

### Gather all comments

Fetch both review comments (on specific lines) and general conversation comments:

```bash
# Review comments (inline on code)
gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate

# General PR comments (conversation thread)
gh api repos/{owner}/{repo}/issues/{number}/comments --paginate

# PR review summaries (top-level review bodies)
gh api repos/{owner}/{repo}/pulls/{number}/reviews --paginate
```

Also fetch the PR diff for context:
```bash
gh pr diff {number}
```

### Extract comment data

For each comment, capture:
- **Author** and **date**
- **Body** (the actual comment text)
- **Location** (file path + line number, if it's an inline comment)
- **State** (is this part of a review that was "approved", "changes_requested", or "commented"?)
- **Thread context** (is this a reply in a thread? what was the parent?)
- **Resolution status** (resolved/outdated threads can be deprioritized)

---

## Phase 2: Classify and Prioritize

### Relevance classification

Mark each comment as **Relevant** or **Not Relevant**:

**Not Relevant** — skip these:
- Resolved or outdated threads
- Pure praise ("+1", "nice!", "LGTM", "looks good")
- Bot-generated comments (CI status, coverage reports, auto-labels)
- Comments by the PR author themselves (self-notes, responses to reviewers)
- Discussion that concluded without an action item
- Questions that were already answered in the thread

**Relevant** — these need attention:
- Requested changes (explicit or implied)
- Bug reports or correctness concerns
- Performance or security issues
- Style/convention violations the project enforces
- Questions from reviewers that are still unanswered
- Suggestions with concrete code alternatives

### Priority levels

For relevant comments, assign priority:

| Priority | Meaning | Examples |
|----------|---------|---------|
| **P1 - Blocker** | Must fix before merge. Correctness, security, or data loss risks. | Race condition, SQL injection, wrong business logic |
| **P2 - Important** | Should fix. Maintainability, performance, or convention issues the reviewer explicitly requested. | Missing error handling, inefficient algorithm, violates project patterns |
| **P3 - Nice-to-have** | Consider fixing. Style nits, minor improvements, optional suggestions. | Variable naming, slight readability improvement, "you could also..." |

### Read the code

Before suggesting fixes, read the actual files mentioned in relevant comments. Understanding the surrounding code is essential — don't suggest fixes based on the diff alone.

---

## Phase 3: Present the Triage Report

Present all comments in a structured report. The report should give the user a clear picture in under 30 seconds of scanning.

### Format

```
## PR Review Triage: #{number} — {title}

**{X} comments total** | {Y} relevant | {Z} not relevant

---

### Blockers (P1)

**1.** `src/lib/openMeteo.ts:42` — @reviewer: "This fetch call has no timeout..."
   - **Fix:** Add AbortController with 10s timeout
   - **Effort:** Small (5 lines)

**2.** ...

### Important (P2)

**3.** `src/components/CitySearch.vue:18` — @reviewer: "Debounce delay should be configurable..."
   - **Fix:** Extract delay to a prop with default value of 300ms
   - **Effort:** Small

### Nice-to-have (P3)

**4.** `src/App.vue:55` — @reviewer: "Minor: could destructure here"
   - **Fix:** Destructure the weather entry in the v-for
   - **Effort:** Trivial

---

### Not Relevant (skipped)
- @bot: Coverage report — 82% (+0.3%) *(bot comment)*
- @reviewer: "Nice refactor!" *(praise)*
- @author: "Good point, will fix" *(self-note, captured in #3 above)*
```

### Key rules for the report

- Summarize each comment concisely — don't dump the raw text, paraphrase to the actionable core
- Quote the reviewer's key phrase so the user recognizes which comment you mean
- Every relevant comment gets a concrete suggested fix, not vague advice
- Include effort estimate (Trivial / Small / Medium / Large) so the user can make informed tradeoffs
- Group by priority, not by file or reviewer
- Show not-relevant comments in a collapsed/brief list so the user can sanity-check your filtering

### After presenting

Ask the user:

> Which fixes would you like me to implement? (e.g., "all P1 and P2", "1, 3, 5", "all", or "none — just wanted the overview")

**Wait for the user's response before proceeding.**

---

## Phase 4: Implement Approved Fixes

Once the user selects which fixes to apply:

1. **Implement** each approved fix using the Edit tool
2. **Read** each modified file fully after editing to verify correctness
3. **Run verification** per CLAUDE.md:
   - `npm run lint`
   - `npm run type-check`
   - If test files or component logic changed: `npm run test`
4. **Fix** any issues from step 3 before reporting
5. **Report** what was done:

```
## Applied Fixes

- #1 `src/lib/openMeteo.ts:42` — Added AbortController timeout
- #3 `src/components/CitySearch.vue:18` — Extracted debounce delay to prop

## Skipped
- #2 (user declined)
- #4 (user declined)

## Verification
- Lint: PASS
- Type-check: PASS
- Tests: PASS (if run)
```

6. **Suggest** replying to reviewers: "Want me to post replies on the resolved comments to let reviewers know the fixes are in?"

---

## Edge Cases

- **Empty reviews**: If the PR has no comments, say so and suggest running `pr-refactor-review` for a self-review instead.
- **Conflicting comments**: If two reviewers disagree, flag it and let the user decide. Don't pick sides.
- **Stale comments**: If a comment refers to code that's already been changed since the review, note it as potentially resolved and let the user confirm.
- **Large PRs**: If there are 30+ relevant comments, ask if the user wants to tackle them in batches (e.g., "P1 first, then P2").
