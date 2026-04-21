/**
 * Label bounding-box and collision utilities shared across
 * Region, Node, and Connector label placement.
 */

export interface LabelRect {
  x: number
  y: number
  w: number
  h: number
}

/** Check if two rectangles overlap (with optional padding) */
export function rectsOverlap(a: LabelRect, b: LabelRect, pad = 2): boolean {
  return (
    a.x - pad < b.x + b.w + pad &&
    a.x + a.w + pad > b.x - pad &&
    a.y - pad < b.y + b.h + pad &&
    a.y + a.h + pad > b.y - pad
  )
}

/** Check if a rect overlaps with any rect in the list */
export function overlapsAny(rect: LabelRect, others: LabelRect[], pad = 4): boolean {
  return others.some((o) => rectsOverlap(rect, o, pad))
}

/** A pre-computed line segment (pixel coords) */
export interface LineSeg {
  x1: number; y1: number; x2: number; y2: number
}

/** Check if a rect is crossed by any line segment in the list */
export function rectHitsAnyLine(rect: LabelRect, lines: LineSeg[], pad = 6): boolean {
  return lines.some((l) =>
    lineIntersectsRect(l.x1, l.y1, l.x2, l.y2,
      rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2)
  )
}

/** A node's icon-disc in pixel coordinates (for collision-avoidance). */
export interface Circle {
  cx: number; cy: number; r: number
}

/** Closest-point rect-vs-circle overlap test. */
export function rectHitsCircle(rect: LabelRect, c: Circle, pad = 0): boolean {
  const qx = Math.max(rect.x, Math.min(c.cx, rect.x + rect.w))
  const qy = Math.max(rect.y, Math.min(c.cy, rect.y + rect.h))
  const dx = c.cx - qx
  const dy = c.cy - qy
  const rr = c.r + pad
  return dx * dx + dy * dy < rr * rr
}

/** Check if a rect overlaps with any of the circles. */
export function rectHitsAnyCircle(rect: LabelRect, circles: Circle[], pad = 4): boolean {
  return circles.some((c) => rectHitsCircle(rect, c, pad))
}

export interface CanvasBounds {
  width: number
  height: number
}

/** Check if a rect extends outside the canvas bounds */
export function rectOutOfBounds(rect: LabelRect, bounds: CanvasBounds): boolean {
  return rect.x < 0 || rect.y < 0 || rect.x + rect.w > bounds.width || rect.y + rect.h > bounds.height
}

/**
 * Combined boolean check: overlaps label, crosses line, hits an icon
 * circle, OR out of canvas. Pass `bounds` to enable the canvas-bounds
 * check; omit to skip. Pass `circles` to enable icon-disc avoidance
 * (labels won't be placed on top of another node's icon).
 */
export function labelCollides(
  rect: LabelRect,
  labels: LabelRect[],
  lines: LineSeg[],
  bounds?: CanvasBounds,
  circles?: Circle[],
): boolean {
  if (bounds && rectOutOfBounds(rect, bounds)) return true
  if (circles && rectHitsAnyCircle(rect, circles)) return true
  return overlapsAny(rect, labels) || rectHitsAnyLine(rect, lines)
}

/**
 * A single thing that overlapped with the probed rect. Pipeline
 * consumers need this granularity to emit diagnostic records — the
 * `labelCollides` boolean tells you "it doesn't fit", but not "against
 * what", which is what an AI agent needs to choose a remediation.
 *
 * `index` points back into the corresponding input array so callers can
 * attach owner-element context (node id, connector id, …) without this
 * module knowing about element identity.
 */
export type CollisionHit =
  | { kind: 'canvas-bounds' }
  | { kind: 'label'; index: number; rect: LabelRect }
  | { kind: 'line';  index: number; line: LineSeg }
  | { kind: 'icon';  index: number; circle: Circle }

/**
 * Return every collider the rect touches. Empty array ⇒ the slot is
 * clear. Ordered canvas-bounds → icons → labels → lines, matching the
 * mental priority of "is this even inside the canvas" then "does it
 * sit on an icon" etc.
 */
export function findCollisions(
  rect: LabelRect,
  labels: LabelRect[],
  lines: LineSeg[],
  bounds?: CanvasBounds,
  circles?: Circle[],
): CollisionHit[] {
  const hits: CollisionHit[] = []
  if (bounds && rectOutOfBounds(rect, bounds)) hits.push({ kind: 'canvas-bounds' })
  if (circles) {
    for (let i = 0; i < circles.length; i++) {
      if (rectHitsCircle(rect, circles[i], 4)) hits.push({ kind: 'icon', index: i, circle: circles[i] })
    }
  }
  for (let i = 0; i < labels.length; i++) {
    if (rectsOverlap(rect, labels[i], 4)) hits.push({ kind: 'label', index: i, rect: labels[i] })
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (lineIntersectsRect(
      l.x1, l.y1, l.x2, l.y2,
      rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12,
    )) hits.push({ kind: 'line', index: i, line: l })
  }
  return hits
}

// ---------------------------------------------------------------------------
// Scored collision: quantifies HOW BAD a placement is (0 = perfect)
// ---------------------------------------------------------------------------

/**
 * Compute the minimum distance from a point to a line segment.
 */
export function pointToSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx, cy = y1 + t * dy
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
}

/**
 * Check if a line segment intersects a circle.
 * Returns true if the segment passes through the circle (center cx,cy radius r).
 */
export function lineIntersectsCircle(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): boolean {
  const dist = pointToSegDist(cx, cy, x1, y1, x2, y2)
  return dist < r
}

/** Check if a line segment intersects a rect */
export function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const left = rx, right = rx + rw, top = ry, bottom = ry + rh
  function code(x: number, y: number): number {
    let c = 0
    if (x < left) c |= 1; if (x > right) c |= 2
    if (y < top) c |= 4; if (y > bottom) c |= 8
    return c
  }
  let c1 = code(x1, y1), c2 = code(x2, y2)
  for (let i = 0; i < 20; i++) {
    if ((c1 | c2) === 0) return true
    if ((c1 & c2) !== 0) return false
    const cOut = c1 !== 0 ? c1 : c2
    let x = 0, y = 0
    if (cOut & 8) { y = bottom; x = x1 + (x2 - x1) * (bottom - y1) / (y2 - y1) }
    else if (cOut & 4) { y = top; x = x1 + (x2 - x1) * (top - y1) / (y2 - y1) }
    else if (cOut & 2) { x = right; y = y1 + (y2 - y1) * (right - x1) / (x2 - x1) }
    else if (cOut & 1) { x = left; y = y1 + (y2 - y1) * (left - x1) / (x2 - x1) }
    if (cOut === c1) { x1 = x; y1 = y; c1 = code(x1, y1) }
    else { x2 = x; y2 = y; c2 = code(x2, y2) }
  }
  return false
}
