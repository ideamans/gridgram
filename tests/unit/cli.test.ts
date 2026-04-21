/**
 * CLI integration tests. Spawns `bun src/cli/gg.ts ...` for each scenario
 * so we exercise the actual exit codes / stderr / file output paths.
 */
import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { spawnSync } from 'child_process'

const TMP = join(process.cwd(), 'tmp', 'cli-test')

function gg(args: string[], opts: { cwd?: string } = {}) {
  return spawnSync('bun', ['run', 'src/cli/gg.ts', ...args], {
    cwd: opts.cwd ?? process.cwd(),
    encoding: 'utf-8',
  })
}

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
})
afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('gg CLI', () => {
  test('renders SVG from a valid .gg file', () => {
    const input = join(TMP, 'ok.gg')
    const output = join(TMP, 'ok.svg')
    writeFileSync(input,
      `icon :n @1,1 src=user "U"\nicon :m @2,1 src=server\nn --> m "x"`)
    const r = gg([input, '-o', output])
    expect(r.status).toBe(0)
    expect(existsSync(output)).toBe(true)
    const svg = readFileSync(output, 'utf-8')
    expect(svg).toContain('<?xml')
    expect(svg).toContain('<svg')
  })

  test('emits JSON envelope (def + diagnostics) with --format json', () => {
    const input = join(TMP, 'json.gg')
    // Use a resolvable Tabler icon so no icon-unresolved diagnostic fires.
    writeFileSync(input, `icon :n @1,1 src=tabler/user "U"`)
    const r = gg([input, '--format', 'json', '--stdout'])
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.def.nodes[0].id).toBe('n')
    expect(parsed.def.nodes[0].pos).toEqual({ col: 1, row: 1 })
    // Clean file → empty diagnostics array.
    expect(parsed.diagnostics).toEqual([])
  })

  test('--diagnostics emits JSON to stderr with icon-unresolved entry', () => {
    const input = join(TMP, 'diag-icon.gg')
    // Deliberate tabler typo — "userr" instead of "user".
    writeFileSync(input, `icon :n @1,1 src=tabler/userr "U"`)
    const r = gg([input, '--stdout', '--diagnostics'])
    expect(r.status).toBe(0) // render still succeeds; the node just gets iconError.
    const diagnostics = JSON.parse(r.stderr)
    expect(Array.isArray(diagnostics)).toBe(true)
    const iconDiag = diagnostics.find((d: any) => d.kind === 'icon-unresolved')
    expect(iconDiag).toBeDefined()
    expect(iconDiag.iconSrc).toBe('tabler/userr')
    expect(iconDiag.iconReason).toBe('not-found')
    expect(iconDiag.element.id).toBe('n')
  })

  test('--diagnostics on a clean diagram writes an empty JSON array', () => {
    const input = join(TMP, 'diag-clean.gg')
    writeFileSync(input, `icon :n @1,1 src=tabler/user "U"`)
    const r = gg([input, '--stdout', '--diagnostics'])
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stderr)).toEqual([])
  })

  test('parse error → exit code 1, stderr cites the attribute', () => {
    const input = join(TMP, 'bad-parse.gg')
    writeFileSync(input, `# bad attr below\nicon :n @1,1 src=user "U" foo=bar`)
    const r = gg([input, '--stdout'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/Unknown icon attribute "foo"/)
  })

  test('integrity error → exit code 2', () => {
    const input = join(TMP, 'bad-ref.gg')
    writeFileSync(input, `icon :n @1,1 src=user "U"\nn --> ghost`)
    const r = gg([input, '--stdout'])
    expect(r.status).toBe(2)
    expect(r.stderr).toMatch(/unknown target node "ghost"/)
  })

  test('missing input file → exit code 3', () => {
    const r = gg([join(TMP, 'does-not-exist.gg'), '--stdout'])
    expect(r.status).toBe(3)
    expect(r.stderr).toMatch(/Cannot read input/)
  })

  test('--icons dir registers SVG files by basename', () => {
    const iconsDir = join(TMP, 'icons')
    mkdirSync(iconsDir, { recursive: true })
    writeFileSync(join(iconsDir, 'thing.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="X" d="M0 0"/></svg>')
    const input = join(TMP, 'with-icons.gg')
    writeFileSync(input, `icon :n @1,1 src=thing "T"`)
    const r = gg([input, '--icons', iconsDir, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('data-marker="X"')
  })

  test('doc { icons: {…} } map (with absolute path) loads file content', () => {
    const iconPath = join(TMP, 'foo.svg')
    writeFileSync(iconPath,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle data-marker="Y" cx="12" cy="12" r="5"/></svg>')
    const input = join(TMP, 'json-icons.gg')
    writeFileSync(input, `doc { icons: { foo: "${iconPath}" } }\nicon :n @1,1 src=foo "F"`)
    const r = gg([input, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('data-marker="Y"')
  })

  test('tabler/<name> resolves via the built-in tabler resolver', () => {
    const input = join(TMP, 'tabler.gg')
    writeFileSync(input, `icon :n @1,1 src=tabler/user "U"`)
    const r = gg([input, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/stroke="currentColor"/)
  })

  test('unknown icon name flags iconError (red ring) by default', () => {
    const input = join(TMP, 'bad-icon.gg')
    writeFileSync(input, `icon :n @1,1 src=not-a-real-icon "X"`)
    const r = gg([input, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('#e02020') // ERROR_COLOR
  })

  test('--no-errors suppresses the red ring for unknown icons', () => {
    const input = join(TMP, 'bad-icon-suppressed.gg')
    writeFileSync(input, `icon :n @1,1 src=not-a-real-icon "X"`)
    const r = gg([input, '--format', 'svg', '--stdout', '--no-errors'])
    expect(r.status).toBe(0)
    expect(r.stdout).not.toContain('#e02020')
  })

  test('--cell-size overrides DiagramDef.cellSize', () => {
    const input = join(TMP, 'cell-size.gg')
    writeFileSync(input, `icon :n @1,1 src=user`)
    const r = gg([input, '--cell-size', '128', '--format', 'json', '--stdout'])
    const def = JSON.parse(r.stdout).def
    expect(def.cellSize).toBe(128)
  })

  test('--width scales the outer SVG while preserving viewBox (aspect)', () => {
    const input = join(TMP, 'width.gg')
    writeFileSync(input,
      `icon :a @1,1 src=user\nicon :b @2,1 src=user\nicon :c @3,1 src=user\nicon :d @4,1 src=user\n` +
      `icon :e @1,2 src=user\nicon :f @2,2 src=user\nicon :g @3,2 src=user\nicon :h @4,2 src=user`)
    const r = gg([input, '--width', '800', '--format', 'svg', '--stdout'])
    expect(r.stdout).toContain('width="800"')
    expect(r.stdout).toMatch(/height="40[0-9](?:\.\d+)?"/)
    expect(r.stdout).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/)
  })

  test('--alias resolves @name/path.svg from the given directory', () => {
    const aliasDir = join(TMP, 'aliases')
    mkdirSync(aliasDir, { recursive: true })
    writeFileSync(join(aliasDir, 'thing.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="ALIAS" d="M0 0"/></svg>')
    const input = join(TMP, 'alias.gg')
    writeFileSync(input, `icon :n @1,1 src=@lib/thing.svg "T"`)
    const r = gg([input, '--alias', `lib=${aliasDir}`, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('data-marker="ALIAS"')
  })

  test('--alias can be repeated to register multiple prefixes', () => {
    const a = join(TMP, 'a-icons'); mkdirSync(a, { recursive: true })
    const b = join(TMP, 'b-icons'); mkdirSync(b, { recursive: true })
    writeFileSync(join(a, 'x.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="A"/></svg>')
    writeFileSync(join(b, 'y.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="B"/></svg>')
    const input = join(TMP, 'multi-alias.gg')
    writeFileSync(input, `icon :n1 @1,1 src=@a/x.svg\nicon :n2 @2,1 src=@b/y.svg`)
    const r = gg([input, '--alias', `a=${a}`, '--alias', `b=${b}`, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('data-marker="A"')
    expect(r.stdout).toContain('data-marker="B"')
  })

  test('relative filename (no @prefix) loads from the .gg file\'s directory', () => {
    writeFileSync(join(TMP, 'local-icon.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path data-marker="LOCAL"/></svg>')
    const input = join(TMP, 'local-path.gg')
    writeFileSync(input, `icon :n @1,1 src=local-icon.svg "L"`)
    const r = gg([input, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('data-marker="LOCAL"')
  })

  test('unknown alias prefix → iconError (red ring), exit 0', () => {
    const input = join(TMP, 'bad-alias.gg')
    writeFileSync(input, `icon :n @1,1 src=@nope/x.svg "X"`)
    const r = gg([input, '--format', 'svg', '--stdout'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('#e02020')
    expect(r.stderr).toMatch(/is not registered/)
  })

  test('--alias without "name=dir" format exits with an error', () => {
    const r = gg(['/tmp/whatever.gg', '--alias', 'justname'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/--alias requires "name=dir"/)
  })

  test('project gridgram.config.json is picked up via walk-up', () => {
    const projDir = join(TMP, 'proj-' + Math.random().toString(36).slice(2, 6))
    const docsDir = join(projDir, 'docs')
    mkdirSync(docsDir, { recursive: true })
    writeFileSync(join(projDir, 'gridgram.config.json'),
      '{"cellSize": 64, "theme": {"primary": "#abcabc"}}')
    writeFileSync(join(docsDir, 'd.gg'), `icon :n @1,1 "A"`)

    const r = spawnSync('bun', ['run', join(process.cwd(), 'src/cli/gg.ts'), 'docs/d.gg', '--format', 'json', '--stdout'], {
      cwd: projDir, encoding: 'utf-8',
    })
    expect(r.status).toBe(0)
    const def = JSON.parse(r.stdout).def
    expect(def.cellSize).toBe(64)
    expect(def.theme.primary).toBe('#abcabc')
  })

  test('CLI overrides beat project config', () => {
    const projDir = join(TMP, 'proj-ov-' + Math.random().toString(36).slice(2, 6))
    mkdirSync(projDir, { recursive: true })
    writeFileSync(join(projDir, 'gridgram.config.json'), '{"cellSize": 64}')
    writeFileSync(join(projDir, 'd.gg'), `icon :n @1,1 "A"`)
    const r = spawnSync('bun', ['run', join(process.cwd(), 'src/cli/gg.ts'), 'd.gg', '--cell-size', '321', '--format', 'json', '--stdout'], {
      cwd: projDir, encoding: 'utf-8',
    })
    expect(r.status).toBe(0)
    const def = JSON.parse(r.stdout).def
    expect(def.cellSize).toBe(321)
  })

  test('--no-config skips project config discovery', () => {
    const projDir = join(TMP, 'proj-nc-' + Math.random().toString(36).slice(2, 6))
    mkdirSync(projDir, { recursive: true })
    writeFileSync(join(projDir, 'gridgram.config.json'), '{"cellSize": 999}')
    writeFileSync(join(projDir, 'd.gg'), `icon :n @1,1 "A"`)
    const r = spawnSync('bun', ['run', join(process.cwd(), 'src/cli/gg.ts'), 'd.gg', '--no-config', '--format', 'json', '--stdout'], {
      cwd: projDir, encoding: 'utf-8',
    })
    expect(r.status).toBe(0)
    const def = JSON.parse(r.stdout).def
    expect(def.cellSize).toBe(256)
  })

  test('--license prints third-party licenses and exits 0', () => {
    const r = gg(['--license'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Third-Party Licenses')
    expect(r.stdout).toContain('preact')
    expect(r.stdout).toContain('tabler/icons')
    expect(r.stdout).toContain('Apache License')
    expect(r.stdout).toContain('MIT')
  })
})
