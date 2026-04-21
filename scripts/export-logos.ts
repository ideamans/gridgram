/**
 * Emit the 12 Gridgram logo variants to `docs/public/icons/`.
 *
 * Every variant uses the same four elements — two primary regions,
 * one accent region, one note — on a 2×2 grid, differing only in how
 * those elements are arranged. When the two primaries sit in adjacent
 * cells they merge into a spanning region (mirroring `region @A1:B1`
 * in .gg); diagonal primaries render as two independent regions.
 *
 * Run: `bun scripts/export-logos.ts`
 *
 * Idempotent. This is the single source of truth for the variants —
 * the monthly picker (`pick-monthly-logo.ts`) just chooses from its
 * output, and the favicon pipeline rasterises from the chosen SVG.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const PRIMARY = '#1e3a5f'
const ACCENT = '#e8792f'

type Cell = 'A1' | 'B1' | 'A2' | 'B2'
type Spec = Cell | `${Cell}:${Cell}`

interface Variant {
  primary: [Spec] | [Cell, Cell]
  accent: Cell
  note: Cell
}

const variants: Variant[] = [
  // 01–08 spanning primaries (adjacent pairs)
  { primary: ['A1:B1'], accent: 'A2', note: 'B2' },
  { primary: ['A1:B1'], accent: 'B2', note: 'A2' },
  { primary: ['A2:B2'], accent: 'A1', note: 'B1' },
  { primary: ['A2:B2'], accent: 'B1', note: 'A1' },
  { primary: ['A1:A2'], accent: 'B1', note: 'B2' },
  { primary: ['A1:A2'], accent: 'B2', note: 'B1' },
  { primary: ['B1:B2'], accent: 'A1', note: 'A2' },
  { primary: ['B1:B2'], accent: 'A2', note: 'A1' },
  // 09–12 diagonal primaries (two independent regions)
  { primary: ['A1', 'B2'], accent: 'A2', note: 'B1' },
  { primary: ['A1', 'B2'], accent: 'B1', note: 'A2' },
  { primary: ['B1', 'A2'], accent: 'A1', note: 'B2' },
  { primary: ['B1', 'A2'], accent: 'B2', note: 'A1' },
]

const CELL: Record<Cell, { x: number; y: number; cx: number; cy: number }> = {
  A1: { x: 0, y: 0, cx: 16, cy: 16 },
  B1: { x: 32, y: 0, cx: 48, cy: 16 },
  A2: { x: 0, y: 32, cx: 16, cy: 48 },
  B2: { x: 32, y: 32, cx: 48, cy: 48 },
}

const SPAN: Record<string, { x: number; y: number; w: number; h: number }> = {
  'A1:B1': { x: 3, y: 3, w: 58, h: 26 },
  'A2:B2': { x: 3, y: 35, w: 58, h: 26 },
  'A1:A2': { x: 3, y: 3, w: 26, h: 58 },
  'B1:B2': { x: 35, y: 3, w: 26, h: 58 },
}

function regionRect(spec: Spec): { x: number; y: number; w: number; h: number } {
  if (spec.includes(':')) return SPAN[spec]
  const c = CELL[spec as Cell]
  return { x: c.x + 3, y: c.y + 3, w: 26, h: 26 }
}

function primaryCircles(v: Variant): Cell[] {
  if (v.primary.length === 1) {
    const s = v.primary[0]
    return s.includes(':') ? (s.split(':') as [Cell, Cell]) : [s as Cell]
  }
  return v.primary as [Cell, Cell]
}

function renderSvg(v: Variant): string {
  const parts: string[] = []
  // Primary region(s)
  for (const spec of v.primary) {
    const r = regionRect(spec as Spec)
    parts.push(
      `  <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="5" fill="${PRIMARY}" fill-opacity="0.14"/>`,
    )
  }
  // Primary circles
  for (const c of primaryCircles(v)) {
    const p = CELL[c]
    parts.push(
      `  <circle cx="${p.cx}" cy="${p.cy}" r="7" fill="none" stroke="${PRIMARY}" stroke-width="2"/>`,
    )
  }
  // Accent region + circle
  const ac = CELL[v.accent]
  parts.push(
    `  <rect x="${ac.x + 3}" y="${ac.y + 3}" width="26" height="26" rx="5" fill="${ACCENT}" fill-opacity="0.22"/>`,
    `  <circle cx="${ac.cx}" cy="${ac.cy}" r="7" fill="none" stroke="${ACCENT}" stroke-width="2"/>`,
  )
  // Note — 22×22 rounded rect inset 5 from cell edges + two text lines
  const n = CELL[v.note]
  parts.push(
    `  <rect x="${n.x + 5}" y="${n.y + 5}" width="22" height="22" rx="4" fill="#ffffff" stroke="${PRIMARY}" stroke-opacity="0.55" stroke-width="1.4"/>`,
    `  <line x1="${n.x + 9}" y1="${n.y + 13}" x2="${n.x + 23}" y2="${n.y + 13}" stroke="${PRIMARY}" stroke-opacity="0.55" stroke-width="1.4" stroke-linecap="round"/>`,
    `  <line x1="${n.x + 9}" y1="${n.y + 20}" x2="${n.x + 19}" y2="${n.y + 20}" stroke="${PRIMARY}" stroke-opacity="0.55" stroke-width="1.4" stroke-linecap="round"/>`,
  )
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" role="img" aria-label="Gridgram">`,
    `  <title>Gridgram</title>`,
    ...parts,
    `</svg>`,
    '',
  ].join('\n')
}

const OUT_DIR = join('docs', 'public', 'icons')
mkdirSync(OUT_DIR, { recursive: true })

for (let i = 0; i < variants.length; i++) {
  const n = String(i + 1).padStart(2, '0')
  const path = join(OUT_DIR, `logo-${n}.svg`)
  writeFileSync(path, renderSvg(variants[i]))
  console.log('  wrote', path)
}
console.log(`\nDone — ${variants.length} variants in ${OUT_DIR}.`)
