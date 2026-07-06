# average-figure-drawer-js

`@nkmr-lab/average-figure-drawer` を **ビルド不要の素の Vanilla JS (ESM)** に移植したもの。
手書きストローク → スプライン補間 → **DFT(フーリエ記述子)** で平均字形を生成/描画する。

## なぜこれを作ったか

本家 `average-figure-drawer` は TypeScript + tsup + npm workspaces で、使うには
`npm install` → `npm run build` が要る。中身の平均化アルゴリズムは純粋な数学なのに、
**「使うために Node/npm が要る」のがハードルだった**。

そこで:

- TypeScript の型注釈を剥がして **素の `.js`(ESM)** に
- 唯一の runtime 依存 `@svgdotjs/svg.js` を、必要な API だけの
  自前ヘルパー [`src/svg-helper.js`](src/svg-helper.js)(`createElementNS` ベース・約150行)に置換
- `detector` パッケージを `navigator.userAgent` 判定([`src/utils/browser_detection.js`](src/utils/browser_detection.js))に置換

結果、**npm・tsup・TypeScript を一切必要とせず**、ブラウザが `import` するだけで動く。
アルゴリズム（Point / Spline / DFT / Stroke / Figure）は本家と同一。

## 使い方（ビルド不要）

```html
<svg id="drawer1" style="width:400px;height:400px;border:1px solid #000"></svg>
<script type="module">
  import { Drawer, Figure, drawMode } from "./src/index.js";

  const d1 = new Drawer("#drawer1");
  // … 書いた文字は d1.currentFigure に溜まる
  // 平均化: Figure.average([figA, figB]) → draw(drawer, drawMode.DFT, {...})
</script>
```

動く最小サンプルは [`example/`](example/) にある（`index.html` をローカルサーバ経由で開くだけ。
ES モジュールは `file://` 直開きでは CORS で読めないので、`http://` で配信すること）。

```bash
# 例: 任意の静的サーバで
npx serve .    # もしくは python -m http.server など
# → http://localhost:XXXX/example/
```

## 公開 API

`src/index.js` から以下を export（本家と同じ）:

| export | 役割 |
|---|---|
| `Drawer` | `<svg>` に手書き入力を取り、描画する本体 |
| `Figure` | 複数 Stroke を持つ「1文字」。`Figure.average()` で平均字形 |
| `Stroke` | 1画。spline 補間 + DFT を持つ。`Stroke.average()` |
| `DFT` | フーリエ記述子（正規化 / 逆変換 / 距離） |
| `Spline` | 3次スプライン補間 |
| `Point` | 点（x, y, z=筆圧, time） |
| `drawMode` | 描画モードの定数（DFT / SPLINE / POINT ほか） |
| `Config` | デフォルト設定 |
| `getPathString` | 点列 → SVG path 文字列 |

## ディレクトリ

```
src/
  index.js              エントリ（re-export）
  drawer.js             Drawer（svg-helper を使用）
  mouse_tracker.js      ポインタ入力トラッキング
  svg-helper.js         ← @svgdotjs/svg.js の置換（自前・依存ゼロ）
  point.js stroke.js spline.js dft.js figure.js graph_analysis.js
  default-config.js draw_mode.js rdp.js
  utils/                DFT / spline / 幾何 などの純関数群
example/                ビルド不要の動作サンプル
```

## 移植元との違い

- **ビルド不要**: `lib/` を焼く工程が無い。`src/*.js` をそのまま配信する。
- **依存ゼロ**: `@svgdotjs/svg.js`・`detector` を撤去。npm パッケージに依存しない。
- **アルゴリズムは不変**: 数値計算（DFT・spline・平均化）は本家と 1:1。

移植元: [`nkmr-lab/average-figure-drawer`](https://github.com/nkmr-lab/average-figure-drawer)（MIT, Ryo Oshima）

## ライセンス

MIT
