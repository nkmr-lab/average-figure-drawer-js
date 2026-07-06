// Node 標準の node:test / node:assert で書いた回帰テスト。npm 依存ゼロ。
//   実行:  node --test          (リポジトリ直下で)
//
// 数学コア(Point/Stroke/Figure)は DOM を触らないので Node でそのまま動く。
// drawer / mouse_tracker / svg-helper は window/document を使うためここでは対象外。

import { test } from "node:test";
import assert from "node:assert/strict";

import Point from "../src/point.js";
import Stroke from "../src/stroke.js";
import Figure from "../src/figure.js";

/** 正弦カーブ上の点列から 1 画の Stroke を作る */
function makeStroke(phase, ampl, n = 40, step = 5) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    pts.push(new Point(50 + i * step, 200 + Math.sin(i / 6 + phase) * ampl, { z: 0.5 }));
  }
  return new Stroke(pts, { color: "rgb(0,0,0)", strokeWidth: 4 });
}

function makeFigure(phase, ampl, n, step) {
  const f = new Figure();
  f.add(makeStroke(phase, ampl, n, step));
  return f;
}

const noNaN = (arr) => arr.every((v) => v === undefined || Number.isFinite(v));

test("Point: distance / average / flatten", () => {
  const a = new Point(0, 0);
  const b = new Point(3, 4);
  assert.equal(a.distance(b), 5);
  const m = Point.average(a, b);
  assert.equal(m.x, 1.5);
  assert.equal(m.y, 2);
  assert.deepEqual(Point.flatten([a, b]), [0, 0, 3, 4]);
});

test("Stroke: 構築で DFT が有限係数を持つ", () => {
  const s = makeStroke(0, 60);
  assert.ok(s.DFT.degree() >= 1, "degree>=1");
  assert.ok(noNaN(s.DFT.equations.normalized.reX), "reX に NaN 無し");
});

test("Figure.average: 同次数どうしの平均が全点有限", () => {
  const figs = [makeFigure(0.0, 60), makeFigure(0.4, 60)];
  figs.forEach((f) => f.prepare());
  const avg = Figure.average(figs);
  assert.ok(avg, "avg が生成される");
  const pts = avg.strokes[0].DFT.pointsToDraw(true);
  assert.ok(pts.length > 0, "描画点がある");
  assert.ok(
    pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    "全点有限"
  );
});

test("回帰: 次数の違うストローク平均で NaN が出ない(欠損係数=0 ガード)", () => {
  // 片方は短く単純(低次数)、片方は長く複雑(高次数)にして degree を変える
  const simple = makeFigure(0.0, 20, 12, 4);
  const complex = makeFigure(1.3, 120, 60, 6);
  const dSimple = simple.strokes[0].DFT.degree();
  const dComplex = complex.strokes[0].DFT.degree();
  assert.notEqual(dSimple, dComplex, "次数が異なる前提");

  [simple, complex].forEach((f) => f.prepare());
  const avg = Figure.average([simple, complex]);
  const n = avg.strokes[0].DFT.equations.normalized;
  for (const key of ["reX", "imX", "reY", "imY", "reZ", "imZ"]) {
    assert.ok(
      n[key].every((v) => v === undefined || Number.isFinite(v)),
      `平均 normalized.${key} に NaN が無い`
    );
  }
});

test("回帰: figure.dftJsonData() が例外を投げず正しい構造を返す", () => {
  const f = makeFigure(0.2, 50);
  f.prepare(); // normalize してから
  const data = f.dftJsonData();
  assert.ok(Array.isArray(data), "配列を返す");
  assert.ok(data.length === 1, "ストローク数ぶん");
  const first = data[0];
  if (first.length > 0) {
    const c = first[0];
    for (const axis of ["x", "y", "z"]) {
      assert.ok("real" in c[axis] && "imaginary" in c[axis], `${axis} に real/imaginary`);
      assert.ok(
        Number.isFinite(c[axis].real) || c[axis].real === undefined,
        `${axis}.real は数値`
      );
    }
  }
});
