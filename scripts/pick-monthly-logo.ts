/**
 * Pick this month's Gridgram logo variant (1–12) and install it as
 * the active `/logo.svg` and `/favicon.svg` for the docs build.
 *
 * Idempotent. Run automatically before `vitepress dev` / `vitepress build`
 * (wired via the `docs:dev` / `docs:build` scripts in package.json).
 *
 * The month → variant mapping is just `getMonth() + 1`, so the user's
 * local clock picks the lookup. Deterministic per-day: re-running mid
 * month rewrites the same bytes.
 *
 * Override with the env var `GRIDGRAM_LOGO` (1–12) for deliberate builds
 * that should not follow the calendar, e.g. `GRIDGRAM_LOGO=7 bun run docs:build`.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const OUT_DIR = join('docs', 'public')
const ICONS_DIR = join(OUT_DIR, 'icons')

function pickVariant(): number {
  const override = process.env.GRIDGRAM_LOGO
  if (override) {
    const n = Number(override)
    if (Number.isInteger(n) && n >= 1 && n <= 12) return n
    console.warn(`  GRIDGRAM_LOGO=${override} ignored — expected integer 1..12`)
  }
  return new Date().getMonth() + 1 // 1..12
}

/**
 * Inject a `prefers-color-scheme: dark` style block into the SVG so
 * the favicon stays legible when the user's browser chrome is dark.
 * Uses attribute selectors so the source SVG needs no modification;
 * `[fill="#1e3a5f"]` picks up every primary-coloured element, same
 * for the stroke and the note's white fill.
 *
 * Only applied to favicon.svg — the page-embedded logo.svg is viewed
 * on the docs body (which defaults to light mode), so its fixed colours
 * already read correctly there. Keeping logo.svg OS-independent avoids
 * the page logo flipping darkish in a dark-OS / light-page combination.
 */
function makeDarkAdaptive(svg: string): string {
  const style = `  <style>
    @media (prefers-color-scheme: dark) {
      [fill="#1e3a5f"]   { fill: #a8c7e9; fill-opacity: 0.28; }
      [fill="#ffffff"]   { fill: #0f172a; }
      [stroke="#1e3a5f"] { stroke: #a8c7e9; stroke-opacity: 0.85; }
    }
  </style>`
  return svg.replace(/(<title>[^<]*<\/title>)/, `$1\n${style}`)
}

const month = pickVariant()
const nn = String(month).padStart(2, '0')
const src = join(ICONS_DIR, `logo-${nn}.svg`)
const svg = readFileSync(src, 'utf-8')
writeFileSync(join(OUT_DIR, 'logo.svg'), svg)
writeFileSync(join(OUT_DIR, 'favicon.svg'), makeDarkAdaptive(svg))

console.log(`  logo → #${nn} (month ${month}) — logo.svg + favicon.svg updated`)
