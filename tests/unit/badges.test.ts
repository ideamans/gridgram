/**
 * Badge preset expansion and render integration.
 *
 * The preset system is pure data — tests cover:
 *   - Expansion of every input shape (bare string / { preset: … } / NodeBadge)
 *   - Layer count (presets emit 2 layers: backing disc + colored icon)
 *   - Position / size propagation from the spec onto every layer
 *   - Unknown preset collection into the errors channel
 *   - End-to-end SVG check: the backing disc is drawn BEFORE the icon
 *     (important for the transparent-cutout fix)
 */
import { describe, expect, test } from 'bun:test'
import {
  BADGE_PRESETS,
  expandBadges,
  isPresetSpec,
  type BadgeSpec,
  type UnknownPresetError,
} from '../../src/badges'
import { renderDiagramSvg } from '../../src/components/Diagram'
import type { DiagramDef, NodeBadge } from '../../src/types'

// ---------------------------------------------------------------------------
// Preset table
// ---------------------------------------------------------------------------
describe('BADGE_PRESETS', () => {
  test('includes the core semantic set', () => {
    for (const name of ['check', 'star', 'alert', 'info']) {
      expect(BADGE_PRESETS[name]).toBeDefined()
    }
  })

  // Presets split into two families: "composed" (white disc + Tabler
  // filled icon on top) for icons whose shape is a cutout, and "solid"
  // (single Tabler filled icon) for silhouette icons that don't need a
  // backing.
  const SOLID_PRESETS = new Set(['star', 'heart'])

  test('composed presets have two layers (backing disc + colored icon)', () => {
    for (const [name, preset] of Object.entries(BADGE_PRESETS)) {
      if (SOLID_PRESETS.has(name)) continue
      expect(preset.layers.length).toBe(2)
      // Layer 0 = disc (currentColor driven by white iconTheme='theme')
      expect(preset.layers[0].icon).toContain('<circle')
      expect(preset.layers[0].color).toBe('#ffffff')
      expect(preset.layers[0].iconTheme).toBe('theme')
      // Layer 1 = colored tabler icon
      expect(typeof preset.layers[1].icon).toBe('string')
      expect(preset.layers[1].color).toBeDefined()
      expect(name).toBeTruthy()
    }
  })

  test('solid presets (star, heart) have a single colored layer — no disc', () => {
    for (const name of SOLID_PRESETS) {
      const preset = BADGE_PRESETS[name]
      expect(preset).toBeDefined()
      expect(preset.layers.length).toBe(1)
      expect(preset.layers[0].color).toBeDefined()
      expect(preset.layers[0].iconTheme).toBe('theme')
      // No circle-backing layer sneaking in.
      expect(preset.layers[0].icon).not.toContain('<circle')
    }
  })
})

// ---------------------------------------------------------------------------
// isPresetSpec
// ---------------------------------------------------------------------------
describe('isPresetSpec', () => {
  test('bare string is a preset spec', () => {
    expect(isPresetSpec('check')).toBe(true)
  })
  test('{ preset: … } is a preset spec', () => {
    expect(isPresetSpec({ preset: 'check' })).toBe(true)
  })
  test('a full NodeBadge is NOT a preset spec', () => {
    expect(isPresetSpec({ icon: '<g/>', position: 'top-right' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// expandBadges
// ---------------------------------------------------------------------------
describe('expandBadges', () => {
  test('bare string expands to all preset layers', () => {
    const expanded = expandBadges(['check'])
    expect(expanded.length).toBe(2)
    expect(expanded[0].color).toBe('#ffffff')   // backing disc
    expect(expanded[1].color).toBe('#16a34a')   // green check
  })

  test('{ preset, position } propagates position to every layer', () => {
    const expanded = expandBadges([{ preset: 'check', position: 'bottom-left' }])
    expect(expanded.every((b) => b.position === 'bottom-left')).toBe(true)
  })

  test('{ preset, size } propagates size to every layer', () => {
    const expanded = expandBadges([{ preset: 'check', size: 0.5 }])
    expect(expanded.every((b) => b.size === 0.5)).toBe(true)
  })

  test('explicit NodeBadge passes through unchanged', () => {
    const badge: NodeBadge = { icon: '<g data-ok="1"/>', color: '#abc', position: 'top-right' }
    const expanded = expandBadges([badge])
    expect(expanded.length).toBe(1)
    expect(expanded[0]).toBe(badge) // identity
  })

  test('mixed specs expand and concatenate', () => {
    const explicit: NodeBadge = { icon: '<g/>', position: 'top-left' }
    const expanded = expandBadges(['check', explicit, { preset: 'alert' }])
    // 2 layers (check) + 1 explicit + 2 layers (alert) = 5
    expect(expanded.length).toBe(5)
  })

  test('unknown preset is collected into errors and produces no output', () => {
    const errors: UnknownPresetError[] = []
    const expanded = expandBadges(['definitely-not-a-preset'], errors)
    expect(expanded.length).toBe(0)
    expect(errors).toEqual([{ preset: 'definitely-not-a-preset' }])
  })

  test('unknown preset silently drops when errors channel not provided', () => {
    const expanded = expandBadges(['nope'])
    expect(expanded.length).toBe(0)
  })

  test('multiple bare-string presets stack at default position', () => {
    const expanded = expandBadges(['check', 'alert'])
    expect(expanded.length).toBe(4) // 2 + 2
    // None of them has an explicit position — all undefined → render picks top-right
    expect(expanded.every((b) => b.position === undefined)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// End-to-end render check
// ---------------------------------------------------------------------------
describe('badge preset rendering through renderDiagramSvg', () => {
  function svgFor(badges: BadgeSpec[]): string {
    const def: DiagramDef = {
      nodes: [{ id: 'a', pos: { col: 1, row: 1 }, src: '<g/>', badges }],
    }
    return renderDiagramSvg(def)
  }

  test('preset string renders 2 overlaid badge svgs', () => {
    const svg = svgFor(['check'])
    // Count SVG-wrapped badge elements. The node's own icon wrapper is
    // also an <svg>, plus the node circle, so there's >= 3 <svg> tags.
    const count = (svg.match(/<svg /g) ?? []).length
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('backing disc (white) is drawn BEFORE the icon (green check) — correct z-order for cutout fix', () => {
    const svg = svgFor(['check'])
    const white = svg.indexOf('#ffffff')
    const green = svg.indexOf('#16a34a')
    expect(white).toBeGreaterThanOrEqual(0)
    expect(green).toBeGreaterThan(white) // green drawn after → on top
  })

  test('two presets at different positions stack independently', () => {
    const svg = svgFor([
      { preset: 'check', position: 'top-right' },
      { preset: 'alert', position: 'bottom-right' },
    ])
    // Both semantic colors should appear
    expect(svg).toContain('#16a34a') // check green
    expect(svg).toContain('#dc2626') // alert red
  })
})
