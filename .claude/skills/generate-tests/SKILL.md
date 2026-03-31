---
name: generate-tests
description: Generate Vitest unit tests for Vue components, TypeScript, and JavaScript files. Use this skill whenever the user asks to "write tests", "add tests", "cover with tests", "generate tests", "test this file", "test this folder", or mentions test coverage for any .vue, .ts, or .js file. Also triggers when the user provides a file or folder path and asks for testing.
---

# Generate Tests

You generate Vitest unit tests for Vue 3 + TypeScript projects. You receive a file or folder path and produce colocated `.test.ts` files that follow the project's testing guidelines.

## Before you start

1. Read the project's testing guidelines at `agent_docs/testing.md` — these are the rules you must follow.
2. Read the project's `CLAUDE.md` for architecture context and available commands.
3. Read each target file thoroughly before writing its tests. Understand what the module exports and how it's used.

## Deciding what to test

For each file, identify the **public interface** — exported functions, component props, emitted events, rendered output. Focus on behavior users and consumers rely on, not implementation details.

### High-value targets (always test)
- Pure utility functions and their edge cases
- Component rendering based on different prop combinations
- User interactions (click, input, submit) and their effects
- Conditional states: loading, error, empty, success
- Error handling paths

### Skip
- Internal ref/reactive values — test the DOM effect instead
- CSS classes for styling
- Third-party library behavior
- Trivially true behavior (e.g., "Vue reactivity works")

## File discovery

When given a **folder path**, find all `.vue`, `.ts`, and `.js` files in it (recursively). Exclude files that already have a colocated `.test.ts` file, and exclude type-only files (like `types.ts`, `env.d.ts`), entry points (`main.ts`), and config files.

When given a **single file**, generate tests for that file regardless of whether tests already exist (the user may want to replace or supplement them).

## Test file conventions

- **Location**: colocate test files next to the source file. `Foo.vue` → `Foo.test.ts`, `utils.ts` → `utils.test.ts`.
- **Naming**: use `.test.ts` extension (not `.spec.ts`).
- **Imports**: explicitly import test utilities from `vitest`:
  ```ts
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  ```
- **Structure**: one top-level `describe` block per file, named after the module. No nested `describe` blocks.
- **Test names**: write descriptive names that read as specifications. A failing test name should tell you what broke.
- **AAA pattern**: separate Arrange, Act, Assert with blank lines.
- **Parameterized tests**: use `it.each` when multiple cases share identical structure.
- **Mock cleanup**: include `afterEach(() => { vi.restoreAllMocks() })` when mocks are used.

## Testing Vue components

Use `@vue/test-utils` with `mount` (not `shallowMount`). Only stub children that make network calls or use timers.

```ts
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
```

- Test the component's **public interface**: props in → DOM output and emitted events out.
- Use `data-test` selectors to find elements. If the component lacks them, add them.
- Always `await` after `.trigger()`, `.setValue()`, or state changes before asserting.
- Mock module-level dependencies (API calls, storage) with `vi.mock()`.
- For async operations, use `await flushPromises()` after triggering them.

## Testing utility functions

- Import the function and call it directly.
- Test happy paths, edge cases (empty input, null, boundary values), and error cases.
- Use `vi.fn()` / `vi.spyOn()` for observing side effects.
- Mock `fetch` globally when testing API functions: `vi.stubGlobal('fetch', vi.fn())`.

## Mock helpers

Define reusable mock factory functions at the top of the test file when a mock object is used in multiple tests. Follow the pattern:

```ts
function mockCity(overrides: Partial<City> = {}): City {
  return {
    id: 1,
    name: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    country: 'Germany',
    admin1: 'Berlin',
    timezone: 'Europe/Berlin',
    ...overrides,
  }
}
```

This keeps tests DRY while allowing per-test customization via the `overrides` parameter.

## Workflow

1. Read all target files.
2. For each file, read its imports to understand dependencies that may need mocking.
3. Write the test file.
4. Run `npm run test` to verify all tests pass.
5. Run `npm run type-check` to verify no type errors.
6. Run `npm run lint` to verify code style.
7. If any check fails, fix the issues and re-run.
8. Report a summary: which files were tested, how many test cases were written, and any files that were skipped (with reasons).

## Adding data-test attributes

When testing Vue components, if the component lacks `data-test` attributes on elements you need to query, add them directly to the component's template. This is expected — `data-test` attributes are part of the testing contract and should be committed alongside the tests.
