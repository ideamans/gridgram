# gridgram plugin for AI agent hosts

This directory packages gridgram as an [Agent Skills](https://agentskills.io/)
plugin. The same skills are consumable by:

- **Claude Code** via the [plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) flow
- **GitHub CLI** via `gh skill install …`
- Cursor, Gemini CLI, Codex, and any other host that speaks the Agent Skills
  open standard

## Layout

```
plugins/gridgram/
├── .claude-plugin/
│   └── plugin.json                 # Claude marketplace manifest
├── skills/
│   ├── gg-render/SKILL.md          # render / validate a .gg file
│   ├── gg-icons/SKILL.md           # search the 6,000+ built-in Tabler icons
│   ├── gg-author/SKILL.md          # compose a new diagram from a description
│   └── gg-install/SKILL.md         # install or update the gg CLI from GitHub releases
└── README.md (this file)
```

Every `SKILL.md` uses the standard frontmatter fields only (`name`,
`description`, `license`, `compatibility`, `allowed-tools`). Claude-specific
behavior lives under `metadata.claude-code.*` when it's needed, so the skills
remain portable.

Run the validator before publishing:

```bash
bun scripts/validate-plugin-skills.ts
```

## Installation paths

### Claude Code — via a marketplace

1. Create a marketplace repository (e.g. `ideamans/claude-public-plugins`) with a
   `.claude-plugin/marketplace.json` that lists this plugin:

   ```json
   {
     "name": "ideamans-plugins",
     "owner": { "name": "Ideamans Inc.", "email": "support@ideamans.com" },
     "plugins": [
       {
         "name": "gridgram",
         "source": {
           "source": "git-subdir",
           "url": "https://github.com/ideamans/gridgram.git",
           "path": "plugins/gridgram"
         },
         "description": "Adds /gg-render, /gg-icons, and /gg-author skills.",
         "homepage": "https://github.com/ideamans/gridgram",
         "keywords": ["diagram", "tabler", "dsl"]
       }
     ]
   }
   ```

2. Users then install from Claude Code:

   ```
   /plugin marketplace add ideamans/claude-public-plugins
   /plugin install gridgram@ideamans-plugins
   ```

### Claude Code — directly from this repo (testing)

From a local checkout:

```
/plugin marketplace add ./plugins/gridgram   # treats it as a single-plugin marketplace
```

(Requires the repo to be added to `extraKnownMarketplaces` or used via
`--scope project`; see the Claude docs.)

### GitHub CLI (`gh skill`)

```bash
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-render --agent claude-code
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-icons
gh skill install ideamans/gridgram/plugins/gridgram/skills/gg-author
```

`gh skill` writes `repository` / `ref` / tree SHA into the frontmatter on
install so `gh skill update` can detect changes. That's fine with our
SSOT-first policy: a bump in this repo flows through to everyone.

## Runtime dependency

All three skills rely on the `gg` CLI being on `PATH`. The skill body points
users at:

- **Install**: `bun install -g gridgram` (once published) or the standalone
  binary from https://github.com/ideamans/gridgram/releases
- **Sanity check**: `gg --version` and `gg icons --tags --limit 3`

If `gg` is missing, each skill prompts the user to install it rather than
silently failing.

## Maintenance

When the gridgram version bumps (`package.json`), bump
`plugins/gridgram/.claude-plugin/plugin.json:version` to match. The test
`plugin.json version matches package.json` enforces this. Keep the `name`
fields on each `SKILL.md` in sync with the parent directory name — the
validator enforces that too.
