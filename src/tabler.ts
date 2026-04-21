/**
 * Tabler icon resolver — pure SVG strings, no React/Preact dependency.
 *
 * Looks up an icon by kebab-case name (e.g. 'user', 'arrow-right') in
 * @tabler/icons' bundled JSON node dumps (copied into src/data/ by
 * `bun run sync-tabler`), and builds an inner-SVG fragment suitable
 * for embedding inside our Node component's wrapper <svg viewBox="0 0 24 24">.
 *
 * Returns:
 *   { icon: '<g fill="..."><path/>...</g>' }   // success
 *   { iconError: true }                        // unknown name (or no Filled variant)
 *
 * The .gg parser uses this same resolver via the '@tabler/<name>' and
 * '@tabler-filled/<name>' identifier prefixes.
 */
import outlineData from './data/tabler-outline.json' with { type: 'json' }
import filledData from './data/tabler-filled.json' with { type: 'json' }

type IconNode = [string, Record<string, string | number>]
type NodeMap = Record<string, IconNode[]>

const OUTLINE = outlineData as unknown as NodeMap
const FILLED = filledData as unknown as NodeMap

export interface TablerOpts {
  filled?: boolean
}

/**
 * Result of a Tabler lookup. Either the SVG fragment for the named icon,
 * or `iconError: true` when the name (or its filled variant) is missing.
 */
export interface TablerResult {
  icon?: string
  iconError?: true
}

function attrsToSvg(attrs: Record<string, string | number>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(attrs)) {
    parts.push(`${k}="${v}"`)
  }
  return parts.join(' ')
}

function nodesToSvg(nodes: IconNode[], filled: boolean): string {
  // Tabler outline icons rely on stroke="currentColor" + stroke-width
  // being set on the root <svg>. Filled icons rely on fill="currentColor"
  // on the root. Since we render *into* our own wrapper <svg>, we apply
  // those root attributes to a wrapping <g> so children inherit them.
  const groupAttrs = filled
    ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  const inner = nodes.map(([tag, a]) => `<${tag} ${attrsToSvg(a)}/>`).join('')
  return `<g ${groupAttrs}>${inner}</g>`
}

/**
 * Resolve a Tabler icon by kebab-case name. Returns a TablerResult
 * with `icon` set on success, or `iconError: true` when no matching
 * icon exists (or no Filled variant exists for `{ filled: true }`).
 */
export function tabler(name: string, opts: TablerOpts = {}): TablerResult {
  const map = opts.filled ? FILLED : OUTLINE
  const nodes = map[name]
  if (!nodes) return { iconError: true }
  return { icon: nodesToSvg(nodes, opts.filled === true) }
}

/** True when the named icon exists in the requested variant. */
export function tablerHas(name: string, opts: TablerOpts = {}): boolean {
  const map = opts.filled ? FILLED : OUTLINE
  return name in map
}

/**
 * Shorthand for `tabler(name).icon` (outline variant). Returns the raw
 * SVG fragment on success, or undefined when the name doesn't exist.
 *
 * Intended for TSX examples that plug an icon straight into NodeDef.src
 * without destructuring the result. Prefer `tabler()` in code that also
 * needs to detect misses (it returns iconError).
 */
export function tablerOutline(name: string): string | undefined {
  return tabler(name).icon
}

/**
 * Shorthand for `tabler(name, { filled: true }).icon`. Returns the raw
 * SVG fragment on success, or undefined when no Filled variant exists.
 * Note: Tabler's outline set is significantly more comprehensive than
 * its filled set (e.g. `server` has outline only).
 */
export function tablerFilled(name: string): string | undefined {
  return tabler(name, { filled: true }).icon
}
