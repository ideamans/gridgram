import Theme from 'vitepress-daisyui-theme'
import type { Theme as ThemeType } from 'vitepress'
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
  enhanceApp(ctx) {
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
