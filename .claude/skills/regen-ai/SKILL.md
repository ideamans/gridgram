---
name: regen-ai
description: Regenerate all AI-facing derived artifacts (src/generated/icon-index.json, src/generated/llm-reference.md, docs/public/llms.txt, docs/public/llms-full.txt) from the gridgram SSOT. Use after editing the .gg grammar (src/gg/dsl.ts), CLI args (src/cli/args.ts), the llm-reference template (src/templates/llm-reference.template.md), the example .gg files in examples/, or before merging a branch that touches any of those.
allowed-tools: Bash(bun run *) Bash(bun scripts/*) Bash(git diff*) Bash(git status*) Read Grep
license: MIT
---

# regen-ai

Regenerate every AI-facing derived artifact in dependency order, verify the
result, and report what changed.

## Steps

1. **Check git status** so the user knows what was pending before the regen.
   ```bash
   git status --short
   ```
2. **Regenerate** the full chain:
   ```bash
   bun run ai:regen
   ```
   This invokes three scripts in order:
   - `scripts/build-icon-index.ts` → `src/generated/icon-index.json`
   - `scripts/build-llm-reference.ts` → `src/generated/llm-reference.md`
   - `scripts/build-llms-txt.ts` → `docs/public/llms.txt` + `docs/public/llms-full.txt`
3. **Verify** the code still compiles and tests still pass:
   ```bash
   bun run typecheck && bun test
   ```
4. **Summarize** for the user:
   - which generated files changed (`git diff --stat` on the generated paths, if tracked)
   - typecheck + test outcome (pass/fail counts)
   - any warnings printed by the generators

## Notes

- `src/generated/` and `docs/public/llms*.txt` are currently `.gitignore`d — a
  regen changes the local working copy but leaves `git status` untouched for
  those paths. Downstream consumers either bundle them at build time
  (`gg --compile`) or regenerate at docs-deploy time. Mention this to the
  user if they're expecting to commit the output.
- If `bun run sync-tabler` hasn't been run in this checkout yet,
  `src/data/tabler-*.json` will be missing and the regen fails fast. Guide
  the user to run `bun install && bun run sync-tabler` first.
- Do **not** hand-edit a generated file to paper over a failure. See
  `.claude/rules/ai-artifacts-policy.md` — fix the source (grammar comment,
  template, example, arg definition) and rerun `/regen-ai`.
