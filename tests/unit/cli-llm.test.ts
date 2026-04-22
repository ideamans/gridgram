/**
 * `gg llm` emits the LLM reference bundle (markdown or JSON). These tests
 * spawn the real CLI so the bundled asset is exercised the same way a user
 * (or an agent) would.
 */
import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'

function gg(args: string[]) {
  return spawnSync('bun', ['run', 'src/cli/gg.ts', ...args], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
  })
}

describe('gg llm', () => {
  test('default (markdown) includes every required section', () => {
    const r = gg(['llm'])
    expect(r.status).toBe(0)
    const out = r.stdout
    for (const section of [
      '# gridgram — LLM reference',
      '## gg CLI',
      '## .gg DSL',
      '### Grammar (informal BNF)',
      '## Icons',
      "## Document settings (`doc { … }`)",
      '## JSON output envelope',
      '## Canonical examples',
      '## Best practices for agents',
    ]) {
      expect(out).toContain(section)
    }
  })

  test('markdown version matches package.json', () => {
    const r = gg(['llm'])
    expect(r.status).toBe(0)
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }
    expect(r.stdout).toContain(`Version: ${pkg.version}`)
  })

  test('markdown embeds the BNF grammar extracted from dsl.ts', () => {
    const r = gg(['llm'])
    expect(r.status).toBe(0)
    // Keys from the BNF that aren't in the prose sections:
    expect(r.stdout).toContain("connector-stmt := IDENT arrow IDENT arg* body?")
    expect(r.stdout).toContain("frame-item  := INT | INT '-' INT | INT '-'")
  })

  test('--format json wraps markdown + structured fields', () => {
    const r = gg(['llm', '--format', 'json'])
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout) as {
      version: string
      iconCounts: { outline: number; filled: number; total: number }
      grammar: string
      reference: string
    }
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }
    expect(parsed.version).toBe(pkg.version)
    expect(parsed.iconCounts.outline).toBeGreaterThan(1000)
    expect(parsed.iconCounts.filled).toBeGreaterThan(100)
    expect(parsed.iconCounts.total).toBe(parsed.iconCounts.outline + parsed.iconCounts.filled)
    expect(parsed.grammar).toContain('connector-stmt')
    expect(parsed.reference).toContain('# gridgram — LLM reference')
  })

  test('markdown embeds the canonical minimal example', () => {
    const r = gg(['llm'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('icon tabler/user "User"')
  })
})
