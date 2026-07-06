import { sum, average, normalizeProportions } from "./utils/array_calc.js";
import randomIntArray from "./utils/random-int-array.js";
import getPathString, {
  getPointOfContactArray,
} from "./utils/get-path-string.js";
import drawMode from "./draw_mode.js";
import Point from "./point.js";
import Spline from "./spline.js";
import DFT from "./dft.js";

/**
 * @classdesc Stroke クラス. points, DFT, Splineを持つ
 */
class Stroke {
  stime;
  points;
  DFT;
  spline;
  originalLength;
  svg;
  color;
  strokeWidth;
  equations;

  /**
   * @constructor
   * @param  {Point[]} points=null ユーザが入力した点列
   * @return {Stroke}
   */
  constructor(points = null, { color, strokeWidth } = {}) {
    this.stime = new Date().getTime();
    this.points = points || [];
    this.DFT = new DFT(this.stime);
    this.spline = new Spline(this.stime);
    this.originalLength = null;
    this.svg = null;

    /**
     * this.DFT.drawで指定される線の色
     */
    this.color = color || null;

    /**
     * this.DFT.drawで指定される線幅
     */
    this.strokeWidth = strokeWidth || null;
    if (points) this.applyDFT();
  }

  /**
   * add - Stroke.pointsにpointを追加
   *
   * @param  {Point} point
   * @return {null}
   */
  add(point) {
    this.points.push(point);
  }

  /**
   * set - Stroke.pointsにpointsを代入
   *
   * @param  {Point[]} points PointのArray
   * @return {null}
   */
  set(points) {
    let ps;
    if (!Array.isArray(points) || points.length < 1) {
      ps = [];
    } else {
      ps = points;
    }
    this.points = ps;
  }

  /**
   * load - Objectを受け取ってstrokeに適用
   * @param  {{points: ?Point[], color: ?String, spline: ?Spline, dft: ?DFT}} param - このstrokeで読み込みたいデータ
   * @return {Stroke} 引数が適応されたStrokeインスタンス
   */
  load({
    points = this.points,
    color = this.color,
    spline = this.spline,
    dft = this.DFT,
  } = {}) {
    this.set(points.map((p) => new Point(p.x, p.y, { z: p.z })));
    this.color = color;
    this.spline.load(spline);
    const dft2 = dft;

    function isNumber(n) {
      return !Number.isNaN(parseFloat(n)) && Number.isFinite(n);
    }

    if (!isNumber(dft2.equation.reX[0])) {
      delete dft2.equation;
      dft2.equation = {
        aX: 0,
        aY: 0,
        aZ: 0,
      };
      dft2.equation.reX = dft.equations.normalized.reX.concat();
      dft2.equation.imX = dft.equations.normalized.imX.concat();
      dft2.equation.reY = dft.equations.normalized.reY.concat();
      dft2.equation.imY = dft.equations.normalized.imY.concat();
      dft2.equation.reZ = dft.equations.normalized.reZ.concat();
      dft2.equation.imZ = dft.equations.normalized.imZ.concat();
    }
    this.DFT.load(dft2);
    return this;
  }

  /**
   * draw - Strokeを描画
   *
   * @param  {Drawer} drawer          描画対象のDrawer instance
   * @param  {drawMode} mode          何を描画するか決める。utils/draw_mode.jsの{drawMode}を参照
   * @return {null}
   */
  draw(drawer, mode, options = {}) {
    if (options.color) this.color = options.color;
    if (options.strokeWidth) this.strokeWidth = options.strokeWidth;

    switch (mode) {
      case drawMode.DFT:
        this.DFT.draw(drawer, this);
        break;
      case drawMode.DFT_SPLINE:
        this.spline.draw(drawer);
        this.DFT.draw(drawer, this);
        break;
      case drawMode.DFT_SPLINE_POINT:
        this.drawOriginalPoints(drawer);
        this.spline.draw(drawer);
        this.DFT.draw(drawer, this);
        break;
      case drawMode.DFT_SPLINE_POINT_ORIGINAL_PATH:
        this.drawUnprocessedPath(drawer);
        this.drawOriginalPoints(drawer);
        this.spline.draw(drawer);
        this.DFT.draw(drawer, this);
        break;
      case drawMode.POINT:
        this.drawOriginalPoints(drawer);
        break;
      case drawMode.SPLINE:
        this.spline.draw(drawer);
        break;
      case drawMode.ORIGINAL_PATH:
        this.drawUnprocessedPath(drawer);
        break;
      case drawMode.DEBUG:
        this.DFT.draw(drawer, this);
        this.spline.draw(drawer);
        this.spline.drawVertexes(drawer);
        break;
      default:
        console.warn(
          [
            'The variable "mode" of stroke.draw() is incorrect.',
            "mode is Symbol defined in utils/draw_mode.js.",
            'Check "drawMode" in utils/draw_mode.js',
          ].join("\n")
        );
        break;
    }
  }

  /**
   * average - Stroke同士の平均的なオブジェクトを生成する
   *
   * @param  {Stroke[]} args - Array of Strokes
   * @return {Stroke | null} generated Stroke or null
   */
  average(...args) {
    if (args.length === 0) {
      return this;
    }
    const strokes = args;
    strokes.unshift(this);
    return Stroke.average(strokes);
  }

  /**
   * length - Stroke.pointsの長さを返す
   *
   * @return {Number}  Stroke.points
   */
  length() {
    let length = 0.0;
    for (let i = 0; i < this.points.length - 1; i += 1) {
      length += Math.hypot(
        this.points[i + 1].x - this.points[i].x,
        this.points[i + 1].y - this.points[i].y
      );
    }
    this.originalLength = length;
    return length;
  }

  /**
   * rebuildFromDFT - DFTから点列などを再構成するよ
   * @returns {null}
   */
  rebuildFromDFT() {
    if (!this.DFT) return;
    this.spline = new Spline();
    this.points = this.DFT.pointsToDraw(); // DFTから点列生成
  }

  // PRIVATE METHODS

  /**
   * drawOriginalPoints - 入力点（補完されていない）を描画
   * @private
   *
   * @param  {Drawer} drawer 描画対象のDrawer Obejct
   * @return {null}
   */
  drawOriginalPoints(drawer) {
    // log('original point');
    drawer.addPoints(this.points, null, null, "originalPoint");
  }

  /**
   * drawUnprocessedPath - 入力点（補完されていない）をつないだ線を描画
   * @private
   *
   * @param  {Drawer} drawer 描画対象のDrawer Obejct
   * @return {null}
   */
  drawUnprocessedPath(drawer) {
    // log('original path');
    drawer.addPolyline(this.points, null, null, "originalPath");
  }

  /**
   * jsonize - strokeをjson化可能なオブジェクトして返す
   *
   * @return {Object} Strokeの再現に必要な要素だけをまとめたオブジェクト
   */
  jsonize() {
    return {
      points: this.points.map((p) => p.jsonize()),
      color: this.color,
      dft: this.DFT.jsonize(),
      spline: this.spline.jsonize(),
    };
  }

  getPathPoints() {
    // TODO: remove
    const points = this.DFT.pointsToDraw().map((point) => {
      point.z = 1;
      return point;
    });
    console.log(points);
    return getPointOfContactArray(points, 30);
  }

  /**
   * adjustSvgPointsLength - 対象のstrokeの点の数を、呼び出した点の数に合わせる
   *
   * @param  {Stroke} targetStroke 点の数を変えるStroke
   * @return {null}
   */
  adjustSvgPointsLength(targetStroke) {
    if (!this.svg) return;
    const fromPoints = this.DFT.pointsToDraw();
    const fromLength = fromPoints.length;
    const toPoints = targetStroke.DFT.pointsToDraw();
    const toLength = toPoints.length;
    const randomInt = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    if (fromLength > toLength) {
      for (let i = 0; i < fromLength - toLength; i += 1) {
        fromPoints.splice(randomInt(1, fromPoints.length - 2), 1);
      }
      this.svg.attr("d", getPathString(fromPoints, this.strokeWidth));
      this.svg.attr("points", Point.flatten(fromPoints));
    } else if (fromLength < toLength) {
      for (let i = 0; i < toLength - fromLength; i += 1) {
        const index = randomInt(1, fromPoints.length - 2);
        fromPoints.splice(
          index,
          0,
          Point.average(fromPoints[index], fromPoints[index + 1])
        );
      }
      this.svg.attr("d", getPathString(fromPoints, this.strokeWidth));
    } else {
      this.svg.attr("d", getPathString(fromPoints, this.strokeWidth));
    }
  }

  /**
   * adjustSvgPathLength - description
   *
   * @todo implement this function
   *
   * @param  {type} targetStroke description
   * @return {type}              description
   */
  adjustSvgPathLength(targetStroke) {
    if (!this.svg) return;

    //  this.svg.attr('d')からanimationするpathを延長/縮減する
    //  - stringのままLコマンドを適当にpickしてduplicateする
    const lRegex = /L\s([\d.\s]*)/g;
    let fromD = this.svg.attr("d").trim();
    const fromLs = fromD.match(lRegex);
    const fromLength = fromLs.length;
    const toD = targetStroke.svg.attr("d").trim();
    const toLs = toD.match(lRegex);
    const toLength = toLs.length;

    // 縮減
    if (fromLength > toLength) {
      const laRegex = /L\s([\d.\s]*)A\s([\d.\s]*)/g;
      const fromLAs = fromD.match(laRegex);
      const indexes = randomIntArray(1, fromLength - 1, fromLength - toLength);
      for (let i = 0; i < fromLength - toLength; i += 1) {
        fromD = fromD.replace(fromLAs[indexes[i]], "");
      }
      this.svg.attr("d", fromD);
    } else if (fromLength < toLength) {
      // 延長
      const indexes = randomIntArray(1, fromLength - 1, toLength - fromLength);
      for (let i = 0; i < toLength - fromLength; i += 1) {
        fromD = fromD.replace(
          fromLs[indexes[i]],
          `${fromLs[indexes[i]]} ${fromLs[indexes[i]]} ${fromLs[indexes[i]]}`
        );
      }
      this.svg.attr("d", fromD);
    }
  }

  /**
   * applyDFT - this.pointの値を元にSpline補完及びDFTを実行する
   *
   * @return {null}
   */
  applyDFT() {
    this.spline.interpolate(this.points);
    this.DFT.findEquation(this.spline.points, this.length());
    // 正規化は Figure レベル(figure.normalize → stroke.DFT.normalize(ratio, center))で行う。
    // ここで引数なし normalize() を呼ぶと centerCoord が undefined になり壊れるため呼ばない。
  }

  getLength() {
    if (!this.points || this.points.length < 2) return 0;
    let len = 0;
    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      len += Math.hypot(p1.x - p0.x, p1.y - p0.y);
    }
    return len;
  }

  /**
   * reverse - 点列を逆転させる
   *
   * @return {null}
   */
  reverse(centerCoord = { x: 0, y: 0 }, reductionRatio = 1) {
    const reversed = new Stroke();

    // 点列反転
    reversed.points = [...this.points].reverse();

    // spline と DFT を新規生成（重要！！）
    reversed.spline = new Spline();
    reversed.DFT = new DFT();

    // 再計算
    reversed.applyDFT();

    // 正規化
    if (reversed.DFT && reversed.DFT.equations) {
      reversed.DFT.normalize(reductionRatio, centerCoord);
    } else {
      console.warn("reverse(): DFT equations not initialized");
    }

    return reversed;
  }

  /**
   * getCenter - 点の座標から、strokeの中心点を計算して返す
   *
   * @return {Point} strokeの中心点
   */
  getCenter() {
    return new Point(
      average(this.points, (p) => p.x),
      average(this.points, (p) => p.y)
    );
  }

  /**
   * animate - このstrokeのSVG要素を、対象のstrokeに向かってアニメーションさせる
   * @param  {{stroke: Stroke, duration: ?Number}} param - 終点のstroke, アニメーションの変化時間
   * @return {null}
   */
  animate({ stroke, duration = 1000 }) {
    const lengthDiff = Math.abs(
      this.DFT.pointsToDraw().length - stroke.DFT.pointsToDraw().length
    );
    this.adjustSvgPointsLength(stroke);
    const conditionalDuration = lengthDiff > 20 ? 0 : duration;
    this.svg.animate(
      { d: getPathString(stroke.DFT.points, stroke.strokeWidth) },
      conditionalDuration,
      () => {
        stroke.svg = this.svg;
      }
    );
  }

  /**
   * getDirectionVector - ストロークの始点から終点までの方向ベクトルを返す
   * （結果は単位ベクトル）
   *
   * @return {Point} 単位化された方向ベクトル
   */
  getDirectionVector() {
    if (!this.points || this.points.length < 3) {
      return new Point(0, 0);
    }

    const n = this.points.length;
    const third = Math.floor(n / 3);
    const pStart = this.points[third];
    const pEnd = this.points[n - third - 1];

    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;

    const len = Math.hypot(dx, dy);
    if (len === 0) return new Point(0, 0);

    return new Point(dx / len, dy / len);
  }

  // STATIC METHODS

  /**
   * @static average - strokesにproportionsで重み付けをした上で平均したStrokeを生成
   * 生成されるStrokeのDFTの式の次数はもっとも高いものに合わせる
   *
   * @param  {Stroke[]} strokes     Array of Strokes
   * @param  {Number[]} proportions Array of Numbers (0-1)
   * @return {Stroke | null} 生成された平均Stroke or null
   */
  static average(strokes, proportions = []) {
    if (!Array.isArray(strokes) || strokes.length === 0) return null;

    const strks = strokes.filter((element) => element instanceof Stroke);
    const len = strks.length;
    if (len === 0) return null;
    if (len === 1) return strks[0];

    const normalizedProportions = normalizeProportions(proportions, len);
    const avgStroke = new Stroke();
    const maximumOrder = Math.max(...strks.map((st) => st.DFT.degree()));
    strks.forEach((stroke) => {
      if (!stroke.DFT.isNormalized()) {
        console.warn("stroke is not normalized;");
      }
    });
    // 次数の異なるストロークを平均すると、短い方の係数が undefined になり
    // undefined * proportion = NaN が生じる。欠損係数は 0 として扱う(|| 0)。
    for (let d = 0; d < maximumOrder; d += 1) {
      avgStroke.DFT.equations.normalized.reX[d] = sum(
        strks,
        (st, i) =>
          (st.DFT.equations.normalized.reX[d] || 0) * normalizedProportions[i]
      );
      avgStroke.DFT.equations.normalized.imX[d] = sum(
        strks,
        (st, i) =>
          (st.DFT.equations.normalized.imX[d] || 0) * normalizedProportions[i]
      );
      avgStroke.DFT.equations.normalized.reY[d] = sum(
        strks,
        (st, i) =>
          (st.DFT.equations.normalized.reY[d] || 0) * normalizedProportions[i]
      );
      avgStroke.DFT.equations.normalized.imY[d] = sum(
        strks,
        (st, i) =>
          (st.DFT.equations.normalized.imY[d] || 0) * normalizedProportions[i]
      );
      avgStroke.DFT.equations.normalized.reZ[d] = sum(
        strks,
        (st, i) =>
          (st.DFT.equations.normalized.reZ[d] || 0) * normalizedProportions[i]
      );
      avgStroke.DFT.equations.normalized.imZ[d] = sum(
        strks,
        (st, i) =>
          (st.DFT.equations.normalized.imZ[d] || 0) * normalizedProportions[i]
      );
    }
    avgStroke.DFT.equations.normalized.aX = sum(
      strks,
      (st, i) => st.DFT.equations.normalized.aX * normalizedProportions[i]
    );
    avgStroke.DFT.equations.normalized.aY = sum(
      strks,
      (st, i) => st.DFT.equations.normalized.aY * normalizedProportions[i]
    );
    avgStroke.DFT.equations.normalized.aZ = sum(
      strks,
      (st, i) => st.DFT.equations.normalized.aZ * normalizedProportions[i]
    );
    avgStroke.DFT.splineSize = sum(
      strks,
      (st, i) => st.DFT.splineSize * normalizedProportions[i]
    );
    avgStroke.DFT.strokeLength = sum(
      strks,
      (st, i) => st.DFT.strokeLength * normalizedProportions[i]
    );

    return avgStroke;
  }
}

export default Stroke;
