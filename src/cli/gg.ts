#!/usr/bin/env bun
/**
 * gg — gridgram CLI.
 *
 * Loads (in priority order):
 *   system defaults → project config → document %%{}%% → CLI overrides
 *
 * The merged ResolvedSettings + DiagramContent feed into a single
 * render path. Format / output path are render-call-time (not in
 * DiagramSettings).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, extname, resolve as pathResolve } from 'path'
import { parseGg } from '../gg/parser.js'
import { formatError, type GgError } from '../gg/errors.js'
import { resolveDiagramIcons } from '../gg/icons.js'
import { buildIconContext } from '../gg/icon-loader.js'
import { renderDiagram, computeRenderDimensions } from '../components/Diagram.js'
import type { DiagramDef } from '../types.js'
import type { DiagramSettings } from '../config.js'
import { resolveSettings } from '../config.js'
import { loadProjectConfig } from '../config-loader.js'
import { loadSharp } from './sharp-loader.js'
import licensesText from '../data/licenses.txt' with { type: 'text' }
import type { PlacementDiagnostic } from '../gg/diagnostics.js'

interface Args {
  input?: string
  output?: string
  format?: 'svg' | 'png' | 'json'
  /** Explicit path to a project config file (skips walk-up discovery). */
  configPath?: string
  /** Per-flag overrides — collected into a DiagramSettings layer. */
  overrides: DiagramSettings
  scale?: number
  stdout?: boolean
  help?: boolean
  license?: boolean
  /** When true, skip project-config discovery entirely. */
  noConfig?: boolean
  /** Emit placement / icon diagnostics as JSON to stderr (in addition
   *  to the normal output). Also wraps --format json output. */
  diagnostics?: boolean
}

const HELP = `gg — gridgram CLI

Usage:
  gg <input.gg> [options]

Options:
  -o, --output <path>     Output path (extension drives format unless --format is given)
      --format <kind>     svg | png | json   (json emits the merged DiagramDef)
      --config <path>     Explicit gridgram.config.{ts,js,json,json5} (skips walk-up)
      --no-config         Disable project config discovery
      --icons <dir>       Register every <dir>/*.svg by basename
      --alias name=dir    Register asset alias prefix. '@name/x.svg' → <dir>/x.svg. Repeatable.
      --cell-size <px>    Override per-cell pixel size (default: 256)
      --width <px>        Final output width in px (aspect preserved)
      --scale <n>         Additional multiplier on the final width (default 1)
      --stdout            Write to stdout (also implied when no -o given)
      --no-errors         Suppress red error markers in output
      --diagnostics       Emit placement + icon diagnostics as JSON to stderr
      --license           Print bundled third-party license texts
  -h, --help              Show this message
`

function parseArgs(argv: string[]): Args {
  const a: Args = { overrides: {} }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    switch (t) {
      case '-h':
      case '--help': a.help = true; break
      case '--license':
      case '--licenses': a.license = true; break
      case '-o':
      case '--output': a.output = argv[++i]; break
      case '--format': a.format = argv[++i] as Args['format']; break
      case '--config': a.configPath = argv[++i]; break
      case '--no-config': a.noConfig = true; break
      case '--icons': a.overrides.iconsDir = argv[++i]; break
      case '--alias': {
        const arg = argv[++i]
        const eq = arg?.indexOf('=')
        if (!arg || eq === -1 || eq === undefined) {
          throw new Error(`--alias requires "name=dir" (got "${arg}")`)
        }
        const name = arg.slice(0, eq)
        const dir = arg.slice(eq + 1)
        if (!name || !dir) {
          throw new Error(`--alias "name=dir": name and dir must both be non-empty (got "${arg}")`)
        }
        a.overrides.assetAliases = { ...(a.overrides.assetAliases ?? {}), [name]: dir }
        break
      }
      case '--cell-size': a.overrides.cellSize = Number(argv[++i]); break
      case '--width':     a.overrides.renderWidth = Number(argv[++i]); break
      case '--scale':     a.scale = Number(argv[++i]); break
      case '--stdout':    a.stdout = true; break
      case '--no-errors': a.overrides.suppressErrors = true; break
      case '--diagnostics': a.diagnostics = true; break
      default:
        if (!a.input && !t.startsWith('-')) a.input = t
        else throw new Error(`Unknown argument: ${t}`)
    }
  }
  return a
}

function inferFormat(args: Args): 'svg' | 'png' | 'json' {
  if (args.format) return args.format
  if (args.output) {
    const ext = extname(args.output).toLowerCase()
    if (ext === '.svg') return 'svg'
    if (ext === '.png') return 'png'
    if (ext === '.json') return 'json'
  }
  return 'svg'
}

function reportErrors(errors: GgError[], filename: string): void {
  for (const e of errors) {
    process.stderr.write(formatError(e, filename) + '\n')
  }
}

/** Extract the settings embedded in a parsed DiagramDef as a layer. */
function documentSettings(def: DiagramDef): DiagramSettings {
  return {
    cellSize: def.cellSize,
    padding: def.padding,
    columns: def.columns,
    rows: def.rows,
    theme: def.theme,
  }
}

async function main(): Promise<number> {
  let args: Args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (e: any) {
    process.stderr.write(`${e.message}\n${HELP}`)
    return 1
  }

  if (args.help) { process.stdout.write(HELP); return 0 }
  if (args.license) {
    process.stdout.write(licensesText)
    if (!licensesText.endsWith('\n')) process.stdout.write('\n')
    return 0
  }
  if (!args.input) { process.stderr.write(HELP); return 1 }

  // ---- Load project config (walk-up from cwd) ----
  let projectLayer: DiagramSettings = {}
  if (!args.noConfig) {
    try {
      const found = await loadProjectConfig({
        cwd: process.cwd(),
        explicitPath: args.configPath,
      })
      if (found) projectLayer = found.settings
    } catch (e: any) {
      process.stderr.write(`Config load error: ${e.message}\n`)
      return 3
    }
  }

  // ---- I/O: read source ----
  let source: string
  try {
    source = readFileSync(args.input, 'utf-8')
  } catch (e: any) {
    process.stderr.write(`Cannot read input: ${args.input}: ${e.message}\n`)
    return 3
  }

  // ---- Parse ----
  const { def: rawDef, errors, icons: rawIcons } = parseGg(source)
  const parseErrors = errors.filter((e) => e.source !== 'check')
  const checkErrors = errors.filter((e) => e.source === 'check')
  if (parseErrors.length > 0) { reportErrors(parseErrors, args.input); return 1 }
  if (checkErrors.length > 0) { reportErrors(checkErrors, args.input); return 2 }

  // ---- Merge layers ----
  const settings = resolveSettings([
    projectLayer,
    documentSettings(rawDef),
    args.overrides,
  ])

  // Apply resolved scalars back onto the def so downstream code (which
  // still reads def.cellSize / .theme / etc.) sees the merged values.
  const mergedDef: DiagramDef = {
    ...rawDef,
    cellSize: settings.cellSize,
    padding: settings.padding,
    columns: settings.columns,
    rows: settings.rows,
    theme: settings.theme,
  }

  // ---- Resolve icons ----
  let def: DiagramDef
  const iconDiagnostics: PlacementDiagnostic[] = []
  try {
    const ctx = await buildIconContext({
      iconsDir: settings.iconsDir,
      jsonIconsMap: rawIcons,
      aliases: settings.assetAliases,
      def: mergedDef,
      docDir: pathResolve(dirname(args.input)),
      aliasDir: process.cwd(),
    })
    // Per-icon non-fatal issues (bad URL, missing file, …). Each node
    // affected still renders with the iconError ring — we just print
    // the reasons so the user can trace the red ring back.
    for (const err of ctx.errors ?? []) {
      process.stderr.write(formatError(err, args.input) + '\n')
    }
    const iconResolve = resolveDiagramIcons(mergedDef, ctx)
    def = iconResolve.def
    iconDiagnostics.push(...iconResolve.diagnostics)
  } catch (e: any) {
    process.stderr.write(`Icon load error: ${e.message}\n`)
    return 3
  }

  // ---- Output ----
  const format = inferFormat(args)
  const writeBytes = async (data: Buffer | string): Promise<number> => {
    if (args.stdout || !args.output) {
      if (typeof data === 'string') process.stdout.write(data)
      else process.stdout.write(data)
      return 0
    }
    try {
      mkdirSync(dirname(pathResolve(args.output)), { recursive: true })
      writeFileSync(args.output, data)
    } catch (e: any) {
      process.stderr.write(`Cannot write output: ${args.output}: ${e.message}\n`)
      return 3
    }
    return 0
  }

  const renderOpts: DiagramSettings = {
    suppressErrors: settings.suppressErrors,
    renderWidth: settings.renderWidth,
  }
  const { svg: bareSvg, diagnostics: layoutDiagnostics } = renderDiagram(def, renderOpts)
  const diagnostics = [...iconDiagnostics, ...layoutDiagnostics]

  // Emit diagnostics to stderr when --diagnostics is set. Kept
  // separate from `--format json` output so agents can combine them
  // predictably (one stream for artifact, one for feedback).
  if (args.diagnostics) {
    process.stderr.write(JSON.stringify(diagnostics, null, 2) + '\n')
  }

  if (format === 'json') {
    // JSON envelope bundles def + diagnostics so a single stdout read
    // gives the agent everything.
    return await writeBytes(JSON.stringify({ def, diagnostics }, null, 2) + '\n')
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n${bareSvg}`

  if (format === 'svg') return await writeBytes(svg)

  try {
    const sharp = await loadSharp()
    const { width, height } = computeRenderDimensions(def, renderOpts)
    const scale = args.scale ?? 1
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)
    const buf = await sharp(Buffer.from(svg)).resize(w, h).png().toBuffer()
    return await writeBytes(buf)
  } catch (e: any) {
    process.stderr.write(`PNG render error: ${e.message}\n`)
    return 3
  }
}

main().then((code) => process.exit(code))
  .catch((e) => { process.stderr.write(`Unexpected: ${e?.stack ?? e}\n`); process.exit(3) })
