import Theme from 'vitepress-daisyui-theme'
import type { Theme as ThemeType, EnhanceAppContext } from 'vitepress'
import { watch } from 'vue'
import { useRoute } from 'vitepress'
import Example from './Example.vue'
import Landing from './Landing.vue'
import Editor from './Editor.vue'
import GgBlock from './GgBlock.vue'
import './custom.css'

/**
 * Click-capture hook that appends `?lang=<key>` to any link emitted by
 * the daisyui theme's LangSwitch (those have a `hreflang` attribute).
 * The hosting layer uses that query parameter as the canonical signal
 * for a language switch; we can't override the LangSwitch component
 * itself (it's statically imported inside vitepress-daisyui-theme's
 * Header.vue), so we mutate the anchor's href just before the browser
 * follows it.
 */
/**
 * Re-inject the ideamans tracking script on every SPA route change.
 * VitePress uses client-side navigation, so a single `<script>` in the
 * HTML head only fires once on first load. The tag provider's script
 * runs a pageview hit on execution; re-adding the element on each
 * route re-runs it. `async` preserves the original tag's semantics.
 */
const TRACKING_SRC = 'https://tags.ideamans.com/scripts/gridgram.js'
function fireTrackingPageview(): void {
  if (typeof document === 'undefined') return
  // Remove any previous instance so the browser actually re-fetches /
  // re-executes the script on each navigation (same-src <script> tags
  // do not re-run just because they're re-appended).
  document
    .querySelectorAll(`script[data-gg-tracking="1"]`)
    .forEach((el) => el.remove())
  const s = document.createElement('script')
  s.src = TRACKING_SRC
  s.async = true
  s.dataset.ggTracking = '1'
  document.head.appendChild(s)
}

function installRouteTracker(): void {
  if (typeof window === 'undefined') return
  const route = useRoute()
  // Initial pageview: the `<script>` in <head> already fires for SSR'd
  // first paint, so we only need to cover subsequent client-side
  // navigations — hence watching `route.path` without `immediate`.
  watch(
    () => route.path,
    () => fireTrackingPageview(),
  )
}

function installLangSwitchHook(): void {
  if (typeof window === 'undefined') return
  const rewrite = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null
    const anchor = target?.closest?.('a[hreflang]') as HTMLAnchorElement | null
    if (!anchor) return
    const lang = anchor.getAttribute('hreflang')
    const href = anchor.getAttribute('href')
    if (!lang || !href) return
    try {
      const url = new URL(href, window.location.origin)
      url.searchParams.set('lang', lang)
      anchor.setAttribute('href', url.pathname + url.search + url.hash)
    } catch {
      // Bad URL — leave the anchor alone.
    }
  }
  document.addEventListener('click', rewrite, { capture: true })
}

export default {
  extends: Theme,
  setup() {
    Theme.setup?.()
    installRouteTracker()
  },
  enhanceApp(ctx: EnhanceAppContext) {
    Theme.enhanceApp?.(ctx)
    // Globally available as <Example name="..."/> in any markdown page.
    ctx.app.component('Example', Example)
    // Globally available as <Landing /> — reads translated strings from the
    // current page's `landing:` frontmatter.
    ctx.app.component('Landing', Landing)
    // Live .gg playground used on /en/editor. Wrap in <ClientOnly> at the
    // call site; the component runs parseGg / renderDiagramSvg in-browser.
    ctx.app.component('Editor', Editor)
    // Pre-built .gg source + rendered SVG side-by-side, styled to match
    // ```gg fenced blocks — use when an example needs async icon
    // resolution (HTTP URLs, file paths) that the ```gg-diagram fence
    // can't handle at markdown-compile time.
    ctx.app.component('GgBlock', GgBlock)

    installLangSwitchHook()
  },
} satisfies ThemeType
