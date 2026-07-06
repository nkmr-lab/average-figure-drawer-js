import { normalizeProportions } from "./utils/array_calc.js";
import Point from "./point.js";
import Stroke from "./stroke.js";
import DFT from "./dft.js";
import GraphAnalysis from "./graph_analysis.js";
import Spline from "./spline.js";

/**
 * @classdesc Figure クラス. Strokeを複数持つ
 */
class Figure {
  strokes;
  graphAnalysis;
  leftTop;
  rightBottom;
  spline;
  points;
  width;
  height;

  /**
   * @constructor
   * @return {Figure}
   */
  constructor() {
    this.strokes = []; // Stroke が入ります
    this.graphAnalysis = new GraphAnalysis();
    this.leftTop = new Point(0, 0);
    this.rightBottom = new Point(0, 0);
  }

  /**
   * loadFrom - URLを指定してfigureに適用
   *
   * @param  {String} url Figureのjsonを返すURL
   * @return {null}
   */
  loadFrom(url) {
    fetch(url)
      .then((response) => {
        response.json();
      })
      .then((json) => {
        this.load(json);
      });
  }

  /**
   * load - jsonを読み込んでfigureに適用
   *
   * @param  {Object} json figure.jsonize()で書き出されたもの
   * @return {Figure}      jsonの中身を反映したFigure
   */
  load(json) {
    this.strokes = json.strokes.map((strokeJson) =>
      new Stroke().load({
        dft: strokeJson.DFT || strokeJson.dft || {},
        points: strokeJson.points || this.points,
        spline: strokeJson.spline || this.spline,
        color: strokeJson.color || null,
      })
    );
    this.leftTop.load(json.leftTop);
    this.rightBottom.load(json.rightBottom);
    return this;
  }

  /**
   * draw - 描画
   *
   * @param  {Drawer} drawer 描画対象のdrawer
   * @param  {drawMode} mode   何を描画するか決める
   * @param  {options} options 描画オプション、色や太さなど
   * @return {null}
   */
  draw(drawer, mode, options = {}) {
    this.strokes.forEach((stroke) => {
      // stroke 側にオプションをそのまま渡す
      stroke.draw(drawer, mode, options);
    });
  }

  /**
   * add - Figure.strokesにstrokeを追加
   *
   * @param  {Stroke} stroke
   * @return {null}
   */
  add(stroke) {
    this.strokes.push(stroke);
  }

  /**
   * set - Figure.strokesをstrokesで置換
   *
   * @param  {Array} strokes Strokeの配列
   * @return {null}
   */
  set(strokes) {
    let strks;
    if (!Array.isArray(strokes) || strokes.length < 1) {
      strks = [];
    } else {
      strks = strokes;
    }
    this.strokes = strks;
    return this;
  }

  /**
   * jsonize - Figureがもつstrokesをjson化したデータを返す
   *
   * @param  {Object} canvasSize {x, y}
   * @param  {boolean} isSelected この画像が選択されているか
   * @return {Object}
   */
  jsonize() {
    return {
      strokes: this.strokes.map((st) => st.jsonize()),
      leftTop: this.leftTop.jsonize(),
      rightBottom: this.rightBottom.jsonize(),
    };
  }

  // TODO: この関数は必要？
  /**
   * jsonizeAverage - AverageFigureがもつstrokesをjson化したデータを返す。AverageFigure専用
   *
   * @param  {Object} canvasSize {x, y}
   * @param  {Number} baseFigureLength AverageFigureを生成するのに使ったFigureの個数
   * @return {Object}
   */
  jsonizeAverage(_canvasSize, baseFigureLength) {
    return {
      strokes: this.strokes.map((st) => st.jsonize()),
      base_char_stroke_length: baseFigureLength,
    };
  }

  /**
   * dftJsonData - FigureがもつDFTをjson化したデータを返す
   *
   * @return {Array}
   */
  dftJsonData() {
    return this.strokes.map((stroke) => {
      const jsonBuffer = [];
      for (let i = 0; i < stroke.DFT.degree(); i += 1) {
        jsonBuffer[i] = {
          x: {
            real: stroke.DFT.equations.normalized.reX[i],
            imaginary: stroke.equations.normalized.DFT.imX[i],
          },
          y: {
            real: stroke.DFT.equations.normalized.reY[i],
            imaginary: stroke.equations.normalized.DFT.imY[i],
          },
          z: {
            real: stroke.DFT.equations.normalized.reZ[i],
            imaginary: stroke.equations.normalized.DFT.imZ[i],
          },
        };
      }
      return jsonBuffer;
    });
  }

  /**
   * shouldDraw - このfigureが描画する要素をもっているか否か返す
   *
   * @return {Boolean}
   */
  shouldDraw() {
    return (
      this.strokes &&
      this.strokes.length > 0 &&
      this.strokes[0].DFT.degree() >= 1
    );
  }

  /**
   * undo - 最後の入力の取り消し
   *
   * @return {Figure}
   */
  undo() {
    const stroke = this.strokes.pop();
    if (stroke) stroke.svg.remove();
    return this;
  }

  /**
   * calculateRect - Figureの左上、右下を計算して領域を設定する
   * pointsが存在しない場合はDFTの式から推定
   * @return {null}
   */
  calculateRect() {
    const allPoints = [];
    this.strokes.forEach((st) => {
      let pts = [];

      // 1. pointsToDraw() が使えるならそこから得る
      if (st.DFT?.points && st.DFT.points.length > 0) {
        pts = st.DFT.points;
      } else if (typeof st.DFT?.pointsToDraw === "function") {
        // 2. DFT式から一定サンプリング数で再構成
        pts = st.DFT.pointsToDraw(200); // 200点くらいで近似
      } else if (typeof st.DFT?.getPoint === "function") {
        // 3. 最低限 getPoint(t) があるなら 0〜1をサンプリング
        pts = Array.from({ length: 100 }, (_, i) => st.DFT.getPoint(i / 100));
      }

      // z等がなくてもPointとして扱えるように安全化
      pts = pts.filter(
        (p) => p && typeof p.x === "number" && typeof p.y === "number"
      );

      allPoints.push(...pts);
    });

    // ✅ 安全ガード
    if (allPoints.length === 0) {
      console.warn("No points available to calculate bounding box");
      return;
    }

    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    //console.log(this.leftTop, this.rightBottom);
    this.leftTop.set(minX, minY);
    this.rightBottom.set(maxX, maxY);
    this.width = maxX - minX;
    this.height = maxY - minY;
  }

  /**
   * normalize - figureの正規化
   * 描かれたFigureのDFTの式と、leftTop, rightBottomを基に、Figureを構成するstroke.DFTの式を正規化する(DFT.equations.normalizedを計算する)
   * 各点のx,y座標は [-1, 1]の中に収まる
   *
   * @return {null}
   */
  normalize() {
    // 外接矩形を再計算（現在のDFTやpointsに基づく）
    this.calculateRect();

    const reductionRatio = this.getReductionRatio();
    const centerCoord = this.getCenterCoord();
    this.strokes.forEach((stroke) =>
      stroke.DFT.normalize(reductionRatio, centerCoord)
    );
  }

  /**
   * adapt - figureの拡大・および平行移動
   * 正規化されたFigureのDFTの式とrightBottom, leftTopを基に、Figureを拡大・平行移動する
   *
   * @return {null}
   */
  adapt() {
    const magnificationRatio = this.getMaginificationRatio();
    const centerCoord = this.getCenterCoord();
    this.strokes.forEach((stroke) =>
      stroke.DFT.adapt(magnificationRatio, centerCoord)
    );
  }

  /**
   * prepare
   */
  prepare() {
    this.normalize();
    this.adapt();
  }

  /**
   * fitToRect - DFTベースで、アスペクト比を保ったまま指定矩形に中央寄せでフィット
   * normalize() + adapt() を組み合わせる実装
   *
   * @param {Object} targetRect - { x, y, width, height }
   * @returns {Figure}
   */
  fitToRect(targetRect) {
    this.calculateRect(); // DFTからでもOK

    const figW = this.rightBottom.x - this.leftTop.x;
    const figH = this.rightBottom.y - this.leftTop.y;
    if (figW === 0 || figH === 0) return this;

    const targetCenter = {
      x: targetRect.x + targetRect.width / 2,
      y: targetRect.y + targetRect.height / 2,
    };

    // 拡大先の半径（= ターゲット矩形の半分の長辺）
    const magnificationRatio =
      Math.max(targetRect.width, targetRect.height) / 2;

    this.strokes.forEach((stroke) => {
      stroke.DFT.adapt(magnificationRatio, targetCenter);
    });

    this.strokes.forEach((s) => s.DFT.pointsToDraw(true));
    this.calculateRect();
    return this;
  }

  /**
   * getMaginificationRatio - leftTop, rightBottomを基に、Figureの拡大率を返す
   *
   * @return {Number}  拡大率
   */
  getMaginificationRatio() {
    const w = (this.rightBottom.x - this.leftTop.x) / 2;
    const h = (this.rightBottom.y - this.leftTop.y) / 2;
    return w > h ? w : h;
  }

  /**
   * getReductionRatio - leftTop, rightBottomを基に、Figureの正規化に必要な縮小率を返す
   *
   * @return {Number}  縮小率
   */
  getReductionRatio() {
    const w = (this.rightBottom.x - this.leftTop.x) / 2;
    const h = (this.rightBottom.y - this.leftTop.y) / 2;
    return w > h ? 1 / w : 1 / h;
  }

  /**
   * getCenterCoord - leftTop, rightBottomを基に、Figureの中心座標を返す
   *
   * @return {Object}  {x, y}
   */
  getCenterCoord() {
    return {
      x: (this.leftTop.x + this.rightBottom.x) / 2,
      y: (this.leftTop.y + this.rightBottom.y) / 2,
    };
  }

  /**
   * changeStrokesOrderBasedOn - strokesの順序を引数のfigureのstorkesの順序に基づいて並べ替える
   *
   * @param  {type} firstFigure 順序の元となるfigure
   * @return {null}
   */
  changeStrokesOrderBasedOn(firstFigure) {
    if (this.strokes.length !== firstFigure.strokes.length) return;

    // ---- 前処理 ----
    this.calculateRect();
    firstFigure.calculateRect();
    if (!this.strokes[0].DFT.isNormalized()) this.normalize();
    if (!firstFigure.strokes[0].DFT.isNormalized()) firstFigure.normalize();

    const { length } = firstFigure.strokes;
    const distances = Array.from({ length }, () => Array(length).fill(0));
    const distanceRevs = Array.from({ length }, () => Array(length).fill(0));

    // ---- DFT距離の計算 ----
    for (let i = 0; i < length; i++) {
      for (let j = 0; j < length; j++) {
        const params = {
          dft0: firstFigure.strokes[i].DFT,
          dft1: this.strokes[j].DFT,
          isReversed: false,
        };
        distances[i][j] = DFT.getDistance(params);
        params.isReversed = true;
        distanceRevs[i][j] = DFT.getDistance(params);
      }
    }

    // ---- コサイン重み付け（安定化）----
    const centers = [[], []];
    for (let i = 0; i < length; i++) {
      centers[0].push(firstFigure.strokes[i].getCenter());
      centers[1].push(this.strokes[i].getCenter());
    }
    const v0 = new Point(0, 0);
    const v1 = new Point(0, 0);
    for (let i = 0; i < length; i++) {
      for (let j = 0; j < length; j++) {
        v0.x = centers[0][i].x - firstFigure.leftTop.x;
        v0.y = centers[0][i].y - firstFigure.leftTop.y;
        v1.x = centers[1][j].x - this.leftTop.x;
        v1.y = centers[1][j].y - this.leftTop.y;
        const cos = Math.max(0.2, Math.abs(Point.getCosineValue(v0, v1)));
        distances[i][j] /= cos;
        distanceRevs[i][j] /= cos;
      }
    }

    // ---- graphAnalysisで順序決定 ----
    this.graphAnalysis.findShortestPathStart(distances, distanceRevs);
    this.graphAnalysis.replaceRowCol(distances, distanceRevs);

    const goodOrder = [];
    const len = this.graphAnalysis.shortestFirstPath.length;

    for (let i = 1; i <= len; ) {
      for (let j = 0; j < len; j++) {
        if (i === this.graphAnalysis.shortestFirstPath[j]) {
          goodOrder.push(this.graphAnalysis.shortestTargetPath[j]);
          i += 1;
          break;
        }
      }
    }

    if (!this.graphAnalysis.isNeededToReorder()) return;

    // ---- 並べ替え・反転情報初期化 ----
    // eslint-disable-next-line prefer-const
    let resultStrokes = goodOrder.map((order) => {
      const src =
        order > 0 ? this.strokes[order - 1] : this.strokes[-order - 1];

      // 新しいStrokeとして複製（元を参照しない）
      const newStroke = new Stroke();
      newStroke.points = [...src.points];
      newStroke.spline = new Spline();
      newStroke.DFT = new DFT();
      newStroke.applyDFT();

      // 反転必要ならreverse
      if (order < 0) {
        newStroke.points.reverse();
        newStroke.applyDFT();
      }

      // 正規化
      const center = firstFigure.getCenter();
      const reductionRatio =
        2 / Math.max(firstFigure.width, firstFigure.height);
      newStroke.DFT.normalize(reductionRatio, center);

      return newStroke;
    });

    // ---- （新規）向き整合性補正フェーズ ----
    const directions = resultStrokes.map((s) => s.getDirectionVector());
    const avgDir = directions.reduce(
      (acc, d) => new Point(acc.x + d.x, acc.y + d.y),
      new Point(0, 0)
    );
    const avgLen = Math.hypot(avgDir.x, avgDir.y);
    const mainDir = new Point(avgDir.x / avgLen, avgDir.y / avgLen);

    // ---- 各ストロークの方向を主方向に揃える ----
    for (let i = 0; i < resultStrokes.length; i++) {
      const d = directions[i];
      const dot = Point.dot(d, mainDir);
      if (dot < 0) {
        // 主方向と逆向き → 反転
        resultStrokes[i] = resultStrokes[i].reverse();
      }
    }

    // ---- （対策2）全ストロークを完全に再構築してセット ----
    const width = this.rightBottom.x - this.leftTop.x;
    const height = this.rightBottom.y - this.leftTop.y;
    const center = this.getCenter();
    const reductionRatio = 2 / Math.max(width, height);

    this.strokes = resultStrokes.map((s) => {
      const ns = new Stroke();
      ns.points = s.points.map(
        (p) => new Point(p.x, p.y, { z: p.z, time: p.time })
      );
      ns.spline = new Spline();
      ns.DFT = new DFT();

      // 再構築＋正規化
      ns.applyDFT();
      ns.DFT.normalize(reductionRatio, center);

      return ns;
    });
  }

  /**
   * getCenter - 中心の座標を取得する
   *
   * @returns {Object} {x, y}
   */
  getCenter() {
    return {
      x: (this.leftTop.x + this.rightBottom.x) / 2,
      y: (this.leftTop.y + this.rightBottom.y) / 2,
    };
  }

  /**
   * length - figureが持つstrokeの数を返す
   *
   * @return {Number}  strokeの数
   */
  length() {
    return this.strokes.length;
  }

  /**
   * getBoundingBox - bounding boxを求める
   * @returns {Object} {leftTop, rightBottom, width, right, shorter, longer}
   */
  getBoundingBox() {
    const retBoundingBox = {
      leftTop: { x: 0, y: 0 },
      rightBottom: { x: 0, y: 0 },
      width: 0,
      height: 0,
      shorter: 0,
      longer: 0,
    };
    for (let i = 0; i < this.strokes.length; i++) {
      const points = this.strokes[i].DFT.pointsToDraw();
      for (let j = 0; j < points.length; j++) {
        if (i == 0 && j == 0) {
          retBoundingBox.leftTop.x = points[0].x;
          retBoundingBox.leftTop.y = points[0].y;
          retBoundingBox.rightBottom.x = points[0].x;
          retBoundingBox.rightBottom.y = points[0].y;
        } else {
          if (retBoundingBox.leftTop.x > points[j].x)
            retBoundingBox.leftTop.x = points[j].x;
          if (retBoundingBox.leftTop.y > points[j].y)
            retBoundingBox.leftTop.y = points[j].y;
          if (retBoundingBox.rightBottom.x < points[j].x)
            retBoundingBox.rightBottom.x = points[j].x;
          if (retBoundingBox.rightBottom.y < points[j].y)
            retBoundingBox.rightBottom.y = points[j].y;
        }
      }
    }
    retBoundingBox.width =
      retBoundingBox.rightBottom.x - retBoundingBox.leftTop.x;
    retBoundingBox.height =
      retBoundingBox.rightBottom.y - retBoundingBox.leftTop.y;
    if (retBoundingBox.width > retBoundingBox.height) {
      retBoundingBox.shorter = retBoundingBox.height;
      retBoundingBox.longer = retBoundingBox.width;
    } else {
      retBoundingBox.shorter = retBoundingBox.width;
      retBoundingBox.longer = retBoundingBox.height;
    }
    return retBoundingBox;
  }

  /**
   * calcArea - 面積を求める
   * @returns {number}
   */
  calcArea() {
    return (
      (this.rightBottom.x - this.leftTop.x) *
      (this.rightBottom.y - this.leftTop.y)
    );
  }

  /**
   * resetFigure - DFTをリセットする
   * @returns {null}
   */
  resetFigure() {
    for (let i = 0; i < this.strokes.length; i++) {
      this.strokes[i].DFT.reset();
    }
  }

  /**
   * getPartOfEquation - フーリエ級数の一部を表示する
   * @param _coefficient
   * @param _cos_or_sin
   * @param _k
   * @returns {String} 数式の文字列
   */
  getPartOfEquation(_coefficient, _cos_or_sin, _k) {
    let retStr = "";
    if (_coefficient > 0) retStr += "+";
    retStr += _coefficient.toFixed(2) + " \\" + _cos_or_sin;
    if (_k == 1) retStr += "(t)";
    else retStr += "(" + _k + "t)";
    return retStr;
  }

  /**
   * getEquation - フーリエの数式を表示する
   * @returns {String} TeXフォーマットの文字列で表現された数式
   */
  getEquation() {
    for (let i = 0; i < this.strokes.length; i++) {
      let equationText_X = "\\[ x_{" + (i + 1) + "}(t) = ";
      let equationText_Y = "\\[ y_{" + (i + 1) + "}(t) = ";
      for (let j = 0; j < 10; j++) {
        if (j == 4 || j == 7) {
          equationText_X += " \\\\ ";
          equationText_Y += " \\\\ ";
        }
        if (j == 0) {
          equationText_X +=
            this.strokes[i].DFT.equations.adapted.reX[j].toFixed(2);
          equationText_Y +=
            this.strokes[i].DFT.equations.adapted.reY[j].toFixed(2);
        } else {
          equationText_X += this.getPartOfEquation(
            this.strokes[i].DFT.equations.adapted.reX[j],
            "cos",
            j
          );
          equationText_X += this.getPartOfEquation(
            this.strokes[i].DFT.equations.adapted.imX[j],
            "sin",
            j
          );
          equationText_Y += this.getPartOfEquation(
            this.strokes[i].DFT.equations.adapted.reY[j],
            "cos",
            j
          );
          equationText_Y += this.getPartOfEquation(
            this.strokes[i].DFT.equations.adapted.imY[j],
            "sin",
            j
          );
        }
      }
      equationText_X += "... \\]";
      equationText_Y += "... \\]";
      return equationText_X + equationText_Y;
    }
  }

  /**
   * averagedLeftTop - figuresの左上の平均を求める
   * @param figures
   * @returns {Object} {x, y}
   */
  averagedLeftTop(figures) {
    const retLeftTop = figures[0].leftTop;
    for (let i = 1; i < figures.length; i++) {
      retLeftTop.x += figures[i].leftTop.x;
      retLeftTop.y += figures[i].leftTop.y;
    }
    retLeftTop.x /= figures.length;
    retLeftTop.y /= figures.length;
    return retLeftTop;
  }

  /**
   * averagedRightBottom - figuresの右下の平均を求める
   * @param figures
   * @returns {Object} {x, y}
   */
  averagedRightBottom(figures) {
    const retRightBottom = figures[0].rightBottom;
    for (let i = 1; i < figures.length; i++) {
      retRightBottom.x += figures[i].rightBottom.x;
      retRightBottom.y += figures[i].rightBottom.y;
    }
    retRightBottom.x /= figures.length;
    retRightBottom.y /= figures.length;
    return retRightBottom;
  }

  // STATIC FUNCTIONS

  /**
   * @static average - Figureの配列から平均化されたFigureを返す
   *
   * @param  {Array} figures          Figureの配列
   * @param  {Array} proportions = [] 0-1の数値の配列
   * @return {Figure | null}          平均化されたFigure or null
   */
  static average(figures, proportions = []) {
    if (figures.length === 0) return null;

    const figs = figures.filter((element) => element instanceof Figure);
    const len = figs.length;
    if (len === 0) return null;
    if (len === 1) return figs[0];

    const figure = new Figure();
    const numOfStrokes = figs[0].strokes.length;

    // log('select correct Figures...');
    // 画数が違うものを除外
    const correctFigures = figs.filter(
      (fig) =>
        fig && fig instanceof Figure && fig.strokes.length === numOfStrokes
    );

    const normalizedProportions = normalizeProportions(
      proportions,
      correctFigures.length
    );
    for (let i = 0; i < numOfStrokes; i += 1) {
      const strokes = correctFigures.map((cf) => cf.strokes[i]);
      figure.add(Stroke.average(strokes, normalizedProportions));
    }

    figure.leftTop = figure.averagedLeftTop(figures);
    figure.rightBottom = figure.averagedRightBottom(figures);

    // ---- DFT・スプラインの適応を内部で完結 ----
    figure.adapt();
    return figure;
  }
}

export default Figure;
