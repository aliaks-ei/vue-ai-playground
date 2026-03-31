# Style Guide for Recommendations

Follow these constraints when making suggestions.

## Core Principles

1. **Be constructive** - Acknowledge what's done well before diving into improvements
2. **Justify suggestions** - Explain WHY something should change, not just WHAT to change

## Code Requirements

**Every issue MUST include code snippets:**
1. The actual current code (copy from diff or file)
2. The suggested improvement as runnable code

Vague advice is not acceptable. Instead of "extract to a composable", show:
- The composable signature
- The usage at call sites
- How it integrates

## Recommendation Preferences

- Prefer solutions that **reduce complexity** and **improve clarity** even if they add a small amount of code
- Prefer **local, incremental refactors** over "big rewrite"
- Reference existing patterns in the codebase when suggesting abstractions
- Avoid recommending new libraries — the stack (Vue 3, Vite, TypeScript, Vitest) is sufficient
- Respect the `App.vue`-as-orchestrator pattern — don't suggest Pinia/Vuex or component-level state management
- Prefer `computed` over `watch` for derived values
- Use `type` not `interface` for TypeScript definitions

## When Proposing New Abstractions

Define:
- Boundary + responsibility
- Input/output types (TypeScript `type` definitions)
- Error strategy (must use `idle | loading | success | error` for async state)
- How it will be tested (Vitest, following `agent_docs/testing.md` conventions)

## Scope

- This is a small codebase (~8 source files) — read changed files fully, don't skim
- Focus on **concrete, actionable suggestions** with specific file/line references
- Don't speculate about performance — only flag issues with evidence or clear reasoning
- Don't suggest over-engineering for a client-side weather dashboard
