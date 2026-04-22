/**
 * Shared citty argument definitions and helpers for `gg` commands.
 *
 * The render command surface lives here so the root command (for backwards
 * compat: `gg file.gg`) and the explicit `gg render file.gg` can share one
 * canonical definition.
 */
import type { ArgsDef } from 'citty'
import type { RenderArgs } from './render.js'
import type { DiagramSettings } from '../config.js'

/**
 * Canonical render-side arg schema. Used for both the root and `render` subcmd.
 * `input` is optional here so the root command can accept e.g. `gg --license`;
 * the render subcommand redeclares it as required in its own defineCommand.
 */
export const renderArgs: ArgsDef = {
  input: {
    type: 'positional',
    required: false,
    description: 'Path to a .gg file, or "-" to read from stdin',
  },
  output: {
    type: 'string',
    alias: 'o',
    description: 'Output path (extension drives format unless --format is given)',
    valueHint: 'path',
  },
  format: {
    type: 'enum',
    options: ['svg', 'png', 'json'],
    description: 'svg | png | json (json emits the merged DiagramDef)',
  },
  config: {
    type: 'string',
    description: 'Explicit gridgram.config.{ts,js,json,json5}. Use --no-config to disable discovery',
    valueHint: 'path',
  },
  errors: {
    type: 'boolean',
    default: true,
    description: 'Draw red error markers for unresolved icons / collisions',
    negativeDescription: 'Suppress red error markers in output',
  },
  icons: {
    type: 'string',
    description: 'Register every <dir>/*.svg by basename',
    valueHint: 'dir',
  },
  alias: {
    // citty doesn't natively collect multi-valued flags, so we read --alias
    // occurrences from rawArgs ourselves. This entry exists only for help text.
    type: 'string',
    description: 'Asset alias. "@name/x.svg" → <dir>/x.svg. Repeatable.',
    valueHint: 'name=dir',
  },
  'cell-size': {
    type: 'string',
    description: 'Override per-cell pixel size (default: 256)',
    valueHint: 'px',
  },
  width: {
    type: 'string',
    description: 'Final output width in px (aspect preserved)',
    valueHint: 'px',
  },
  scale: {
    type: 'string',
    description: 'Additional multiplier on the final width (default 1)',
  },
  frame: {
    type: 'string',
    description: 'Frame number to render (default: 1)',
    valueHint: 'n',
  },
  stdout: {
    type: 'boolean',
    description: 'Write to stdout (also implied when no -o given)',
  },
  diagnostics: {
    type: 'boolean',
    description: 'Emit placement + icon diagnostics as JSON to stderr',
  },
}

/** Pull repeated `--alias name=dir` occurrences out of rawArgs. */
export function collectAliases(rawArgs: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < rawArgs.length; i++) {
    const t = rawArgs[i]
    if (t === '--alias' || t === '-alias') {
      const arg = rawArgs[++i]
      if (!arg) throw new Error('--alias requires "name=dir" (got nothing)')
      const eq = arg.indexOf('=')
      if (eq === -1) throw new Error(`--alias requires "name=dir" (got "${arg}")`)
      const name = arg.slice(0, eq)
      const dir = arg.slice(eq + 1)
      if (!name || !dir) {
        throw new Error(`--alias "name=dir": name and dir must both be non-empty (got "${arg}")`)
      }
      out[name] = dir
    } else if (t.startsWith('--alias=')) {
      const arg = t.slice('--alias='.length)
      const eq = arg.indexOf('=')
      if (eq === -1) throw new Error(`--alias requires "name=dir" (got "${arg}")`)
      const name = arg.slice(0, eq)
      const dir = arg.slice(eq + 1)
      if (!name || !dir) {
        throw new Error(`--alias "name=dir": name and dir must both be non-empty (got "${arg}")`)
      }
      out[name] = dir
    }
  }
  return out
}

function parseNumber(key: string, v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  if (Number.isNaN(n)) throw new Error(`${key} expects a number (got "${v}")`)
  return n
}

/**
 * Translate citty's parsed args (plus rawArgs for repeated flags) into the
 * RenderArgs shape used by the pure render pipeline.
 */
export function toRenderArgs(args: any, rawArgs: string[]): RenderArgs {
  const overrides: DiagramSettings = {}
  const iconsDir = args.icons
  if (iconsDir) overrides.iconsDir = iconsDir
  const aliases = collectAliases(rawArgs)
  if (Object.keys(aliases).length > 0) overrides.assetAliases = aliases
  const cellSize = parseNumber('--cell-size', args['cell-size'])
  if (cellSize !== undefined) overrides.cellSize = cellSize
  const width = parseNumber('--width', args.width)
  if (width !== undefined) overrides.renderWidth = width
  const frame = parseNumber('--frame', args.frame)
  if (frame !== undefined) overrides.frame = frame
  // `errors` defaults to true; `--no-errors` flips it to false through citty's
  // built-in boolean negation handling.
  if (args.errors === false) overrides.suppressErrors = true
  // `--no-config` is read directly from rawArgs: citty would otherwise
  // overwrite the string `config` arg with `false`, which we can't distinguish
  // from "user passed an explicit path" after the fact.
  const noConfig = rawArgs.includes('--no-config')

  return {
    input: args.input,
    output: args.output,
    format: args.format as 'svg' | 'png' | 'json' | undefined,
    configPath: typeof args.config === 'string' ? args.config : undefined,
    noConfig,
    stdout: !!args.stdout,
    diagnostics: !!args.diagnostics,
    scale: parseNumber('--scale', args.scale),
    overrides,
  }
}
