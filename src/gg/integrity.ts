/**
 * Post-parse integrity checks:
 *   - Connector from/to references known node ids
 *   - Note targets reference known node or connector ids
 *   - Region spans fit within cols×rows
 *   - Region spans form a single 4-connected shape (no diagonal-only joins)
 *   - Cell occupancy: at most one node-or-note per cell after auto-layout
 *
 * At this point the DiagramDef carries the raw user-input coordinates
 * (1-based / A1 forms). We normalize a temporary copy here so the
 * checks can reason in canonical 0-based space without mutating the
 * def that render-time foldLayers will later re-normalize.
 *
 * Duplicate-node-id detection happens in parser.ts because it needs to
 * see source attribution (DSL vs JSON) at parse time.
 */
import type { DiagramDef, FrameSpec, FrameRange, NormalizedDiagramDef } from '../types.js'
import type { GgError } from './errors.js'
import { buildBlob, DisjointRegionError } from '../geometry/blob.js'
import { computeLayout } from '../geometry/grid.js'
import { normalizeDiagramDef } from '../normalize.js'
import { cellAddress } from './diagnostics.js'
import { hasFrames, resolveFrame, normalizeFrameSpec } from '../frame.js'

/**
 * Collect every finite frame number that appears as an endpoint of
 * any spec in the def. Open-ended ranges `[n, Infinity]` contribute
 * their lower endpoint only — the check at the low end covers the
 * behaviour for the whole range (anything in the range references the
 * same set of frame-qualifying objects).
 *
 * Frame 1 is always included so frame-less diagrams still get their
 * default check.
 */
function declaredFrames(def: DiagramDef): number[] {
  const frames = new Set<number>([1])
  const visit = (spec: FrameSpec | undefined): void => {
    if (spec === undefined) return
    let ranges: FrameRange[] | undefined
    try { ranges = normalizeFrameSpec(spec) } catch { return }
    if (!ranges) return
    for (const [lo, hi] of ranges) {
      if (Number.isFinite(lo)) frames.add(lo)
      if (Number.isFinite(hi)) frames.add(hi)
    }
  }
  for (const n of def.nodes) visit(n.frames)
  for (const c of def.connectors ?? []) visit(c.frames)
  for (const r of def.regions ?? []) visit(r.frames)
  for (const n of def.notes ?? []) visit(n.frames)
  for (const o of def.frameOverrides ?? []) visit(o.frames)
  return Array.from(frames).sort((a, b) => a - b)
}

/** Format a normalized 0-based span as `A1-C3` using A1 addresses —
 *  agents and humans read this directly without having to adjust
 *  for the internal 0-base. */
function formatSpan(from: { col: number; row: number }, to: { col: number; row: number }): string {
  return `${cellAddress(from.col + 1, from.row + 1)}-${cellAddress(to.col + 1, to.row + 1)}`
}

/**
 * Run the integrity checks against a diagram. When `frame` is given,
 * checks that specific frame only. When omitted, checks every frame
 * number explicitly referenced by the declarations (at least frame 1)
 * so errors that only manifest at frame N — e.g. two icons at the
 * same cell at frame 3 — are caught at parse time rather than
 * silently accepted until someone renders `--frame 3`.
 *
 * Duplicate messages across frames are deduplicated; frame-specific
 * errors are annotated with `(frame N)` so the reader can tell which
 * frame to look at.
 */
export function checkIntegrity(rawDef: DiagramDef, frame?: number): GgError[] {
  if (frame !== undefined) return checkIntegrityAtFrame(rawDef, frame)
  if (!hasFrames(rawDef)) return checkIntegrityAtFrame(rawDef, 1)

  const collected: GgError[] = []
  const seen = new Set<string>()
  for (const f of declaredFrames(rawDef)) {
    const frameErrs = checkIntegrityAtFrame(rawDef, f)
    for (const e of frameErrs) {
      const annotated: GgError = { ...e, message: `${e.message} (frame ${f})` }
      const key = `${annotated.source}|${annotated.message}`
      if (seen.has(key)) continue
      seen.add(key)
      collected.push(annotated)
    }
  }
  return collected
}

function checkIntegrityAtFrame(rawDef: DiagramDef, frame: number): GgError[] {
  // Collapse frame-tagged declarations first — everything below
  // reasons about the flat frame-N view of the diagram.
  const def = hasFrames(rawDef) ? resolveFrame(rawDef, frame) : rawDef
  const errors: GgError[] = []

  // Connector ref check (no coords involved)
  const nodeIds = new Set(def.nodes.map((n) => n.id))
  const connectorIds = new Set((def.connectors ?? []).map((c) => c.id).filter((v): v is string => !!v))
  for (const c of def.connectors ?? []) {
    if (!nodeIds.has(c.from)) {
      errors.push({
        message: `Connector references unknown source node "${c.from}"`,
        line: 0, source: 'check',
      })
    }
    if (!nodeIds.has(c.to)) {
      errors.push({
        message: `Connector references unknown target node "${c.to}"`,
        line: 0, source: 'check',
      })
    }
  }

  // Note target ref check
  for (const n of def.notes ?? []) {
    for (const id of n.targets ?? []) {
      if (!nodeIds.has(id) && !connectorIds.has(id)) {
        errors.push({
          message: `Note target references unknown node / connector "${id}"`,
          line: 0, source: 'check',
        })
      }
    }
  }

  // Coord-bearing checks: work against a normalized copy.
  let normalized: NormalizedDiagramDef
  try {
    normalized = normalizeDiagramDef(def)
  } catch (e: any) {
    // A malformed coord (bad A1, col < 1, …) surfaces as a check error
    // citing the offending address.
    errors.push({ message: e?.message ?? String(e), line: 0, source: 'check' })
    return errors
  }

  // Cell-occupancy check — nodes and notes each claim a single cell.
  // A second claim on the same cell is almost always a coordinate
  // mistake, so surface it as an integrity error that points at both
  // occupants (identified by id for nodes, by A1 address for notes,
  // since notes are anonymous).
  const occupants = new Map<string, string>()  // "col,row" -> description
  const describeNode = (id: string) => id.startsWith('__n') ? 'icon' : `icon "${id}"`
  for (const n of normalized.nodes) {
    const key = `${n.pos.col},${n.pos.row}`
    const me = describeNode(n.id)
    const prev = occupants.get(key)
    if (prev) {
      errors.push({
        message: `Duplicate cell ${cellAddress(n.pos.col + 1, n.pos.row + 1)}: ${prev} and ${me}`,
        line: 0, source: 'check',
      })
    } else {
      occupants.set(key, me)
    }
  }
  for (const note of normalized.notes ?? []) {
    const key = `${note.pos.col},${note.pos.row}`
    const addr = cellAddress(note.pos.col + 1, note.pos.row + 1)
    const me = `note at ${addr}`
    const prev = occupants.get(key)
    if (prev) {
      errors.push({
        message: `Duplicate cell ${addr}: ${prev} and ${me}`,
        line: 0, source: 'check',
      })
    } else {
      occupants.set(key, me)
    }
  }

  // Region bounds + connectivity check
  if ((normalized.regions?.length ?? 0) > 0 && normalized.nodes.length > 0) {
    const layout = computeLayout(normalized)
    for (const region of normalized.regions ?? []) {
      for (const span of region.spans) {
        const from = span.from as { col: number; row: number }
        const to = span.to as { col: number; row: number }
        const cs = [from.col, to.col]
        const rs = [from.row, to.row]
        if (cs.some((c) => c < 0 || c >= layout.columns) || rs.some((r) => r < 0 || r >= layout.rows)) {
          // Bottom-right corner in user-facing 1-based A-notation so
          // agents see "… exceeds A1-D3 grid" rather than the raw
          // column count.
          const maxCell = cellAddress(layout.columns, layout.rows)
          errors.push({
            message: `Region span out of bounds: ${formatSpan(from, to)} ` +
                     `exceeds A1-${maxCell} grid (${layout.columns}×${layout.rows})`,
            line: 0, source: 'check',
          })
        }
      }
      try {
        buildBlob(region.spans, layout)
      } catch (e) {
        if (e instanceof DisjointRegionError) {
          const desc = region.spans.map((s) => {
            const f = s.from as { col: number; row: number }
            const t = s.to   as { col: number; row: number }
            return formatSpan(f, t)
          }).join('; ')
          errors.push({
            message: `Region spans are disjoint (must form a single 4-connected shape): ${desc}`,
            line: 0, source: 'check',
          })
        } else {
          throw e
        }
      }
    }
  }

  return errors
}
