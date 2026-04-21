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
}
const props = withDefaults(defineProps<Props>(), { output: 'svg', source: 'gg', coords: false })

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

const svgUrl = computed(() => `/examples/${props.name}.svg`)
const pngUrl = computed(() => `/examples/${props.name}.png`)
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
})
</script>

<template>
  <div class="gg-example">
    <!-- Output viewer -->
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
        :class="['gg-example__viewport', { 'has-coords': showCoords }]"
      >
        <div class="gg-example__image-box">
          <img v-if="outputTab === 'svg'" :src="svgUrl" :alt="`${name} (SVG)`" />
          <img v-else                     :src="pngUrl" :alt="`${name} (PNG)`" />
          <template v-if="showCoords">
            <!-- Column letters above the image, positioned at the centre
                 of each grid column as a percentage of the image width.
                 This sits slightly inside the SVG's internal padding,
                 but stays close enough to read as a teaching overlay. -->
            <div class="gg-example__col-axis">
              <span
                v-for="(label, i) in colLabels"
                :key="i"
                class="gg-example__axis-label"
                :style="{ left: `${((i + 0.5) / coordCols) * 100}%` }"
              >{{ label }}</span>
            </div>
            <!-- Row numbers along the left side of the image. -->
            <div class="gg-example__row-axis">
              <span
                v-for="(label, i) in rowLabels"
                :key="i"
                class="gg-example__axis-label"
                :style="{ top: `${((i + 0.5) / coordRows) * 100}%` }"
              >{{ label }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Source viewer -->
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

      <!-- Code: mirrors the structure VitePress emits for a ```gg fence —
           `<div class="language-*">` around Shiki's own `<pre class="shiki
           vp-code"><code>…</code></pre>`. Being inside `.vp-doc` (the
           markdown content wrapper) means `.vp-doc div[class*='language-']`
           styles — bg, rounded corners, horizontal padding on code, etc —
           cascade in automatically. The `gg-example__code` modifier only
           removes the outer margin VitePress normally gives standalone
           fences, since ours sits inside a bordered panel. -->
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
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-conic-gradient(#f6f6f6 0% 25%, #ffffff 25% 50%) 0 0/20px 20px;
  padding: 24px;
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
</style>
