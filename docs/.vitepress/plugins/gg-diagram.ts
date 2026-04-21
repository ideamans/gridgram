/**
 * VitePress / markdown-it plugin that renders ```gg-diagram fenced
 * blocks into inline SVG via Gridgram's own parser + renderer.
 *
 * Distinct from ```gg:
 *   ```gg          → syntax-highlighted source (Shiki, for docs code samples)
 *   ```gg-diagram  → build-time SVG, inlined into the page
 *
 * Fence info string accepts optional flags after the language:
 *   ```gg-diagram                     → SVG only (default)
 *   ```gg-diagram gallery             → Tabbed "Diagram | Source" viewer.
 *   ```gg-diagram gallery framing=1-3 → Gallery viewer with a per-frame
 *                                        carousel: badge `Frame N / 1–3`
 *                                        in the top-left, left/right nav
 *                                        arrows revealed on hover. One
 *                                        SVG per frame is rendered up
 *                                        front; a CSS radio-button trick
 *                                        swaps which one is visible, so
 *                                        the page stays JS-free.
 *   ```gg-diagram gallery framing=2   → Fixed single frame (no arrows,
 *                                        badge shows `Frame 2`).
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
import { resolveDiagramIcons, stripSvgWrapper, type ResolveIconsResult } from '../../../src/gg/icons'
import { renderDiagram } from '../../../src/components/Diagram'
import { formatError, type GgError } from '../../../src/gg/errors'
import { decodeDataUrl } from '../../../src/gg/icon-loader'
import type { DiagramDef } from '../../../src/types'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Shape the plugin emits — either a list of rendered frames (one
 *  entry per frame for frame-aware diagrams, a single entry otherwise)
 *  or a structured error record the caller renders as an accordion. */
interface FrameRender { frame: number | null; svg: string }
type RenderOutcome =
  | { kind: 'ok'; frames: FrameRender[]; warningsHtml?: string }
  | { kind: 'error'; errors: GgError[]; source: string }

/** Parse + sync-resolve icons once, shared by both the single-SVG and
 *  the per-frame rendering paths. */
function prepareDef(source: string): { def: DiagramDef; diagnostics: ResolveIconsResult['diagnostics']; errors: GgError[] } | { errors: GgError[] } {
  const { def: rawDef, errors, icons: rawIcons } = parseGg(source)
  if (errors.length > 0) return { errors }
  const inline: Record<string, string> = {}
  if (rawIcons) {
    for (const [id, value] of Object.entries(rawIcons)) {
      if (typeof value !== 'string') continue
      const trimmed = value.trim()
      if (trimmed.startsWith('<')) {
        inline[id] = stripSvgWrapper(value)
      } else if (trimmed.startsWith('data:')) {
        try { inline[id] = decodeDataUrl(trimmed) }
        catch { /* leave unresolved; resolver flags iconError */ }
      }
      // HTTP URLs / file paths remain silently skipped — use examples/
      // with the async loader for those.
    }
  }
  const { def, diagnostics } = resolveDiagramIcons(rawDef, { inline })
  return { def, diagnostics, errors: [] }
}

function renderGgSource(source: string, frames: number[] | null): RenderOutcome {
  const prepared = prepareDef(source)
  if ('def' in prepared === false) {
    return { kind: 'error', errors: prepared.errors, source }
  }
  const { def, diagnostics: iconDiagnostics } = prepared
  const allDiagnostics = [...iconDiagnostics]
  const renders: FrameRender[] = []
  if (frames === null) {
    const { svg, diagnostics: d } = renderDiagram(def)
    renders.push({ frame: null, svg })
    allDiagnostics.push(...d)
  } else {
    for (const f of frames) {
      const { svg, diagnostics: d } = renderDiagram(def, { frame: f })
      renders.push({ frame: f, svg })
      allDiagnostics.push(...d)
    }
  }

  // Non-fatal diagnostics (icon-unresolved, label-collision,
  // route-failed) surface through a `warnings` accordion under the
  // rendered diagram — the page still shows the SVG(s), authors see
  // what needs tidying. De-dupe by message so N frames don't emit the
  // same warning N times.
  const seen = new Set<string>()
  const deduped = allDiagnostics.filter((d) => {
    const key = `${d.kind}|${d.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (deduped.length > 0) {
    const asGgErrors: GgError[] = deduped.map((d) => ({
      message: d.message, line: 0, source: d.kind === 'icon-unresolved' ? 'icon' : 'check',
    }))
    return {
      kind: 'ok',
      frames: renders,
      warningsHtml: buildErrorAccordion(asGgErrors, source, 'warnings'),
    }
  }
  return { kind: 'ok', frames: renders }
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

/** Parse the fence's `framing=` flag. Returns null when the flag is
 *  absent (no frame carousel), or `{ min, max }` otherwise. `min ===
 *  max` means "fixed single frame" — shows a badge but no arrows. */
function parseFramingFlag(flags: Iterable<string>): { min: number; max: number } | null {
  for (const f of flags) {
    if (!f.startsWith('framing=')) continue
    const spec = f.slice('framing='.length)
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(spec)
    if (range) {
      const min = Number(range[1]), max = Number(range[2])
      if (Number.isFinite(min) && Number.isFinite(max) && min <= max) return { min, max }
      return null
    }
    const single = /^\d+$/.exec(spec)
    if (single) return { min: Number(spec), max: Number(spec) }
    return null
  }
  return null
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

/**
 * Build the diagram-pane body when the fence requested `framing=`. One
 * SVG, badge, and (for ranges) a pair of nav labels is emitted per
 * frame; which one is visible is decided by a per-gallery radio group
 * in custom.css. Keeps the component JS-free — label `for=` targets
 * the radio for the destination frame, so clicking ◀ / ▶ just flips
 * the `:checked` state.
 */
function buildFramingPane(id: number, renders: FrameRender[], framing: { min: number; max: number }): string {
  const name = `gg-gallery-${id}-frame`
  const frames = renders.map((r) => r.frame ?? framing.min)
  const firstFrame = framing.min
  const label = (n: number): string =>
    framing.min === framing.max ? `Frame ${n}` : `Frame ${n} <span class="gg-gallery__frame-range">/ ${framing.min}–${framing.max}</span>`

  const radios = frames.map((f) =>
    `<input type="radio" class="gg-gallery__frame-radio" ` +
    `data-frame="${f}" id="${name}-${f}" name="${name}"${f === firstFrame ? ' checked' : ''}>`
  ).join('')

  const slides = renders.map((r) => {
    const f = r.frame ?? framing.min
    return `<div class="gg-gallery__frame" data-frame="${f}">${r.svg}</div>`
  }).join('')

  const badges = frames.map((f) =>
    `<span class="gg-gallery__frame-badge" data-frame="${f}">${label(f)}</span>`
  ).join('')

  // Prev/next labels: each frame gets its own pair (possibly disabled
  // at the ends). CSS shows only the pair whose `data-from` matches
  // the currently-checked frame.
  let nav = ''
  if (framing.min !== framing.max) {
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]
      const prevF = i > 0 ? frames[i - 1] : null
      const nextF = i < frames.length - 1 ? frames[i + 1] : null
      if (prevF !== null) {
        nav += `<label class="gg-gallery__nav gg-gallery__nav--prev" data-from="${f}" for="${name}-${prevF}" aria-label="Previous frame">◀</label>`
      } else {
        nav += `<span class="gg-gallery__nav gg-gallery__nav--prev is-disabled" data-from="${f}" aria-hidden="true">◀</span>`
      }
      if (nextF !== null) {
        nav += `<label class="gg-gallery__nav gg-gallery__nav--next" data-from="${f}" for="${name}-${nextF}" aria-label="Next frame">▶</label>`
      } else {
        nav += `<span class="gg-gallery__nav gg-gallery__nav--next is-disabled" data-from="${f}" aria-hidden="true">▶</span>`
      }
    }
  }

  return (
    radios +
    `<div class="gg-gallery__framebox">` +
    `<div class="gg-gallery__frame-slides">${slides}</div>` +
    `<div class="gg-gallery__frame-badges">${badges}</div>` +
    nav +
    `</div>`
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
      const flagParts = parts.slice(1)
      const flags = new Set(flagParts.map((s) => s.toLowerCase()))
      const galleryMode = flags.has('gallery')
      const framing = parseFramingFlag(flagParts)
      const framesToRender: number[] | null = framing
        ? Array.from({ length: framing.max - framing.min + 1 }, (_, i) => framing.min + i)
        : null
      let body: string
      let isError = false
      try {
        const outcome = renderGgSource(token.content, framesToRender)
        if (outcome.kind === 'ok') {
          // Generate a gallery id upfront — needed when framing is on
          // so the per-frame radio group has a unique `name=`.
          const id = ++galleryCounter
          if (framing) {
            body = buildFramingPane(id, outcome.frames, framing)
          } else {
            body = outcome.frames[0]?.svg ?? ''
          }
          if (outcome.warningsHtml) body += outcome.warningsHtml
          if (galleryMode) {
            const sourceHtml = highlightGgSource(token.content, options)
            return buildGalleryHtml(id, body, sourceHtml)
          }
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
      if (galleryMode && !isError) {
        // Already emitted above in the ok branch.
      }
      return `<div class="gg-inline-diagram">${body}</div>\n`
    }
    if (defaultFence) return defaultFence(tokens, idx, options, env, self)
    return self.renderToken(tokens, idx, options)
  }
}
