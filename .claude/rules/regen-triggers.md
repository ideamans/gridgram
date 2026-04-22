---
paths:
  - "src/cli/args.ts"
  - "src/cli/commands/**/*.ts"
  - "src/cli/gg.ts"
  - "src/gg/dsl.ts"
  - "src/gg/parser.ts"
  - "src/gg/diagnostics.ts"
  - "src/types.ts"
  - "src/data/icon-tags.json"
  - "src/templates/llm-reference.template.md"
  - "examples/**/diagram.gg"
  - "examples/**/diagram.ts"
  - "package.json"
---

# Regen triggers

You are editing a file that feeds the AI-artifact generators. When this turn
produces a code change in any of the `paths` above:

1. **Regenerate before committing**: run the `regen-ai` skill (`/regen-ai`)
   or `bun run ai:regen` directly. This refreshes:
   - `src/generated/icon-index.json`
   - `src/generated/llm-reference.md`
   - `docs/public/llms.txt` and `docs/public/llms-full.txt`
2. **Run typecheck + tests** (`bun run typecheck && bun test`) after the
   regen. Surface any newly-failing tests to the user before moving on.
3. **Do not hand-edit generated files** to silence a test failure — fix the
   source and regenerate instead. See `.claude/rules/ai-artifacts-policy.md`.

For a release (tag push), `bun run ai:regen` is mandatory; `docs:build`
reruns `build-llms-txt` automatically, but `src/generated/` is populated by
`sync-tabler` and so is only fresh if `bun install` + `bun run sync-tabler`
ran.
