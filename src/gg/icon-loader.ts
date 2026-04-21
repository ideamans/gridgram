/**
 * Filesystem / network icon loaders. Build an IconContext for
 * resolveDiagramIcons from CLI flags and JSON directives.
 *
 * Conventions:
 *   - --icons <dir>          : every <dir>/*.svg becomes id=basename → SVG
 *   - JSON `icons:` map      : id → URL | dataURL | file path | raw SVG
 *   - --alias name=<dir>     : alias prefix; '@name/x.svg' resolves to
 *                              <dir>/x.svg
 *   - DSL path icons         : '@alias/x.svg' / 'x.svg' / '/abs/x.svg' —
 *                              pre-scanned from the DiagramDef and read
 *                              on-demand
 *
 * Network fetches are async; the loader is therefore async too.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename, extname, isAbsolute } from 'path'
import type { DiagramDef } from '../types'
import {
  stripSvgWrapper,
  collectPathRefs,
  TABLER_PREFIX,
  TABLER_FILLED_PREFIX,
  type IconContext,
} from './icons'
import type { GgError } from './errors'
import { ICON_VIEWPORT } from '../constants'

const iconError = (message: string): GgError => ({ message, line: 0, source: 'icon' })

// ---------------------------------------------------------------------------
// Icon-value loaders
// ---------------------------------------------------------------------------

const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'])
const RASTER_MIME: Record<string, string> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

/** Wrap a raster asset in an SVG `<image>` fragment sized to the icon's
 *  ICON_VIEWPORT-unit box. Short edge fits the square, long edge is
 *  cropped (`preserveAspectRatio="xMidYMid slice"`). */
function rasterFragment(mime: string, bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString('base64')
  return `<image href="data:${mime};base64,${base64}" ` +
         `x="0" y="0" width="${ICON_VIEWPORT}" height="${ICON_VIEWPORT}" ` +
         `preserveAspectRatio="xMidYMid slice"/>`
}

/** Decode a `data:…` URL — returns either an SVG fragment (for SVG
 *  payloads) or an `<image>` fragment (for raster payloads). */
export function decodeDataUrl(url: string): string {
  const m = /^data:([^,]*),(.*)$/s.exec(url)
  if (!m) throw new Error(`Invalid data URL: ${url.slice(0, 60)}…`)
  const meta = m[1]
  const data = m[2]
  const mime = (meta.split(';')[0] || '').toLowerCase()
  const isBase64 = meta.includes(';base64')
  if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
    // Raster — pass the data through verbatim.
    const bytes = isBase64
      ? new Uint8Array(Buffer.from(data, 'base64'))
      : new TextEncoder().encode(decodeURIComponent(data))
    return rasterFragment(mime, bytes)
  }
  const text = isBase64
    ? Buffer.from(data, 'base64').toString('utf-8')
    : decodeURIComponent(data)
  return stripSvgWrapper(text)
}

/**
 * Load a single icon-map value. The value may be:
 *   - URL (https://… or http://…) — fetched. SVG responses are inlined
 *     as `<g>…</g>`; PNG / JPEG / GIF / WebP / AVIF responses are wrapped
 *     in an `<image>` element that covers the icon's square
 *     (short-edge fit, long-edge cropped).
 *   - dataURL (data:…) — decoded (same SVG vs raster split)
 *   - file path (relative to cwd, or absolute) — read (same split by
 *     extension)
 *   - raw SVG markup ('<svg…') — used as-is (after stripping the wrapper)
 */
export async function loadIconValue(value: string, cwd: string): Promise<string> {
  if (value.startsWith('data:')) return decodeDataUrl(value)
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const r = await fetch(value)
    if (!r.ok) throw new Error(`Icon fetch failed (${r.status}) for ${value}`)
    // Decide SVG vs raster by Content-Type first, URL extension second.
    const ct = (r.headers.get('content-type') || '').toLowerCase().split(';')[0].trim()
    const urlExt = extname(new URL(value).pathname).toLowerCase()
    const isSvg = ct === 'image/svg+xml' || urlExt === '.svg'
    if (isSvg) return stripSvgWrapper(await r.text())
    const mime = ct.startsWith('image/') ? ct : (RASTER_MIME[urlExt] || 'image/png')
    return rasterFragment(mime, new Uint8Array(await r.arrayBuffer()))
  }
  if (value.trim().startsWith('<')) {
    return stripSvgWrapper(value)
  }
  // Otherwise treat as a file path.
  const full = isAbsolute(value) ? value : join(cwd, value)
  const ext = extname(full).toLowerCase()
  if (RASTER_EXT.has(ext)) {
    const bytes = new Uint8Array(readFileSync(full))
    return rasterFragment(RASTER_MIME[ext], bytes)
  }
  return stripSvgWrapper(readFileSync(full, 'utf-8'))
}

export function loadIconDirectory(dir: string): Record<string, string> {
  const out: Record<string, string> = {}
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch (e) {
    throw new Error(`--icons directory not found or not readable: ${dir}`)
  }
  for (const name of entries) {
    if (extname(name).toLowerCase() !== '.svg') continue
    const full = join(dir, name)
    let st
    try { st = statSync(full) } catch { continue }
    if (!st.isFile()) continue
    const id = basename(name, '.svg')
    out[id] = stripSvgWrapper(readFileSync(full, 'utf-8'))
  }
  return out
}

/**
 * Resolve every entry of an icons map to its inlined SVG fragment.
 *
 * A per-entry failure drops that entry from the output and records a
 * structured error; the map keeps loading the rest. Callers decide
 * whether to surface the errors (the CLI prints them; tests just check
 * the resolved map).
 */
export async function loadIconMap(
  map: Record<string, string>,
  cwd: string,
): Promise<{
  map: Record<string, string>
  errors: GgError[]
  /** Per-entry load failures, keyed by the map's id. Used by the icon
   *  resolver to produce `load-failed` diagnostics for the nodes that
   *  referenced these ids. */
  failed: Map<string, string>
}> {
  const out: Record<string, string> = {}
  const errors: GgError[] = []
  const failed = new Map<string, string>()
  for (const [id, value] of Object.entries(map)) {
    try {
      out[id] = await loadIconValue(value, cwd)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      errors.push(iconError(`icon "${id}": ${msg}`))
      failed.set(id, msg)
    }
  }
  return { map: out, errors, failed }
}

// ---------------------------------------------------------------------------
// Path-ref pre-loading
// ---------------------------------------------------------------------------

export interface PathResolveCtx {
  /** Directory for cwd-relative DSL paths (e.g. 'path/to.svg') — normally the .gg file's dir. */
  docDir: string
  /** Directory for resolving alias target paths (e.g. from `--alias brand=./icons`) — normally process.cwd. */
  aliasDir: string
  /** Alias name → target directory (possibly relative to aliasDir) */
  aliases: Record<string, string>
}

export function resolvePathRef(ref: string, ctx: PathResolveCtx): string {
  if (ref.startsWith(TABLER_PREFIX) || ref.startsWith(TABLER_FILLED_PREFIX)) {
    throw new Error(`Internal: ${ref} is a built-in Tabler reference, not a path ref`)
  }
  if (ref.startsWith('@')) {
    const slash = ref.indexOf('/')
    if (slash === -1) {
      throw new Error(`Icon alias reference "${ref}" is missing a path after '@alias/'`)
    }
    const name = ref.slice(1, slash)
    const rest = ref.slice(slash + 1)
    const target = ctx.aliases[name]
    if (!target) {
      throw new Error(`Icon alias "@${name}/" is not registered (use --alias ${name}=<dir>)`)
    }
    const baseDir = isAbsolute(target) ? target : join(ctx.aliasDir, target)
    return join(baseDir, rest)
  }
  return isAbsolute(ref) ? ref : join(ctx.docDir, ref)
}

/**
 * Pre-read every external-path icon referenced in the def.
 *
 * A per-ref failure drops that ref from the output and records a
 * structured error; the def keeps resolving the rest (nodes with an
 * unresolved ref surface as `iconError` downstream).
 */
export function loadPathRefs(
  def: DiagramDef,
  ctx: PathResolveCtx,
): {
  paths: Record<string, string>
  errors: GgError[]
  /** Per-ref load failures, keyed by the original DSL string (e.g.
   *  '@alias/x.svg' or './foo.svg'). */
  failed: Map<string, string>
} {
  const paths: Record<string, string> = {}
  const errors: GgError[] = []
  const failed = new Map<string, string>()
  for (const ref of collectPathRefs(def)) {
    let absolute: string
    try {
      absolute = resolvePathRef(ref, ctx)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      errors.push(iconError(`icon resolution: ${msg}`))
      failed.set(ref, msg)
      continue
    }
    const ext = extname(absolute).toLowerCase()
    try {
      if (RASTER_EXT.has(ext)) {
        const bytes = new Uint8Array(readFileSync(absolute))
        paths[ref] = rasterFragment(RASTER_MIME[ext], bytes)
      } else {
        const svg = readFileSync(absolute, 'utf-8')
        paths[ref] = stripSvgWrapper(svg)
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      errors.push(iconError(`icon resolution: cannot read ${absolute}: ${msg}`))
      failed.set(ref, `cannot read ${absolute}: ${msg}`)
    }
  }
  return { paths, errors, failed }
}

// ---------------------------------------------------------------------------
// Top-level builder
// ---------------------------------------------------------------------------

export async function buildIconContext(opts: {
  iconsDir?: string
  jsonIconsMap?: Record<string, string>
  aliases?: Record<string, string>
  def?: DiagramDef
  /** Directory for cwd-relative DSL paths AND for the JSON `icons:` map (= .gg file's dir). */
  docDir: string
  /** Directory for alias target paths (= process.cwd usually). Defaults to docDir. */
  aliasDir?: string
}): Promise<IconContext> {
  const ctx: IconContext = {}
  const errors: GgError[] = []
  const failedSources = new Map<string, string>()
  if (opts.iconsDir) ctx.dir = loadIconDirectory(opts.iconsDir)
  if (opts.jsonIconsMap) {
    const r = await loadIconMap(opts.jsonIconsMap, opts.docDir)
    ctx.inline = r.map
    errors.push(...r.errors)
    for (const [k, v] of r.failed) failedSources.set(k, v)
  }
  if (opts.aliases) ctx.aliases = opts.aliases
  if (opts.def) {
    const r = loadPathRefs(opts.def, {
      docDir: opts.docDir,
      aliasDir: opts.aliasDir ?? opts.docDir,
      aliases: opts.aliases ?? {},
    })
    ctx.paths = r.paths
    for (const [k, v] of r.failed) failedSources.set(k, v)
    errors.push(...r.errors)
  }
  if (errors.length > 0) ctx.errors = errors
  if (failedSources.size > 0) ctx.failedSources = failedSources
  return ctx
}
