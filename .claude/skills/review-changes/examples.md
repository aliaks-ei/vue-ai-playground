# Example Scenarios

## When to Use This Skill

### Scenario 1: Pre-review refactoring check
**User**: "Review my changes for refactoring opportunities"
**Use case**: User wants suggestions for improving code before submitting for review

### Scenario 2: Code quality improvement
**User**: "What can I improve in this code?"
**Use case**: User wants to improve code quality before merging

### Scenario 3: Anti-pattern detection
**User**: "Check my code for issues"
**Use case**: User wants to check for anti-patterns and convention violations

### Scenario 4: Comprehensive PR review
**User**: "I'm about to open a PR. Can you review my code for any issues?"
**Use case**: User wants a thorough review for anti-patterns, performance concerns, and refactoring opportunities

### Scenario 5: Casual pre-merge sanity check
**User**: "look over my branch before I merge"
**Use case**: Quick scan for anything obviously wrong or improvable

---

## Example Review Flow

1. Run git commands to gather context
2. Read diffs and understand what changed
3. Read full changed files (small codebase — always read fully)
4. **Write the Understanding Summary** (prove you get it)
5. Evaluate the approach (architecture, state management, reactivity, correctness)
6. Check for convention violations (secondary)
7. Compile prioritized action items

---

## Good vs Bad Review Comments

### Bad (vague)
> "Consider extracting this to a composable"

### Good (concrete)
> ```typescript
> // Current code (src/App.vue:45-52)
> const activeWeather = computed(() => savedCities.value.filter(c => c.status === 'success'))
> const sortedWeather = computed(() => activeWeather.value.sort((a, b) => a.name.localeCompare(b.name)))
>
> // Suggested: Combine into single computed to avoid intermediate reactivity overhead
> const sortedActiveWeather = computed(() =>
>   savedCities.value
>     .filter(c => c.status === 'success')
>     .sort((a, b) => a.name.localeCompare(b.name))
> )
> ```

### Bad (no justification)
> "This should use a Map instead of an object"

### Good (justified)
> "This lookup runs on every re-render when the city list changes. Using a Map keyed by city ID instead of `Array.find()` reduces lookup from O(n) to O(1), which matters when the user has many saved cities."

---

## Full Review Example

Below is a condensed example of a complete review output for a branch that adds weather caching.

### Understanding Summary

This PR adds a client-side cache for weather API responses. It introduces a `WeatherCache` type in `src/lib/types.ts`, adds `getCache`/`setCache` helpers to `src/lib/storage.ts`, and updates `App.vue` to check the cache before calling `fetchWeather`. Cached entries expire after 15 minutes.

### Suggestions

1. **[Critical]** `src/lib/storage.ts:32-38` — Cache never invalidated on city removal

   When a user removes a saved city, its cached weather data stays in `localStorage` indefinitely. Over time this leaks storage.

   Current:
   ```typescript
   function removeCity(key: string) {
     const cities = getSavedCities()
     const updated = cities.filter(c => cityKey(c) !== key)
     localStorage.setItem(CITIES_KEY, JSON.stringify(updated))
   }
   ```

   Suggested:
   ```typescript
   function removeCity(key: string) {
     const cities = getSavedCities()
     const updated = cities.filter(c => cityKey(c) !== key)
     localStorage.setItem(CITIES_KEY, JSON.stringify(updated))
     localStorage.removeItem(`weather_cache_${key}`)
   }
   ```

   Why: Without cleanup, removed cities leave orphaned cache entries. With localStorage's ~5MB limit, this could eventually cause `setItem` to throw.

2. **[Important]** `src/App.vue:61` — Cache check doesn't respect the `WeatherEntry` state model

   Current:
   ```typescript
   const cached = getCache(key)
   if (cached) {
     weatherData.value[key] = cached
     return
   }
   ```

   Suggested:
   ```typescript
   const cached = getCache(key)
   if (cached) {
     weatherData.value[key] = { status: 'success', data: cached, fetchedAt: cached.timestamp }
     return
   }
   weatherData.value[key] = { status: 'loading' }
   ```

   Why: The codebase uses a discriminated union (`idle | loading | success | error`) for weather state. Assigning raw cached data bypasses this model, which could cause template `v-if` guards to show the wrong state.

3. **[Minor]** `src/lib/storage.ts:45` — Magic number for cache TTL

   Current: `if (Date.now() - entry.timestamp > 900000) return null`
   Suggested:
   ```typescript
   const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
   if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null
   ```

   Why: 900000 is not self-documenting. A named constant makes the intent and value immediately clear.
