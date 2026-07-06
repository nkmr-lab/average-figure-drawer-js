import Point from "./point.js";
import {
  discreteFourierTransform3D,
  inverseDiscreteFourierTransform3D,
} from "./utils/discrete-fourier-transform-3d.js";

/**
 * @classdesc DFTクラス. pointsを持つ
 */
class DFT {
  stime;
  equations;
  points;
  strokeLength;
  splineSize;
  appropriateDegree;
  maxDegree;
  thresholdOfCoefficient;

  /**
   * constructor - description
   *
   * @param  {String} stime
   * @return {DFT}
   */
  constructor(stime) {
    this.stime = stime;

    /**
      @typedef {Object} Equation
      @property {Number[]} reX - DFTの実部
      @property {Number[]} reY - DFTの実部
      @property {Number[]} imX - DFTの虚部
      @property {Number[]} imY - DFTの虚部
      @property {Number} aX - DFTの拡張
      @property {Number} aY - DFTの拡張
      */

    this.equations = {
      normalized: {
        reX: [], // DFTの実部
        imX: [], // DFTの虚部
        reY: [], // DFTの実部
        imY: [], // DFTの虚部
        reZ: [], // DFTの実部
        imZ: [], // DFTの虚部
        aX: 0, // DFTの拡張
        aY: 0, // DFTの拡張
        aZ: 0, // DFTの拡張
      },
      adapted: {
        reX: [], // DFTの実部
        imX: [], // DFTの虚部
        reY: [], // DFTの実部
        imY: [], // DFTの虚部
        reZ: [], // DFTの実部
        imZ: [], // DFTの虚部
        aX: 0, // DFTの拡張
        aY: 0, // DFTの拡張
        aZ: 0, // DFTの拡張
      },
    };
    this.points = [];
    this.strokeLength = 0;
    this.splineSize = 0;
    this.appropriateDegree = 0;
    this.maxDegree = 100;
    this.thresholdOfCoefficient = 0.001;
  }

  /**
   * load - 代入
   * @param {{
   *   equation: Equation,
   *   strokeLength: Number,
   *   splineSize: Number,
   *   maxDegree: Number,
   *   thresholdOfCoefficient: Number
   * }} params -
   * @return {DFT}
   */
  load(arg = {}) {
    if (typeof arg !== "object" || arg === null) return;

    let {
      equation = this.equations.normalized,
      strokeLength = this.strokeLength,
      splineSize = this.splineSize,
      maxDegree = this.maxDegree,
      thresholdOfCoefficient = this.thresholdOfCoefficient,
    } = arg;

    this.equations.normalized = equation;
    this.equations.adapted = {
      reX: [],
      imX: [],
      reY: [],
      imY: [],
      reZ: [],
      imZ: [],
      aX: 0,
      aY: 0,
    };

    // FIXIT: データ形式移行のための一時的な実装
    if (!this.equations.normalized.reX) {
      this.equations.normalized = {
        reX: equation.real_x || [],
        imX: equation.imaginary_x || [],
        reY: equation.real_y || [],
        imY: equation.imaginary_y || [],
        reZ: equation.real_z || [],
        imZ: equation.imaginary_z || [],
        aX: equation.aX || 0,
        aY: equation.aY || 0,
        aZ: equation.aZ || 0,
      };
    }
    if (this.equations.normalized.reX.length === 0) {
      this.equations.adapted = {
        reX: arg.reX || [],
        imX: arg.imX || [],
        reY: arg.reY || [],
        imY: arg.imY || [],
        reZ: arg.reZ || [],
        imZ: arg.imZ || [],
        aX: arg.aX || 0,
        aY: arg.aY || 0,
        aZ: arg.aZ || 0,
      };
    }
    if (arg.stroke_length) {
      strokeLength = arg.stroke_length;
      splineSize = arg.spline_size;
      thresholdOfCoefficient = arg.threshold_of_coefficient;
    }

    this.strokeLength = strokeLength;
    this.splineSize = splineSize;
    this.maxDegree = maxDegree;
    this.thresholdOfCoefficient = thresholdOfCoefficient;
    return this;
  }

  /**
   * draw - 描画
   *
   * @param  {Drawer} drawer 描画対象のDrawer instance
   * @param  {Stroke} stroke このDFTインスタンスを持つstroke
   * @return {null}
   */
  draw(drawer, stroke) {
    if (this.appropriateDegree === 0) {
      this.appropriateDegree = this.getAppropriateDegree(
        this.thresholdOfCoefficient
      );
      // log(`current degree ${this.appropriateDegree}`);
      this.points = Point.thinOut(
        this.generatePoints(
          this.appropriateDegree,
          this.thresholdOfCoefficient
        ),
        1
      );
    }

    if (this.points.length < 1) return;

    // === z=0 の太さ補正 ===
    const points = this.points.map((p) => {
      if (p.z === 0) {
        return new Point(p.x, p.y, { z: 0.5, time: p.time });
      }
      return p;
    });

    if (points.length === 1) {
      stroke.svg = drawer.addPoint(
        points[0],
        stroke.color,
        stroke.strokeWidth / 2,
        "dft"
      );
      return;
    }
    stroke.svg = drawer.addPath(
      points,
      stroke.color,
      stroke.strokeWidth,
      "dft"
    );
  }

  /**
   * pointsToDraw - 描画すべき点を返す
   *
   * @return {Point[]}  Pointの配列
   */
  pointsToDraw(forceRegenerate = false) {
    if (forceRegenerate || this.appropriateDegree === 0) {
      this.appropriateDegree = this.getAppropriateDegree(
        this.thresholdOfCoefficient
      );
      this.points = Point.thinOut(
        this.generatePoints(
          this.appropriateDegree,
          this.thresholdOfCoefficient
        ),
        1
      );
    }
    return this.points;
  }

  /**
   * findEquation - 点列からDFTの式を求める
   *
   * @param  {Point[]} splinePoints 元になるスプライン補完された点列
   * @param  {Number} strokeLength  元になるstrokeの点同士の距離の和
   * @return {null}
   */
  findEquation(splinePoints, strokeLength) {
    this.reset();
    this.splineSize = splinePoints.length;
    this.strokeLength = strokeLength;
    const degree = Math.ceil(Math.min(this.maxDegree, this.strokeLength));
    // log(`degree: ${degree}`);
    // log(`start DFT: ${((new Date()).getTime() - this.stime)}(msec)`);
    this.equations.adapted = discreteFourierTransform3D(splinePoints, degree);
    // log(`done DFT: ${((new Date()).getTime() - this.stime)}(msec)`);
  }

  /**
   * degree - 式の次元数を返す
   *
   * @return {Number}  式の次元数
   */
  degree() {
    return Math.max(
      this.equations.adapted.reX.length,
      this.equations.normalized.reX.length
    );
  }

  /**
   * generatePoints - フーリエ級数の方程式から、点列を生成して返す
   * @private
   *
   * @param  {Number} maxDegree
   * @param  {Number} thresholdOfCoefficient 係数の閾値
   * @return {Point[]}                       Pointの配列
   */
  generatePoints(maxDegree, thresholdOfCoefficient) {
    return inverseDiscreteFourierTransform3D({
      equation: this.equations.adapted,
      length: Math.ceil(this.strokeLength),
      maxDegree,
      threshold: thresholdOfCoefficient,
    });
  }

  /**
   * getAppropriateDegree - 式の次元数が高すぎると線が波打つので、適切な次元数を求める。
   * @private
   *
   * @param  {Number} thresholdOfCoefficient 係数の閾値
   * @return {Number}                        次元数
   */
  getAppropriateDegree(thresholdOfCoefficient) {
    const minimumDegree = 2;
    const averageDistanceThreshold = 0.5;
    let degree = minimumDegree;
    let current = null;
    let pre = null;

    // 次数をあげた時の変化をみて、適切な次数を求める
    for (let i = minimumDegree; i <= this.maxDegree; i += 3) {
      let distances = 0.0;
      current = this.generatePoints(i, thresholdOfCoefficient);
      if (pre !== null) {
        for (let j = 0; j < current.length; j += 1) {
          distances += Math.hypot(
            current[j].x - pre[j].x,
            current[j].y - pre[j].y
          );
        }
        if (distances / current.length < averageDistanceThreshold) {
          // log(`distance = ${distances}, currentlength = ${current.length}`);
          degree = i;
          break;
        }
        degree = i;
      }
      pre = current;
      current = null;
    }
    return degree;
  }

  /**
   * jsonize - dftをjson化可能なオブジェクトして返す
   *
   * @return {Object} DFTの再現に必要な要素だけをまとめたオブジェクト
   */
  jsonize() {
    const degree = this.degree();
    const equation = {
      reX: this.equations.normalized.reX.slice(0, degree),
      reY: this.equations.normalized.reY.slice(0, degree),
      reZ: this.equations.normalized.reZ.slice(0, degree),
      imX: this.equations.normalized.imX.slice(0, degree),
      imY: this.equations.normalized.imY.slice(0, degree),
      imZ: this.equations.normalized.imZ.slice(0, degree),
      aX: this.equations.normalized.aX,
      aY: this.equations.normalized.aY,
      aZ: this.equations.normalized.aZ,
    };

    return {
      equation,
      strokeLength: this.strokeLength,
      splineSize: this.splineSize,
      maxDegree: this.maxDegree,
      thresholdOfCoefficient: this.thresholdOfCoefficient,
    };
  }

  // PRIVATE METHODS

  /**
   * reset - DFTのリセット
   * @private
   * @return {null}
   */
  reset() {
    this.equations.adapted.reX = [];
    this.equations.adapted.imX = [];
    this.equations.adapted.reY = [];
    this.equations.adapted.imY = [];
    this.equations.adapted.reZ = [];
    this.equations.adapted.imZ = [];
    this.equations.adapted.aX = 0;
    this.equations.adapted.aY = 0;
    this.equations.adapted.aZ = 0;
    this.points = [];
    this.splineSize = 0;
    this.appropriateDegree = 0;
  }

  /**
   * normalize - DFTの正規化。this.equations.adapted から this.equations.normalized を求める
   * 正規化された図形は点のx,y座標は[-1,1]の範囲に収まる
   *
   * @param  {Number} reductionRatio 縮小率。このDFTをもつFigureをfigureとした時に、Math.max(figureの幅, figureの高さ)/2
   * @param  {Point} centerCoord   このDFTをもつFigureの中心座標
   * @return {null}
   */
  normalize(reductionRatio, centerCoord) {
    this.equations.normalized.reX[0] =
      (this.equations.adapted.reX[0] - centerCoord.x * 2) * reductionRatio;
    this.equations.normalized.reY[0] =
      (this.equations.adapted.reY[0] - centerCoord.y * 2) * reductionRatio;
    this.equations.normalized.imX[0] =
      this.equations.adapted.imX[0] * reductionRatio;
    this.equations.normalized.imY[0] =
      this.equations.adapted.imY[0] * reductionRatio;
    this.equations.normalized.reZ = this.equations.adapted.reZ.slice();
    this.equations.normalized.imZ = this.equations.adapted.imZ.slice();
    for (let i = 1; i < this.equations.adapted.reX.length; i += 1) {
      this.equations.normalized.reX[i] =
        this.equations.adapted.reX[i] * reductionRatio;
      this.equations.normalized.reY[i] =
        this.equations.adapted.reY[i] * reductionRatio;
      this.equations.normalized.imX[i] =
        this.equations.adapted.imX[i] * reductionRatio;
      this.equations.normalized.imY[i] =
        this.equations.adapted.imY[i] * reductionRatio;
    }
  }

  /**
   * adapt - 正規化されたDFTの拡大。this.equations.normalized から this.equations.adapted を求める
   *
   * @param  {Number} magnificationRatio 拡大率。拡大後ののFigureをfigureとした時に、Math.max(figureの幅, figureの高さ)/2
   * @param  {Point} centerCoord        このDFTをもつFigureの中心座標
   * @return {null}
   */
  adapt(magnificationRatio, centerCoord) {
    this.equations.adapted.reX[0] =
      this.equations.normalized.reX[0] * magnificationRatio + centerCoord.x * 2;
    this.equations.adapted.reY[0] =
      this.equations.normalized.reY[0] * magnificationRatio + centerCoord.y * 2;
    this.equations.adapted.imX[0] =
      this.equations.normalized.imX[0] * magnificationRatio;
    this.equations.adapted.imY[0] =
      this.equations.normalized.imY[0] * magnificationRatio;
    this.equations.adapted.reZ[0] = this.equations.normalized.reZ[0];
    this.equations.adapted.imZ[0] = this.equations.normalized.imZ[0];
    for (let i = 1; i < this.equations.normalized.reX.length; i += 1) {
      this.equations.adapted.reX[i] =
        this.equations.normalized.reX[i] * magnificationRatio;
      this.equations.adapted.reY[i] =
        this.equations.normalized.reY[i] * magnificationRatio;
      this.equations.adapted.imX[i] =
        this.equations.normalized.imX[i] * magnificationRatio;
      this.equations.adapted.imY[i] =
        this.equations.normalized.imY[i] * magnificationRatio;
      this.equations.adapted.reZ[i] = this.equations.normalized.reZ[i];
      this.equations.adapted.imZ[i] = this.equations.normalized.imZ[i];
    }

    // --- 追加 ---
    if (this.points && this.points.length > 0) {
      // adaptedに合わせて点群を再生成
      this.points = Point.thinOut(
        this.generatePoints(
          this.appropriateDegree ||
            this.getAppropriateDegree(this.thresholdOfCoefficient),
          this.thresholdOfCoefficient
        ),
        1
      );
    }
  }

  /**
   * isNormalized - DFTが正規化済みか否かを返す
   *
   * @return {Boolean} DFTが正規化済みなら true, そうでなければ false
   */
  isNormalized() {
    return this.equations.normalized.reX.length > 0;
  }

  /**
   * isAdapted - DFTが描画用の式を持っているか否かを返す
   *
   * @return {Boolean} DFTが描画用の式を持っていたなら true, そうでなければ false
   */
  isAdapted() {
    return this.equations.adapted.reX.length > 0;
  }

  /**
   * @static getDistance - 2つのDFTの式の距離を返す
   *
   * @param {{dft0: DFT, dft1: DFT, isReversed: Boolean}} param - isReveresed は反転したジェオブジェクトを探すか否か
   * @return {Number}
   */
  static getDistance({ dft0, dft1, isReversed }) {
    if (!dft0.isNormalized()) {
      console.error(
        "1st DFT param is not normalized; DFT params must be normalized in DFT.getDistance()."
      );
      return -1;
    }
    if (!dft1.isNormalized()) {
      console.error(
        "2nd DFT param is not normalized; DFT params must be normalized in DFT.getDistance()."
      );
      return -1;
    }

    let distance = 0;
    for (let i = 0; i < dft0.degree(); i += 1) {
      if (
        dft0.equations.normalized.reX[i] &&
        dft1.equations.normalized.reX[i]
      ) {
        let reX = dft1.equations.normalized.reX[i] || 0;
        let reY = dft1.equations.normalized.reY[i] || 0;
        let imX = dft1.equations.normalized.imX[i] || 0;
        let imY = dft1.equations.normalized.imY[i] || 0;
        if (isReversed && i > 0) {
          if (i % 2 === 1) {
            reX *= -1;
            reY *= -1;
          } else {
            imX *= -1;
            imY *= -1;
          }
        }
        distance +=
          ((dft0.equations.normalized.reX[i] - reX) ** 2 +
            (dft0.equations.normalized.imX[i] - imX) ** 2 +
            (dft0.equations.normalized.reY[i] - reY) ** 2 +
            (dft0.equations.normalized.imY[i] - imY) ** 2) /
          (i + 1);
      }
    }

    return distance / 1000;
  }
}

export default DFT;
