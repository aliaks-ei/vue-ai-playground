Review this pull request only for documentation drift in `AGENTS.md` and `agent_docs/`.

The checkout is the PR merge ref. Use:
- `git diff --name-status HEAD^1 HEAD` to list the files changed by the PR.
- `git diff HEAD^1 HEAD -- <path>` to inspect the code changes for a specific file.

Repository guidance:
- Map code and workflow changes to the relevant doc files in `agent_docs/` and `AGENTS.md`.
- Suggest doc updates when commands, CI behavior, architecture boundaries, data flow, Open-Meteo normalization, storage behavior, UI responsibilities, or testing expectations changed.
- Ignore unrelated code review issues. This is a docs-maintenance review only.

Output requirements:
- Return markdown only.
- Start with `## Codex Docs Review`.
- If no documentation updates are needed, say `No AGENTS.md or agent_docs updates needed for this PR.` in a short paragraph.
- If updates are needed, use flat bullets in this format:
  - `target doc`: what changed in code, what the doc should say now, and which changed files triggered the suggestion.
- Keep the response concise and actionable.
