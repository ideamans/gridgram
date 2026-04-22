/**
 * `gg icons` subcommand tests. Spawns the real CLI so we exercise citty
 * dispatch + the compiled icon index together.
 */
import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'child_process'

function gg(args: string[]) {
  return spawnSync('bun', ['run', 'src/cli/gg.ts', ...args], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  })
}

describe('gg icons', () => {
  test('list all with --limit prints ref/label/category/tags tab-separated', () => {
    const r = gg(['icons', '--limit', '3'])
    expect(r.status).toBe(0)
    const lines = r.stdout.trim().split('\n')
    expect(lines.length).toBe(3)
    for (const line of lines) {
      const cols = line.split('\t')
      expect(cols.length).toBe(4) // ref, label, category, tags-csv
      expect(cols[0]).toMatch(/^tabler\//)
    }
  })

  test('--search exact name scores highest (top results are the exact match)', () => {
    const r = gg(['icons', '--search', 'user', '--limit', '5', '--format', 'json'])
    expect(r.status).toBe(0)
    const results = JSON.parse(r.stdout) as Array<{ name: string; score: number }>
    expect(results.length).toBe(5)
    // At least one of the top results must be the exact name "user".
    expect(results.some((r) => r.name === 'user' && r.score === 10)).toBe(true)
    // Results are sorted by score desc.
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  test('--tag filters to icons having that tag', () => {
    const r = gg(['icons', '--tag', 'cloud', '--limit', '3', '--format', 'json'])
    expect(r.status).toBe(0)
    const results = JSON.parse(r.stdout) as Array<{ tags: string[] }>
    expect(results.length).toBe(3)
    for (const rec of results) expect(rec.tags).toContain('cloud')
  })

  test('--set tabler-filled restricts to the filled style', () => {
    const r = gg(['icons', '--set', 'tabler-filled', '--limit', '5', '--format', 'json'])
    expect(r.status).toBe(0)
    const results = JSON.parse(r.stdout) as Array<{ set: string; ref: string }>
    for (const rec of results) {
      expect(rec.set).toBe('tabler-filled')
      expect(rec.ref.startsWith('tabler/filled/')).toBe(true)
    }
  })

  test('--tags returns tag frequency, most common first', () => {
    const r = gg(['icons', '--tags', '--limit', '5', '--format', 'json'])
    expect(r.status).toBe(0)
    const results = JSON.parse(r.stdout) as Array<{ tag: string; count: number }>
    expect(results.length).toBe(5)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].count).toBeGreaterThanOrEqual(results[i].count)
    }
  })

  test('--format json with no filters wraps results in a counts envelope', () => {
    // Pass a larger buffer: the full list is >1MB which kills spawnSync's
    // default maxBuffer (1MB) with a null exit code.
    const r = spawnSync('bun', ['run', 'src/cli/gg.ts', 'icons', '--format', 'json'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
    })
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout) as { counts: { outline: number; filled: number; total: number }; results: unknown[] }
    expect(parsed.counts.outline).toBeGreaterThan(1000)
    expect(parsed.counts.filled).toBeGreaterThan(100)
    expect(parsed.counts.total).toBe(parsed.counts.outline + parsed.counts.filled)
    expect(Array.isArray(parsed.results)).toBe(true)
    expect(parsed.results.length).toBe(parsed.counts.total)
  })

  test('--limit with non-numeric value exits 1 with a clear error', () => {
    const r = gg(['icons', '--limit', 'abc'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/--limit expects a number/)
  })

  test('--search with no matches returns an empty result set', () => {
    const r = gg(['icons', '--search', 'zzzzzzzzzzzzzz-not-an-icon', '--format', 'json'])
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout)).toEqual([])
  })

  // Regression coverage for src/data/icon-tags.json: these common
  // architecture-diagram concepts used to return zero or off-topic results
  // before the gridgram-authored tag overrides were added.
  for (const [query, expectedNames] of [
    ['cache', ['bolt', 'clock-play']],
    ['microservice', ['box', 'puzzle']],
    ['kubernetes', ['box-multiple']],
    ['websocket', ['plug', 'route']],
    ['loadbalancer', ['arrows-split', 'route']],
  ] as const) {
    test(`--search "${query}" surfaces ${expectedNames.join(' or ')}`, () => {
      const r = gg(['icons', '--search', query, '--limit', '5', '--format', 'json'])
      expect(r.status).toBe(0)
      const names = (JSON.parse(r.stdout) as Array<{ name: string }>).map((x) => x.name)
      // At least one of the expected canonical icons must appear in the top N.
      expect(expectedNames.some((n) => names.includes(n))).toBe(true)
    })
  }
})
