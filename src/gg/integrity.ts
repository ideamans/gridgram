/**
 * Post-parse integrity checks:
 *   - Connector from/to references known node ids
 *   - Note targets reference known node or connector ids
 *   - Region spans fit within cols×rows
 *   - Region spans form a single 4-connected shape (no diagonal-only joins)
 *
 * At this point the DiagramDef carries the raw user-input coordinates
 * (1-based / A1 forms). We normalize a temporary copy here so the
 * checks can reason in canonical 0-based space without mutating the
 * def that render-time foldLayers will later re-normalize.
 *
 * Duplicate-node-id detection happens in parser.ts because it needs to
 * see source attribution (DSL vs JSON) at parse time.
 */
import type { DiagramDef } from '../types'
import type { GgError } from './errors'
import { buildBlob, DisjointRegionError } from '../geometry/blob'
import { computeLayout } from '../geometry/grid'
import { normalizeDiagramDef } from '../normalize'
import { cellAddress } from './diagnostics'

/** Format a normalized 0-based span as `A1-C3` using A1 addresses —
 *  agents and humans read this directly without having to adjust
 *  for the internal 0-base. */
function formatSpan(from: { col: number; row: number }, to: { col: number; row: number }): string {
  return `${cellAddress(from.col + 1, from.row + 1)}-${cellAddress(to.col + 1, to.row + 1)}`
}

export function checkIntegrity(def: DiagramDef): GgError[] {
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
  let normalized: DiagramDef
  try {
    normalized = normalizeDiagramDef(def)
  } catch (e: any) {
    // A malformed coord (bad A1, col < 1, …) surfaces as a check error
    // citing the offending address.
    errors.push({ message: e?.message ?? String(e), line: 0, source: 'check' })
    return errors
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
