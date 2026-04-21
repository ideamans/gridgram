<script setup lang="ts">
/**
 * Landing page for /en/ and /ja/.
 *
 * Sections in reading order:
 *   1. Hero          — monthly logo + short pitch + 2 CTAs
 *   2. Carousel      — full-width infinite marquee of gallery examples
 *   3. Features      — four Tabler-icon cards, one sentence each
 *   4. Grid demo     — split: SVG on the left, .gg / .ts tabbed source on the right
 *   5. Architecture  — single rendered .gg showing how the pieces fit
 *   6. Final CTA     — title + 2 CTAs
 *   7. Acknowledgments — the open-source projects we ship on top of,
 *                        immediately before the site-wide footer
 *
 * All user-facing strings come from the page's `landing:` frontmatter so
 * the template stays locale-agnostic. The acknowledgments library list
 * is objective data and lives here (title/intro are translated).
 */
import { computed, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { createHighlighter, type Highlighter } from 'shiki'
import { tablerOutline } from 'gridgram'
import ggGrammar from '../gg.tmLanguage.json'

interface CtaLink { text: string; link: string }
interface FeatureLink { href: string; text: string }
interface FeatureItem { icon: string; title: string; body: string; link?: FeatureLink }
interface DemoContent {
  title: string
  intro?: string
  name: string
  ggLabel?: string
  tsLabel?: string
}
interface ArchitectureContent {
  title: string
  intro?: string
  name: string
}
interface AcknowledgmentsContent {
  title: string
  intro?: string
  roleLabel?: string
  licenseLabel?: string
}
interface LandingFrontmatter {
  hero: {
    name: string
    text: string
    primary?: CtaLink
    secondary?: CtaLink
  }
  features?: { items: FeatureItem[] }
  demo?: DemoContent
  architecture?: ArchitectureContent
  acknowledgments?: AcknowledgmentsContent
  finalCta?: {
    title: string
    text?: string
    primary?: CtaLink
    secondary?: CtaLink
  }
}

const { frontmatter } = useData()
const content = computed<LandingFrontmatter>(() => (frontmatter.value as any).landing ?? {})

/** Wrap the raw Tabler `<g>` markup in a full `<svg>` so it can be v-html'd. */
function iconSvg(name: string, size = 32): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `width="${size}" height="${size}" stroke-width="1.8" stroke="currentColor" ` +
    `fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    tablerOutline(name) +
    `</svg>`
  )
}

/** Practical charts lifted from the gallery — API gateway, saga,
 *  production line, CI/CD, etc. — chosen so the marquee reads as
 *  "here's the kind of thing you'd actually ship". */
const carouselExamples = [
  'gallery-gateway', 'gallery-saga', 'gallery-line', 'gallery-pipeline',
  'gallery-zones', 'gallery-replicas', 'gallery-lambda', 'gallery-kafka',
  'gallery-queue', 'gallery-plant',
]
/** Duplicated so the marquee can translate by -50% for a seamless loop. */
const carouselTrack = [...carouselExamples, ...carouselExamples]

// ----- Shiki setup (reused across gg + ts panes) ------------------------
let hlPromise: Promise<Highlighter> | null = null
function getHl(): Promise<Highlighter> {
  if (!hlPromise) {
    hlPromise = (async () => {
      const hl = await createHighlighter({
        langs: ['typescript'],
        themes: ['github-light', 'github-dark'],
      })
      await hl.loadLanguage(ggGrammar as any)
      return hl
    })()
  }
  return hlPromise
}

async function highlight(src: string, lang: 'gg' | 'typescript'): Promise<string> {
  const hl = await getHl()
  const html = hl.codeToHtml(src.replace(/\s+$/, ''), {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
  return html.replace(/<pre class="shiki/, '<pre class="shiki vp-code')
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    return r.ok ? await r.text() : null
  } catch { return null }
}

const ggHtml = ref('')
const tsHtml = ref('')
const hasGg = ref(false)
const hasTs = ref(false)

onMounted(async () => {
  const name = content.value.demo?.name
  if (!name) return
  const [gg, ts] = await Promise.all([
    fetchText(`/examples/${name}.gg`),
    fetchText(`/examples/${name}.ts`),
  ])
  if (gg) { ggHtml.value = await highlight(gg, 'gg'); hasGg.value = true }
  if (ts) { tsHtml.value = await highlight(ts, 'typescript'); hasTs.value = true }
})

// ----- Acknowledgments (objective data; titles come from frontmatter) ---
interface Acknowledgment {
  name: string
  href: string
  license: string
  role: string
  role_ja: string
}
const acknowledgments: Acknowledgment[] = [
  {
    name: 'Preact',
    href: 'https://preactjs.com/',
    license: 'MIT',
    role: 'Virtual-DOM core and SSR renderer',
    role_ja: '仮想DOMコアとSSRレンダラ',
  },
  {
    name: 'preact-render-to-string',
    href: 'https://github.com/preactjs/preact-render-to-string',
    license: 'MIT',
    role: 'SVG string output',
    role_ja: 'SVG文字列の生成',
  },
  {
    name: 'JSON5',
    href: 'https://json5.org/',
    license: 'MIT',
    role: '`doc { … }` block parsing',
    role_ja: '`doc { … }` ブロックのパース',
  },
  {
    name: 'Tabler Icons',
    href: 'https://tabler.io/icons',
    license: 'MIT',
    role: '5,500+ built-in outline and filled icons',
    role_ja: '組み込み 5,500+ アウトライン/フィルドアイコン',
  },
  {
    name: 'sharp',
    href: 'https://sharp.pixelplumbing.com/',
    license: 'Apache-2.0',
    role: 'PNG rasterization (CLI only, fetched at runtime)',
    role_ja: 'PNG ラスタライズ（CLI 専用、初回実行時に取得）',
  },
  {
    name: 'libvips',
    href: 'https://github.com/libvips/libvips',
    license: 'LGPL-2.1-or-later',
    role: "sharp's image-processing backend (CLI only, fetched at runtime)",
    role_ja: 'sharp の画像処理バックエンド（CLI 専用、初回実行時に取得）',
  },
  {
    name: 'Bun',
    href: 'https://bun.sh/',
    license: 'MIT',
    role: 'Build toolchain and CLI compile target',
    role_ja: 'ビルドツールチェーン / CLI コンパイル対象',
  },
  {
    name: 'VitePress',
    href: 'https://vitepress.dev/',
    license: 'MIT',
    role: 'This documentation site',
    role_ja: 'このドキュメントサイト',
  },
]

const siteLang = computed<string>(() => {
  const l = (frontmatter.value as any).lang ?? 'en'
  return String(l).toLowerCase().startsWith('ja') ? 'ja' : 'en'
})
</script>

<template>
  <div class="gg-landing">
    <!-- ============================ Hero ============================ -->
    <section class="py-20 md:py-28 px-6 text-center">
      <img
        src="/logo.svg"
        class="gg-hero__logo mx-auto mb-8"
        alt=""
        aria-hidden="true"
      />
      <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight leading-none">
        {{ content.hero.name }}
      </h1>
      <p class="text-xl md:text-2xl mt-6 opacity-75 max-w-2xl mx-auto">
        {{ content.hero.text }}
      </p>
      <div class="flex flex-wrap gap-3 justify-center mt-10">
        <a
          v-if="content.hero.primary"
          :href="content.hero.primary.link"
          class="btn btn-primary btn-lg"
        >{{ content.hero.primary.text }}</a>
        <a
          v-if="content.hero.secondary"
          :href="content.hero.secondary.link"
          class="btn btn-ghost btn-lg"
        >{{ content.hero.secondary.text }}</a>
      </div>
    </section>

    <!-- ========================== Carousel ========================== -->
    <section class="gg-carousel py-10 bg-base-200 overflow-hidden">
      <div class="gg-carousel__track">
        <a
          v-for="(name, i) in carouselTrack"
          :key="i"
          :href="`/en/gallery/`"
          class="gg-carousel__item"
          tabindex="-1"
        >
          <img :src="`/examples/${name}.svg`" :alt="name" loading="lazy" />
        </a>
      </div>
    </section>

    <!-- ========================== Features ========================== -->
    <section
      v-if="content.features?.items?.length"
      class="py-20 md:py-24 px-6"
    >
      <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
        <div
          v-for="(f, i) in content.features.items"
          :key="i"
          class="flex flex-col items-start"
        >
          <div class="text-primary mb-3" v-html="iconSvg(f.icon, 36)" />
          <h3 class="font-semibold text-base md:text-lg">{{ f.title }}</h3>
          <p class="text-sm opacity-70 leading-relaxed mt-1.5">
            {{ f.body }}
            <a
              v-if="f.link"
              :href="f.link.href"
              class="text-primary underline underline-offset-2 whitespace-nowrap"
              target="_blank"
              rel="noopener"
            >{{ f.link.text }} ↗</a>
          </p>
        </div>
      </div>
    </section>

    <!-- ========================== Grid demo ========================== -->
    <!-- Canonical example: explicit @A1/@B1/… coords (the headline usage
         pattern). Left pane: the rendered SVG; right pane: a tab-switched
         source view (.gg / .ts) so readers can pick whichever authoring
         style they'd actually use. -->
    <section
      v-if="content.demo"
      class="py-16 md:py-20 px-6 bg-base-200"
    >
      <div class="max-w-6xl mx-auto">
        <header class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
            {{ content.demo.title }}
          </h2>
          <p
            v-if="content.demo.intro"
            class="opacity-70 mt-3 max-w-xl mx-auto"
          >{{ content.demo.intro }}</p>
        </header>

        <div class="gg-demo grid md:grid-cols-2 gap-6 md:gap-8 items-start">
          <!-- Left: rendered SVG -->
          <div class="gg-demo__canvas">
            <img :src="`/examples/${content.demo.name}.svg`" alt="" />
          </div>

          <!-- Right: daisyUI `tabs-border` switching between .gg / .ts.
               Purely CSS (radio inputs drive :checked), no Vue state.
               Both pairs render on SSR; the shiki HTML streams in on
               mount via v-html. Pane padding + scroll live in scoped CSS
               so the inline radio/tab-content markup stays minimal. -->
          <div class="gg-demo__source tabs tabs-border">
            <input
              type="radio"
              name="gg-demo-tabs"
              class="tab"
              :aria-label="content.demo.ggLabel || '.gg (DSL)'"
              checked
            />
            <div class="gg-demo__pane tab-content">
              <div class="language-gg" v-html="ggHtml" />
            </div>

            <input
              type="radio"
              name="gg-demo-tabs"
              class="tab"
              :aria-label="content.demo.tsLabel || 'TypeScript'"
            />
            <div class="gg-demo__pane tab-content">
              <div class="language-typescript" v-html="tsHtml" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================== Architecture ========================== -->
    <!-- Gridgram describing itself: the .gg source that produces the
         diagram is the same grammar users write. Shown as a single big
         rendered SVG; link to the source in the repo for the curious. -->
    <section
      v-if="content.architecture"
      class="py-16 md:py-20 px-6"
    >
      <div class="max-w-5xl mx-auto">
        <header class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
            {{ content.architecture.title }}
          </h2>
          <p
            v-if="content.architecture.intro"
            class="opacity-70 mt-3 max-w-2xl mx-auto"
          >{{ content.architecture.intro }}</p>
        </header>
        <div class="gg-arch__canvas">
          <img :src="`/examples/${content.architecture.name}.svg`" alt="" />
        </div>
      </div>
    </section>

    <!-- ========================== Final CTA ========================== -->
    <section
      v-if="content.finalCta"
      class="py-20 md:py-24 px-6 text-center"
    >
      <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
        {{ content.finalCta.title }}
      </h2>
      <p
        v-if="content.finalCta.text"
        class="opacity-70 mt-3 max-w-xl mx-auto"
      >{{ content.finalCta.text }}</p>
      <div class="flex flex-wrap gap-3 justify-center mt-8">
        <a
          v-if="content.finalCta.primary"
          :href="content.finalCta.primary.link"
          class="btn btn-primary btn-lg"
        >{{ content.finalCta.primary.text }}</a>
        <a
          v-if="content.finalCta.secondary"
          :href="content.finalCta.secondary.link"
          class="btn btn-ghost btn-lg"
        >{{ content.finalCta.secondary.text }}</a>
      </div>
    </section>

    <!-- ========================== Acknowledgments ========================== -->
    <!-- Placed last on the landing so it sits directly above the
         site-wide footer. -->
    <section
      v-if="content.acknowledgments"
      class="py-16 md:py-20 px-6 bg-base-200"
    >
      <div class="max-w-5xl mx-auto">
        <header class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
            {{ content.acknowledgments.title }}
          </h2>
          <p
            v-if="content.acknowledgments.intro"
            class="opacity-70 mt-3 max-w-2xl mx-auto"
          >{{ content.acknowledgments.intro }}</p>
        </header>
        <ul class="gg-ack grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <li
            v-for="(a, i) in acknowledgments"
            :key="i"
            class="gg-ack__card"
          >
            <a
              :href="a.href"
              target="_blank"
              rel="noopener"
              class="gg-ack__name"
            >{{ a.name }} ↗</a>
            <span class="gg-ack__license">{{ a.license }}</span>
            <p class="gg-ack__role">
              {{ siteLang === 'ja' ? a.role_ja : a.role }}
            </p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gg-landing { width: 100%; }

/* Hero — the monthly logo is shown at a larger size than the navbar
   so the current variant reads on first glance. */
.gg-hero__logo {
  width: 96px;
  height: 96px;
  display: block;
}

/* Carousel — full-width marquee with two-copy track for a seamless loop. */
.gg-carousel { position: relative; }
.gg-carousel::before,
.gg-carousel::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  width: 72px;
  pointer-events: none;
  z-index: 1;
}
.gg-carousel::before {
  left: 0;
  background: linear-gradient(to right, var(--fallback-b2, oklch(var(--b2))) 0%, transparent 100%);
}
.gg-carousel::after {
  right: 0;
  background: linear-gradient(to left, var(--fallback-b2, oklch(var(--b2))) 0%, transparent 100%);
}
.gg-carousel__track {
  display: flex;
  align-items: center;
  gap: 32px;
  width: max-content;
  animation: gg-marquee 60s linear infinite;
}
.gg-carousel:hover .gg-carousel__track { animation-play-state: paused; }
.gg-carousel__item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 24px 28px;
  background: var(--vp-c-bg, #fff);
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  transition: transform 0.3s;
}
.gg-carousel__item:hover { transform: translateY(-3px); }
.gg-carousel__item img {
  height: 240px;
  width: auto;
  max-width: 560px;
  display: block;
}
@media (max-width: 768px) {
  .gg-carousel__item img { height: 180px; max-width: 420px; }
}
@keyframes gg-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .gg-carousel__track { animation: none; }
}

/* Grid demo — left: rendered SVG inside a card; right: tab-switched
   source view. Both panes sit at the top of their cell so the tabs
   line up with the top of the canvas image. */
.gg-demo__canvas {
  display: flex;
  justify-content: center;
  padding: 24px;
  background: var(--vp-c-bg, #fff);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}
.gg-demo__canvas img {
  max-width: 520px;
  width: 100%;
  height: auto;
  display: block;
}
/* Source pane — paired with daisyUI's `tabs-border`. Bg matches
   VitePress's own pre>code gray so shiki sits flush. Padding comes
   from the pane (not shiki's own) so the code has breathing room;
   horizontal + vertical scroll kick in once the content exceeds the
   cap height, so the landing grid stays balanced with the SVG on the
   left. */
.gg-demo__pane {
  background: var(--vp-code-block-bg);
  border-radius: 10px;
  padding: 16px 18px;
  max-height: 520px;
  overflow: auto;
}
.gg-demo__pane :deep(.language-gg),
.gg-demo__pane :deep(.language-typescript) {
  margin: 0;
  background: transparent;
}
.gg-demo__pane :deep(pre) {
  margin: 0;
  padding: 0;
  background: transparent;
  white-space: pre;
  overflow: visible;
}
.gg-demo__pane :deep(code) {
  background: transparent;
  padding: 0;
}

/* Architecture canvas — full-width card hosting the self-describing diagram. */
.gg-arch__canvas {
  display: flex;
  justify-content: center;
  padding: 24px;
  background: var(--vp-c-bg, #fff);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}
.gg-arch__canvas img {
  max-width: 880px;
  width: 100%;
  height: auto;
  display: block;
}

/* Acknowledgments — compact card per upstream project. */
.gg-ack { list-style: none; padding: 0; margin: 0; }
.gg-ack__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: var(--vp-c-bg, #fff);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}
.gg-ack__name {
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.gg-ack__name:hover { text-decoration: underline; }
.gg-ack__license {
  display: inline-block;
  align-self: flex-start;
  font-size: 11px;
  font-family: var(--vp-font-family-mono, ui-monospace, monospace);
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--vp-c-default-soft, rgba(128, 128, 128, 0.1));
  color: var(--vp-c-text-2);
  margin-top: 2px;
}
.gg-ack__role {
  font-size: 13px;
  opacity: 0.75;
  line-height: 1.5;
  margin: 2px 0 0;
}
</style>
