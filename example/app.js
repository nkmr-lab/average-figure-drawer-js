// ビルド不要。npm パッケージ名ではなく、ライブラリの src を相対パスで直接 import する。
import { Drawer, Figure, drawMode } from "../src/index.js";

// Object型として各Drawerを保持
const drawers = {};

window.onload = () => {
  // Drawerの設定
  drawers["#drawer1"] = new Drawer("#drawer1");
  drawers["#drawer2"] = new Drawer("#drawer2");
  // mouse, touch, penを操作できないようにするには下記のようにする
  drawers["#averaged"] = new Drawer("#averaged", {
    ignoreInputs: ["mouse", "touch", "pen"],
  });
};

globalThis.average = () => {
  // figure(書いた文字)の取り出し
  const figures = [
    drawers["#drawer1"].currentFigure,
    drawers["#drawer2"].currentFigure,
  ];
  // 画数が違うと平均化できないのでアラート
  if (figures[0].length !== figures[1].length) {
    window.alert("画数が違います");
    return;
  }

  // 前処理
  figures.forEach((f) => f.prepare());
  // 平均化
  const avgFigure = Figure.average(figures);

  // まずは平均を描画するところをクリア
  drawers["#averaged"].clear();
  // 他のストロークも書いてあげるなら以下のように
  figures.forEach((f) =>
    f.draw(drawers["#averaged"], drawMode.DFT, {
      color: "rgb(200, 200, 200)",
      strokeWidth: 1,
    })
  );

  // 平均を描画しよう
  avgFigure.draw(drawers["#averaged"], drawMode.DFT, {
    color: "rgb(255, 0, 0)",
    strokeWidth: 4,
  });

  // 小さく左上に描画するならこんな風に
  avgFigure.fitToRect({ x: 10, y: 10, width: 50, height: 50 });
  avgFigure.draw(drawers["#averaged"], drawMode.DFT, {
    color: "rgb(0, 0, 255)",
    strokeWidth: 1,
  });
};

globalThis.clearSVG = (mode) => {
  if (mode === "all") {
    for (const key in drawers) {
      drawers[key].clear();
    }
  } else {
    drawers[mode]?.clear();
  }
};
