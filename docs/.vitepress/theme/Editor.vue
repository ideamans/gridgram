<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { parseGg } from '../../../src/gg/parser.js'
import { resolveDiagramIcons } from '../../../src/gg/icons.js'
import { renderDiagramSvg } from '../../../src/components/Diagram.js'
import { formatError } from '../../../src/gg/errors.js'

const DEFAULT_SRC = `# Edit me — the SVG on the right updates live.
doc { cols: 3, rows: 2 }

icon :user @A1 tabler/user     "User"
icon :web  @B1 tabler/world    "Web"
icon :db   @C1 tabler/database "Database"

user --> web "request"
web  --> db  "query"
`

const source = ref(DEFAULT_SRC)
const svg = ref('')
const errors = ref<string[]>([])
const warnings = ref<string[]>([])

let renderTimer: ReturnType<typeof setTimeout> | null = null

function renderNow(text: string) {
  try {
    const { def, errors: parseErrors, icons } = parseGg(text)
    const fatal = parseErrors
      .filter((e) => e.source !== 'check')
      .map((e) => formatError(e, 'editor.gg'))
    const checks = parseErrors
      .filter((e) => e.source === 'check')
      .map((e) => formatError(e, 'editor.gg'))
    errors.value = [...fatal, ...checks]
    if (fatal.length > 0 || checks.length > 0) {
      svg.value = ''
      warnings.value = []
      return
    }
    const { def: resolved, diagnostics: iconDiag } = resolveDiagramIcons(def, {
      inline: icons,
    })
    const out = renderDiagramSvg(resolved, { renderWidth: 800 })
    svg.value = out
    warnings.value = iconDiag.map((d) => d.message)
  } catch (e: any) {
    errors.value = [e?.message ?? String(e)]
    svg.value = ''
    warnings.value = []
  }
}

function scheduleRender(text: string) {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => renderNow(text), 80)
}

watch(source, (v) => scheduleRender(v))
onMounted(() => renderNow(source.value))
</script>

<template>
  <div class="gg-editor">
    <div class="gg-editor-row">
      <textarea
        class="gg-editor-input"
        v-model="source"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
      />
      <div class="gg-editor-preview">
        <div v-if="svg" class="gg-editor-svg" v-html="svg" />
        <div v-else class="gg-editor-placeholder">
          (Fix the errors below to see the diagram)
        </div>
      </div>
    </div>
    <div
      v-if="errors.length || warnings.length"
      class="gg-editor-messages"
    >
      <div v-if="errors.length" class="gg-editor-errors">
        <pre v-for="(m, i) in errors" :key="'e' + i">{{ m }}</pre>
      </div>
      <div v-if="warnings.length" class="gg-editor-warnings">
        <div
          v-for="(m, i) in warnings"
          :key="'w' + i"
        >{{ m }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gg-editor {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
.gg-editor-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 440px;
}
.gg-editor-input {
  width: 100%;
  padding: 14px 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  border: 0;
  border-right: 1px solid var(--vp-c-divider);
  outline: 0;
  resize: none;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  white-space: pre;
  tab-size: 2;
}
.gg-editor-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}
.gg-editor-svg :deep(svg) {
  max-width: 100%;
  height: auto;
  display: block;
}
.gg-editor-placeholder {
  color: var(--vp-c-text-3);
  font-size: 13px;
  text-align: center;
}
.gg-editor-messages {
  border-top: 1px solid var(--vp-c-divider);
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.gg-editor-errors pre {
  margin: 0 0 6px;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--vp-c-danger-1, #d32f2f);
}
.gg-editor-warnings {
  color: var(--vp-c-warning-1, #b8860b);
}
.gg-editor-warnings > div {
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 4px;
}
@media (max-width: 820px) {
  .gg-editor-row {
    grid-template-columns: 1fr;
  }
  .gg-editor-input {
    border-right: 0;
    border-bottom: 1px solid var(--vp-c-divider);
    min-height: 280px;
  }
}
</style>
