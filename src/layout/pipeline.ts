/**
 * Layout pipeline.
 *
 * Takes a DiagramDef and produces a fully resolved DiagramLayout: where
 * every connector ends up (including routed ones), where every label
 * lands (with collision flagging), and which Note leader lines target
 * which fixed pixel coords.
 *
 * Has no dependency on React. The Diagram component consumes the
 * output of `resolveDiagram(def)` and only handles the SVG mapping.
 */
import type {
  NormalizedConnectorDef, NormalizedDiagramDef, NormalizedNodeDef,
  NormalizedNoteDef, NormalizedRegionDef,
} from '../types'
import { computeLayout, gridToPixel, resolveNodeSizeFrac } from '../geometry/grid'
import type { GridLayout } from '../geometry/grid'
import type { LabelRect, LineSeg, Circle, CollisionHit } from '../geometry/collision'
import {
  resolveConnectorPath, polylineToSegments, rawMidpoint, type Pixel,
} from '../geometry/connector-path'
import { connectorCrossesNode, findCrossingNodes, intPtKey, routeAroundNodes } from '../geometry/router'
import type { IntPt } from '../geometry/router'
import type { AttemptRecord } from '../geometry/label-placer'
import type {
  ElementRef, Obstacle, PlacementAttempt, PlacementDiagnostic,
} from '../gg/diagnostics'
import { toCellRef, toSpanRef } from '../gg/diagnostics'
import { computeNodeLabelRect } from './node-label'
import type { NodeLabelResult } from './node-label'
import { computeConnectorLabelRect } from './connector-label'
import type { ConnectorLabelResult } from './connector-label'
import { computeRegionLabelRect } from './region-label'
import type { RegionLabelResult } from './region-label'
import { computeNoteLayout, computeNoteLeaders } from './note-layout'
import type { NoteLayout, LeaderTarget } from './note-layout'

export interface ResolvedConnector {
  conn: NormalizedConnectorDef
  /** Router-supplied waypoints (only set when the direct line crosses a node) */
  pixelWaypoints?: Pixel[]
  /** Grid-intersection points along a routed path (used for usage counting) */
  intersections: IntPt[]
  /** True when the line could neither go direct nor be routed */
  lineError: boolean
  labelResult?: ConnectorLabelResult
}

export interface ResolvedNote {
  note: NormalizedNoteDef
  layout: NoteLayout
  targets: LeaderTarget[]
}

export interface ResolvedRegion {
  region: NormalizedRegionDef
  labelResult: RegionLabelResult | null
}

export interface DiagramLayout {
  layout: GridLayout
  nodeMap: Map<string, NormalizedNodeDef>
  connectors: ResolvedConnector[]
  notes: ResolvedNote[]
  regions: ResolvedRegion[]
  /** Node id → label placement (only present when the node has a label) */
  nodeLabelByNodeId: Map<string, NodeLabelResult>
  /** Placement / layout feedback for AI agents and humans. Empty when
   *  every label fit cleanly and every connector routed successfully. */
  diagnostics: PlacementDiagnostic[]
}

// ---------------------------------------------------------------------------
// Per-step pure helpers
// ---------------------------------------------------------------------------

interface ConnectorLineRecord {
  resolved: ResolvedConnector
  /** Index range of this connector's segments in `lines` */
  start: number
  end: number
  /** When routing failed, the obstacle nodes the direct line crosses.
   *  Pipeline turns these into a `route-failed` diagnostic. */
  crossingNodes?: NormalizedNodeDef[]
}

function resolveConnectors(
  connectors: NormalizedConnectorDef[],
  nodeMap: Map<string, NormalizedNodeDef>,
  allNodes: NormalizedNodeDef[],
  layout: GridLayout
): { records: ConnectorLineRecord[]; lines: LineSeg[] } {
  const records: ConnectorLineRecord[] = []
  const lines: LineSeg[] = []
  const used = new Set<string>()

  const appendSegments = (conn: NormalizedConnectorDef, pixelWaypoints?: Pixel[]) => {
    const path = resolveConnectorPath(conn, nodeMap, layout, pixelWaypoints)
    if (path) lines.push(...polylineToSegments(path.points))
  }

  for (const conn of connectors) {
    const start = lines.length
    const crossings = findCrossingNodes(conn, nodeMap, allNodes, layout)

    if (crossings.length === 0) {
      appendSegments(conn)
      records.push({
        resolved: { conn, intersections: [], lineError: false },
        start, end: lines.length,
      })
      continue
    }

    const route = routeAroundNodes(conn, nodeMap, allNodes, layout, used)
    if (route) {
      for (const pt of route.intersections) used.add(intPtKey(pt.i, pt.j))
      appendSegments(conn, route.waypoints)
      records.push({
        resolved: {
          conn,
          pixelWaypoints: route.waypoints,
          intersections: route.intersections,
          lineError: false,
        },
        start, end: lines.length,
      })
    } else {
      appendSegments(conn)
      records.push({
        resolved: { conn, intersections: [], lineError: true },
        start, end: lines.length,
        crossingNodes: crossings,
      })
    }
  }

  return { records, lines }
}

function buildNoteTargets(
  note: NormalizedNoteDef,
  nodeMap: Map<string, NormalizedNodeDef>,
  connectorById: Map<string, ResolvedConnector>,
  layout: GridLayout
): LeaderTarget[] {
  const targets: LeaderTarget[] = []
  for (const tid of note.targets ?? []) {
    const node = nodeMap.get(tid)
    if (node) {
      targets.push({
        aim: gridToPixel(layout, node.pos),
        stopRadius: (layout.cellSize * resolveNodeSizeFrac(node)) / 2,
      })
      continue
    }
    const connR = connectorById.get(tid)
    if (connR) {
      const path = resolveConnectorPath(connR.conn, nodeMap, layout, connR.pixelWaypoints)
      if (path) targets.push({ aim: rawMidpoint(path), stopRadius: 0 })
    }
  }
  return targets
}

/** Sort nodes so the most-connected ones get first pick of corners. */
function nodesByConnectorCount(nodes: NormalizedNodeDef[], connectors: NormalizedConnectorDef[]): NormalizedNodeDef[] {
  const count = new Map<string, number>()
  for (const c of connectors) {
    count.set(c.from, (count.get(c.from) ?? 0) + 1)
    count.set(c.to, (count.get(c.to) ?? 0) + 1)
  }
  return [...nodes].sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0))
}

// ---------------------------------------------------------------------------
// Diagnostic helpers
// ---------------------------------------------------------------------------

const nodeRef = (n: NormalizedNodeDef): ElementRef =>
  ({ kind: 'node', id: n.id, pos: toCellRef(n.pos) })
const connectorRef = (c: NormalizedConnectorDef): ElementRef =>
  ({ kind: 'connector', id: c.id, from: c.from, to: c.to })
const noteRef = (n: NormalizedNoteDef): ElementRef =>
  ({ kind: 'note', id: `@${toCellRef(n.pos).address}`, pos: toCellRef(n.pos) })
const regionRef = (r: NormalizedRegionDef, idx: number): ElementRef =>
  ({ kind: 'region', id: `region-${idx + 1}`, span: toSpanRef(r.spans[0]) })

/** Indexed owner arrays parallel to the pipeline's flat collision
 *  primitives, so a CollisionHit's array index can be mapped back to
 *  the element that owns the obstacle. */
interface OwnerTables {
  bounds: { width: number; height: number }
  labelOwners: ElementRef[]   // parallel to placedLabels
  lineOwners: ElementRef[]    // parallel to avoidLines
  iconOwners: ElementRef[]    // parallel to allIconCircles
}

/**
 * Subset of OwnerTables seen by a single placement call — the
 * labelOwners / lineOwners / iconOwners arrays may be sub-views
 * (filtered to drop self-collisions).
 */
interface OwnerScope {
  bounds: { width: number; height: number }
  labelOwners: ElementRef[]
  lineOwners: ElementRef[]
  iconOwners: ElementRef[]
}

function hitToObstacle(hit: CollisionHit, scope: OwnerScope): Obstacle {
  switch (hit.kind) {
    case 'canvas-bounds':
      return { kind: 'canvas-bounds', bounds: scope.bounds }
    case 'label':
      return { kind: 'label', owner: scope.labelOwners[hit.index], rect: hit.rect }
    case 'icon':
      return { kind: 'icon', owner: scope.iconOwners[hit.index], circle: hit.circle }
    case 'line': {
      const owner = scope.lineOwners[hit.index]
      // Notes → 'leader' (dotted guide lines), connectors → 'line'.
      const kind = owner?.kind === 'note' ? 'leader' : 'line'
      return { kind, owner, line: hit.line } as Obstacle
    }
  }
}

function summariseObstacles(obs: Obstacle[]): string {
  if (obs.length === 0) return 'no collisions'
  const groups = new Map<string, number>()
  for (const o of obs) {
    const key =
      o.kind === 'canvas-bounds'
        ? 'canvas-bounds'
        : `${o.kind} of ${elementLabel(o.owner)}`
    groups.set(key, (groups.get(key) ?? 0) + 1)
  }
  return Array.from(groups.entries())
    .map(([k, n]) => (n > 1 ? `${k} (×${n})` : k))
    .join(', ')
}

function elementLabel(e: ElementRef): string {
  switch (e.kind) {
    case 'node': return `node "${e.id}"`
    case 'note': return `note ${e.id}`
    case 'region': return e.id ?? `region ${e.span.from.address}-${e.span.to.address}`
    case 'connector': return `connector ${e.from}→${e.to}`
  }
}

/**
 * Emit diagnostics when `def.columns` / `def.rows` (the declared grid)
 * doesn't match what the content actually uses. Three sub-kinds:
 *
 *   overflow       — a node / region sits outside the declared grid
 *   slack-leading  — first used cell is past col/row 1 (empty band
 *                    before the content)
 *   slack-trailing — declared columns/rows overshoot the last used cell
 *                    (empty band after the content)
 *
 * All coordinates emitted in user-facing 1-based form.
 */
function buildGridMismatchDiagnostics(
  def: NormalizedDiagramDef,
  layout: GridLayout,
): PlacementDiagnostic[] {
  const diagnostics: PlacementDiagnostic[] = []

  // Collect every 0-based (col, row) cell a declared element occupies.
  const cells: Array<{ col: number; row: number; source: ElementRef }> = []
  for (const n of def.nodes) {
    cells.push({ col: n.pos.col, row: n.pos.row, source: nodeRef(n) })
  }
  for (const c of def.connectors ?? []) {
    for (const wp of c.waypoints ?? []) {
      cells.push({ col: Math.floor(wp.col), row: Math.floor(wp.row), source: connectorRef(c) })
    }
  }
  for (const note of def.notes ?? []) {
    cells.push({ col: note.pos.col, row: note.pos.row, source: noteRef(note) })
  }
  for (const [i, r] of (def.regions ?? []).entries()) {
    for (const span of r.spans) {
      const f = span.from
      const t = span.to
      cells.push({ col: Math.max(f.col, t.col), row: Math.max(f.row, t.row), source: regionRef(r, i) })
      cells.push({ col: Math.min(f.col, t.col), row: Math.min(f.row, t.row), source: regionRef(r, i) })
    }
  }
  if (cells.length === 0) return diagnostics

  const maxCol1 = Math.max(...cells.map((c) => c.col)) + 1 // 1-based last cell
  const maxRow1 = Math.max(...cells.map((c) => c.row)) + 1
  const minCol1 = Math.min(...cells.map((c) => c.col)) + 1
  const minRow1 = Math.min(...cells.map((c) => c.row)) + 1

  const emit = (
    axis: 'col' | 'row',
    kind: 'overflow' | 'slack-leading' | 'slack-trailing',
    declared: number | undefined,
    used: number,
    element: ElementRef,
    message: string,
    suggestion: string,
  ) => {
    diagnostics.push({
      kind: 'grid-mismatch',
      severity: kind === 'overflow' ? 'warning' : 'warning',
      element,
      message,
      suggestion,
      grid: { axis, declared, used, kind },
    })
  }

  // --- overflow: content beyond the declared grid ---------------------------
  if (def.columns !== undefined && maxCol1 > def.columns) {
    const worst = cells.reduce((a, b) => (a.col > b.col ? a : b))
    emit(
      'col', 'overflow', def.columns, maxCol1, worst.source,
      `Column ${maxCol1} is used but only ${def.columns} column(s) are declared.`,
      `Increase \`doc { cols: ${maxCol1} }\` or move the offending cell(s) within range.`,
    )
  }
  if (def.rows !== undefined && maxRow1 > def.rows) {
    const worst = cells.reduce((a, b) => (a.row > b.row ? a : b))
    emit(
      'row', 'overflow', def.rows, maxRow1, worst.source,
      `Row ${maxRow1} is used but only ${def.rows} row(s) are declared.`,
      `Increase \`doc { rows: ${maxRow1} }\` or move the offending cell(s) within range.`,
    )
  }

  // --- slack-leading: first used cell is past col/row 1 --------------------
  // Only worth mentioning when the user declared columns explicitly;
  // otherwise this is just "the diagram starts at B2" which is fine.
  if (def.columns !== undefined && minCol1 > 1) {
    const first = cells.reduce((a, b) => (a.col < b.col ? a : b))
    emit(
      'col', 'slack-leading', def.columns, minCol1, first.source,
      `Declared ${def.columns} column(s) but content starts at column ${minCol1} — columns 1…${minCol1 - 1} are empty.`,
      `Shift cells left, or drop \`doc.cols\` so the grid hugs the content.`,
    )
  }
  if (def.rows !== undefined && minRow1 > 1) {
    const first = cells.reduce((a, b) => (a.row < b.row ? a : b))
    emit(
      'row', 'slack-leading', def.rows, minRow1, first.source,
      `Declared ${def.rows} row(s) but content starts at row ${minRow1} — rows 1…${minRow1 - 1} are empty.`,
      `Shift cells up, or drop \`doc.rows\` so the grid hugs the content.`,
    )
  }

  // --- slack-trailing: declared grid overshoots the last used cell ---------
  if (def.columns !== undefined && def.columns > maxCol1) {
    const last = cells.reduce((a, b) => (a.col > b.col ? a : b))
    emit(
      'col', 'slack-trailing', def.columns, maxCol1, last.source,
      `Declared ${def.columns} column(s) but content ends at column ${maxCol1} — columns ${maxCol1 + 1}…${def.columns} are empty.`,
      `Set \`doc.cols\` to ${maxCol1} (or drop it) to tighten the grid.`,
    )
  }
  if (def.rows !== undefined && def.rows > maxRow1) {
    const last = cells.reduce((a, b) => (a.row > b.row ? a : b))
    emit(
      'row', 'slack-trailing', def.rows, maxRow1, last.source,
      `Declared ${def.rows} row(s) but content ends at row ${maxRow1} — rows ${maxRow1 + 1}…${def.rows} are empty.`,
      `Set \`doc.rows\` to ${maxRow1} (or drop it) to tighten the grid.`,
    )
  }

  return diagnostics
}

function buildRouteFailedDiagnostic(
  conn: NormalizedConnectorDef,
  crossingNodes: NormalizedNodeDef[],
  iconCircleById: Map<string, Circle>,
  bounds: { width: number; height: number },
): PlacementDiagnostic {
  const element = connectorRef(conn)
  const obstacles: Obstacle[] = []
  for (const n of crossingNodes) {
    const circle = iconCircleById.get(n.id)
    if (circle) obstacles.push({ kind: 'icon', owner: nodeRef(n), circle })
  }
  const names = crossingNodes.map((n) => `"${n.id}"`).join(', ')
  return {
    kind: 'route-failed',
    severity: 'warning',
    element,
    message:
      `Connector ${conn.from}→${conn.to} crosses node(s) ${names} and no routed ` +
      `alternative was found; the line is drawn straight through.`,
    suggestion:
      `Move ${conn.from} / ${conn.to} to an outer cell, add waypoints to steer the connector, ` +
      `or relocate ${names} so a clear path exists.`,
    // One synthetic attempt so the agent sees the obstacles in the same
    // shape as label-collision diagnostics.
    attempts: [{
      slot: 'direct line',
      // No meaningful rect for a route — keep the shape but zero it out.
      rect: { x: 0, y: 0, w: 0, h: 0 },
      obstacles,
      accepted: true,
    }],
  }
}

function buildPlacementDiagnostic(
  element: ElementRef,
  attempts: AttemptRecord[],
  scope: OwnerScope,
): PlacementDiagnostic {
  const richAttempts: PlacementAttempt[] = attempts.map((a) => ({
    slot: a.description,
    rect: a.rect,
    obstacles: a.hits.map((h) => hitToObstacle(h, scope)),
    accepted: a.accepted,
  }))
  const final = richAttempts[richAttempts.length - 1]
  const triedCount = richAttempts.length
  const finalObs = final.obstacles
  const summary = summariseObstacles(finalObs)
  const tag = elementLabel(element)
  const message =
    triedCount === 1
      ? `Label for ${tag} could not fit its only candidate slot; blocked by ${summary}.`
      : `Label for ${tag} could not find a clear slot across ${triedCount} candidates; final fallback still blocked by ${summary}.`

  return {
    kind: 'label-collision',
    severity: 'warning',
    element,
    message,
    finalRect: final.rect,
    attempts: richAttempts,
  }
}

// ---------------------------------------------------------------------------
// Pipeline entry point
// ---------------------------------------------------------------------------

/**
 * Resolve a DiagramDef into a DiagramLayout. Steps:
 *   1. Lay out connectors (direct lines or routed) and accumulate their segments
 *   2. Lay out notes (fixed cells; their rects act as labels for later steps)
 *   3. Place node labels in connector-count order (most-connected first)
 *   4. Place connector labels (skipping each connector's own segments)
 *   5. Place region labels last (they're background)
 */
export function resolveDiagram(def: NormalizedDiagramDef): DiagramLayout {
  const layout = computeLayout(def)
  const bounds = { width: layout.width, height: layout.height }
  const nodeMap = new Map(def.nodes.map((n) => [n.id, n]))
  const connectorDefs = def.connectors ?? []
  const diagnostics: PlacementDiagnostic[] = []

  const placedLabels: LabelRect[] = []
  // Indexed owner table, grows alongside `placedLabels` through the
  // pipeline's placement phases.
  const labelOwners: ElementRef[] = []

  // Pre-compute every node's icon disc so label placement can avoid
  // dropping a label on top of another node's glyph. Indexed by node
  // id so the node's own circle can be filtered out when placing that
  // node's label.
  const iconCircleById = new Map<string, Circle>()
  for (const n of def.nodes) {
    const { x, y } = gridToPixel(layout, n.pos)
    const r = (layout.cellSize * resolveNodeSizeFrac(n)) / 2
    iconCircleById.set(n.id, { cx: x, cy: y, r })
  }
  const allIconCircles = Array.from(iconCircleById.values())
  const allIconOwners: ElementRef[] = def.nodes.map(nodeRef)
  const iconIndexById = new Map<string, number>(def.nodes.map((n, i) => [n.id, i]))

  // Step 0 — grid-mismatch diagnostics (declared vs actual extents)
  diagnostics.push(...buildGridMismatchDiagnostics(def, layout))

  // Step 1
  const { records: connRecords, lines: connLines } = resolveConnectors(
    connectorDefs, nodeMap, def.nodes, layout
  )
  // Parallel owner array for connLines — one entry per segment.
  const connLineOwners: ElementRef[] = []
  for (const rec of connRecords) {
    const owner = connectorRef(rec.resolved.conn)
    for (let i = rec.start; i < rec.end; i++) connLineOwners.push(owner)
  }
  // Emit route-failed diagnostics for connectors that fell back to
  // "just draw it straight through the obstacles."
  for (const rec of connRecords) {
    if (rec.crossingNodes) {
      diagnostics.push(buildRouteFailedDiagnostic(
        rec.resolved.conn, rec.crossingNodes, iconCircleById, bounds,
      ))
    }
  }

  // Step 2 — notes
  const connectorById = new Map<string, ResolvedConnector>()
  for (const r of connRecords) {
    if (r.resolved.conn.id) connectorById.set(r.resolved.conn.id, r.resolved)
  }

  const notes: ResolvedNote[] = (def.notes ?? []).map((note) => {
    const noteLayout = computeNoteLayout(note, layout)
    const targets = buildNoteTargets(note, nodeMap, connectorById, layout)
    placedLabels.push(noteLayout.rect)
    labelOwners.push(noteRef(note))
    return { note, layout: noteLayout, targets }
  })

  // Note leader lines join connector lines as "lines labels must avoid".
  // They're visually secondary (dotted, low-opacity) but treating them
  // the same during layout keeps labels from landing on top of them.
  const noteLeaderLines: LineSeg[] = []
  const noteLeaderOwners: ElementRef[] = []
  for (const n of notes) {
    const owner = noteRef(n.note)
    for (const l of computeNoteLeaders(n.layout.rect, n.targets)) {
      noteLeaderLines.push({ x1: l.start.x, y1: l.start.y, x2: l.end.x, y2: l.end.y })
      noteLeaderOwners.push(owner)
    }
  }
  const avoidLines: LineSeg[] = [...connLines, ...noteLeaderLines]
  const avoidLineOwners: ElementRef[] = [...connLineOwners, ...noteLeaderOwners]

  // Step 3 — node labels (priority order). Exclude the node's *own*
  // circle from the collision set so its callout can rest against its
  // own icon (the callout geometry already makes that deliberate).
  const nodeLabelByNodeId = new Map<string, NodeLabelResult>()
  for (const node of nodesByConnectorCount(def.nodes, connectorDefs)) {
    const selfIdx = iconIndexById.get(node.id)
    const otherCircles = selfIdx === undefined
      ? allIconCircles
      : allIconCircles.filter((_, i) => i !== selfIdx)
    const otherIconOwners = selfIdx === undefined
      ? allIconOwners
      : allIconOwners.filter((_, i) => i !== selfIdx)
    const result = computeNodeLabelRect(
      node, layout, placedLabels, avoidLines, bounds, otherCircles,
    )
    if (result) {
      if (result.error) {
        diagnostics.push(buildPlacementDiagnostic(nodeRef(node), result.attempts, {
          bounds,
          labelOwners,
          lineOwners: avoidLineOwners,
          iconOwners: otherIconOwners,
        }))
      }
      placedLabels.push(result.rect)
      labelOwners.push(nodeRef(node))
      nodeLabelByNodeId.set(node.id, result)
    }
  }

  // Step 4 — connector labels (each excludes its own line segments,
  // but still avoids every other connector's lines + note leaders).
  for (const r of connRecords) {
    if (!r.resolved.conn.label) continue
    const otherLines = [
      ...connLines.slice(0, r.start),
      ...connLines.slice(r.end),
      ...noteLeaderLines,
    ]
    const otherLineOwners = [
      ...connLineOwners.slice(0, r.start),
      ...connLineOwners.slice(r.end),
      ...noteLeaderOwners,
    ]
    const result = computeConnectorLabelRect(
      r.resolved.conn, nodeMap, layout,
      placedLabels, otherLines,
      r.resolved.pixelWaypoints,
      bounds,
      allIconCircles,
    )
    if (result) {
      if (result.error) {
        diagnostics.push(buildPlacementDiagnostic(connectorRef(r.resolved.conn), result.attempts, {
          bounds,
          labelOwners,
          lineOwners: otherLineOwners,
          iconOwners: allIconOwners,
        }))
      }
      placedLabels.push(result.rect)
      labelOwners.push(connectorRef(r.resolved.conn))
      r.resolved.labelResult = result
    }
  }

  // Step 5 — region labels
  const regions: ResolvedRegion[] = (def.regions ?? []).map((region, idx) => {
    const labelResult = computeRegionLabelRect(
      region, layout, placedLabels, avoidLines, bounds, allIconCircles,
    )
    if (labelResult) {
      if (labelResult.error) {
        diagnostics.push(buildPlacementDiagnostic(regionRef(region, idx), labelResult.attempts, {
          bounds,
          labelOwners,
          lineOwners: avoidLineOwners,
          iconOwners: allIconOwners,
        }))
      }
      placedLabels.push(labelResult.rect)
      labelOwners.push(regionRef(region, idx))
    }
    return { region, labelResult }
  })

  return {
    layout,
    nodeMap,
    connectors: connRecords.map((r) => r.resolved),
    notes,
    regions,
    nodeLabelByNodeId,
    diagnostics,
  }
}
