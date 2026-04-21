/**
 * Frame resolution — collapses a frame-tagged DiagramDef into a flat,
 * frame-less DiagramDef for a specific frame number.
 *
 * Frames are *tags*, not timesteps. Given:
 *
 *   icon         :user  @A1 tabler/user  "User"
 *   icon [2]     :user  @A1 tabler/user  "User login"      # overrides label at f=2
 *   icon [2]     :new   @B1 tabler/user  "Newcomer"        # only exists at f=2
 *   icon [3-5]   :user  @A1 tabler/filled/user "Session"   # overrides icon + label f=3..5
 *
 * resolveFrame(def, 2) yields:
 *
 *   - :user with label "User login" (base + f=2 override, later wins)
 *   - :new at B1 with label "Newcomer"
 *
 * resolveFrame(def, 1) yields just the base :user; :new is absent.
 *
 * Matching rules:
 *   - `frames === undefined` → always matches (base declaration)
 *   - `frames` as number    → single frame
 *   - `frames` as array     → each item is a single frame or `[min,max]` range
 *   - Ranges are inclusive; `max` may be `Infinity` (gg's `[N-]`)
 *
 * Id merge (nodes + connectors): declarations sharing an id within the
 * matched set are deep-merged in declaration order — later wins per
 * field. Anonymous declarations (notes, regions, anonymous icons /
 * connectors) are kept as distinct entries.
 *
 * `doc [N] { … }` blocks arrive as `def.frameOverrides`; resolveFrame
 * deep-merges each matching override's settings onto the base
 * scalars / theme.
 *
 * Pure: the input def is not mutated.
 */
import type {
  DiagramDef, FrameSpec, FrameRange, FrameDocOverride,
  NodeDef, ConnectorDef, RegionDef, NoteDef,
} from './types.js'

// ---------------------------------------------------------------------------
// Spec normalisation / matching
// ---------------------------------------------------------------------------

/**
 * Collapse any user-facing `FrameSpec` into an array of `[min, max]`
 * ranges. Returns `undefined` when `spec` is `undefined` (which means
 * "always matches"). Throws on malformed input (negative range, etc.).
 */
export function normalizeFrameSpec(spec: FrameSpec | undefined): FrameRange[] | undefined {
  if (spec === undefined) return undefined
  if (typeof spec === 'number') return [[spec, spec]]
  const ranges: FrameRange[] = []
  for (const item of spec) {
    if (typeof item === 'number') {
      ranges.push([item, item])
    } else if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
      const [a, b] = item
      if (a > b) throw new Error(`Frame range start (${a}) must be ≤ end (${b})`)
      ranges.push([a, b])
    } else {
      throw new Error(`Invalid frame spec item: ${JSON.stringify(item)}`)
    }
  }
  return ranges
}

/** Does `spec` include frame number `n`? `undefined` spec matches all frames. */
export function frameMatches(spec: FrameSpec | undefined, n: number): boolean {
  const ranges = normalizeFrameSpec(spec)
  if (ranges === undefined) return true
  return ranges.some(([lo, hi]) => n >= lo && n <= hi)
}

// ---------------------------------------------------------------------------
// Parser for the gg `[ … ]` inner body
// ---------------------------------------------------------------------------

/**
 * Parse the contents of a `.gg` frame-spec bracket into canonical form.
 *
 * Accepted inputs (just the inside, already stripped of `[` / `]`):
 *   "2"            → 2
 *   "2, 3"         → [2, 3]
 *   "2-5"          → [[2, 5]]
 *   "2, 3-5, 7"    → [2, [3,5], 7]
 *   "5-"           → [[5, Infinity]]
 *
 * Returns `{ spec }` on success or `{ error }` with a human-readable message.
 */
export function parseGgFrameSpec(body: string): { spec?: FrameSpec; error?: string } {
  const items = body.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  if (items.length === 0) return { error: 'Empty frame spec `[]`' }
  const result: Array<number | FrameRange> = []
  for (const item of items) {
    // Open-ended range "N-" → [N, Infinity]
    const openEnd = /^(\d+)-$/.exec(item)
    if (openEnd) {
      result.push([Number(openEnd[1]), Infinity])
      continue
    }
    // Closed range "A-B"
    const closed = /^(\d+)-(\d+)$/.exec(item)
    if (closed) {
      const a = Number(closed[1])
      const b = Number(closed[2])
      if (a > b) return { error: `Frame range start (${a}) must be ≤ end (${b})` }
      result.push([a, b])
      continue
    }
    // Single number
    if (/^\d+$/.test(item)) {
      result.push(Number(item))
      continue
    }
    return { error: `Invalid frame spec item: "${item}"` }
  }
  // Collapse a single-item list to a bare number for compactness.
  if (result.length === 1 && typeof result[0] === 'number') {
    return { spec: result[0] }
  }
  return { spec: result }
}

// ---------------------------------------------------------------------------
// resolveFrame — produce a flat, frame-less DiagramDef for frame `n`
// ---------------------------------------------------------------------------

function deepMergeInto(target: Record<string, any>, source: Record<string, any>): void {
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue
    const existing = target[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && existing && typeof existing === 'object' && !Array.isArray(existing)) {
      deepMergeInto(existing, v)
    } else {
      target[k] = v
    }
  }
}

/**
 * Merge declarations that share an id. `entries` is the list of
 * declarations (already filtered to the current frame). Entries without
 * an id are passed through as-is. Entries with the same id are
 * deep-merged in order (later wins per field). Declaration order of the
 * *first* occurrence is preserved so auto-position stays stable.
 */
function mergeById<T extends { id?: string; frames?: FrameSpec }>(
  entries: T[],
  getId: (e: T) => string | undefined,
): T[] {
  const byId = new Map<string, T>()
  const out: T[] = []
  for (const e of entries) {
    const id = getId(e)
    if (!id) { out.push(stripFrames(e)); continue }
    const prev = byId.get(id)
    if (!prev) {
      // Take a shallow copy so we can mutate via deepMergeInto later
      // without clobbering the caller's object.
      const copy = { ...e } as T
      byId.set(id, copy)
      out.push(copy)
    } else {
      deepMergeInto(prev as any, e as any)
    }
  }
  // Strip frames from all merged entries — the resolved def is
  // frame-less by construction.
  for (const e of out) stripFramesInPlace(e as any)
  return out
}

function stripFrames<T extends { frames?: FrameSpec }>(e: T): T {
  if (e.frames === undefined) return e
  const { frames: _discard, ...rest } = e as any
  return rest
}

function stripFramesInPlace(e: { frames?: FrameSpec }): void {
  if ('frames' in e) delete (e as any).frames
}

/**
 * Materialise the DiagramDef for a single frame number. Objects
 * tagged with a non-matching frame spec are dropped; matching objects
 * with the same id are merged.
 */
export function resolveFrame(def: DiagramDef, frame: number): DiagramDef {
  const match = <T extends { frames?: FrameSpec }>(e: T): boolean => frameMatches(e.frames, frame)

  // Base settings — start from def's top-level scalars + theme, then
  // layer every matching `doc [N]` override on top (deep-merged).
  const base: Omit<DiagramDef, 'nodes' | 'connectors' | 'regions' | 'notes' | 'frameOverrides'> = {
    cellSize: def.cellSize,
    padding: def.padding,
    columns: def.columns,
    rows: def.rows,
    theme: def.theme ? { ...def.theme } : undefined,
  }
  for (const override of def.frameOverrides ?? []) {
    if (!frameMatches(override.frames, frame)) continue
    deepMergeInto(base as any, override.settings as any)
  }

  const nodes: NodeDef[] = mergeById(
    def.nodes.filter(match),
    (n) => n.id,
  )
  const connectors: ConnectorDef[] | undefined = def.connectors
    ? mergeById(def.connectors.filter(match), (c) => c.id)
    : undefined
  const regions: RegionDef[] | undefined = def.regions
    ? def.regions.filter(match).map(stripFrames)
    : undefined
  const notes: NoteDef[] | undefined = def.notes
    ? def.notes.filter(match).map(stripFrames)
    : undefined

  return {
    ...base,
    nodes,
    connectors: connectors && connectors.length > 0 ? connectors : undefined,
    regions:    regions    && regions.length    > 0 ? regions    : undefined,
    notes:      notes      && notes.length      > 0 ? notes      : undefined,
  }
}

/**
 * Does this def use frames anywhere? Useful for skipping resolveFrame
 * entirely on diagrams that never opted in.
 */
export function hasFrames(def: DiagramDef): boolean {
  if ((def.frameOverrides?.length ?? 0) > 0) return true
  if (def.nodes.some((n) => n.frames !== undefined)) return true
  if (def.connectors?.some((c) => c.frames !== undefined)) return true
  if (def.regions?.some((r) => r.frames !== undefined)) return true
  if (def.notes?.some((n) => n.frames !== undefined)) return true
  return false
}
