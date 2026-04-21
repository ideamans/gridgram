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
import type { LabelRect, LineSeg, CanvasBounds, Circle, CollisionHit } from './collision.js'
import { findCollisions } from './collision.js'

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
 * What to do when NO candidate fits cleanly AND no explicit `fallback`
 * was supplied:
 *   - 'last-candidate' (default): use the last candidate in the list
 *     (preserves the historical behavior).
 *   - 'smallest-collision': walk every attempt and pick the candidate
 *     with the fewest collision hits. Ties broken by earliest index —
 *     so tier-1 candidates win over tier-2 / tier-3 expanded positions
 *     when they're tied. Useful when the candidate list itself
 *     encodes a preference order (e.g. node labels try closer leader
 *     offsets first, then stretch out).
 */
export type NoFitStrategy = 'last-candidate' | 'smallest-collision'

export interface PlaceLabelOptions {
  noFitStrategy?: NoFitStrategy
}

/**
 * Walk `candidates` in order and return the first one whose rect does
 * not collide with the context. If none fit:
 *   - when `fallback` is supplied, use it (flagged `error: true`).
 *   - otherwise dispatch on `options.noFitStrategy` — default
 *     'last-candidate' reproduces the historical last-wins behavior,
 *     'smallest-collision' picks the candidate with the fewest hits.
 *
 * Returns null only when `candidates` is empty AND no `fallback` is
 * supplied — i.e. the caller has nothing to place at all.
 */
export function placeLabel<Slot>(
  candidates: readonly SlotCandidate<Slot>[],
  context: CollisionContext,
  fallback?: SlotCandidate<Slot>,
  options?: PlaceLabelOptions,
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

  // No clean slot. Decide what to force.
  if (fallback) {
    const fbHits = findCollisions(
      fallback.rect, context.placedLabels, context.connLines, context.bounds, context.iconCircles,
    )
    attempts.push({ description: fallback.description, rect: fallback.rect, hits: fbHits, accepted: true })
    return { rect: fallback.rect, slot: fallback.slot, error: true, attempts }
  }

  if (candidates.length === 0) return null

  const strategy: NoFitStrategy = options?.noFitStrategy ?? 'last-candidate'
  if (strategy === 'smallest-collision') {
    // Find the attempt (= candidate) with the minimum hit count. Ties
    // are broken by earliest index so a tier-1 position beats a
    // tier-2 one with the same collision count.
    let bestIdx = 0
    for (let i = 1; i < attempts.length; i++) {
      if (attempts[i].hits.length < attempts[bestIdx].hits.length) bestIdx = i
    }
    const best = candidates[bestIdx]
    // Mark the winning attempt as accepted in-place so downstream
    // diagnostic emission reflects the final choice.
    attempts[bestIdx] = { ...attempts[bestIdx], accepted: true }
    return { rect: best.rect, slot: best.slot, error: true, attempts }
  }

  // 'last-candidate' — the previous default: duplicate the last
  // candidate as a forced fallback entry.
  const fb = candidates[candidates.length - 1]
  const fbHits = findCollisions(
    fb.rect, context.placedLabels, context.connLines, context.bounds, context.iconCircles,
  )
  attempts.push({ description: fb.description, rect: fb.rect, hits: fbHits, accepted: true })
  return { rect: fb.rect, slot: fb.slot, error: true, attempts }
}
