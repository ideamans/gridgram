/**
 * Validates every SKILL.md under plugins/** against the Agent Skills open
 * standard. These tests are the local counterpart of running the official
 * `skills-ref validate` tool and give us fast feedback during dev.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { validatePluginSkills } from '../../scripts/validate-plugin-skills.ts'

const PLUGINS = join(process.cwd(), 'plugins')

describe('plugins/** SKILL.md validation', () => {
  test('every skill passes the standards check', () => {
    const { issues } = validatePluginSkills(PLUGINS)
    const errors = issues.filter((i) => i.severity === 'error')
    if (errors.length > 0) {
      console.log('validation errors:', errors)
    }
    expect(errors).toEqual([])
  })

  test('every skill declares name + description only from standard fields', () => {
    const { skillDirs, issues } = validatePluginSkills(PLUGINS)
    expect(skillDirs.length).toBeGreaterThanOrEqual(3)
    const nonStandardWarnings = issues.filter(
      (i) => i.severity === 'warn' && i.message.includes('non-standard frontmatter key'),
    )
    expect(nonStandardWarnings).toEqual([])
  })
})

describe('plugins/gridgram/.claude-plugin/plugin.json', () => {
  const path = join(PLUGINS, 'gridgram/.claude-plugin/plugin.json')

  test('exists and parses', () => {
    expect(existsSync(path)).toBe(true)
    const parsed = JSON.parse(readFileSync(path, 'utf-8'))
    expect(parsed.name).toBe('gridgram')
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+/)
    expect(parsed.license).toBeDefined()
  })

  test('version matches package.json (kept in sync with the library itself)', () => {
    const plugin = JSON.parse(readFileSync(path, 'utf-8'))
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
    expect(plugin.version).toBe(pkg.version)
  })
})

describe('skill descriptions include discovery keywords', () => {
  const cases: Array<{ skill: string; keywords: string[] }> = [
    { skill: 'gg-render', keywords: ['render', 'gridgram', 'diagnostics'] },
    { skill: 'gg-icons', keywords: ['icon', 'tabler', 'gridgram'] },
    { skill: 'gg-author', keywords: ['diagram', 'gridgram', 'draw'] },
  ]

  for (const { skill, keywords } of cases) {
    test(`${skill} description mentions ${keywords.join(', ')}`, () => {
      const src = readFileSync(join(PLUGINS, `gridgram/skills/${skill}/SKILL.md`), 'utf-8')
      const m = src.match(/^---\n([\s\S]*?)\n---/)
      expect(m).toBeTruthy()
      const fm = m![1]!
      const desc = fm.match(/^description:\s*(.*)$/m)?.[1]?.toLowerCase() ?? ''
      for (const kw of keywords) {
        expect(desc).toContain(kw.toLowerCase())
      }
    })
  }
})
