/**
 * One-pass coordinate normalization for a DiagramDef.
 *
 * The public DiagramDef accepts coordinates in several 1-based forms
 * (A1 strings, `[col, row]` tuples, `{col, row}` objects), and permits
 * nodes to omit `pos` entirely (auto-layout fills them in). Every
 * piece of layout math, integrity checking, and rendering downstream
 * reads canonical 0-based `{col, row}` objects and a fully-populated
 * `nodes[i].pos`. This module is the single place that converts one
 * to the other.
 *
 * Two different consumers used to run the same sequence of
 * `auto-position.ts` helpers — `integrity.ts` (to check regions
 * against a canonical shape) and `Diagram.foldLayers` (to feed the
 * layout pipeline). They now call this function instead, so adding
 * a new coordinate-bearing field only needs to be handled in one
 * place.
 *
 * Pure: the input def is not mutated.
 */
import type { DiagramDef, NormalizedDiagramDef } from './types.js'
import {
  assignAutoPositions,
  normalizeConnectorWaypoints,
  normalizeNotes,
  normalizeRegions,
} from './auto-position.js'

export function normalizeDiagramDef(def: DiagramDef): NormalizedDiagramDef {
  return {
    ...def,
    nodes: assignAutoPositions(def.nodes, def.columns),
    connectors: def.connectors ? normalizeConnectorWaypoints(def.connectors) : undefined,
    notes:      def.notes      ? normalizeNotes(def.notes)                  : undefined,
    regions:    def.regions    ? normalizeRegions(def.regions)              : undefined,
  }
}
