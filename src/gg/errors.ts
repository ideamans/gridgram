/**
 * Structured error reporting for the .gg pipeline.
 *
 * Every error carries the originating source location (file + 1-based
 * line) and the source kind ('dsl' | 'json' | 'check') so messages can
 * cite the exact spot where the user wrote the offending construct.
 */
export type GgErrorSource = 'dsl' | 'json' | 'check' | 'icon'

export interface GgError {
  message: string
  line: number
  source: GgErrorSource
  /** The original line text (for `at file:line  (snippet)` rendering) */
  snippet?: string
  /** Optional second location for cross-cutting issues (e.g. duplicate IDs) */
  related?: { line: number; source: GgErrorSource; snippet?: string }
}

export function formatError(err: GgError, filename = 'input.gg'): string {
  const lines: string[] = [`Error: ${err.message}`]
  const where = (loc: { line: number; source: GgErrorSource; snippet?: string }) => {
    const tag = loc.source.toUpperCase()
    const snip = loc.snippet ? `   (${tag}:  ${loc.snippet.trim()})` : ''
    return `  at ${filename}:${loc.line}${snip}`
  }
  lines.push(where(err))
  if (err.related) lines.push(where(err.related))
  return lines.join('\n')
}
