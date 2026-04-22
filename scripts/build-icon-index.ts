#!/usr/bin/env bun
/**
 * Builds src/generated/icon-index.json — the SSOT consumed by `gg icons` and
 * by the LLM-reference bundle. One record per icon+set pair:
 *
 *   { name, set, ref, label, category, tags }
 *
 * Sources:
 *   - src/data/tabler-meta.json  (name / category / tags / styles)
 *   - src/data/icon-tags.json    (optional gridgram-authored tag overrides)
 *
 * Tabler's built-in tags are rich (5–15 per icon), so overrides stay optional.
 * The overrides file, if present, is a `{ "<icon-name>": ["tag", ...] }` map —
 * entries are unioned with the tabler tag list and deduped.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

interface TablerMetaEntry {
  name: string
  category?: string
  tags?: Array<string | number>
  styles?: {
    outline?: unknown
    filled?: unknown
  }
}

interface IconRecord {
  name: string
  set: 'tabler-outline' | 'tabler-filled'
  ref: string
  label: string
  category: string
  tags: string[]
}

/** kebab-case → "Kebab case" for display. */
function deriveLabel(name: string): string {
  const s = name.replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function normalizeTags(raw: Array<string | number> | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const t of raw) {
    const s = String(t).trim().toLowerCase()
    if (s) seen.add(s)
  }
  return [...seen]
}

function unionTags(a: string[], b: string[] | undefined): string[] {
  if (!b || b.length === 0) return a
  const seen = new Set(a)
  for (const t of b) {
    const s = String(t).trim().toLowerCase()
    if (s) seen.add(s)
  }
  return [...seen]
}

async function main(): Promise<void> {
  const root = process.cwd()
  const metaPath = join(root, 'src/data/tabler-meta.json')
  const overridesPath = join(root, 'src/data/icon-tags.json')
  const outPath = join(root, 'src/generated/icon-index.json')

  if (!existsSync(metaPath)) {
    console.error(`Missing ${metaPath} — run \`bun run sync-tabler\` first.`)
    process.exit(1)
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, TablerMetaEntry>
  const overrides: Record<string, string[]> = existsSync(overridesPath)
    ? JSON.parse(readFileSync(overridesPath, 'utf-8'))
    : {}

  const records: IconRecord[] = []
  for (const [name, entry] of Object.entries(meta)) {
    const baseTags = unionTags(normalizeTags(entry.tags), overrides[name])
    const label = deriveLabel(name)
    const category = entry.category ?? 'Uncategorized'

    if (entry.styles?.outline) {
      records.push({
        name,
        set: 'tabler-outline',
        ref: `tabler/${name}`,
        label,
        category,
        tags: baseTags,
      })
    }
    if (entry.styles?.filled) {
      records.push({
        name,
        set: 'tabler-filled',
        ref: `tabler/filled/${name}`,
        label,
        category,
        tags: baseTags,
      })
    }
  }

  // Stable ordering: by ref. Helps diffs and deterministic search results.
  records.sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0))

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(records, null, 0) + '\n')

  const outline = records.filter((r) => r.set === 'tabler-outline').length
  const filled = records.filter((r) => r.set === 'tabler-filled').length
  console.log(`  wrote ${records.length} icon records → ${outPath}`)
  console.log(`  outline: ${outline}, filled: ${filled}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
