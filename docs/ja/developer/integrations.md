# 統合例

Gridgram をホストシステムに組み込むためのパターン集。これらは個別のパッケージではなく、プリミティブ API をホストの要求する形に組み合わせる慣習です。

> **Import 境界のリマインダ:** 純粋なパイプライン（`parseGg`、`resolveDiagramIcons`、`renderDiagram` …）は `'gridgram'` から import し、どこでも動きます。ファイルシステム／HTTP ヘルパ（`buildIconContext`、`loadProjectConfig`）は `'gridgram/node'` から来て、Node ランタイムでのみ動作します。

## HTTP エンドポイント

`.gg` ソースを受け取って SVG と診断を返す最小のサービス：

```ts
import { serve } from 'bun'
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

serve({
  port: 3000,
  async fetch(req) {
    if (req.method !== 'POST') return new Response('POST /render', { status: 405 })
    const source = await req.text()

    const { def: rawDef, errors, icons } = parseGg(source)
    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 })
    }

    const ctx = await buildIconContext({
      jsonIconsMap: icons,
      def: rawDef,
      docDir: process.cwd(),
    })
    const { def, diagnostics: iconDiags } = resolveDiagramIcons(rawDef, ctx)
    const { svg, diagnostics: layoutDiags } = renderDiagram(def)

    return Response.json({
      svg,
      diagnostics: [...iconDiags, ...layoutDiags],
    })
  },
})
```

メモ：

- リクエストごとのプロジェクト設定は持ちません — デプロイ全体の設定は起動時に一度読み込む `gridgram.config.ts` に置き、`resolveSettings` で先頭に追加します（[設定](./config) 参照）。
- Node.js でも同じ — `Bun.serve` を `http.createServer`、Fastify、Hono などに差し替えればよいだけです。

## MCP ツール

Gridgram をエージェントツールとして公開する Model Context Protocol サーバ。骨組み：

```ts
import { Server } from '@modelcontextprotocol/sdk/server'
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

const server = new Server({ name: 'gridgram', version: '0.1.0' }, {
  capabilities: { tools: {} },
})

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== 'render_diagram') throw new Error('unknown tool')

  const source = req.params.arguments?.source as string
  const { def: rawDef, errors, icons } = parseGg(source)
  if (errors.length) {
    return { content: [{ type: 'text', text: JSON.stringify({ errors }) }] }
  }

  const ctx = await buildIconContext({
    jsonIconsMap: icons, def: rawDef, docDir: process.cwd(),
  })
  const { def, diagnostics: iconDiags } = resolveDiagramIcons(rawDef, ctx)
  const { svg, diagnostics: layoutDiags } = renderDiagram(def)
  const diagnostics = [...iconDiags, ...layoutDiags]

  return {
    content: [
      { type: 'text', text: JSON.stringify({ diagnostics }, null, 2) },
      { type: 'image', data: Buffer.from(svg).toString('base64'), mimeType: 'image/svg+xml' },
    ],
  }
})
```

エージェントの使い勝手にとって決定的なのは、応答に `diagnostics` 配列を含めること — LLM が赤く染まった SVG だけではなく、*なぜ* 図版がきれいに描画されなかったかを把握できるようにするためです。エージェントループの例は [診断](./diagnostics) を参照してください。

## ヘッドレスのビルドステップ

静的サイトジェネレータや CI ジョブで、ディレクトリ内のすべての `.gg` ファイルを処理する例：

```ts
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

async function buildAll(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { recursive: true })) {
    if (!entry.endsWith('.gg')) continue
    const path = join(dir, entry)
    const source = await readFile(path, 'utf-8')

    const { def: rawDef, errors, icons } = parseGg(source)
    if (errors.length) throw new Error(`${path}: ${errors[0].message}`)

    const ctx = await buildIconContext({
      jsonIconsMap: icons, def: rawDef, docDir: dirname(path),
    })
    const { def } = resolveDiagramIcons(rawDef, ctx)
    const { svg, diagnostics } = renderDiagram(def)

    if (diagnostics.length > 0) {
      console.warn(`${path}:`, diagnostics.map((d) => d.message).join('\n  '))
    }

    await writeFile(path.replace(/\.gg$/, '.svg'),
      `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`)
  }
}
```

本リポジトリのドキュメントサイトはまさにこのパターンを使っています — 完全版は `scripts/build-docs-examples.ts` を参照（`sharp` による PNG ラスタライズと `.gg` / `.ts` のパリティチェックを追加）。

## PNG ラスタライズ

Gridgram は `sharp` を依存として同梱しません — TS API は SVG のみを描画し、`sharp` はホストに属する重量級のネイティブモジュールです。PNG が必要になった時点でインストールしてください：

```sh
npm install sharp
```

```ts
import sharp from 'sharp'
import { renderDiagram, computeRenderDimensions } from 'gridgram'

const { svg } = renderDiagram(def, { renderWidth: 2048 })
const { width, height } = computeRenderDimensions(def, { renderWidth: 2048 })

await sharp(Buffer.from(svg))
  .resize(width, height)
  .png()
  .toFile('out.png')
```

`computeRenderDimensions` と `renderDiagram` は同じ `DiagramOptions` を取るので、アスペクト比が揃います。

別案として — `gg` CLI は sharp を同梱しています（初回の PNG 描画時に `~/.cache/gridgram/` に遅延ロード）。パイプラインが既にバイナリにアクセスできるなら、アプリに sharp を組み込むより `gg -o out.png` をシェルアウトするほうが簡単なことも多いです。

## Preact／ブラウザ埋め込み

ホストが Preact アプリ（あるいは Vite / Rspack / esbuild でバンドルされた任意の ES モジュールブラウザアプリ）なら、`<Diagram>` コンポーネントを使います：

```tsx
import { Diagram } from 'gridgram'
import type { DiagramDef } from 'gridgram'

export function DiagramView({ def }: { def: DiagramDef }) {
  return <Diagram def={def} renderWidth={1024} />
}
```

または `buildDiagramTree` で生の VNode ツリーに落として自分でラップします。使われるのは純粋なエントリポイント（`'gridgram'`）のみ — ブラウザに配信しても安全です。

`parseGg` と `resolveDiagramIcons` も純粋なので、ブラウザ側のライブエディタはこれらと描画関数だけで十分です。完全な例は [docs/.vitepress/theme/Editor.vue](https://github.com/ideamans/gridgram/blob/main/docs/.vitepress/theme/Editor.vue) のソースを参照してください。

## ワーカー／ワーカースレッド

`renderDiagram` は純粋でスレッドセーフです — モジュールレベルの可変状態なし、グローバルなし。各ワーカーが `gridgram` を import して独立に呼び出せます。Tabler アイコン JSON は読み取り専用で安全に共有されます。

## キャッシング

メモ化した描画レイヤの例：

```ts
const cache = new Map<string, string>()

function renderCached(def: DiagramDef): string {
  const key = JSON.stringify(def)                  // good enough for equality
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const { svg } = renderDiagram(def)
  cache.set(key, svg)
  return svg
}
```

`renderDiagram` は決定的なので、入力 def 全体をキーにしたキャッシュは健全です。アイコンを上流で解決済みなら def の `src` フィールドはインライン SVG 文字列となり、キャッシュキーは長くなりますが安定します。

## 関連

- [CLI](../guide/cli) — ビルトインのワンショット描画。
- [設定](./config) — プロジェクト／デプロイ全体の既定の合成。
- [診断](./diagnostics) — どの統合でも共通のフィードバック形式。
