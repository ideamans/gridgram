---
name: gg-icons
description: Find the right built-in Tabler icon for a gridgram diagram. Use when the user asks to pick an icon, find an icon, suggest icons for a concept, list icons by tag or category, or decide whether to use the outline or filled style. gridgram ships 5,039 outline + 1,053 filled Tabler icons, searchable via the `gg icons` CLI.
license: MIT
compatibility: Requires the gridgram `gg` CLI on PATH. Run `gg icons` to confirm.
allowed-tools: Bash(gg:*)
---

# gg-icons

Help the user pick an icon by driving the `gg icons` semantic search CLI.

## When the user is vague

If they say "an icon for a database", go straight to `--search`:

```bash
gg icons --search database --limit 10 --format json
```

Score ≥ 5 results are usually solid. Show the top 3–5 as `tabler/<name>` refs plus the label.

## When the user has a concept but no keyword

Start from tags:

```bash
gg icons --tags --limit 30
```

Surface high-frequency tags that relate to the user's domain ("cloud", "payment", "security", etc.), then:

```bash
gg icons --tag <tag> --limit 15 --format json
```

## When the user wants filled vs outline

- Outline is the default `tabler/<name>` reference.
- Filled is `tabler/filled/<name>` and only exists for 1,053 icons.
- To restrict search to filled: `gg icons --set tabler-filled --search <query>`.

## Always return refs agents can paste

Give answers as literal reference strings so the user (or another skill) can drop them into a `.gg` file:

```
tabler/server       # for "API backend"
tabler/database     # for "storage"
tabler/cloud        # for "CDN" or "hosted service"
```

## Scoring cheatsheet

`gg icons --search` returns each hit with a `score`:

| score | match type          |
| ----- | ------------------- |
| 10    | exact name          |
| 7     | name prefix         |
| 5     | exact tag           |
| 4     | name substring      |
| 3     | label substring     |
| 2     | category substring  |
| 1     | tag substring       |

If everything ties low, broaden to tags. If nothing scores above 2, tell the user nothing good matches and suggest a synonym.
