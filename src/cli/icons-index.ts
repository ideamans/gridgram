/**
 * Loads the generated icon index and offers search / filter primitives used
 * by `gg icons` (and later by the LLM-reference bundle).
 *
 * The index is built by scripts/build-icon-index.ts from the tabler
 * metadata bundled by sync-tabler. One record per icon+set pair.
 */

export interface IconRecord {
  name: string
  set: 'tabler-outline' | 'tabler-filled'
  ref: string
  label: string
  category: string
  tags: string[]
}

// Regular JSON import: Bun (and bun --compile) inlines the file, and
// TypeScript types the value as the parsed array directly.
import iconIndex from '../generated/icon-index.json' with { type: 'json' }

export function loadIndex(): IconRecord[] {
  return iconIndex as IconRecord[]
}

export interface SearchFilters {
  search?: string
  tag?: string
  set?: 'tabler-outline' | 'tabler-filled'
}

/**
 * Score an icon against a query. Higher = better match.
 * 10 — exact name match
 *  7 — name starts with query
 *  5 — query is a tag (exact)
 *  4 — query is a substring of name
 *  3 — query is a substring of label (case-insensitive)
 *  2 — query is a substring of category
 *  1 — query is a substring of any tag
 */
function scoreMatch(rec: IconRecord, q: string): number {
  const needle = q.toLowerCase()
  if (rec.name === needle) return 10
  if (rec.name.startsWith(needle)) return 7
  if (rec.tags.includes(needle)) return 5
  if (rec.name.includes(needle)) return 4
  if (rec.label.toLowerCase().includes(needle)) return 3
  if (rec.category.toLowerCase().includes(needle)) return 2
  for (const t of rec.tags) if (t.includes(needle)) return 1
  return 0
}

export interface ScoredRecord extends IconRecord {
  score: number
}

export function searchIcons(filters: SearchFilters, limit?: number): ScoredRecord[] {
  const all = loadIndex()
  const out: ScoredRecord[] = []
  for (const rec of all) {
    if (filters.set && rec.set !== filters.set) continue
    if (filters.tag) {
      const t = filters.tag.toLowerCase()
      if (!rec.tags.includes(t)) continue
    }
    let score = filters.search ? scoreMatch(rec, filters.search) : 1
    if (filters.search && score === 0) continue
    out.push({ ...rec, score })
  }

  // Higher score first, then alphabetical for deterministic output.
  out.sort((a, b) => b.score - a.score || (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0))
  return typeof limit === 'number' && limit > 0 ? out.slice(0, limit) : out
}

export function tagFrequency(set?: 'tabler-outline' | 'tabler-filled'): Array<{ tag: string; count: number }> {
  const all = loadIndex()
  const freq = new Map<string, number>()
  for (const rec of all) {
    if (set && rec.set !== set) continue
    for (const t of rec.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
  }
  const list = [...freq.entries()].map(([tag, count]) => ({ tag, count }))
  // Most common first, then alphabetical.
  list.sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
  return list
}

export function iconCounts(): { outline: number; filled: number; total: number } {
  const all = loadIndex()
  const outline = all.filter((r) => r.set === 'tabler-outline').length
  const filled = all.filter((r) => r.set === 'tabler-filled').length
  return { outline, filled, total: all.length }
}
