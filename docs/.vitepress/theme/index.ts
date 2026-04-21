import Theme from 'vitepress-daisyui-theme'
import type { Theme as ThemeType } from 'vitepress'
import Example from './Example.vue'
import Landing from './Landing.vue'
import Editor from './Editor.vue'
import './custom.css'

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
  },
} satisfies ThemeType
