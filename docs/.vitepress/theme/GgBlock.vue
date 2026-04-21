<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'
import ggGrammar from '../gg.tmLanguage.json'

interface Props {
  /** Example folder name under examples/ (e.g. 'team-photos'). */
  name: string
  /** Layout: 'stack' (default) puts source above the SVG; 'split' puts them side-by-side. */
  layout?: 'stack' | 'split'
}
const props = withDefaults(defineProps<Props>(), { layout: 'stack' })

const ggUrl  = computed(() => `/examples/${props.name}.gg`)
const svgUrl = computed(() => `/examples/${props.name}.svg`)

const ggHtml = ref<string>('')
const svg    = ref<string>('')

// Shared highlighter — one instance per page across every <GgBlock>.
let highlighterPromise: Promise<Highlighter> | null = null
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const hl = await createHighlighter({
        langs: [],
        themes: ['github-light', 'github-dark'],
      })
      await hl.loadLanguage(ggGrammar as any)
      return hl
    })()
  }
  return highlighterPromise
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return await r.text()
}

/** Mirrors Example.vue's highlighter pipeline so ```gg fenced blocks
 *  and <GgBlock> render byte-identically (same Shiki themes, same
 *  `vp-code` class so VitePress's dual-theme CSS kicks in). */
async function highlight(source: string): Promise<string> {
  const hl = await getHighlighter()
  const html = hl.codeToHtml(source.replace(/\s+$/, ''), {
    lang: 'gg',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
  return html.replace(/<pre class="shiki/, '<pre class="shiki vp-code')
}

onMounted(async () => {
  const [src, svgText] = await Promise.all([
    fetchText(ggUrl.value),
    fetchText(svgUrl.value),
  ])
  ggHtml.value = await highlight(src)
  svg.value = svgText
})
</script>

<template>
  <div class="gg-block" :class="`gg-block--${layout}`">
    <div class="gg-block__source language-gg vp-adaptive-theme" v-html="ggHtml" />
    <div class="gg-block__diagram" v-html="svg" />
  </div>
</template>

<style scoped>
.gg-block {
  display: grid;
  gap: 16px;
  align-items: start;
  margin: 16px 0;
}
.gg-block--stack { grid-template-columns: 1fr; }
.gg-block--split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }

.gg-block__source {
  /* Inherits VitePress's `.language-gg` fenced-block styling
     (rounded container, code padding, copy button hook). */
}
.gg-block__source :deep(pre) {
  margin: 0;
}
.gg-block__diagram {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}
.gg-block__diagram :deep(svg) {
  max-width: 100%;
  height: auto;
  display: block;
}
@media (max-width: 820px) {
  .gg-block--split { grid-template-columns: 1fr; }
}
</style>
