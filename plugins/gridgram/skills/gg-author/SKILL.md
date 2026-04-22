---
name: gg-author
description: Compose a new gridgram diagram from a description. Use when the user asks you to draw, design, sketch, diagram, or visualize a system / architecture / flow as a gridgram. Produces a .gg file and renders it. Pulls icon picks via the gg-icons workflow and validates via gg-render before handing the file back.
license: MIT
compatibility: Requires the gridgram `gg` CLI on PATH and write access to the working directory.
allowed-tools: Bash(gg:*) Read Write
---

# gg-author

Turn a description into a rendered gridgram diagram.

## Workflow

1. **Clarify the subject**. Ask a single compact question if the request is ambiguous (what boxes, what arrows, one frame or multiple, etc.). Don't spin on clarifications — make reasonable defaults and flag them.
2. **Plan the grid**. gridgram is a fixed-grid renderer. Decide columns × rows before placing nodes:
   - Linear flow → 1 row, N columns.
   - Simple request/response or 2-tier → 2×2.
   - Fan-out → parent in row 1 centered, children in row 2.
3. **Pick icons**. Prefer the `gg-icons` workflow: run `gg icons --search <term> --format json --limit 5` for each concept and pick score ≥ 5. If the domain is unusual, pivot on `gg icons --tags --limit 30` first.
4. **Draft the `.gg` file**. Preferred shape (use A1 positions for readability):
   ```gg
   icon :id1 @A1 tabler/<name> "Label"
   icon :id2 @B1 tabler/<name> "Label"

   id1 --> id2 "edge label"
   ```
   - Give `:id` sigils to every node you'll reference from a connector or note.
   - Use `doc { cols: N }` if you want auto-flow without manual positions.
   - For colors/themes, use `doc { theme: { primary: "#…" } }`.
5. **Validate**. Run:
   ```bash
   gg <file.gg> --format json --diagnostics --stdout > /tmp/gg-check.json 2>/tmp/gg-diag.json
   ```
   - Parse error (exit 1)? Show the user the stderr and iterate.
   - Integrity error (exit 2)? Usually an unknown connector target or overlapping region — fix the `.gg` and retry.
   - Non-empty diagnostics on exit 0? Investigate before reporting success.
6. **Render**. `gg <file.gg> -o <file>.svg`. Also offer `--width` or `-o <file>.png` if the user wants a raster.

## Pitfalls to avoid

- **Don't invent icon sources**. Only `tabler/<name>`, `tabler/filled/<name>`, paths registered via `--icons` / `--alias`, or inline ones declared in `doc { icons: { … } }`. Anything else draws a red error ring.
- **Keep ids short and readable**. `front`, `api`, `db` beats `theFrontendService`.
- **Don't silently suppress errors**. Avoid `--no-errors` unless the user explicitly asks — the red ring is how gridgram signals problems.
- **Check `diagnostics.length` before declaring done**. An SVG with 12 unresolved icons is a failed render even if exit code is 0.

## Example starter

```gg
icon :client @A1 tabler/world  "Client"
icon :api   @B1 tabler/server  "API"
icon :db    @B2 tabler/database "DB"

client --> api "HTTPS"
api    --> db  "SQL"
```
