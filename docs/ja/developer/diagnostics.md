# 診断

Gridgram のパイプラインは SVG を出すだけでなく、うまく収まらなかった要素について構造化フィードバックも出します。衝突のない場所を見つけられなかったラベル、障害物を迂回できなかったコネクタ、解決に失敗したアイコンソース — それぞれが `PlacementDiagnostic` レコードとなり、呼び出し側が検査、出力、あるいは AI エージェントへの修正依頼に使えます。

これはエージェントが図版を反復改善するために使う主要な面です。

## `PlacementDiagnostic` の形

```ts
interface PlacementDiagnostic {
  kind:
    | 'label-collision'    // a label was forced into an overlapping fallback
    | 'route-failed'       // a connector couldn't route around obstacles
    | 'icon-unresolved'    // node.src / badge.icon didn't resolve
    | 'region-disjoint'    // (reserved; currently surfaces as an integrity error)
  severity: 'warning' | 'error'
  element: ElementRef
  message: string                    // human-readable one-liner
  suggestion?: string                 // optional remediation hint
  finalRect?: PixelRect               // where the element actually drew
  attempts?: PlacementAttempt[]       // full placement search history
  iconSrc?: string                    // icon-unresolved: the original DSL id
  iconReason?: 'not-found' | 'load-failed' | 'malformed'
}
```

各診断には以下ができるだけの情報が含まれます：

1. **どの要素** で問題が起きたかを特定（`element` + 任意の `finalRect` で描画位置を特定）。
2. **何が悪かったか** を知る（`message`、各試行スロットでの `obstacles` を持つ `attempts` の探索履歴）。
3. **修正方針** を選ぶ — 自動的に（エージェント）、または手動で（CLI 出力を読む人間）。

## `ElementRef`

```ts
type ElementRef =
  | { kind: 'node';      id: string; pos?: GridCellRef; line?: number }
  | { kind: 'note';      id: string; pos?: GridCellRef; line?: number }
  | { kind: 'region';    id?: string; span: GridSpanRef; line?: number }
  | { kind: 'connector'; id?: string; from: string; to: string; line?: number }

interface GridCellRef { col: number; row: number; address: string }  // 1-based
interface GridSpanRef { from: GridCellRef; to: GridCellRef }
```

ここでの座標はすべて **1-based で A1 アドレス付き** — エージェント／人間がソースに書いたのと同じ形式です。0-based の内部座標がこの境界を越えて出てくることはありません。

## `PlacementAttempt`

```ts
interface PlacementAttempt {
  slot: string             // human-readable ("top-right", "seg 2 / t=0.5 above")
  rect: PixelRect          // where the label would have drawn
  obstacles: Obstacle[]    // everything that blocked this slot
  accepted: boolean        // the winning slot (last entry) vs rejected tries
}
```

配列の最後の試行は常に `accepted: true` — クリーンなスロットか、障害物があっても最終的に採用されたフォールバックのどちらかです。

## `Obstacle`

```ts
type Obstacle =
  | { kind: 'label';  owner: ElementRef; rect: PixelRect }
  | { kind: 'icon';   owner: ElementRef; circle: PixelCircle }
  | { kind: 'line';   owner: ElementRef; line: PixelLine }
  | { kind: 'leader'; owner: ElementRef; line: PixelLine }
  | { kind: 'canvas-bounds'; bounds: { width: number; height: number } }
```

`owner` は配置を妨げた要素（そのラベル／アイコン／線）を指し示します。ピクセルレベルの幾何情報により、エージェントは重なりの深さを定量的に判断できます。

## 例：label-collision 診断

```json
{
  "kind": "label-collision",
  "severity": "warning",
  "element": {
    "kind": "node",
    "id": "api",
    "pos": { "col": 2, "row": 1, "address": "B1" }
  },
  "message": "Label for node \"api\" could not find a clear slot across 7 candidates; final fallback still blocked by icon of node \"db\", label of node \"web\".",
  "finalRect": { "x": 512, "y": 200, "w": 82, "h": 28 },
  "attempts": [
    {
      "slot": "top-right",
      "rect": { "x": 520, "y": 148, "w": 82, "h": 28 },
      "obstacles": [
        {
          "kind": "icon",
          "owner": { "kind": "node", "id": "db", "pos": { "col": 2, "row": 2, "address": "B2" } },
          "circle": { "cx": 512, "cy": 400, "r": 57.6 }
        }
      ],
      "accepted": false
    },
    {
      "slot": "bottom-right",
      "rect": { "x": 520, "y": 252, "w": 82, "h": 28 },
      "obstacles": [
        {
          "kind": "line",
          "owner": { "kind": "connector", "from": "api", "to": "db" },
          "line": { "x1": 512, "y1": 200, "x2": 512, "y2": 400 }
        }
      ],
      "accepted": false
    },
    /* … five more attempts … */
    {
      "slot": "top-left",
      "rect": { "x": 430, "y": 148, "w": 82, "h": 28 },
      "obstacles": [/* fallback still collides */],
      "accepted": true
    }
  ]
}
```

これを読んだエージェントは次のような対応が取れます：

- `api` を外側の列に移動 — `C1` なら `db` のアイコンを避けられる。
- `api` のラベルを短くして狭いスロットに収める。
- 直結の `api → db` コネクタを削除するか、ウェイポイントを入れる。

## 例：route-failed 診断

```json
{
  "kind": "route-failed",
  "severity": "warning",
  "element": { "kind": "connector", "from": "a", "to": "b" },
  "message": "Connector a→b crosses node(s) \"mid\" and no routed alternative was found; the line is drawn straight through.",
  "suggestion": "Move a / b to an outer cell, add waypoints to steer the connector, or relocate \"mid\" so a clear path exists.",
  "attempts": [{
    "slot": "direct line",
    "rect": { "x": 0, "y": 0, "w": 0, "h": 0 },
    "obstacles": [{
      "kind": "icon",
      "owner": { "kind": "node", "id": "mid", "pos": { "col": 2, "row": 1, "address": "B1" } },
      "circle": { "cx": 240, "cy": 120, "r": 58 }
    }],
    "accepted": true
  }]
}
```

## 例：icon-unresolved 診断

```json
{
  "kind": "icon-unresolved",
  "severity": "warning",
  "element": { "kind": "node", "id": "api" },
  "message": "Node \"api\" src=\"tabler/userr\" could not be resolved (no matching Tabler icon or registered entry).",
  "iconSrc": "tabler/userr",
  "iconReason": "not-found"
}
```

`iconReason` は 2 種類の修正方針を区別します：

- `'not-found'` — 該当する tabler 名がない、登録された素の名前もない、解決可能なパスもない。**典型的な修正：改名または登録。**
- `'load-failed'` — ローダがソースを試し、I/O またはネットワークエラーになった。**典型的な修正：接続性やパスを確認。**

`'load-failed'` の場合、ローダのエラーメッセージが診断の `message` に含まれます。

## 診断を取得する

### TS API から

```ts
import { renderDiagram, resolveDiagramIcons } from 'gridgram'

const { def, diagnostics: iconDiagnostics } = resolveDiagramIcons(rawDef, ctx)
const { svg, diagnostics: layoutDiagnostics } = renderDiagram(def)

const all = [...iconDiagnostics, ...layoutDiagnostics]
```

### CLI から

```sh
gg diagram.gg -o out.svg --diagnostics
#                         ^ writes JSON array of diagnostics to stderr
```

または `--format json` と合わせて：

```sh
gg diagram.gg --format json --stdout
# { "def": { … resolved DiagramDef … },
#   "diagnostics": [ … all diagnostics … ] }
```

stdout の一度の読み取りで、解決済み def とそのフィードバックをエージェントが同時に得られます。

## エージェントループを書く

```ts
import { parseGg, resolveDiagramIcons, renderDiagram } from 'gridgram'
import { buildIconContext } from 'gridgram/node'

async function autoFixDiagram(source: string, maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { def, errors, icons } = parseGg(source)
    if (errors.length) throw new Error(errors.map((e) => e.message).join('\n'))

    const ctx = await buildIconContext({ jsonIconsMap: icons, def, docDir: '.' })
    const iconResolve = resolveDiagramIcons(def, ctx)
    const rendered = renderDiagram(iconResolve.def)
    const diagnostics = [...iconResolve.diagnostics, ...rendered.diagnostics]

    if (diagnostics.length === 0) return rendered.svg

    // Hand the diagnostics to an LLM that edits the .gg source.
    source = await llm.rewriteDiagram(source, diagnostics)
  }
  throw new Error('diagram still has diagnostics after retry budget')
}
```

この形は、LLM が診断を JSON として直接受け取れるよう設計されています — 独自のパース層は不要です。

## Severity

- `'warning'` — 図版はそれでも描画されます。ラベルはフォールバック位置に表示され、ルートは障害物を突き抜けて描かれます。`suppressErrors: true` でない限り、SVG の赤いマーカーで問題が可視化されます。
- `'error'` — 描画が構造的に壊れています。現時点ではランタイムでは未使用です（予約された `region-disjoint` kind は代わりに `parseGg` の整合性エラーとして現れます）。将来の拡張のため型に残しています。

## 関連

- [`renderDiagram` と仲間たち](./render) — `diagnostics` を返します。
- [パーサ](./parser) — `resolveDiagramIcons` は icon-unresolved 診断を返します。
- [統合例](./integrations) — MCP と HTTP の面。
