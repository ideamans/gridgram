import { h } from 'preact'
import type { VNode } from 'preact'
import { renderToString } from 'preact-render-to-string'
import type { DiagramDef, NormalizedDiagramDef } from '../types.js'
import type { PlacementDiagnostic } from '../gg/diagnostics.js'
import { Region } from './Region.js'
import { DiagramNode } from './Node.js'
import { Connector } from './Connector.js'
import { Note } from './Note.js'
import { resolveDiagram } from '../layout/pipeline.js'
import { computeLayout } from '../geometry/grid.js'
import { isTransparent } from './colors.js'
import type { DiagramSettings, ResolvedSettings } from '../config.js'
import { resolveSettings } from '../config.js'
import { expandBadges } from '../badges.js'
import { normalizeDiagramDef } from '../normalize.js'
import { resolveFrame, hasFrames } from '../frame.js'

/**
 * Back-compat alias: callers that used to pass a loose DiagramOptions
 * object (`{ suppressErrors, width }`) can still do so. Internally this
 * is a DiagramSettings layer.
 */
export type DiagramOptions = DiagramSettings

/**
 * Fold a DiagramDef + settings-layer (or two — document + override) into
 * a ResolvedSettings plus an effective DiagramDef. DiagramDef carries
 * both content (nodes, etc.) and embedded settings (cellSize/theme/…)
 * so we extract those as a document layer on the way in.
 */
function foldLayers(rawDef: DiagramDef, override: DiagramSettings = {}): {
  def: NormalizedDiagramDef
  settings: ResolvedSettings
} {
  // 0. Collapse frame-tagged declarations down to a single flat def.
  //    When the diagram declares no frames, resolveFrame is a no-op;
  //    skip it so diagrams that never opted in incur zero overhead.
  //    `doc [N] { … }` overrides are merged on top of the base scalars
  //    here too, which is why we extract the docLayer AFTER resolution.
  const frame = override.frame ?? 1
  const def = hasFrames(rawDef) ? resolveFrame(rawDef, frame) : rawDef
  const docLayer: DiagramSettings = {
    cellSize: def.cellSize,
    padding: def.padding,
    columns: def.columns,
    rows: def.rows,
    theme: def.theme,
  }
  const settings = resolveSettings([docLayer, override])
  // 1. Canonicalise every coordinate (A1 / tuple → 0-based {col,row})
  //    and auto-fill any missing node positions. This also respects the
  //    resolved `columns` in case the override changed it.
  const normalized = normalizeDiagramDef({ ...def, columns: settings.columns })
  // 2. Expand badge preset references into concrete NodeBadge[] layers
  //    so downstream rendering only sees fully-specified badges.
  const nodes = normalized.nodes.map((n) =>
    n.badges && n.badges.length > 0 ? { ...n, badges: expandBadges(n.badges) } : n
  )
  // 3. Re-apply the resolved scalars onto the def so downstream layout
  //    code (which still reads def.cellSize / def.columns / etc.) sees
  //    the merged values.
  const resolvedDef: NormalizedDiagramDef = {
    ...normalized,
    cellSize: settings.cellSize,
    padding: settings.padding,
    columns: settings.columns,
    rows: settings.rows,
    theme: settings.theme,
    nodes,
  }
  return { def: resolvedDef, settings }
}

/** Render result carrying the resolved layout alongside the VNode tree,
 *  so `renderDiagram` can surface placement diagnostics without running
 *  the pipeline twice. */
interface InternalRender {
  tree: any
  diagnostics: PlacementDiagnostic[]
}

function buildDiagramInternal(rawDef: DiagramDef, opts: DiagramOptions = {}): InternalRender {
  const { def, settings } = foldLayers(rawDef, opts)
  const { layout, nodeMap, connectors, notes, regions, nodeLabelByNodeId, diagnostics } =
    resolveDiagram(def)
  const { width: canvasW, height: canvasH } = layout
  const suppressErrors = settings.suppressErrors
  const mask = (err: boolean | undefined) => (suppressErrors ? false : err)
  const theme = settings.theme

  // Decide the outer svg's reported width/height. viewBox always stays
  // at the internal coord space so geometry/labels don't shift.
  let outerW: number = canvasW
  let outerH: number = canvasH
  if (settings.renderWidth && settings.renderWidth > 0) {
    outerW = settings.renderWidth
    outerH = settings.renderWidth * (canvasH / canvasW)
  }

  const children: any[] = []
  // Background rect is omitted when bg is undefined / '' / 'transparent',
  // producing an SVG with a transparent canvas.
  if (!isTransparent(theme.bg)) {
    children.push(h('rect', { width: canvasW, height: canvasH, fill: theme.bg }))
  }

  for (const [i, r] of regions.entries()) {
    const el = Region({
      region: r.region,
      layout,
      theme,
      labelPosition: r.labelResult?.position,
      labelError: mask(r.labelResult?.error),
    })
    el.key = `region-${i}` as any
    children.push(el)
  }

  for (const [i, r] of connectors.entries()) {
    const el = Connector({
      connector: r.conn,
      nodes: nodeMap,
      layout,
      theme,
      markerId: `marker-${i}`,
      pixelWaypoints: r.pixelWaypoints,
      lineError: mask(r.lineError),
      labelRect: r.labelResult?.rect,
      labelError: mask(r.labelResult?.error),
    })
    if (el) {
      el.key = `conn-${i}` as any
      children.push(el)
    }
  }

  for (const n of def.nodes) {
    const lr = nodeLabelByNodeId.get(n.id)
    const el = DiagramNode({
      node: n,
      layout,
      theme,
      labelCorner: lr?.corner,
      labelTier: lr?.tier,
      labelError: mask(lr?.error),
      iconError: mask(n.iconError),
    })
    el.key = n.id as any
    children.push(el)
  }

  for (const [i, rn] of notes.entries()) {
    const el = Note({ note: rn.note, layout, theme, targets: rn.targets })
    el.key = `note-${i}` as any
    children.push(el)
  }

  const tree = h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: outerW,
      height: outerH,
      viewBox: `0 0 ${canvasW} ${canvasH}`,
      style: 'font-family:system-ui, sans-serif',
    },
    children,
  )
  return { tree, diagnostics }
}

/** Build the Preact VNode tree for a diagram. Diagnostics are discarded
 *  — use `renderDiagram` instead if you need them. */
export function buildDiagramTree(rawDef: DiagramDef, opts: DiagramOptions = {}): any {
  return buildDiagramInternal(rawDef, opts).tree
}

/** Props accepted by the `<Diagram>` Preact component. */
export interface DiagramProps extends DiagramOptions {
  def: DiagramDef
}

/**
 * Preact functional component wrapper around `buildDiagramTree` — embed a
 * diagram directly in your JSX:
 *
 *   import { Diagram } from 'gridgram'
 *   <Diagram def={myDef} renderWidth={1024} />
 *
 * For plain SVG string output (no Preact host), use `renderDiagram` instead.
 */
export function Diagram(props: DiagramProps): VNode {
  const { def, ...opts } = props
  return buildDiagramTree(def, opts)
}

/** Render result carrying the SVG alongside any placement / route
 *  diagnostics the pipeline produced. Icon-unresolved diagnostics come
 *  from `resolveDiagramIcons` upstream; callers typically merge the
 *  two lists. */
export interface RenderResult {
  svg: string
  diagnostics: PlacementDiagnostic[]
}

/**
 * Render a DiagramDef to an SVG string *and* return the layout
 * diagnostics. Diagnostics include `label-collision` (a label was
 * forced into an overlapping fallback) and `route-failed` (a connector
 * couldn't be routed around obstacle nodes). Empty array on a clean
 * layout.
 */
export function renderDiagram(def: DiagramDef, opts: DiagramOptions = {}): RenderResult {
  const { tree, diagnostics } = buildDiagramInternal(def, opts)
  return { svg: renderToString(tree), diagnostics }
}

/** Render a DiagramDef to a standalone SVG string (no XML declaration).
 *  Discards diagnostics — prefer `renderDiagram` when you need agent-
 *  readable feedback about layout issues. */
export function renderDiagramSvg(def: DiagramDef, opts: DiagramOptions = {}): string {
  return renderDiagram(def, opts).svg
}

/**
 * Compute the final rasterized pixel dimensions for a DiagramDef.
 * Used by the CLI to size sharp's PNG output in accordance with the
 * render-time `width` option and the canvas aspect.
 */
export function computeRenderDimensions(
  rawDef: DiagramDef,
  opts: DiagramOptions = {},
): { width: number; height: number } {
  const { def, settings } = foldLayers(rawDef, opts)
  const layout = computeLayout(def)
  if (settings.renderWidth && settings.renderWidth > 0) {
    return {
      width: settings.renderWidth,
      height: Math.round(settings.renderWidth * (layout.height / layout.width)),
    }
  }
  return { width: layout.width, height: layout.height }
}
