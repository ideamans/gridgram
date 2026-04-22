/**
 * Sanity tests for the llms.txt / llms-full.txt generator.
 *
 * We regenerate into a tmp dir (via a subprocess that honors `GRIDGRAM_DOCS_URL`)
 * and validate the outputs rather than assuming `docs/public/llms*.txt` exist
 * from a prior run.
 */
import { describe, expect, test, beforeAll } from 'bun:test'
import { spawnSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PUB = join(process.cwd(), 'docs/public')

beforeAll(() => {
  // Always regenerate to guarantee freshness — the previous output may be
  // from a different commit. Uses the default base URL.
  const r = spawnSync('bun', ['scripts/build-llms-txt.ts'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  })
  if (r.status !== 0) {
    throw new Error(`build-llms-txt.ts failed:\n${r.stderr}`)
  }
})

describe('llms.txt (index)', () => {
  test('file exists and starts with an H1 + blockquote', () => {
    const path = join(PUB, 'llms.txt')
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, 'utf-8')
    expect(src.startsWith('# gridgram')).toBe(true)
    expect(src).toMatch(/^> /m)
  })

  test('has the canonical top-level sections', () => {
    const src = readFileSync(join(PUB, 'llms.txt'), 'utf-8')
    for (const heading of ['## Home', '## Guide', '## Developer', '## Gallery', '## LLM reference (single bundle)']) {
      expect(src).toContain(heading)
    }
  })

  test('links are absolute https URLs under the docs domain', () => {
    const src = readFileSync(join(PUB, 'llms.txt'), 'utf-8')
    const linkRE = /\[[^\]]+\]\(([^)]+)\)/g
    const urls: string[] = []
    let m: RegExpExecArray | null
    while ((m = linkRE.exec(src)) !== null) urls.push(m[1]!)
    expect(urls.length).toBeGreaterThan(10)
    for (const u of urls) {
      expect(u.startsWith('https://')).toBe(true)
      // Point to .md for agents that prefer raw markdown.
      expect(u.endsWith('.md') || u.endsWith('.txt')).toBe(true)
    }
  })

  test('lists at least the CLI guide page', () => {
    const src = readFileSync(join(PUB, 'llms.txt'), 'utf-8')
    expect(src).toContain('/en/guide/cli.md')
  })
})

describe('llms-full.txt (concatenated bundle)', () => {
  test('file exists and starts with the full-bundle header', () => {
    const path = join(PUB, 'llms-full.txt')
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, 'utf-8')
    expect(src.startsWith('# gridgram — full documentation')).toBe(true)
  })

  test('embeds the generated LLM reference markdown verbatim', () => {
    const src = readFileSync(join(PUB, 'llms-full.txt'), 'utf-8')
    expect(src).toContain('# gridgram — LLM reference')
    expect(src).toContain("connector-stmt := IDENT arrow IDENT arg* body?")
  })

  test('concatenates at least 30 source docs', () => {
    const src = readFileSync(join(PUB, 'llms-full.txt'), 'utf-8')
    const sources = src.match(/<!-- source: [^>]+ -->/g) ?? []
    expect(sources.length).toBeGreaterThan(30)
  })
})
