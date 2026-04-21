/**
 * Public API for gridgram.
 *
 * This entry point is **browser-safe** — it imports nothing from `fs`,
 * `path`, or other Node-only modules. For filesystem helpers (project
 * config discovery, icon file loading) use the `gridgram/node` subpath.
 */

// Rendering --------------------------------------------------------------
export { Diagram, renderDiagram, renderDiagramSvg, buildDiagramTree } from './components/Diagram.js'
export type { DiagramOptions, DiagramProps, RenderResult } from './components/Diagram.js'

// Layered settings -------------------------------------------------------
export { defineConfig, resolveSettings, SYSTEM_DEFAULTS } from './config.js'
export type {
  DiagramSettings,
  ResolvedSettings,
  DiagramContent,
  OutputTarget,
} from './config.js'

// .gg parser + integrity (pure; browser-safe) ---------------------------
export { parseGg } from './gg/parser.js'
export type { ParseResult } from './gg/parser.js'
export { checkIntegrity } from './gg/integrity.js'
export { formatError } from './gg/errors.js'
export type { GgError, GgErrorSource } from './gg/errors.js'

// Icon resolution (pure; does not read the filesystem) ------------------
export {
  resolveIcon,
  resolveDiagramIcons,
  collectPathRefs,
  isPathRef,
  stripSvgWrapper,
  TABLER_PREFIX,
  TABLER_FILLED_PREFIX,
} from './gg/icons.js'
export type { IconContext, ResolveIconsResult } from './gg/icons.js'

// Diagnostics ------------------------------------------------------------
export type {
  PlacementDiagnostic, PlacementAttempt, Obstacle, ElementRef,
  DiagnosticKind, GridCellRef, GridSpanRef, PixelRect, PixelLine, PixelCircle,
} from './gg/diagnostics.js'

// Diagram types ----------------------------------------------------------
export type {
  DiagramDef,
  DiagramTheme,
  NodeDef,
  NodeBadge,
  BadgePosition,
  ConnectorDef,
  ArrowEnd,
  WayPoint,
  WayPointInput,
  RegionDef,
  NoteDef,
  GridPos,
  GridPosInput,
  GridSpan,
  SvgFragment,
} from './types.js'

// Tabler icons -----------------------------------------------------------
export { tabler, tablerOutline, tablerFilled, tablerHas } from './tabler.js'

// Badges -----------------------------------------------------------------
export { BADGE_PRESETS, expandBadges } from './badges.js'
export type { BadgeSpec, BadgePresetRef } from './badges.js'
