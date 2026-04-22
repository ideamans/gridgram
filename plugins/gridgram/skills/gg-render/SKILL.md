---
name: gg-render
description: Render a .gg file to SVG, PNG, or a JSON envelope using the gridgram CLI. Use when the user asks to render, build, compile, or preview a gridgram diagram, or when they want to validate a .gg file and see its placement diagnostics. Also use when given a TypeScript DiagramDef and asked to produce an image.
license: MIT
compatibility: Requires the gridgram `gg` CLI on PATH (`bun install -g gridgram` or the standalone binary from https://github.com/ideamans/gridgram/releases).
allowed-tools: Bash(gg:*) Bash(bun:*) Read Write
---

# gg-render

Render a gridgram diagram and surface any problems the user should know about.

## Inputs to collect

- The diagram source. Preferred: a path to a `.gg` file. Also acceptable: inline `.gg` text (write it to a tempfile), or a TypeScript `DiagramDef` (the user should be on the TS side of the API in that case; see `gg llm` for the envelope schema).
- The desired output: `svg` (default), `png`, or `json` (the merged `DiagramDef` + diagnostics).
- Optional: `--width`, `--cell-size`, `--frame`, `--icons <dir>`, `--alias name=dir`.

## Workflow

1. **Locate or materialize the source.** If the user pasted `.gg` text, write it to `./tmp.gg` (or a path they specified).
2. **Validate first.** Always run:
   ```bash
   gg <input.gg> --format json --diagnostics --stdout > /tmp/gg-check.json 2>/tmp/gg-diag.json
   ```
   - Exit code `1` → parse error (bad syntax). Show the stderr verbatim.
   - Exit code `2` → integrity error (unknown node ref, region not 4-connected, etc.).
   - Exit code `3` → I/O or environment (missing sharp for PNG, missing file, etc.).
3. **Check diagnostics.** Even on exit `0`, `/tmp/gg-diag.json` may contain warnings (unresolved icons, routing failures, collisions). Summarize them for the user.
4. **Produce the final artifact:**
   ```bash
   gg <input.gg> -o <output>.svg          # or .png, or .json
   ```
   Respect any width/scale/frame flags the user supplied.
5. **Report** the output path, the size (if PNG/SVG), and the diagnostics count. If diagnostics are non-empty, suggest concrete fixes (e.g. "icon `tabler/serverr` not found — did you mean `tabler/server`?").

## Best practices

- Use `tabler/<name>` (outline) or `tabler/filled/<name>` for icons. Use the `/gg-icons` skill to search when unsure.
- Prefer A1 position strings (`@A1`) over tuples for human-readable source.
- Never hand-edit SVG output; rerender from `.gg` instead.
