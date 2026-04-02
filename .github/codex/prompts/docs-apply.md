Apply the documentation updates requested by the existing Codex docs review comment for this pull request.

Read `.codex-docs-apply/context.md` first.

Requirements:
- Only edit `AGENTS.md` and files under `agent_docs/`.
- Do not edit application code, tests, workflows, prompts, package metadata, or lockfiles.
- Use the existing Codex docs review comment as guidance, but verify each change against the actual pull request diff before editing.
- If the review comment says no documentation updates are needed, make no changes.
- Prefer the smallest accurate doc update that keeps repository guidance in sync with the code and workflow behavior.
- Keep markdown concise and aligned with the current style of the repo docs.

Useful workflow:
- Read the base ref from `.codex-docs-apply/context.md`.
- Inspect the PR diff with `git diff --name-status origin/<base-ref>...HEAD`.
- Inspect specific files with `git diff origin/<base-ref>...HEAD -- <path>`.
- Read only the relevant docs before editing.

Output requirements:
- Return markdown only.
- Start with `## Codex Docs Apply`.
- If you changed docs, summarize which doc files you updated and why.
- If you did not change docs, say `No documentation changes were applied.` in a short paragraph.
