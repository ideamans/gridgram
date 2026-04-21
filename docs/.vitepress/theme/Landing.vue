<script setup lang="ts">
/**
 * Landing page for /en/ and /ja/.
 *
 * Sections in reading order:
 *   1. Hero       — monthly logo + short pitch + 2 CTAs
 *   2. Carousel   — full-width infinite marquee of gallery examples
 *   3. Features   — four Tabler-icon cards, one sentence each
 *   4. Grid demo  — one diagram with explicit @A1/@B1/… coords,
 *                   shown as SVG centred above its .gg / .ts source
 *                   (side by side) — this IS the headline usage pattern.
 *   5. Final CTA  — title + 2 CTAs
 *
 * All user-facing strings come from the page's `landing:` frontmatter so
 * the template stays locale-agnostic. Feature icons reference Tabler
 * outline names — resolved at build time via `tablerOutline()`.
 */
import { computed, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { createHighlighter, type Highlighter } from 'shiki'
import { tablerOutline } from 'gridgram'
import ggGrammar from '../gg.tmLanguage.json'

interface CtaLink { text: string; link: string }
interface FeatureLink { href: string; text: string }
interface FeatureItem { icon: string; title: string; body: string; link?: FeatureLink }
interface LandingFrontmatter {
  hero: {
    name: string
    text: string
    primary?: CtaLink
    secondary?: CtaLink
  }
  features?: { items: FeatureItem[] }
  demo?: {
    title: string
    intro?: string
    name: string                  // example folder name under /examples/
    ggLabel?: string
    tsLabel?: string
  }
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

onMounted(async () => {
  const name = content.value.demo?.name
  if (!name) return
  const [gg, ts] = await Promise.all([
    fetchText(`/examples/${name}.gg`),
    fetchText(`/examples/${name}.ts`),
  ])
  if (gg) ggHtml.value = await highlight(gg, 'gg')
  if (ts) tsHtml.value = await highlight(ts, 'typescript')
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
    <!-- One canonical example: explicit @A1/@B1/… coords (the headline
         usage pattern) — rendered SVG on top, .gg / .ts source below. -->
    <section
      v-if="content.demo"
      class="py-16 md:py-20 px-6 bg-base-200"
    >
      <div class="max-w-5xl mx-auto">
        <header class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
            {{ content.demo.title }}
          </h2>
          <p
            v-if="content.demo.intro"
            class="opacity-70 mt-3 max-w-xl mx-auto"
          >{{ content.demo.intro }}</p>
        </header>
        <!-- Centred SVG -->
        <div class="gg-demo__canvas">
          <img :src="`/examples/${content.demo.name}.svg`" alt="" />
        </div>
        <!-- Source pair -->
        <div class="grid md:grid-cols-2 gap-4 md:gap-6 mt-8">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-sm font-mono opacity-70">
              <div class="text-primary" v-html="iconSvg('file-text', 18)" />
              <span>{{ content.demo.ggLabel || '.gg (DSL)' }}</span>
            </div>
            <div class="language-gg" v-html="ggHtml" />
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-sm font-mono opacity-70">
              <div class="text-primary" v-html="iconSvg('brand-typescript', 18)" />
              <span>{{ content.demo.tsLabel || 'TypeScript' }}</span>
            </div>
            <div class="language-typescript" v-html="tsHtml" />
          </div>
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

/* Grid demo — centred image atop a 2-column source pair. The canvas
   cap keeps a 2×2 grid readable without blowing up the column. */
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

.gg-landing :deep(.language-gg),
.gg-landing :deep(.language-typescript) {
  margin: 0;
}
</style>
