# パーサ

`.gg` ソース → `DiagramDef` は 3 段階で進みます。各段階はそのまま直接呼び出せる関数としてエクスポートされています：

```
  .gg source
      │
      ▼
  parseGg(source)               → { def, errors, icons }
      │                            (includes integrity checks)
      ▼
  buildIconContext({ … })       → IconContext           (gridgram/node)
      │                            (filesystem / network reads)
      ▼
  resolveDiagramIcons(def, ctx) → { def, diagnostics }
      │
      ▼
  renderDiagram(def)            → { svg, diagnostics }
```

**ブラウザ vs Node**: `parseGg`、`resolveDiagramIcons`、`checkIntegrity`、`formatError`、アイコン分類ヘルパ（`isPathRef`、`collectPathRefs`、`stripSvgWrapper`）はすべて純粋で `'gridgram'` からエクスポートされており、あらゆる ESM ホストで動作します。ファイルシステム / HTTP アイコンローダ（`buildIconContext` など）は `'gridgram/node'` サブパスにあり、Node 限定です。

## `parseGg(source)`

```ts
import { parseGg } from 'gridgram'

interface ParseResult {
  def: DiagramDef
  errors: GgError[]
  icons?: Record<string, string>   // from `doc { icons: … }`
}

function parseGg(source: string): ParseResult
```

ソースをトークナイズし、`doc` / `icon` / `region` / `note` / コネクタのステートメントを `DiagramDef` に畳み込み、整合性チェック（コネクタ参照、ノートのターゲット、リージョンスパン）を走らせます。`errors` には 3 種類のエラーが入ります：

| `source` | 意味 |
|----------|------|
| `'dsl'`  | トークナイザ／ステートメントパーサの問題 — 未知のステートメント、壊れた属性。 |
| `'json'` | JSON5 パーサが `doc { }` または `icons:` の本文を拒否。 |
| `'check'`| 整合性チェック：未知のコネクタターゲット、飛び地リージョンなど。 |

パースエラーは def が組み立てられる前に表面化します。エラーを持った def でもクイックプレビューには部分的に使えますが、`errors` を処理せずに本番描画してはいけません。

### `GgError` の形

```ts
interface GgError {
  message: string
  line: number                   // 1-based
  source: 'dsl' | 'json' | 'check' | 'icon'
  snippet?: string               // the offending source line
  related?: { line: number; source: GgErrorSource; snippet?: string }
}
```

読みやすい文字列には `formatError` を使います：

```ts
import { formatError } from 'gridgram'

for (const e of errors) console.error(formatError(e, filename))
// Error: Unknown statement "icn"
//   at diagram.gg:3  (DSL:  icn :a @A1 "hello")
```

### `icons` フィールド

`.gg` ファイルはインラインアイコンソースを直接登録できます：

```gg
doc {
  icons: {
    logo:  'https://example.com/logo.svg',
    brand: './assets/brand.svg',
  },
}

icon @A1 logo  "Us"
icon @B1 brand "You"
```

`parseGg` はこれらを `icons: Record<string, string>` として def と共に返します。リゾルバは生の SVG 文字列については `IconContext.inline` で、ロードが必要な URL / file / dataURL の値については `buildIconContext` の `jsonIconsMap` で消費します。これにより、ソース時点のアイコン参照を `DiagramDef` 型（描画された図版をモデル化するもので、その由来ではない）から切り離しています。

## `resolveDiagramIcons(def, ctx)`

```ts
import { resolveDiagramIcons } from 'gridgram'

function resolveDiagramIcons(
  def: DiagramDef,
  ctx: IconContext,
): { def: DiagramDef; diagnostics: PlacementDiagnostic[] }
```

文字列値の `node.src` をすべて解決済みの SVG フラグメントに置き換えます。`src` が解決できなかったノードには `iconError: true` が付与され、`src` は削除されます。それぞれの失敗は次の [PlacementDiagnostic](./diagnostics) を発行します：

- `kind: 'icon-unresolved'`
- `iconSrc`: 元の DSL 識別子
- `iconReason`: `'not-found'`（tabler 不一致 / 未登録）または `'load-failed'`（ローダが試みてエラー）

呼び出し側は通常これらを描画時の診断と連結し、エージェントに単一のストリームとして渡します：

```ts
const iconResolve = resolveDiagramIcons(rawDef, ctx)
const rendered = renderDiagram(iconResolve.def)
const allDiagnostics = [...iconResolve.diagnostics, ...rendered.diagnostics]
```

純粋、同期、ブラウザセーフ。`ctx` は普通のオブジェクトです — 手動で構築する（Tabler 組込と事前読み込み済みのインライン SVG だけを扱うブラウザ利用で典型的）こともできますし、Node では `buildIconContext` に埋めさせることもできます。

## `IconContext`

```ts
interface IconContext {
  inline?: Record<string, string>           // from doc.icons / --icons map
  dir?: Record<string, string>              // from --icons <dir> basename
  aliases?: Record<string, string>          // from --alias / project config
  paths?: Record<string, string>            // pre-loaded external refs
  errors?: GgError[]                        // non-fatal loader issues
  failedSources?: Map<string, string>       // identifier → reason
}
```

すべてのフィールドは任意です。最小限の有効なコンテキスト — `{}` — は Tabler 組込のみを解決し、それ以外の `src` はすべて `iconError` としてフラグします。

## `buildIconContext(opts)` — Node 限定

```ts
import { buildIconContext } from 'gridgram/node'

function buildIconContext(opts: {
  iconsDir?: string
  jsonIconsMap?: Record<string, string>
  aliases?: Record<string, string>
  def?: DiagramDef
  docDir: string      // for cwd-relative paths AND for the icons map
  aliasDir?: string   // defaults to docDir
}): Promise<IconContext>
```

def を走査して外部パスのアイコン参照をすべて列挙し、事前読み込み（ファイルシステムか HTTP）します。リゾルバが消費する `IconContext` を返します。アイコンごとの致命的でない失敗は `ctx.errors`（`GgError` として）と `ctx.failedSources`（DSL 識別子をキーとする map）に入ります。

```ts
import { buildIconContext } from 'gridgram/node'

const ctx = await buildIconContext({
  iconsDir: settings.iconsDir,            // --icons <dir>
  jsonIconsMap: parseResult.icons,        // from parseGg
  aliases: settings.assetAliases,         // from project config
  def: rawDef,
  docDir: dirname(sourcePath),
  aliasDir: process.cwd(),
})

// Surface per-icon loader errors early
for (const err of ctx.errors ?? []) console.error(formatError(err, sourcePath))
```

ブラウザバンドルではこの import は失敗します。ブラウザでは、外部アイコン参照を完全に使わない（Tabler のみ）か、ホストコード側で事前読み込みし、その結果を `ctx.inline` / `ctx.paths` 経由で `resolveDiagramIcons` に渡してください。

### パス参照の解決

| DSL 形式              | 解決先 |
|-----------------------|-------------------|
| `'@brand/aws.svg'`    | `aliases.brand + '/aws.svg'`（`aliases.brand` が絶対なら絶対、そうでなければ `aliasDir` と結合） |
| `'./foo.svg'`         | `docDir + '/foo.svg'` |
| `'/abs/path.svg'`     | そのまま |
| `'foo.svg'`           | `docDir + '/foo.svg'` |

## `checkIntegrity(def)`

```ts
import { checkIntegrity } from 'gridgram'

function checkIntegrity(def: DiagramDef): GgError[]
```

`parseGg` が自動で走らせるパース後チェック：

- コネクタの `from` / `to` が既知のノード ID を参照している
- ノートの `targets` が既知のノード / コネクタ ID を参照している
- リージョンスパンが `columns × rows` の範囲内に収まる
- リージョンスパンが単一の 4-連結な形を成す
- 座標の不正（不正な A1、`col < 1` など）

`parseGg` をスキップしてプログラム的に `DiagramDef` を構築する呼び出し側でも検証できるよう、独立してエクスポートされています。エラーメッセージは 1-based A1 座標（たとえば「`A1-J10 exceeds A1-B2 grid`」）を使うので、エージェントが内部 0-based 形式をデコードする必要はありません。

## アイコン分類ヘルパ

こちらも `'gridgram'` からエクスポートされ、ブラウザセーフです：

```ts
import { isPathRef, collectPathRefs, stripSvgWrapper } from 'gridgram'

isPathRef('@brand/aws.svg')       // true  — needs external loading
isPathRef('tabler/user')          // false — Tabler built-in
isPathRef('logo')                 // false — bare name → icon map

collectPathRefs(def)              // string[] of every node.src / badge.icon
                                  // that looks like an external path
stripSvgWrapper('<svg …>…</svg>') // '…'    — keep the inner fragment
```

`collectPathRefs` は `buildIconContext` が事前読み込みすべき外部ファイルを発見するために使うものです。独自の非同期ローダ（`fs` ではなくストレージアダプタでパスを解決するなど）を実装する場合はこちらを利用してください。

## 関連

- [型定義](./types) — `DiagramDef` とそのメンバ。
- [診断](./diagnostics) — icon-unresolved ストリームを消費側から見る。
- [ユーザーガイド：CLI](../guide/cli) — CLI 側からの同じパース処理。
