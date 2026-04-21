/**
 * Brand-case rename: "gridgram" → "Gridgram" for prose / display only.
 *
 * What this script protects (stays lowercase):
 *  - Fenced code blocks (``` … ```) — technical identifiers live here
 *  - Inline code spans (`…`) — referenced identifiers stay verbatim
 *  - Package specifiers in strings:   'gridgram', 'gridgram/sub'
 *  - URLs to the GitHub repo
 *  - Config filenames: gridgram.config.{ts,js,json,json5}
 *  - Install commands: npm|bun|pnpm|yarn (install|add) gridgram
 *  - URL seeds on example assets (picsum, @gridgram-*)
 *
 * Everything else — prose sentences, headings, frontmatter display
 * strings — gets the capital G. Idempotent.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

const PROTECTED_PATTERNS: RegExp[] = [
  /github\.com\/ideamans\/gridgram/g,
  /'gridgram(?:\/[^']+)?'/g,
  /"gridgram(?:\/[^"]+)?"/g,
  /gridgram\.config\.(?:ts|js|json|json5|\{[^}]+\})/g,
  /(?:npm install|bun add|pnpm add|yarn add|install) gridgram\b/g,
  /picsum\.photos\/seed\/gridgram-[a-z0-9-]+/g,
  /@gridgram-/g,
]

function protectRegions(text: string): { text: string; placeholders: string[] } {
  const placeholders: string[] = []
  let out = text
  for (const rx of PROTECTED_PATTERNS) {
    out = out.replace(rx, (m) => {
      const key = `\x00P${placeholders.length}\x00`
      placeholders.push(m)
      return key
    })
  }
  return { text: out, placeholders }
}

function restore(text: string, placeholders: string[]): string {
  return text.replace(/\x00P(\d+)\x00/g, (_, i) => placeholders[Number(i)])
}

function processProse(text: string): string {
  // Protect inline-code spans first so identifiers between backticks
  // stay untouched.
  const inlineSpans: string[] = []
  let work = text.replace(/`[^`\n]+`/g, (m) => {
    const key = `\x01I${inlineSpans.length}\x01`
    inlineSpans.push(m)
    return key
  })
  const { text: masked, placeholders } = protectRegions(work)
  let substituted = masked.replace(/\bgridgram\b/g, 'Gridgram')
  substituted = restore(substituted, placeholders)
  substituted = substituted.replace(/\x01I(\d+)\x01/g, (_, i) => inlineSpans[Number(i)])
  return substituted
}

function processMarkdown(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  let inCode = false
  for (const line of lines) {
    if (/^```/.test(line)) {
      inCode = !inCode
      out.push(line)
      continue
    }
    out.push(inCode ? line : processProse(line))
  }
  return out.join('\n')
}

function walk(dir: string, skip: (p: string) => boolean): string[] {
  const results: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (skip(p)) continue
    const s = statSync(p)
    if (s.isDirectory()) results.push(...walk(p, skip))
    else if (name.endsWith('.md')) results.push(p)
  }
  return results
}

const files = walk('docs', (p) => p.includes('/.vitepress/') || p.includes('/node_modules/'))
let changed = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const out = processMarkdown(src)
  if (src !== out) {
    writeFileSync(f, out)
    changed++
    console.log('updated:', f)
  }
}
console.log(`\n${changed} file(s) updated.`)
