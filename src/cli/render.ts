/**
 * Core render pipeline used by both the root command and `gg render`.
 *
 * Takes already-parsed args (from citty) and runs the full parse → merge →
 * icon-resolve → render path. Returns a process exit code; all I/O stays here.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, extname, resolve as pathResolve } from 'path'
import { parseGg } from '../gg/parser.js'
import { checkIntegrity } from '../gg/integrity.js'
import { formatError, type GgError } from '../gg/errors.js'
import { hasFrames } from '../frame.js'
import { resolveDiagramIcons } from '../gg/icons.js'
import { buildIconContext } from '../gg/icon-loader.js'
import { renderDiagram, computeRenderDimensions } from '../components/Diagram.js'
import type { DiagramDef } from '../types.js'
import type { DiagramSettings } from '../config.js'
import { resolveSettings } from '../config.js'
import { loadProjectConfig } from '../config-loader.js'
import { loadSharp } from './sharp-loader.js'
import type { PlacementDiagnostic } from '../gg/diagnostics.js'

export interface RenderArgs {
  input: string
  output?: string
  format?: 'svg' | 'png' | 'json'
  configPath?: string
  noConfig?: boolean
  stdout?: boolean
  diagnostics?: boolean
  scale?: number
  overrides: DiagramSettings
}

function inferFormat(args: RenderArgs): 'svg' | 'png' | 'json' {
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

function documentSettings(def: DiagramDef): DiagramSettings {
  return {
    cellSize: def.cellSize,
    padding: def.padding,
    columns: def.columns,
    rows: def.rows,
    theme: def.theme,
  }
}

export async function runRender(args: RenderArgs): Promise<number> {
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

  // `-` means "read .gg from stdin" — useful for piping from heredocs.
  const fromStdin = args.input === '-'
  let source: string
  try {
    source = readFileSync(fromStdin ? 0 : args.input, 'utf-8')
  } catch (e: any) {
    const label = fromStdin ? 'stdin' : args.input
    process.stderr.write(`Cannot read input: ${label}: ${e.message}\n`)
    return 3
  }

  const { def: rawDef, errors, icons: rawIcons } = parseGg(source)
  const parseErrors = errors.filter((e) => e.source !== 'check')
  const checkErrors = errors.filter((e) => e.source === 'check')
  const sourceLabel = fromStdin ? '<stdin>' : args.input
  if (parseErrors.length > 0) { reportErrors(parseErrors, sourceLabel); return 1 }
  if (checkErrors.length > 0) { reportErrors(checkErrors, sourceLabel); return 2 }

  if (args.overrides.frame !== undefined && args.overrides.frame !== 1 && hasFrames(rawDef)) {
    const frameErrs = checkIntegrity(rawDef, args.overrides.frame)
      .filter((e) => e.source === 'check')
    if (frameErrs.length > 0) { reportErrors(frameErrs, sourceLabel); return 2 }
  }

  const settings = resolveSettings([
    projectLayer,
    documentSettings(rawDef),
    args.overrides,
  ])

  const mergedDef: DiagramDef = {
    ...rawDef,
    cellSize: settings.cellSize,
    padding: settings.padding,
    columns: settings.columns,
    rows: settings.rows,
    theme: settings.theme,
  }

  let def: DiagramDef
  const iconDiagnostics: PlacementDiagnostic[] = []
  try {
    const ctx = await buildIconContext({
      iconsDir: settings.iconsDir,
      jsonIconsMap: rawIcons,
      aliases: settings.assetAliases,
      def: mergedDef,
      docDir: fromStdin ? process.cwd() : pathResolve(dirname(args.input)),
      aliasDir: process.cwd(),
    })
    for (const err of ctx.errors ?? []) {
      process.stderr.write(formatError(err, sourceLabel) + '\n')
    }
    const iconResolve = resolveDiagramIcons(mergedDef, ctx)
    def = iconResolve.def
    iconDiagnostics.push(...iconResolve.diagnostics)
  } catch (e: any) {
    process.stderr.write(`Icon load error: ${e.message}\n`)
    return 3
  }

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
    frame: args.overrides.frame,
  }
  const { svg: bareSvg, diagnostics: layoutDiagnostics } = renderDiagram(def, renderOpts)
  const diagnostics = [...iconDiagnostics, ...layoutDiagnostics]

  if (args.diagnostics) {
    process.stderr.write(JSON.stringify(diagnostics, null, 2) + '\n')
  }

  if (format === 'json') {
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
