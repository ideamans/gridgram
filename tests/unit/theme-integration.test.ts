/**
 * Integration tests: theme keywords + auto-tint + transparent bg flow
 * end-to-end through renderDiagramSvg. These are the "did it actually
 * come out right in the SVG" checks that sit on top of the resolveColor
 * unit tests in colors.test.ts.
 */
import { describe, expect, test } from 'bun:test'
import { renderDiagramSvg } from '../../src/components/Diagram'
import type { DiagramDef } from '../../src/types'

const theme = {
  primary: '#1e3a5f',
  secondary: '#3b5a80',
  accent: '#e8792f',
  text: '#2d3748',
  bg: '#ffffff',
}

// --------------------------------------------------------------------------
// Node color resolution
// --------------------------------------------------------------------------
describe('node color in SVG', () => {
  test('"accent" keyword resolves to the theme hex on the ring', () => {
    const def: DiagramDef = {
      theme,
      nodes: [{ id: 'a', pos: { col: 2, row: 2 }, color: 'accent', label: 'A' }],
    }
    const svg = renderDiagramSvg(def)
    expect(svg).toContain('stroke="#e8792f"')
  })

  test('named color "red" renders as-is with fill-opacity (no "red15" bug)', () => {
    const def: DiagramDef = {
      theme,
      nodes: [{ id: 'a', pos: { col: 2, row: 2 }, color: 'red', label: 'R' }],
    }
    const svg = renderDiagramSvg(def)
    expect(svg).toContain('stroke="red"')
    expect(svg).toContain('fill="red"')
    expect(svg).not.toContain('red15')
    expect(svg).toMatch(/fill-opacity="0\.\d+/)
  })

  test('rgb(...) value also works for ring fill', () => {
    const def: DiagramDef = {
      theme,
      nodes: [{ id: 'a', pos: { col: 2, row: 2 }, color: 'rgb(200, 0, 0)' }],
    }
    const svg = renderDiagramSvg(def)
    expect(svg).toContain('stroke="rgb(200, 0, 0)"')
    expect(svg).not.toContain('rgb(200, 0, 0)15')
  })

  test('no node.color → falls back to theme.primary', () => {
    const def: DiagramDef = {
      theme,
      nodes: [{ id: 'a', pos: { col: 2, row: 2 } }],
    }
    const svg = renderDiagramSvg(def)
    expect(svg).toContain('stroke="#1e3a5f"')
  })
})

// --------------------------------------------------------------------------
// Connector color resolution
// --------------------------------------------------------------------------
describe('connector color in SVG', () => {
  test('"secondary" keyword resolves to the theme hex', () => {
    const def: DiagramDef = {
      theme,
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 3, row: 2 } },
      ],
      connectors: [{ from: 'a', to: 'b', color: 'secondary' }],
    }
    const svg = renderDiagramSvg(def)
    expect(svg).toContain('stroke="#3b5a80"')
  })

  test('CSS named color for connector works', () => {
    const def: DiagramDef = {
      theme,
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 3, row: 2 } },
      ],
      connectors: [{ from: 'a', to: 'b', color: 'black' }],
    }
    const svg = renderDiagramSvg(def)
    expect(svg).toContain('stroke="black"')
  })
})

// --------------------------------------------------------------------------
// Region color resolution — auto-tint vs explicit
// --------------------------------------------------------------------------
describe('region color in SVG', () => {
  const baseDef = (regionColor: string): DiagramDef => ({
    theme,
    nodes: [{ id: 'a', pos: { col: 2, row: 2 } }],
    regions: [{
      spans: [{ from: { col: 2, row: 2 }, to: { col: 2, row: 2 } }],
      color: regionColor,
    }],
  })

  test('bare keyword "accent" auto-tints (fill + fill-opacity)', () => {
    const svg = renderDiagramSvg(baseDef('accent'))
    expect(svg).toContain('fill="#e8792f"')
    expect(svg).toMatch(/fill-opacity="0\.\d+/)
  })

  test('"accent/20" embeds alpha in the hex (no separate fill-opacity)', () => {
    const svg = renderDiagramSvg(baseDef('accent/20'))
    expect(svg).toContain('fill="#e8792f20"')
  })

  test('literal hex without alpha → solid (no auto-tint)', () => {
    const svg = renderDiagramSvg(baseDef('#e8792f'))
    expect(svg).toContain('fill="#e8792f"')
    // No automatic fill-opacity for non-keyword literals
    expect(svg).not.toMatch(/<path[^>]*fill="#e8792f"[^>]*fill-opacity=/)
  })

  test('literal hex with alpha passes through unchanged', () => {
    const svg = renderDiagramSvg(baseDef('#e8792f12'))
    expect(svg).toContain('fill="#e8792f12"')
  })
})

// --------------------------------------------------------------------------
// Background transparency
// --------------------------------------------------------------------------
describe('transparent background', () => {
  const base: DiagramDef = { nodes: [{ id: 'a', pos: { col: 2, row: 2 } }] }

  test('bg = "" (opt-out of system default) → no background rect', () => {
    // System default theme.bg is '#ffffff'. To suppress the backdrop
    // a caller now has to explicitly opt out (empty / 'none' / 'transparent').
    const svg = renderDiagramSvg({
      ...base,
      theme: { primary: '#000', secondary: '#111', accent: '#222', text: '#333', bg: '' },
    })
    expect(svg).not.toMatch(/<rect width="[\d.]+" height="[\d.]+" fill=/)
  })

  test('bg = "transparent" → no background rect', () => {
    const svg = renderDiagramSvg({
      ...base,
      theme: { primary: '#000', secondary: '#111', accent: '#222', text: '#333', bg: 'transparent' },
    })
    expect(svg).not.toMatch(/<rect width="[\d.]+" height="[\d.]+" fill=/)
  })

  test('bg = "#ffffff" → background rect is drawn', () => {
    const svg = renderDiagramSvg({ ...base, theme })
    expect(svg).toMatch(/<rect width="[\d.]+" height="[\d.]+" fill="#ffffff"/)
  })

  test('connector label backdrop falls back to white when bg is transparent', () => {
    const def: DiagramDef = {
      theme: { primary: '#000', secondary: '#111', accent: '#222', text: '#333', bg: 'transparent' },
      nodes: [
        { id: 'a', pos: { col: 2, row: 2 } },
        { id: 'b', pos: { col: 3, row: 2 } },
      ],
      connectors: [{ from: 'a', to: 'b', label: 'Hi' }],
    }
    const svg = renderDiagramSvg(def)
    // The label rect should not fill with 'transparent' (would be invisible
    // and hard to read); it falls back to white.
    expect(svg).toMatch(/<rect[^>]*rx="[^"]*"[^>]*fill="#ffffff"/)
  })
})
