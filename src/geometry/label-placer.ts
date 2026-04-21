/**
 * Generic "try candidates in order, fall back with error" label placement.
 *
 * Node, Connector, and Region all run the same loop:
 *   1. build a list of candidate slots up front — each carries the
 *      pixel rect it would draw at, plus a human-readable description
 *      ("top-right", "segment 2 / above", …)
 *   2. accept the first slot that collides with nothing
 *   3. otherwise force a fallback (explicit or last candidate) and flag
 *      `error: true`
 *
 * The placer records every attempt with the specific obstacles it hit
 * (see CollisionHit). The pipeline turns those into PlacementDiagnostic
 * records that agents / humans read to debug a tight layout.
 */
import type { LabelRect, LineSeg, CanvasBounds, Circle, CollisionHit } from './collision'
import { findCollisions } from './collision'

export interface CollisionContext {
  placedLabels: LabelRect[]
  connLines: LineSeg[]
  bounds?: CanvasBounds
  /** Node icon discs the label must not overlap. Callers that want a
   *  node to sit on top of its *own* icon should filter it out first. */
  iconCircles?: Circle[]
}

/**
 * A candidate slot with its pre-built rect and a short description.
 * Descriptions end up in PlacementAttempt.slot so an agent reading
 * the diagnostic can tell which positions were tried.
 */
export interface SlotCandidate<Slot> {
  slot: Slot
  rect: LabelRect
  description: string
}

/** One position that was tested. Always present in the result — the
 *  accepted slot is the last one. */
export interface AttemptRecord {
  description: string
  rect: LabelRect
  hits: CollisionHit[]
  accepted: boolean
}

export interface PlacementResult<Slot> {
  rect: LabelRect
  slot: Slot
  /** True when placement fell back to the blocked fallback slot. */
  error: boolean
  /** Every candidate the placer examined, in order tried. The final
   *  entry has `accepted: true` and represents the chosen slot (whether
   *  clean or forced-with-collisions). */
  attempts: AttemptRecord[]
}

/**
 * Walk `candidates` in order and return the first one whose rect does
 * not collide with the context. If none fit, return the `fallback`
 * (defaults to the last candidate) flagged `error: true`.
 *
 * Returns null only when `candidates` is empty AND no `fallback` is
 * supplied — i.e. the caller has nothing to place at all.
 */
export function placeLabel<Slot>(
  candidates: readonly SlotCandidate<Slot>[],
  context: CollisionContext,
  fallback?: SlotCandidate<Slot>,
): PlacementResult<Slot> | null {
  const attempts: AttemptRecord[] = []
  for (const cand of candidates) {
    const hits = findCollisions(
      cand.rect, context.placedLabels, context.connLines, context.bounds, context.iconCircles,
    )
    if (hits.length === 0) {
      attempts.push({ description: cand.description, rect: cand.rect, hits: [], accepted: true })
      return { rect: cand.rect, slot: cand.slot, error: false, attempts }
    }
    attempts.push({ description: cand.description, rect: cand.rect, hits, accepted: false })
  }

  const fb = fallback ?? candidates[candidates.length - 1]
  if (!fb) return null

  const fbHits = findCollisions(
    fb.rect, context.placedLabels, context.connLines, context.bounds, context.iconCircles,
  )
  attempts.push({ description: fb.description, rect: fb.rect, hits: fbHits, accepted: true })
  return { rect: fb.rect, slot: fb.slot, error: true, attempts }
}
