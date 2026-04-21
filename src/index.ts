/**
 * Public API for gridgram.
 *
 * Core: render a DiagramDef to an SVG string.
 * The internal layout pipeline, collision math, blob tracing, router,
 * and metrics are not re-exported — import from the subtrees in tests
 * or advanced integrations if you need them.
 */
export { Diagram, renderDiagram, renderDiagramSvg, buildDiagramTree } from './components/Diagram.js'
export type { DiagramOptions, DiagramProps, RenderResult } from './components/Diagram.js'
export type {
  PlacementDiagnostic, PlacementAttempt, Obstacle, ElementRef,
  DiagnosticKind, GridCellRef, GridSpanRef, PixelRect, PixelLine, PixelCircle,
} from './gg/diagnostics.js'
export { defineConfig, resolveSettings, SYSTEM_DEFAULTS } from './config.js'
export type {
  DiagramSettings,
  ResolvedSettings,
  DiagramContent,
  OutputTarget,
} from './config.js'
export type {
  DiagramDef,
  DiagramTheme,
  NodeDef,
  NodeBadge,
  BadgePosition,
  ConnectorDef,
  ArrowEnd,
  WayPoint,
  RegionDef,
  NoteDef,
  GridPos,
  GridSpan,
  SvgFragment,
} from './types.js'
export { tabler, tablerOutline, tablerFilled, tablerHas } from './tabler.js'
export { BADGE_PRESETS, expandBadges } from './badges.js'
export type { BadgeSpec, BadgePresetRef } from './badges.js'
