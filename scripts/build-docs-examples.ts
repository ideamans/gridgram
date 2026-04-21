/**
 * docs ExamplesJob.
 *
 * Reads `examples/<name>/diagram.gg` + `examples/<name>/diagram.ts`,
 * renders both, verifies they produce identical SVG, and writes:
 *
 *   docs/public/examples/<name>.svg
 *   docs/public/examples/<name>.png
 *   docs/public/examples/<name>.gg     (raw source copy for the doc viewer)
 *   docs/public/examples/<name>.ts     (raw source copy)
 *
 * Plus a manifest:
 *
 *   docs/public/examples/manifest.json
 *
 * If `.gg` and `.ts` outputs disagree, the build fails — the contract
 * is "either source produces the same diagram", and docs would silently
 * lie to readers if we let drift through.
 *
 * If only one source is present, that source is used (with a console
 * note). Eventually every example should have both.
 */
import {
  readFileSync, writeFileSync, readdirSync, existsSync,
  mkdirSync, statSync, rmSync,
} from 'fs'
import { dirname, join, resolve as pathResolve } from 'path'
import { pathToFileURL } from 'url'
import { parseGg } from '../src/gg/parser'
import { resolveDiagramIcons } from '../src/gg/icons'
import { buildIconContext } from '../src/gg/icon-loader'
import { renderDiagramSvg, computeRenderDimensions } from '../src/components/Diagram'
import type { DiagramDef } from '../src/types'
import type { IconContext } from '../src/gg/icons'

const EXAMPLES_DIR = pathResolve('examples')
const OUT_DIR      = pathResolve('docs/public/examples')

interface ExampleSources {
  name: string
  dir: string
  ggPath?: string
  tsPath?: string
  ggSource?: string
  tsSource?: string
}

interface RenderResult {
  svg: string
  /** Native canvas pixel dimensions (sharp resize target). */
  width: number
  height: number
}

interface ManifestEntry {
  name: string
  category: string
  hasGg: boolean
  hasTs: boolean
  width: number
  height: number
}

// ---------------------------------------------------------------------------
function discoverExamples(): ExampleSources[] {
  if (!existsSync(EXAMPLES_DIR)) return []
  const out: ExampleSources[] = []
  for (const name of readdirSync(EXAMPLES_DIR).sort()) {
    const dir = join(EXAMPLES_DIR, name)
    if (!statSync(dir).isDirectory()) continue
    const gg = join(dir, 'diagram.gg')
    const ts = join(dir, 'diagram.ts')
    out.push({
      name, dir,
      ggPath: existsSync(gg) ? gg : undefined,
      tsPath: existsSync(ts) ? ts : undefined,
      ggSource: existsSync(gg) ? readFileSync(gg, 'utf-8') : undefined,
      tsSource: existsSync(ts) ? readFileSync(ts, 'utf-8') : undefined,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
async function renderFromGg(ex: ExampleSources): Promise<RenderResult> {
  const { def: rawDef, errors, icons: rawIcons } = parseGg(ex.ggSource!)
  const fatal = errors.filter((e) => e.source !== 'check')
  if (fatal.length > 0) {
    throw new Error(`[${ex.name}] .gg parse error: ${fatal.map((e) => e.message).join('; ')}`)
  }
  const checks = errors.filter((e) => e.source === 'check')
  if (checks.length > 0) {
    throw new Error(`[${ex.name}] .gg integrity error: ${checks.map((e) => e.message).join('; ')}`)
  }
  const ctx: IconContext = await buildIconContext({
    jsonIconsMap: rawIcons,
    def: rawDef,
    docDir: ex.dir,
    aliasDir: process.cwd(),
  })
  const def = resolveDiagramIcons(rawDef, ctx).def
  const svg = renderDiagramSvg(def)
  const dims = computeRenderDimensions(def)
  return { svg, width: dims.width, height: dims.height }
}

// ---------------------------------------------------------------------------
async function renderFromTs(ex: ExampleSources): Promise<RenderResult> {
  // Dynamic import — Bun handles .ts natively.
  const mod = await import(pathToFileURL(ex.tsPath!).href)
  const def: DiagramDef | undefined = mod.def ?? mod.default
  if (!def) {
    throw new Error(`[${ex.name}] diagram.ts must export \`def\` or default-export the DiagramDef`)
  }
  const svg = renderDiagramSvg(def)
  const dims = computeRenderDimensions(def)
  return { svg, width: dims.width, height: dims.height }
}

// ---------------------------------------------------------------------------
async function rasterize(svg: string, width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp(Buffer.from(svg)).resize(Math.round(width), Math.round(height)).png().toBuffer()
}

// ---------------------------------------------------------------------------
function categoryOf(name: string): string {
  const dash = name.indexOf('-')
  return dash > 0 ? name.slice(0, dash) : 'misc'
}

async function buildOne(ex: ExampleSources): Promise<ManifestEntry> {
  let chosen: RenderResult
  if (ex.ggPath && ex.tsPath) {
    const ggR = await renderFromGg(ex)
    const tsR = await renderFromTs(ex)
    if (ggR.svg !== tsR.svg) {
      // Compose a small unified-diff hint pointing to the first divergence.
      const i = firstDiff(ggR.svg, tsR.svg)
      const window = (s: string) => s.slice(Math.max(0, i - 60), i + 60)
      throw new Error(
        `[${ex.name}] .gg and .ts produce different SVG output (first diff at index ${i})\n` +
        `  .gg: …${window(ggR.svg)}…\n` +
        `  .ts: …${window(tsR.svg)}…`
      )
    }
    chosen = ggR
  } else if (ex.ggPath) {
    chosen = await renderFromGg(ex)
    console.warn(`  ${ex.name}: only .gg source — TS parity not verified`)
  } else if (ex.tsPath) {
    chosen = await renderFromTs(ex)
    console.warn(`  ${ex.name}: only .ts source — gg expressibility not verified`)
  } else {
    throw new Error(`[${ex.name}] no diagram.gg or diagram.ts found in ${ex.dir}`)
  }

  // Write outputs
  const svgPath = join(OUT_DIR, `${ex.name}.svg`)
  writeFileSync(svgPath, `<?xml version="1.0" encoding="UTF-8"?>\n${chosen.svg}`)
  const png = await rasterize(chosen.svg, chosen.width, chosen.height)
  writeFileSync(join(OUT_DIR, `${ex.name}.png`), png)
  if (ex.ggSource) writeFileSync(join(OUT_DIR, `${ex.name}.gg`), ex.ggSource)
  if (ex.tsSource) writeFileSync(join(OUT_DIR, `${ex.name}.ts`), ex.tsSource)

  console.log(`  ✓ ${ex.name}  (${Math.round(chosen.width)}×${Math.round(chosen.height)})`)
  return {
    name: ex.name,
    category: categoryOf(ex.name),
    hasGg: !!ex.ggPath,
    hasTs: !!ex.tsPath,
    width: Math.round(chosen.width),
    height: Math.round(chosen.height),
  }
}

function firstDiff(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i
  return n
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  // Clean & recreate output dir
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const examples = discoverExamples()
  if (examples.length === 0) {
    console.log('No examples found in', EXAMPLES_DIR)
    return
  }

  console.log(`Building ${examples.length} examples → ${OUT_DIR}`)
  const manifest: ManifestEntry[] = []
  for (const ex of examples) {
    const entry = await buildOne(ex)
    manifest.push(entry)
  }
  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  )
  console.log(`Done — ${manifest.length} examples, manifest.json written.`)
}

main().catch((e) => {
  console.error(e?.stack ?? e)
  process.exit(1)
})
