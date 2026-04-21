---
title: Editor
aside: false
outline: false
---

# Editor

A live `.gg` playground. Type on the left, the SVG on the right
updates as you go. Parse errors and icon-resolution warnings land
under the panes.

The full `.gg` syntax is supported — `doc { }` blocks, icons, regions,
connectors, notes. Only **Tabler built-ins** (`tabler/name`,
`tabler/filled/name`) resolve in the browser; external icon files
(`./x.svg`, `@alias/x.svg`) aren't available here. Use the `gg` CLI
for those.

<ClientOnly>
  <Editor />
</ClientOnly>

## Tips

- `icon :id @A1 tabler/user "Label"` — a node with an id, position, icon, and label.
- `a --> b "label"` — a connector from node `a` to node `b` with an edge label.
- `doc { cols: 4, rows: 3 }` — pin the grid; omit to auto-infer from `@pos`.
- `doc { theme: { primary: "#e8792f", accent: "#1e3a5f" } }` — retheme.
- See the [User Guide](./guide/) for the full reference.
