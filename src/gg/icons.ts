/**
 * Icon resolution for the .gg pipeline.
 *
 * After parsing, each node.icon is a string identifier. This module
 * walks the DiagramDef and replaces those identifiers with the
 * corresponding raw-SVG fragment (or sets iconError = true).
 *
 * Resolution priority:
 *
 *   1. Built-in namespaces:
 *        'tabler/<name>'         → @tabler/icons outline
 *        'tabler/filled/<name>'  → @tabler/icons filled
 *      (no '@' prefix; built-ins aren't user-aliases)
 *
 *   2. External-file references (paths handled by the loader):
 *        '@alias/x.svg'  → resolved via aliases registered with --alias
 *        './x.svg'       → relative to the .gg file's directory
 *        '/abs/x.svg'    → absolute path
 *        'x.svg'         → relative
 *
 *   3. Bare names (no '/' and no '.svg') → icon map (registered via the
 *      .gg %%{ icons: {…} }%% directive or gridgram.config.ts). The map's
 *      values may be:
 *        - URL ('https://…')           — fetched and inlined at build
 *        - dataURL ('data:image/svg+xml,…') — decoded and inlined
 *        - file path (relative/absolute) — read and inlined
 *        - raw SVG markup ('<svg…>…</svg>') — stripped and inlined
 *
 *   4. Otherwise: iconError = true (the node renders with the red
 *      missing-icon ring).
 */
import type { DiagramDef, NodeBadge, NodeDef } from '../types'
import type { BadgeSpec } from '../badges'
import { tabler } from '../tabler'
import type { GgError } from './errors'
import type { ElementRef, PlacementDiagnostic } from './diagnostics'

export interface IconContext {
  /** Resolved icon map: id → already-loaded SVG content (post URL/dataURL/path resolution). */
  inline?: Record<string, string>
  /** --icons <dir> → basename → SVG content (already loaded). */
  dir?: Record<string, string>
  /** Alias name → directory path (for '@alias/x.svg' file references). */
  aliases?: Record<string, string>
  /** Original path-style icon string → pre-loaded SVG content. */
  paths?: Record<string, string>
  /**
   * Non-fatal loading errors — per-icon fetch/read/decode failures. The
   * icon resolver silently drops the affected entries (so the node renders
   * with an `iconError` ring rather than aborting the whole diagram), and
   * it's up to the caller to surface these messages. The CLI prints them
   * through formatError; the docs build collects them into its summary.
   */
  errors?: GgError[]
  /**
   * Loader-attributed failures, keyed by the DSL identifier the node
   * would have used (bare name from `doc.icons` or a path-ref string
   * like '@alias/x.svg'). Lets resolveDiagramIcons tell a `load-failed`
   * iconError ("we tried to fetch but …") apart from `not-found`
   * ("no such tabler name / no entry in the icons map"). Populated by
   * the icon-loader as it tries and fails each entry.
   */
  failedSources?: Map<string, string>
}

/** Strip the outer `<svg>...</svg>` wrapper from a full SVG file. */
export function stripSvgWrapper(svg: string): string {
  const m = svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/i)
  return m ? m[1].trim() : svg.trim()
}

export const TABLER_PREFIX = 'tabler/'
export const TABLER_FILLED_PREFIX = 'tabler/filled/'

const ASSET_EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']

/**
 * True when `id` is an external-file reference that the loader needs
 * to pre-read (alias-prefixed, ends in a known image extension, or
 * is an absolute / relative path).
 */
export function isPathRef(id: string): boolean {
  if (id.startsWith(TABLER_PREFIX) || id.startsWith(TABLER_FILLED_PREFIX)) return false
  if (id.startsWith('@')) return true
  const lower = id.toLowerCase()
  if (ASSET_EXTS.some((e) => lower.endsWith(e))) return true
  if (id.startsWith('/') || id.startsWith('./') || id.startsWith('../')) return true
  return false
}

/**
 * Resolve a single icon identifier to either an SVG fragment or an
 * iconError flag.
 */
export function resolveIcon(id: string, ctx: IconContext): { icon?: string; iconError?: boolean } {
  // 1. Built-in Tabler namespaces
  if (id.startsWith(TABLER_FILLED_PREFIX)) {
    const name = id.slice(TABLER_FILLED_PREFIX.length)
    const r = tabler(name, { filled: true })
    return r.iconError ? { iconError: true } : { icon: r.icon as string }
  }
  if (id.startsWith(TABLER_PREFIX)) {
    const name = id.slice(TABLER_PREFIX.length)
    const r = tabler(name)
    return r.iconError ? { iconError: true } : { icon: r.icon as string }
  }
  // 2. External paths (pre-loaded by the loader)
  if (isPathRef(id)) {
    if (ctx.paths && id in ctx.paths) return { icon: ctx.paths[id] }
    return { iconError: true }
  }
  // 3. Bare name → icon map (inline takes priority over --icons dir)
  if (ctx.inline && id in ctx.inline) return { icon: ctx.inline[id] }
  if (ctx.dir && id in ctx.dir) return { icon: ctx.dir[id] }
  // 4. Miss
  return { iconError: true }
}

export interface ResolveIconsResult {
  def: DiagramDef
  /** One PlacementDiagnostic per node.src (or badge.icon) that couldn't
   *  resolve. Reason distinguishes `not-found` (no tabler match / not
   *  registered) from `load-failed` (a loader attempted the source and
   *  got an I/O or network error). */
  diagnostics: PlacementDiagnostic[]
}

/**
 * Walk the DiagramDef, replacing every string-valued node.src (and
 * badge.icon) with the resolved SVG fragment. Unresolvable sources
 * flip `iconError` on the node AND emit a diagnostic with the original
 * src + a best-effort reason.
 */
export function resolveDiagramIcons(def: DiagramDef, ctx: IconContext): ResolveIconsResult {
  const diagnostics: PlacementDiagnostic[] = []
  const nodes: NodeDef[] = def.nodes.map((n) => {
    const out: NodeDef = { ...n }
    if (typeof n.src === 'string') {
      const r = resolveIcon(n.src, ctx)
      if (r.iconError) {
        diagnostics.push(unresolvedDiagnostic(n, n.src, ctx))
        delete out.src
        out.iconError = true
      } else {
        out.src = r.icon
      }
    }
    if (n.badges) {
      out.badges = n.badges.map((b): BadgeSpec => {
        if (typeof b === 'string') return b
        if ('preset' in b) return b
        if (typeof b.icon !== 'string') return b
        if (b.icon.startsWith('<')) return b
        const r = resolveIcon(b.icon, ctx)
        if (r.iconError) {
          diagnostics.push(unresolvedDiagnostic(n, b.icon, ctx, /*badge*/ true))
          return { ...b, icon: '' } as NodeBadge
        }
        return { ...b, icon: r.icon }
      })
    }
    return out
  })
  return { def: { ...def, nodes }, diagnostics }
}

/**
 * Classify why an icon src couldn't resolve. `load-failed` means the
 * loader attempted it and errored; anything else is `not-found`. We
 * don't yet distinguish `malformed` (future: SVG with a parse error).
 */
function classifyIconReason(
  src: string,
  ctx: IconContext,
): { reason: 'not-found' | 'load-failed'; detail?: string } {
  const loaderMsg = ctx.failedSources?.get(src)
  if (loaderMsg) return { reason: 'load-failed', detail: loaderMsg }
  return { reason: 'not-found' }
}

function unresolvedDiagnostic(
  node: NodeDef,
  src: string,
  ctx: IconContext,
  isBadge = false,
): PlacementDiagnostic {
  const { reason, detail } = classifyIconReason(src, ctx)
  const element: ElementRef = { kind: 'node', id: node.id }
  const role = isBadge ? 'badge icon' : 'src'
  const suffix = detail ? ` — ${detail}` : ''
  const message =
    reason === 'load-failed'
      ? `Node "${node.id}" ${role}="${src}" failed to load${suffix}.`
      : `Node "${node.id}" ${role}="${src}" could not be resolved (no matching Tabler icon or registered entry).`
  return {
    kind: 'icon-unresolved',
    severity: 'warning',
    element,
    message,
    iconSrc: src,
    iconReason: reason,
  }
}

/**
 * Collect every string-form icon reference that looks like an external
 * path. Used by the loader to know which files to pre-read.
 */
export function collectPathRefs(def: DiagramDef): string[] {
  const refs = new Set<string>()
  for (const n of def.nodes) {
    if (typeof n.src === 'string' && isPathRef(n.src)) refs.add(n.src)
    for (const b of n.badges ?? []) {
      if (typeof b === 'string' || 'preset' in b) continue
      if (typeof b.icon === 'string' && isPathRef(b.icon)) refs.add(b.icon)
    }
  }
  return [...refs]
}
