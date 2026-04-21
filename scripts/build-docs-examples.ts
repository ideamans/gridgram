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
import type { DiagramDef, FrameSpec, FrameRange } from '../src/types'
import type { IconContext } from '../src/gg/icons'
import { hasFrames, normalizeFrameSpec } from '../src/frame'

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

interface PreparedDef {
  /** The fully resolved, icon-expanded DiagramDef — ready to render at
   *  any frame the examples asks for. */
  def: DiagramDef
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
  /** Declared frame numbers when the example uses frame tags.
   *  Always starts with 1 and is sorted ascending. Absent for
   *  non-frame examples. */
  frames?: number[]
}

/**
 * Extract every finite frame number mentioned anywhere in the def:
 * node / connector / region / note `frames`, plus `doc [N]` overrides.
 * Frame 1 is always included so the base layer is covered. Open-ended
 * ranges `[n, Infinity]` contribute their lower endpoint — anything
 * above behaves identically (everything in the range-to-infinity set
 * matches uniformly).
 */
function collectDeclaredFrames(def: DiagramDef): number[] {
  const set = new Set<number>([1])
  const visit = (spec: FrameSpec | undefined): void => {
    if (spec === undefined) return
    let ranges: FrameRange[] | undefined
    try { ranges = normalizeFrameSpec(spec) } catch { return }
    if (!ranges) return
    for (const [lo, hi] of ranges) {
      if (Number.isFinite(lo)) set.add(lo)
      if (Number.isFinite(hi)) set.add(hi)
    }
  }
  for (const n of def.nodes) visit(n.frames)
  for (const c of def.connectors ?? []) visit(c.frames)
  for (const r of def.regions ?? []) visit(r.frames)
  for (const n of def.notes ?? []) visit(n.frames)
  for (const o of def.frameOverrides ?? []) visit(o.frames)
  return Array.from(set).sort((a, b) => a - b)
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
async function prepareFromGg(ex: ExampleSources): Promise<PreparedDef> {
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
  return { def }
}

// ---------------------------------------------------------------------------
async function prepareFromTs(ex: ExampleSources): Promise<PreparedDef> {
  // Dynamic import — Bun handles .ts natively.
  const mod = await import(pathToFileURL(ex.tsPath!).href)
  const def: DiagramDef | undefined = mod.def ?? mod.default
  if (!def) {
    throw new Error(`[${ex.name}] diagram.ts must export \`def\` or default-export the DiagramDef`)
  }
  return { def }
}

function renderAtFrame(def: DiagramDef, frame: number | undefined): RenderResult {
  const opts = frame !== undefined ? { frame } : {}
  const svg = renderDiagramSvg(def, opts)
  const dims = computeRenderDimensions(def, opts)
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
  // Prepare the DiagramDef (parse + icon resolve) from each available
  // source. For parity-checked examples, both sources must produce
  // identical SVG at frame 1 (the default).
  let def: DiagramDef
  if (ex.ggPath && ex.tsPath) {
    const ggDef = (await prepareFromGg(ex)).def
    const tsDef = (await prepareFromTs(ex)).def
    // Parity-check every frame the example declares (and frame 1 for
    // frame-less examples). A divergence at any frame breaks the docs
    // contract, not just at the default render.
    const parityFrames = hasFrames(ggDef) || hasFrames(tsDef)
      ? Array.from(new Set([...collectDeclaredFrames(ggDef), ...collectDeclaredFrames(tsDef)])).sort((a, b) => a - b)
      : [undefined as number | undefined]
    for (const f of parityFrames) {
      const ggSvg = renderAtFrame(ggDef, f).svg
      const tsSvg = renderAtFrame(tsDef, f).svg
      if (ggSvg !== tsSvg) {
        const i = firstDiff(ggSvg, tsSvg)
        const window = (s: string) => s.slice(Math.max(0, i - 60), i + 60)
        throw new Error(
          `[${ex.name}] .gg and .ts produce different SVG output${f !== undefined ? ` at frame ${f}` : ''} (first diff at index ${i})\n` +
          `  .gg: …${window(ggSvg)}…\n` +
          `  .ts: …${window(tsSvg)}…`
        )
      }
    }
    def = ggDef
  } else if (ex.ggPath) {
    def = (await prepareFromGg(ex)).def
    console.warn(`  ${ex.name}: only .gg source — TS parity not verified`)
  } else if (ex.tsPath) {
    def = (await prepareFromTs(ex)).def
    console.warn(`  ${ex.name}: only .ts source — gg expressibility not verified`)
  } else {
    throw new Error(`[${ex.name}] no diagram.gg or diagram.ts found in ${ex.dir}`)
  }

  // Default-frame render — always written as `<name>.svg/.png` so
  // non-frame-aware consumers (existing <Example /> callers, external
  // links) keep working unchanged.
  const defaultR = renderAtFrame(def, undefined)
  writeFileSync(join(OUT_DIR, `${ex.name}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${defaultR.svg}`)
  writeFileSync(join(OUT_DIR, `${ex.name}.png`), await rasterize(defaultR.svg, defaultR.width, defaultR.height))
  if (ex.ggSource) writeFileSync(join(OUT_DIR, `${ex.name}.gg`), ex.ggSource)
  if (ex.tsSource) writeFileSync(join(OUT_DIR, `${ex.name}.ts`), ex.tsSource)

  // Per-frame renders — only when the example actually uses frame tags.
  // Written as `<name>-f<N>.svg/.png` so the <Example framing=…> viewer
  // can flip between them. Frame 1 mirrors the default render but is
  // still emitted under the -f1 name so the viewer has a uniform URL
  // pattern to follow.
  let framesList: number[] | undefined
  if (hasFrames(def)) {
    framesList = collectDeclaredFrames(def)
    for (const n of framesList) {
      const r = renderAtFrame(def, n)
      writeFileSync(join(OUT_DIR, `${ex.name}-f${n}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${r.svg}`)
      writeFileSync(join(OUT_DIR, `${ex.name}-f${n}.png`), await rasterize(r.svg, r.width, r.height))
    }
  }

  const tag = framesList ? ` [frames: ${framesList.join(',')}]` : ''
  console.log(`  ✓ ${ex.name}  (${Math.round(defaultR.width)}×${Math.round(defaultR.height)})${tag}`)
  return {
    name: ex.name,
    category: categoryOf(ex.name),
    hasGg: !!ex.ggPath,
    hasTs: !!ex.tsPath,
    width: Math.round(defaultR.width),
    height: Math.round(defaultR.height),
    frames: framesList,
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
