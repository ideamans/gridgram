import { describe, expect, test } from 'bun:test'
import { resolveIcon, resolveDiagramIcons, stripSvgWrapper } from '../../src/gg/icons'
import type { IconContext } from '../../src/gg/icons'
import type { DiagramDef } from '../../src/types'

describe('resolveIcon', () => {
  test('tabler/<name> resolves to outline fragment', () => {
    const r = resolveIcon('tabler/user', {})
    expect(r.icon).toMatch(/^<g [^>]*stroke="currentColor"/)
    expect(r.iconError).toBeUndefined()
  })

  test('tabler/filled/<name> resolves to filled fragment', () => {
    const r = resolveIcon('tabler/filled/user', {})
    expect(r.icon).toMatch(/^<g fill="currentColor">/)
  })

  test('missing tabler filled variant flags iconError', () => {
    const r = resolveIcon('tabler/filled/server', {})
    expect(r.iconError).toBe(true)
    expect(r.icon).toBeUndefined()
  })

  test('bare name resolves via JSON inline map', () => {
    const r = resolveIcon('user', { inline: { user: '<custom/>' } })
    expect(r.icon).toBe('<custom/>')
  })

  test('bare name resolves via --icons dir map', () => {
    const r = resolveIcon('user', { dir: { user: '<dir/>' } })
    expect(r.icon).toBe('<dir/>')
  })

  test('inline beats dir', () => {
    const r = resolveIcon('user', { inline: { user: '<inline/>' }, dir: { user: '<dir/>' } })
    expect(r.icon).toBe('<inline/>')
  })

  test('bare name with no registered alias flags iconError (no self-made built-ins anymore)', () => {
    const r = resolveIcon('server', {})
    expect(r.iconError).toBe(true)
  })

  test('unknown name flags iconError', () => {
    const r = resolveIcon('definitely-not-a-real-icon', {})
    expect(r.iconError).toBe(true)
  })
})

describe('stripSvgWrapper', () => {
  test('strips outer <svg> tags', () => {
    const inner = stripSvgWrapper('<svg xmlns="..." viewBox="0 0 24 24"><path d="M0 0"/></svg>')
    expect(inner).toBe('<path d="M0 0"/>')
  })

  test('keeps multi-element inner content intact', () => {
    const inner = stripSvgWrapper('<svg><circle/><rect/></svg>')
    expect(inner).toBe('<circle/><rect/>')
  })

  test('returns input unchanged when there is no wrapper', () => {
    expect(stripSvgWrapper('<g><path/></g>')).toBe('<g><path/></g>')
  })
})

describe('resolveDiagramIcons', () => {
  test('replaces string icon with resolved SVG (tabler/<name>)', () => {
    const def: DiagramDef = { nodes: [{ id: 'a', pos: { col: 2, row: 2 }, src: 'tabler/server' }] }
    const out = resolveDiagramIcons(def, {}).def
    expect(typeof out.nodes[0].src).toBe('string')
    expect((out.nodes[0].src as string)).toMatch(/stroke="currentColor"/)
  })

  test('flags iconError when name is unknown', () => {
    const def: DiagramDef = { nodes: [{ id: 'a', pos: { col: 2, row: 2 }, src: 'unknownXYZ' }] }
    const out = resolveDiagramIcons(def, {}).def
    expect(out.nodes[0].src).toBeUndefined()
    expect(out.nodes[0].iconError).toBe(true)
  })

  test('does not mutate the input def', () => {
    const def: DiagramDef = { nodes: [{ id: 'a', pos: { col: 2, row: 2 }, src: 'unknownXYZ' }] }
    const out = resolveDiagramIcons(def, {}).def
    expect(def.nodes[0].src).toBe('unknownXYZ')
    expect(out).not.toBe(def)
  })

  test('tabler/user resolves through resolveDiagramIcons', () => {
    const def: DiagramDef = { nodes: [{ id: 'a', pos: { col: 2, row: 2 }, src: 'tabler/user' }] }
    const out = resolveDiagramIcons(def, {}).def
    expect((out.nodes[0].src as string)).toMatch(/stroke="currentColor"/)
  })
})

describe('resolveDiagramIcons — diagnostics', () => {
  test('emits icon-unresolved with reason=not-found for a tabler miss', () => {
    const def: DiagramDef = { nodes: [{ id: 'api', pos: { col: 2, row: 2 }, src: 'tabler/userr' }] }
    const { diagnostics } = resolveDiagramIcons(def, {})
    expect(diagnostics).toHaveLength(1)
    const d = diagnostics[0]
    expect(d.kind).toBe('icon-unresolved')
    expect(d.iconSrc).toBe('tabler/userr')
    expect(d.iconReason).toBe('not-found')
    expect(d.element.kind).toBe('node')
    if (d.element.kind === 'node') expect(d.element.id).toBe('api')
    expect(d.message).toMatch(/"api"/)
    expect(d.message).toMatch(/tabler\/userr/)
  })

  test('reason=load-failed when the loader recorded an I/O error for the src', () => {
    const def: DiagramDef = { nodes: [{ id: 'n', pos: { col: 1, row: 1 }, src: 'dead' }] }
    const ctx: IconContext = {
      failedSources: new Map([['dead', 'ENOENT: file not found']]),
    }
    const { diagnostics } = resolveDiagramIcons(def, ctx)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].iconReason).toBe('load-failed')
    expect(diagnostics[0].message).toMatch(/ENOENT/)
  })

  test('nodes without src produce no diagnostic', () => {
    const def: DiagramDef = { nodes: [{ id: 'n', pos: { col: 1, row: 1 } }] }
    const { diagnostics } = resolveDiagramIcons(def, {})
    expect(diagnostics).toEqual([])
  })
})
