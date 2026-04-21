/**
 * Cross-cutting layout constants.
 *
 * Values shared by subsystems that would otherwise each need to spell
 * them out in their own module and drift silently out of sync.
 */

/**
 * Icon SVG viewport, in abstract user-space units. Every icon source
 * — Tabler built-in, raw SVG registered via `doc.icons`, raster image
 * wrapped in `<image>`, path-resolved file — is expected to paint
 * inside a `0 0 ICON_VIEWPORT ICON_VIEWPORT` box. The renderer
 * positions this box inside each node's circle, so changing the
 * number here would shift icon sizing across Node.ts, badge
 * rendering, and the icon-loader's raster wrapper in lockstep.
 */
export const ICON_VIEWPORT = 24
