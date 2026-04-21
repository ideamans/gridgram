/**
 * VitePress / markdown-it plugin that renders ```gg-diagram fenced
 * blocks into inline SVG via Gridgram's own parser + renderer.
 *
 * Distinct from ```gg:
 *   ```gg          → syntax-highlighted source (Shiki, for docs code samples)
 *   ```gg-diagram  → build-time SVG, inlined into the page
 *
 * Fence info string accepts optional flags after the language:
 *   ```gg-diagram            → SVG only (default)
 *   ```gg-diagram gallery    → Tabbed "Diagram | Source" viewer; source
 *                              is syntax-highlighted via VitePress's
 *                              existing Shiki pipeline.
 *
 * Synchronous — reuses Gridgram's sync render pipeline. Icon support:
 *   - Tabler built-ins (tabler/<name>, tabler/filled/<name>)
 *   - Raw SVG markup registered via `doc { icons: { foo: '<svg …>' } }`
 *   - data: URLs (base64 or url-encoded, SVG or raster) registered via
 *     `doc { icons: { foo: 'data:…' } }`
 * HTTP URLs and file paths are not resolved here — they'd need the
 * async loader that markdown-it can't await.
 *
 * Error UX: parse / integrity / render failures do NOT break the build.
 * The fence renders a collapsed `<details>` accordion directly below
 * where the diagram would have been, carrying the structured GgError
 * list + the original source. An agent (or a human) can pick that up
 * and feed the diagnostic back to the LLM that produced the .gg.
 */
import type MarkdownIt from 'markdown-it'
import { parseGg } from '../../../src/gg/parser'
import { resolveDiagramIcons, stripSvgWrapper } from '../../../src/gg/icons'
import { renderDiagram } from '../../../src/components/Diagram'
import { formatError, type GgError } from '../../../src/gg/errors'
import { decodeDataUrl } from '../../../src/gg/icon-loader'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Shape the plugin emits — either a rendered SVG or a structured
 *  error record the caller renders as an accordion. Kept as a union
 *  so the dispatch is explicit and testable. */
type RenderOutcome =
  | { kind: 'ok'; svg: string }
  | { kind: 'error'; errors: GgError[]; source: string }

function renderGgSource(source: string): RenderOutcome {
  const { def: rawDef, errors, icons: rawIcons } = parseGg(source)
  const allErrors = errors // parser + integrity merged
  if (allErrors.length > 0) {
    return { kind: 'error', errors: allErrors, source }
  }

  // Sync icon resolution: Tabler + inline raw-SVG + data: URLs.
  const inline: Record<string, string> = {}
  if (rawIcons) {
    for (const [id, value] of Object.entries(rawIcons)) {
      if (typeof value !== 'string') continue
      const trimmed = value.trim()
      if (trimmed.startsWith('<')) {
        inline[id] = stripSvgWrapper(value)
      } else if (trimmed.startsWith('data:')) {
        try {
          inline[id] = decodeDataUrl(trimmed)
        } catch {
          // Leave unresolved; the icon resolver will flag iconError.
        }
      }
      // HTTP URLs / file paths remain silently skipped — use examples/
      // with the async loader for those.
    }
  }
  const { def, diagnostics: iconDiagnostics } = resolveDiagramIcons(rawDef, { inline })
  const { svg, diagnostics: layoutDiagnostics } = renderDiagram(def)
  const allDiagnostics = [...iconDiagnostics, ...layoutDiagnostics]

  // Non-fatal diagnostics (icon-unresolved, label-collision,
  // route-failed) surface through a `warnings` accordion under the
  // rendered diagram — the page still shows the SVG, authors see what
  // needs tidying.
  if (allDiagnostics.length > 0) {
    const asGgErrors: GgError[] = allDiagnostics.map((d) => ({
      message: d.message, line: 0, source: d.kind === 'icon-unresolved' ? 'icon' : 'check',
    }))
    return { kind: 'ok', svg: svg + buildErrorAccordion(asGgErrors, source, 'warnings') }
  }
  return { kind: 'ok', svg }
}

/**
 * Collapsible `<details>` accordion summarising every GgError alongside
 * the offending .gg source. Intent:
 *   - build never fails; the page still renders
 *   - authors / agents can click to see exactly what broke
 *   - the source block is inside the accordion so an LLM agent can lift
 *     it verbatim and attempt a repair
 */
function buildErrorAccordion(
  errors: GgError[],
  source: string,
  severity: 'error' | 'warnings' = 'error',
): string {
  const label = severity === 'error'
    ? `gg-diagram render failed — ${errors.length} error${errors.length === 1 ? '' : 's'}`
    : `gg-diagram — ${errors.length} warning${errors.length === 1 ? '' : 's'}`
  const formatted = errors.map((e) => formatError(e, 'gg-diagram')).join('\n')
  const color = severity === 'error' ? '#dc2626' : '#d97706'
  return (
    `<details class="gg-diagram-accordion" data-severity="${severity}" ` +
    `style="margin-top:8px;border:1px solid ${color};border-radius:6px;background:${severity === 'error' ? '#fef2f2' : '#fffbeb'};">` +
    `<summary style="cursor:pointer;padding:8px 12px;color:${color};font-weight:500;font-family:var(--vp-font-family-mono,monospace);font-size:13px;">${label}</summary>` +
    `<div style="padding:0 12px 12px;">` +
    `<pre style="margin:8px 0 0;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:4px;overflow-x:auto;font-size:12px;color:${color};">${escapeHtml(formatted)}</pre>` +
    `<div style="font-size:11px;color:#6b7280;margin:12px 0 4px;">Source that produced this diagnostic:</div>` +
    `<pre style="margin:0;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;overflow-x:auto;font-size:12px;color:#374151;">${escapeHtml(source)}</pre>` +
    `</div></details>`
  )
}

/**
 * Delegate to VitePress's own Shiki-backed highlighter for the .gg
 * grammar. `md.options.highlight` is installed by VitePress during
 * markdown init and returns a fully-styled `<pre class="shiki ...">`
 * block. Falling back to plain escaped `<pre>` keeps the page alive
 * if a host markdown-it without a highlighter uses this plugin.
 */
function highlightGgSource(source: string, options: any): string {
  const highlight = options?.highlight
  if (typeof highlight === 'function') {
    try {
      const out = highlight(source, 'gg', '')
      if (typeof out === 'string' && out.length > 0) return out
    } catch {
      // fall through to the plain-text fallback
    }
  }
  return `<pre class="gg-gallery__code-fallback"><code>${escapeHtml(source)}</code></pre>`
}

/**
 * Build the "Diagram | Source" tabbed viewer. Pure HTML + CSS — two
 * hidden radios drive the `:checked ~ …` sibling selectors in custom.css
 * so no client-side JS is involved.
 */
function buildGalleryHtml(id: number, diagramHtml: string, sourceHtml: string): string {
  const name = `gg-gallery-${id}`
  return (
    `<div class="gg-gallery">` +
    `<input type="radio" class="gg-gallery__radio gg-gallery__radio--diagram" ` +
      `id="${name}-diagram" name="${name}" checked>` +
    `<input type="radio" class="gg-gallery__radio gg-gallery__radio--source" ` +
      `id="${name}-source" name="${name}">` +
    `<div class="gg-gallery__tabs" role="tablist">` +
    `<label class="gg-gallery__tab gg-gallery__tab--diagram" for="${name}-diagram" role="tab">Diagram</label>` +
    `<label class="gg-gallery__tab gg-gallery__tab--source" for="${name}-source" role="tab">Source</label>` +
    `</div>` +
    `<div class="gg-gallery__pane gg-gallery__pane--diagram" role="tabpanel">${diagramHtml}</div>` +
    `<div class="gg-gallery__pane gg-gallery__pane--source" role="tabpanel">${sourceHtml}</div>` +
    `</div>\n`
  )
}

export function ggDiagramPlugin(md: MarkdownIt): void {
  let galleryCounter = 0
  const defaultFence = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info.trim()
    const parts = info.split(/\s+/)
    const lang = parts[0]
    if (lang === 'gg-diagram') {
      const flags = new Set(parts.slice(1).map((s) => s.toLowerCase()))
      const galleryMode = flags.has('gallery')
      let body: string
      let isError = false
      try {
        const outcome = renderGgSource(token.content)
        if (outcome.kind === 'ok') {
          body = outcome.svg
        } else {
          // On error, render no diagram — just the accordion. Keeps
          // the page layout intact and gives the author a clear pointer.
          body = buildErrorAccordion(outcome.errors, outcome.source, 'error')
          isError = true
        }
      } catch (e: any) {
        // Unexpected throws (programming errors in Gridgram itself).
        // Still don't break the build — surface through the same
        // accordion mechanism as a synthetic GgError.
        const msg = e?.stack ?? e?.message ?? String(e)
        body = buildErrorAccordion(
          [{ message: msg, line: 0, source: 'dsl' }],
          token.content,
          'error',
        )
        isError = true
      }
      // Hard render errors skip the tabbed viewer — the accordion is
      // already a self-contained "here's the source + why it failed"
      // unit and the Source tab would just duplicate it.
      if (galleryMode && !isError) {
        const sourceHtml = highlightGgSource(token.content, options)
        const id = ++galleryCounter
        return buildGalleryHtml(id, body, sourceHtml)
      }
      return `<div class="gg-inline-diagram">${body}</div>\n`
    }
    if (defaultFence) return defaultFence(tokens, idx, options, env, self)
    return self.renderToken(tokens, idx, options)
  }
}
