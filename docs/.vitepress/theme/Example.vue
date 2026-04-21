<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'
import ggGrammar from '../gg.tmLanguage.json'

interface Props {
  /** Example folder name under examples/ (e.g. 'basic-01-hello'). */
  name: string
  /** Initial output tab: 'svg' (default) or 'png'. */
  output?: 'svg' | 'png'
  /** Initial source tab: 'gg' (default) or 'ts'. */
  source?: 'gg' | 'ts'
  /**
   * Overlay Excel-style column letters (A, B, …) above the diagram and
   * row numbers (1, 2, …) beside it. Useful on pages that teach `@pos`
   * syntax. Use `cols` / `rows` to match the example's grid.
   */
  coords?: boolean
  cols?: number | string
  rows?: number | string
  /**
   * Frame selector for diagrams that use `frames` tags. Accepts either
   *   framing="2"     — fixed: show only that frame
   *   framing="1-3"   — range: show frame 1 first, reveal ◀ / ▶ buttons
   *                     on hover to step through 1..3.
   * Always displays a `[Frame N]` badge in the top-left corner so the
   * reader knows which merged view they're looking at.
   */
  framing?: string | number
  /**
   * Layout variant:
   *   'stacked' (default) — two tab groups, one above the other:
   *        [SVG | PNG] on top with the diagram, [.gg | .ts] below with
   *        source. Used in the user-guide where space isn't tight.
   *   'single'  — one tab bar: [SVG | PNG | .gg | .ts]; content area
   *        swaps between image and source. Roughly half the vertical
   *        footprint of stacked, designed for gallery grids.
   * Framing (badge + hover arrows) works identically in both modes
   * when SVG / PNG is the active tab.
   */
  layout?: 'stacked' | 'single'
}
const props = withDefaults(defineProps<Props>(), { output: 'svg', source: 'gg', coords: false, layout: 'stacked' })

// Convert 1-based column index to Excel-style letters (A, B, …, AA, …).
function colLetter(n: number): string {
  let out = ''
  let x = n
  while (x > 0) {
    const rem = (x - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    x = Math.floor((x - 1) / 26)
  }
  return out
}

const coordCols = computed(() => Number(props.cols ?? 0) | 0)
const coordRows = computed(() => Number(props.rows ?? 0) | 0)
const showCoords = computed(() => !!props.coords && coordCols.value > 0 && coordRows.value > 0)
const colLabels = computed(() =>
  Array.from({ length: coordCols.value }, (_, i) => colLetter(i + 1)),
)
const rowLabels = computed(() =>
  Array.from({ length: coordRows.value }, (_, i) => String(i + 1)),
)

const outputTab = ref<'svg' | 'png'>(props.output)
const sourceTab = ref<'gg' | 'ts'>(props.source)

// Single-layout unified tab. Can be any of the four channels; in
// stacked layout this ref is unused. Defaults to the initial output
// tab so readers land on the diagram first.
const singleTab = ref<'svg' | 'png' | 'gg' | 'ts'>(props.output)

// Frame selector — parses the `framing` prop once, then drives both
// the asset URLs and the hover navigation. `null` frameMin means the
// example is not in frame-mode (no badge, no arrows, single file).
interface FrameRangeUi { min: number; max: number; start: number }
function parseFraming(raw: Props['framing']): FrameRangeUi | null {
  if (raw === undefined || raw === null || raw === '') return null
  const s = String(raw).trim()
  const range = /^(\d+)\s*-\s*(\d+)$/.exec(s)
  if (range) {
    const min = Number(range[1])
    const max = Number(range[2])
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null
    return { min, max, start: min }
  }
  const single = /^\d+$/.exec(s)
  if (single) {
    const n = Number(single[0])
    return { min: n, max: n, start: n }
  }
  return null
}
const framing = computed<FrameRangeUi | null>(() => parseFraming(props.framing))
const currentFrame = ref<number>(framing.value?.start ?? 1)
// Keep currentFrame pinned inside the new range when the prop changes
// (hot-reload friendliness; normally it never fires).
watch(framing, (f) => { currentFrame.value = f?.start ?? 1 })
const canStepBack = computed(() => !!framing.value && framing.value.min !== framing.value.max && currentFrame.value > framing.value.min)
const canStepFwd  = computed(() => !!framing.value && framing.value.min !== framing.value.max && currentFrame.value < framing.value.max)
function stepBack(): void { if (canStepBack.value) currentFrame.value-- }
function stepFwd():  void { if (canStepFwd.value)  currentFrame.value++ }

// When framing is set, images come from the per-frame files the build
// script emits (`<name>-f<N>.svg/.png`). Otherwise fall back to the
// default single-frame files, matching pre-frame behaviour exactly.
const svgUrl = computed(() => framing.value
  ? `/examples/${props.name}-f${currentFrame.value}.svg`
  : `/examples/${props.name}.svg`)
const pngUrl = computed(() => framing.value
  ? `/examples/${props.name}-f${currentFrame.value}.png`
  : `/examples/${props.name}.png`)
const ggUrl  = computed(() => `/examples/${props.name}.gg`)
const tsUrl  = computed(() => `/examples/${props.name}.ts`)

const ggSource = ref<string>('')
const tsSource = ref<string>('')
const ggHtml   = ref<string>('')
const tsHtml   = ref<string>('')
const hasGg    = ref(false)
const hasTs    = ref(false)

const ggFilename = computed(() => `${props.name}.gg`)
const tsFilename = computed(() => `${props.name}.ts`)

// Shared highlighter instance (created once, reused across <Example> components
// on the same page). Both .ts and our custom .gg grammar are registered up
// front so we don't race per-block.
let highlighterPromise: Promise<Highlighter> | null = null
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const hl = await createHighlighter({
        langs: ['typescript'],
        themes: ['github-light', 'github-dark'],
      })
      // Register the same grammar VitePress loads for fenced ```gg blocks so
      // the Example component's .gg panel matches the rest of the docs.
      await hl.loadLanguage(ggGrammar as any)
      return hl
    })()
  }
  return highlighterPromise
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  }
}

async function highlight(source: string, lang: 'typescript' | 'gg'): Promise<string> {
  const hl = await getHighlighter()
  // Default 'classic' structure → full `<pre class="shiki …"><code>…</code></pre>`.
  // Injecting `vp-code` onto the <pre> so VitePress's own dual-theme
  // rules (`html:not(.dark) .vp-code span { color: var(--shiki-light) }`
  // etc.) apply without us reinventing them. The outer template wraps
  // this in `<div class="language-…">` so `.vp-doc` fenced-block styling
  // — bg, rounded corners, padding — matches a markdown ```gg block.
  //
  // Trim trailing whitespace / newline first — source files end with `\n`
  // (POSIX convention), which Shiki renders as an extra empty `<span
  // class="line">` that shows up as a blank line under the final code
  // row. Stripping keeps the code block flush to its last real line.
  const html = hl.codeToHtml(source.replace(/\s+$/, ''), {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
  return html.replace(/<pre class="shiki/, '<pre class="shiki vp-code')
}

onMounted(async () => {
  const [gg, ts] = await Promise.all([fetchText(ggUrl.value), fetchText(tsUrl.value)])
  if (gg !== null) { ggSource.value = gg; hasGg.value = true; ggHtml.value = await highlight(gg, 'gg') }
  if (ts !== null) { tsSource.value = ts; hasTs.value = true; tsHtml.value = await highlight(ts, 'typescript') }
  if (sourceTab.value === 'gg' && !hasGg.value && hasTs.value) sourceTab.value = 'ts'
  if (sourceTab.value === 'ts' && !hasTs.value && hasGg.value) sourceTab.value = 'gg'
  // If single-layout user picked .gg/.ts but that source file is
  // missing, fall back to svg so the component still shows something.
  if (singleTab.value === 'gg' && !hasGg.value) singleTab.value = 'svg'
  if (singleTab.value === 'ts' && !hasTs.value) singleTab.value = 'svg'
})
</script>

<template>
  <!-- =====================================================================
       STACKED layout (default): two panels, output on top, source below.
       ===================================================================== -->
  <div v-if="layout !== 'single'" class="gg-example">
    <div class="gg-example__panel">
      <div class="gg-example__tabs" role="tablist" aria-label="Output">
        <button
          :class="['gg-example__tab', { 'is-active': outputTab === 'svg' }]"
          @click="outputTab = 'svg'"
          role="tab"
          :aria-selected="outputTab === 'svg'"
        >SVG</button>
        <button
          :class="['gg-example__tab', { 'is-active': outputTab === 'png' }]"
          @click="outputTab = 'png'"
          role="tab"
          :aria-selected="outputTab === 'png'"
        >PNG</button>
      </div>
      <div
        :class="[
          'gg-example__viewport',
          { 'has-coords': showCoords, 'has-framing': !!framing },
        ]"
      >
        <div
          v-if="framing"
          class="gg-example__frame-badge"
          aria-live="polite"
        >
          Frame {{ currentFrame }}
          <span v-if="framing.min !== framing.max" class="gg-example__frame-range">
            / {{ framing.min }}–{{ framing.max }}
          </span>
        </div>
        <div class="gg-example__image-box">
          <img v-if="outputTab === 'svg'" :src="svgUrl" :alt="`${name} (SVG, frame ${currentFrame})`" />
          <img v-else                     :src="pngUrl" :alt="`${name} (PNG, frame ${currentFrame})`" />
          <template v-if="showCoords">
            <div class="gg-example__col-axis">
              <span
                v-for="(label, i) in colLabels"
                :key="i"
                class="gg-example__axis-label"
                :style="{ left: `${((i + 0.5) / coordCols) * 100}%` }"
              >{{ label }}</span>
            </div>
            <div class="gg-example__row-axis">
              <span
                v-for="(label, i) in rowLabels"
                :key="i"
                class="gg-example__axis-label"
                :style="{ top: `${((i + 0.5) / coordRows) * 100}%` }"
              >{{ label }}</span>
            </div>
          </template>
          <template v-if="framing && framing.min !== framing.max">
            <button
              class="gg-example__frame-nav gg-example__frame-nav--prev"
              :disabled="!canStepBack"
              @click="stepBack"
              aria-label="Previous frame"
            >◀</button>
            <button
              class="gg-example__frame-nav gg-example__frame-nav--next"
              :disabled="!canStepFwd"
              @click="stepFwd"
              aria-label="Next frame"
            >▶</button>
          </template>
        </div>
      </div>
    </div>

    <div class="gg-example__panel">
      <div class="gg-example__tabs" role="tablist" aria-label="Source">
        <button
          v-if="hasGg"
          :class="['gg-example__tab', { 'is-active': sourceTab === 'gg' }]"
          @click="sourceTab = 'gg'"
          role="tab"
          :aria-selected="sourceTab === 'gg'"
        >.gg</button>
        <button
          v-if="hasTs"
          :class="['gg-example__tab', { 'is-active': sourceTab === 'ts' }]"
          @click="sourceTab = 'ts'"
          role="tab"
          :aria-selected="sourceTab === 'ts'"
        >.ts</button>
      </div>
      <div
        v-if="sourceTab === 'gg' && hasGg"
        class="language-gg gg-example__code"
        v-html="ggHtml"
      />
      <div
        v-else-if="sourceTab === 'ts' && hasTs"
        class="language-typescript gg-example__code"
        v-html="tsHtml"
      />
    </div>
  </div>

  <!-- =====================================================================
       SINGLE layout: one tab bar [SVG | PNG | .gg | .ts], shared content
       area that swaps between the diagram viewport and a code block.
       Roughly half the vertical footprint of stacked — used in gallery
       pages where a grid of examples would otherwise get long.
       ===================================================================== -->
  <div v-else class="gg-example gg-example--single">
    <div class="gg-example__tabs" role="tablist" aria-label="Example">
      <button
        :class="['gg-example__tab', { 'is-active': singleTab === 'svg' }]"
        @click="singleTab = 'svg'"
        role="tab"
        :aria-selected="singleTab === 'svg'"
      >SVG</button>
      <button
        :class="['gg-example__tab', { 'is-active': singleTab === 'png' }]"
        @click="singleTab = 'png'"
        role="tab"
        :aria-selected="singleTab === 'png'"
      >PNG</button>
      <button
        v-if="hasGg"
        :class="['gg-example__tab', { 'is-active': singleTab === 'gg' }]"
        @click="singleTab = 'gg'"
        role="tab"
        :aria-selected="singleTab === 'gg'"
      >.gg</button>
      <button
        v-if="hasTs"
        :class="['gg-example__tab', { 'is-active': singleTab === 'ts' }]"
        @click="singleTab = 'ts'"
        role="tab"
        :aria-selected="singleTab === 'ts'"
      >.ts</button>
    </div>

    <!-- Output viewport — rendered when SVG or PNG is the active tab. -->
    <div
      v-if="singleTab === 'svg' || singleTab === 'png'"
      :class="[
        'gg-example__viewport',
        { 'has-coords': showCoords, 'has-framing': !!framing },
      ]"
    >
      <div
        v-if="framing"
        class="gg-example__frame-badge"
        aria-live="polite"
      >
        Frame {{ currentFrame }}
        <span v-if="framing.min !== framing.max" class="gg-example__frame-range">
          / {{ framing.min }}–{{ framing.max }}
        </span>
      </div>
      <div class="gg-example__image-box">
        <img v-if="singleTab === 'svg'" :src="svgUrl" :alt="`${name} (SVG, frame ${currentFrame})`" />
        <img v-else                     :src="pngUrl" :alt="`${name} (PNG, frame ${currentFrame})`" />
        <template v-if="showCoords">
          <div class="gg-example__col-axis">
            <span
              v-for="(label, i) in colLabels"
              :key="i"
              class="gg-example__axis-label"
              :style="{ left: `${((i + 0.5) / coordCols) * 100}%` }"
            >{{ label }}</span>
          </div>
          <div class="gg-example__row-axis">
            <span
              v-for="(label, i) in rowLabels"
              :key="i"
              class="gg-example__axis-label"
              :style="{ top: `${((i + 0.5) / coordRows) * 100}%` }"
            >{{ label }}</span>
          </div>
        </template>
        <template v-if="framing && framing.min !== framing.max">
          <button
            class="gg-example__frame-nav gg-example__frame-nav--prev"
            :disabled="!canStepBack"
            @click="stepBack"
            aria-label="Previous frame"
          >◀</button>
          <button
            class="gg-example__frame-nav gg-example__frame-nav--next"
            :disabled="!canStepFwd"
            @click="stepFwd"
            aria-label="Next frame"
          >▶</button>
        </template>
      </div>
    </div>

    <!-- Source panes — rendered when .gg or .ts is the active tab. -->
    <div
      v-else-if="singleTab === 'gg' && hasGg"
      class="language-gg gg-example__code"
      v-html="ggHtml"
    />
    <div
      v-else-if="singleTab === 'ts' && hasTs"
      class="language-typescript gg-example__code"
      v-html="tsHtml"
    />
  </div>
</template>

<style scoped>
.gg-example {
  display: flex;
  flex-direction: column;
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.gg-example__panel { display: flex; flex-direction: column; min-width: 0; }
.gg-example__panel + .gg-example__panel {
  border-top: 1px solid var(--vp-c-divider);
}
.gg-example__tabs {
  display: flex;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.gg-example__tab {
  padding: 8px 14px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  background: transparent;
  border: 0;
  color: var(--vp-c-text-2);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.gg-example__tab.is-active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}
.gg-example__viewport {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-conic-gradient(#f6f6f6 0% 25%, #ffffff 25% 50%) 0 0/20px 20px;
  /* 16px vertical, 24px horizontal — narrow enough that the Frame
     badge (when present) reads as a caption tight to the top edge,
     wide enough horizontally that the left-edge nav arrow sits just
     inside the checker. */
  padding: 16px 24px;
  min-height: 240px;
}
.gg-example__viewport img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Wrap around the <img> so the coord overlay can position relative to
   the image's actual rendered box (not the viewport padding box). */
.gg-example__image-box {
  position: relative;
  display: inline-block;
}
/* When coords are on, leave room above/left for the axis labels. */
.gg-example__viewport.has-coords {
  padding-top: 56px;
  padding-left: 56px;
}
.gg-example__col-axis,
.gg-example__row-axis {
  position: absolute;
  pointer-events: none;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 600;
}
.gg-example__col-axis {
  /* Strip sits above the image, spanning its full width. */
  top: -28px;
  left: 0;
  right: 0;
  height: 20px;
}
.gg-example__row-axis {
  /* Strip sits to the left, spanning full height. */
  top: 0;
  bottom: 0;
  left: -28px;
  width: 20px;
}
.gg-example__axis-label {
  position: absolute;
  transform: translate(-50%, -50%);
}
.gg-example__col-axis .gg-example__axis-label {
  top: 50%;
}
.gg-example__row-axis .gg-example__axis-label {
  left: 50%;
}

/* The fenced-code styling — bg, padding, colors, rounded corners — is
   inherited from VitePress's own `.vp-doc div[class*='language-']` and
   `.vp-code` rules via the `<div class="language-…">` wrapper in the
   template. Only layout tweaks live here: kill the outer margin
   VitePress gives standalone fences (this one sits inside a panel),
   and round off only the bottom so it joins the tab bar seamlessly. */
.gg-example__code :deep(> div),
.gg-example__code {
  margin: 0 !important;
  border-radius: 0 !important;
}

/* --- Frame-aware viewer bits ------------------------------------- */

/* The frame badge sits in the viewport's padding strip (above the
   image), on top of the checkered backdrop. White plate with a light
   border + small radius so it reads as a caption chip without
   covering any diagram content.
   Positioning: left edge flush with the viewport's left padding (24px,
   inside boundary of the padding strip); vertical centre of the badge
   lines up with the vertical centre of the 24px top-padding strip.
   Tight line-height + small padding keeps the badge short enough to
   sit in that strip with visible gaps above and below. */
.gg-example__frame-badge {
  position: absolute;
  /* Top is nudged into the checker backdrop just above the diagram
     edge so the badge reads as a caption. Left is offset by 2px from
     the viewport's 24px left padding to account for the extra
     horizontal padding inside the badge — keeps the text column at
     the same x as before. translateY(-50%) keeps the text's vertical
     centre pinned at `top` regardless of the badge's total height,
     so growing the vertical padding doesn't shift the text. */
  top: 18px;
  left: 22px;
  transform: translateY(-50%);
  padding: 3px 9px;
  font-size: 12px;
  line-height: 1;
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: #ffffff;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
  z-index: 2;
}
.gg-example__frame-range {
  color: var(--vp-c-text-3);
  font-weight: 400;
  margin-left: 4px;
}

/* Arrows are invisible until the viewport is hovered or a nav button
   itself is focused. Positioned outside the image on the viewport's
   inner edge so they don't occlude diagram content. */
.gg-example__frame-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease-out;
}
.gg-example__frame-nav--prev { left: -18px; }
.gg-example__frame-nav--next { right: -18px; }
.gg-example__frame-nav:disabled {
  cursor: default;
  color: var(--vp-c-text-3);
}
.gg-example__viewport.has-framing:hover .gg-example__frame-nav,
.gg-example__viewport.has-framing:focus-within .gg-example__frame-nav {
  opacity: 1;
}
</style>
