# CHANGELOG

## v0.2.0 (2026-07-06) — (a) コード硬化

本家 average-figure-drawer から引き継いだ不十分な実装を修正。挙動は基本互換だが、
壊れていた/危うかった箇所を堅牢化した。

- **fix**: `Figure.dftJsonData()` のパス逆参照バグ
  (`stroke.equations.normalized.DFT.imX` → `stroke.DFT.equations.normalized.imX`)。
  従来は呼ぶと例外だった。
- **fix**: `Stroke.applyDFT()` 内の到達不能な引数なし `DFT.normalize()` を除去。
  呼ばれると `centerCoord` が undefined になり壊れる死にコードだった。
  正規化は Figure レベル(`figure.normalize`)で行う。
- **robust**: `Stroke.average()` の次数境界 NaN をガード。次数の異なるストロークを
  平均しても、欠損係数を 0 として扱い NaN を出さない。
- **test**: Node 標準 `node:test` で回帰テストを追加(`node --test`、npm 依存なし)。
- CDN: 配信は `test/` を除外(`.gitattributes` の `export-ignore`)。

## v0.1.0 (2026-07-06) — 初版

`@nkmr-lab/average-figure-drawer`(TS + tsup + npm workspaces)を、npm/tsup/TypeScript を
一切必要としない素の Vanilla ESM へ全面移植。`@svgdotjs/svg.js` を自前 `svg-helper.js` に、
`detector` を `navigator` 判定に置換。数値計算は本家と 1:1。
