/**
 * Public API for gridgram.
 *
 * Core: render a DiagramDef to an SVG string.
 * The internal layout pipeline, collision math, blob tracing, router,
 * and metrics are not re-exported — import from the subtrees in tests
 * or advanced integrations if you need them.
 */
export { renderDiagram, renderDiagramSvg, buildDiagramTree } from './components/Diagram'
export type { DiagramOptions, RenderResult } from './components/Diagram'
export type {
  PlacementDiagnostic, PlacementAttempt, Obstacle, ElementRef,
  DiagnosticKind, GridCellRef, GridSpanRef, PixelRect, PixelLine, PixelCircle,
} from './gg/diagnostics'
export { defineConfig, resolveSettings, SYSTEM_DEFAULTS } from './config'
export type {
  DiagramSettings,
  ResolvedSettings,
  DiagramContent,
  OutputTarget,
} from './config'
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
} from './types'
export { tabler, tablerOutline, tablerFilled, tablerHas } from './tabler'
export { BADGE_PRESETS, expandBadges } from './badges'
export type { BadgeSpec, BadgePresetRef } from './badges'
