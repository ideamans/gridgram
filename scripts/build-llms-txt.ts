#!/usr/bin/env bun
/**
 * Generate docs/public/llms.txt (the llmstxt.org index format) and
 * docs/public/llms-full.txt (full concatenated markdown of the English docs
 * + the generated LLM reference).
 *
 * - llms.txt follows the spec at https://llmstxt.org/ (H1 / blockquote /
 *   optional body / H2-delimited link sections). Links are absolute URLs
 *   into the deployed docs site so external agents can fetch each page
 *   directly.
 * - llms-full.txt is a single file that concatenates every doc's markdown
 *   (Mintlify+Anthropic convention) plus src/generated/llm-reference.md.
 *   That's the "give me everything in one payload" version.
 *
 * Re-run via `bun run build-llms-txt`. Also wired into `ai:regen` and
 * `docs:build`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs'
import { join, relative, dirname } from 'path'

const root = process.cwd()
const DOCS_EN = join(root, 'docs/en')
const OUT_DIR = join(root, 'docs/public')
const SITE_BASE = process.env.GRIDGRAM_DOCS_URL?.replace(/\/$/, '') ?? 'https://gridgram.ideamans.com'

interface DocPage {
  /** Route path used in the deployed docs (e.g. "/en/guide/first-gridgram"). */
  route: string
  /** Display title (from frontmatter or first H1 or filename). */
  title: string
  /** Absolute filesystem path to the .md source. */
  file: string
  /** File body, frontmatter stripped. */
  body: string
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walkMarkdown(full))
    else if (s.isFile() && entry.endsWith('.md')) out.push(full)
  }
  return out
}

/** Strip a leading `---\n … \n---\n` frontmatter block and return (fm, body). */
function splitFrontmatter(src: string): { frontmatter: Record<string, string>; body: string } {
  const fm: Record<string, string> = {}
  if (!src.startsWith('---\n')) return { frontmatter: fm, body: src }
  const end = src.indexOf('\n---', 4)
  if (end === -1) return { frontmatter: fm, body: src }
  const block = src.slice(4, end)
  // Cheap YAML parse: only flat `key: value` lines. That's all the docs use
  // at the outermost level that we care about here (title).
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (m) fm[m[1]!] = m[2]!.trim().replace(/^['"]|['"]$/g, '')
  }
  // +4 skips the closing "\n---" plus one newline after.
  const rest = src.slice(end + 4)
  return { frontmatter: fm, body: rest.replace(/^\n/, '') }
}

/** Derive a route like "/en/guide/connector" from an absolute .md path. */
function routeOf(file: string): string {
  let r = '/' + relative(root, file).replace(/\.md$/, '')
  // `index.md` collapses to its directory route.
  r = r.replace(/\/index$/, '/')
  // Trim trailing slash for non-root routes so URLs are predictable.
  if (r !== '/' && r.endsWith('/')) r = r.slice(0, -1)
  // VitePress serves `docs/` as the root of the site — strip the prefix.
  return r.replace(/^\/docs/, '')
}

function titleOf(fm: Record<string, string>, body: string, file: string): string {
  if (fm.title) return fm.title
  const h1 = body.match(/^#\s+(.+)$/m)
  if (h1) return h1[1]!.trim()
  // Fallback: humanize the filename.
  const base = file.split('/').pop()!.replace(/\.md$/, '').replace(/-/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function loadPages(): DocPage[] {
  const pages: DocPage[] = []
  for (const file of walkMarkdown(DOCS_EN)) {
    const src = readFileSync(file, 'utf-8')
    const { frontmatter, body } = splitFrontmatter(src)
    pages.push({
      route: routeOf(file),
      title: titleOf(frontmatter, body, file),
      file,
      body,
    })
  }
  // Stable ordering by route.
  pages.sort((a, b) => (a.route < b.route ? -1 : a.route > b.route ? 1 : 0))
  return pages
}

function groupForIndex(pages: DocPage[]): Map<string, DocPage[]> {
  // Group by first path segment after /en/: guide / developer / gallery / etc.
  const groups = new Map<string, DocPage[]>()
  for (const p of pages) {
    // p.route looks like "/en", "/en/guide", "/en/guide/connector", …
    const parts = p.route.split('/').filter(Boolean)
    // parts[0] === 'en'
    const group = parts.length < 2 ? 'Home' : capitalize(parts[1]!)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(p)
  }
  return groups
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function renderIndex(pages: DocPage[]): string {
  const groups = groupForIndex(pages)
  const lines: string[] = []
  lines.push('# gridgram')
  lines.push('')
  lines.push(
    '> Grid-based diagram rendering library and CLI. Renders `.gg` DSL or a TypeScript `DiagramDef` to SVG / PNG / JSON with deterministic layout and 6,000+ built-in Tabler icons.',
  )
  lines.push('')
  lines.push(
    'gridgram is designed for agent/LLM workflows. The `gg` CLI exposes `render`, `icons` (semantic icon search), `llm` (this reference as a single bundle), and `license`.',
  )
  lines.push('')

  // Canonical order for the top-level groups.
  const order = ['Home', 'Guide', 'Developer', 'Gallery', 'Editor']
  const seen = new Set<string>()

  const emitGroup = (name: string, items: DocPage[]) => {
    lines.push(`## ${name}`)
    lines.push('')
    for (const p of items) {
      const url = `${SITE_BASE}${p.route}.md`
      lines.push(`- [${p.title}](${url})`)
    }
    lines.push('')
  }

  for (const g of order) {
    const items = groups.get(g)
    if (items && items.length > 0) {
      emitGroup(g, items)
      seen.add(g)
    }
  }
  // Anything left over (unexpected group) goes under Optional.
  const leftover: DocPage[] = []
  for (const [g, items] of groups) if (!seen.has(g)) leftover.push(...items)
  if (leftover.length > 0) {
    lines.push('## Optional')
    lines.push('')
    for (const p of leftover) {
      const url = `${SITE_BASE}${p.route}.md`
      lines.push(`- [${p.title}](${url})`)
    }
    lines.push('')
  }

  // Always append the LLM-reference bundle link.
  lines.push('## LLM reference (single bundle)')
  lines.push('')
  lines.push(`- [gridgram LLM reference](${SITE_BASE}/llms-full.txt): full CLI + .gg grammar + icons + JSON schema + examples, concatenated for one-shot context.`)
  lines.push('')

  return lines.join('\n')
}

function renderFull(pages: DocPage[]): string {
  const lines: string[] = []
  lines.push('# gridgram — full documentation')
  lines.push('')
  lines.push('> Concatenated English docs plus the generated `gg llm` reference. Auto-generated; do not edit by hand.')
  lines.push('')
  for (const p of pages) {
    lines.push(`<!-- source: ${relative(root, p.file)} -->`)
    lines.push(`<!-- route: ${p.route} -->`)
    lines.push('')
    lines.push(p.body.trim())
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  // Append the LLM reference (a completely different kind of content: CLI
  // spec + BNF + JSON envelope). Keeps everything agent-relevant in one payload.
  const refPath = join(root, 'src/generated/llm-reference.md')
  if (existsSync(refPath)) {
    lines.push('<!-- source: src/generated/llm-reference.md -->')
    lines.push('')
    lines.push(readFileSync(refPath, 'utf-8').trim())
    lines.push('')
  }
  return lines.join('\n')
}

function main(): void {
  if (!existsSync(DOCS_EN)) {
    console.error(`Missing ${DOCS_EN} — no English docs to index.`)
    process.exit(1)
  }
  const pages = loadPages()
  const index = renderIndex(pages)
  const full = renderFull(pages)
  mkdirSync(OUT_DIR, { recursive: true })
  const idxPath = join(OUT_DIR, 'llms.txt')
  const fullPath = join(OUT_DIR, 'llms-full.txt')
  writeFileSync(idxPath, index)
  writeFileSync(fullPath, full)
  console.log(`  wrote ${index.length} chars → ${idxPath}`)
  console.log(`  wrote ${full.length} chars → ${fullPath} (${pages.length} docs concatenated)`)
}

main()
