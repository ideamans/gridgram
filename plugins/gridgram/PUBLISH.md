# Publishing checklist — gridgram plugin

Use this before pushing changes that affect `plugins/gridgram/**` to the
`ideamans/gridgram` repository, and before any marketplace update in
`ideamans/claude-plugins`.

## Pre-push checklist

- [ ] `plugins/gridgram/.claude-plugin/plugin.json` `version` equals
  root `package.json` `version`. The test
  `plugin.json version matches package.json` enforces this locally.
- [ ] `bun scripts/validate-plugin-skills.ts` passes with 0 errors and
  0 warnings.
- [ ] `claude plugin validate plugins/gridgram` returns ✔.
- [ ] `bun run typecheck && bun test` green — in particular
  `tests/unit/plugin-skills.test.ts`.
- [ ] Every SKILL.md description contains the discovery keywords the
  tests assert on (e.g. `gg-render` must mention "render", "gridgram",
  "diagnostics").
- [ ] `README.md` (in this directory) cites the correct install flow —
  the runtime dependency (`gg` CLI on PATH) is accurate.

## Marketplace update flow

Once `plugins/gridgram/**` is pushed to `ideamans/gridgram`:

```bash
# In ideamans/claude-plugins checkout:
claude plugin validate .           # marketplace.json schema
git pull && git status             # ensure clean
# If you changed plugin metadata (description/version/keywords), update
# the corresponding entry in .claude-plugin/marketplace.json.
git commit -am "gridgram: bump to <version>"
git push                           # downstream users pick up via
                                   #   /plugin marketplace update
```

The `git-subdir` source pins to the default branch of `ideamans/gridgram`.
To pin to a release tag, add `ref: "v<version>"` or a `sha` field — see
the Claude docs on plugin sources.

## When to bump version

| Change type                                       | Bump         |
| ------------------------------------------------- | ------------ |
| Skill body text only (instructions, examples)     | patch        |
| New skill / breaking skill removal                | minor / major|
| `allowed-tools` widened                           | patch        |
| `plugin.json.keywords` / description tweak        | patch        |
| gridgram CLI surface change that skills rely on   | match the CLI's own version |

Keep `plugin.json.version` aligned with `package.json.version`. If the
library is at `0.4.0` and this plugin only had a skill body tweak, bump
**both** to `0.4.1` together so downstream users can trust the version
label to reflect the full product.
