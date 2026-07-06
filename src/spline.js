import Point from "./point.js";
import rdp from "./rdp.js";
import getVertexes from "./utils/get_vertexes.js";
import { getCurvatures, isCurve } from "./utils/get_curvatures.js";
import cubicSpline from "./utils/cubic-spline.js";

/**
 * @classdesc Splineクラス. pointsを持つ
 */
class Spline {
  stime;
  points;
  magnification;
  doubleBackMargin;
  vertexes;

  /**
   * constructor - description
   *
   * @param  {String} stime stime
   * @return {Spline}
   */
  constructor(stime) {
    /**
     * 作成時間
     */
    this.stime = stime;
    /**
     * spline補完された点列
     */
    this.points = [];

    /**
     * spline補完時の倍率
     */
    this.magnification = 100;

    /**
     * doubleback時の両端のマージン
     */
    this.doubleBackMargin = 16;

    /**
     * デバッグ用。手書きの線の頂点。
     */
    this.vertexes = [];
  }

  /**
   * load - Objectを受け取って、splineに値を適用
   *
   * @param {{magnification: Number, doubleBackMargin: Number}} params - splineを復元するのに必要な値
   * @return {Spline}
   */
  load({
    magnification = this.magnification,
    doubleBackMargin = this.doubleBackMargin,
  } = {}) {
    this.magnification = magnification;
    this.doubleBackMargin = doubleBackMargin;
    return this;
  }

  /**
   * jsonize - figureを復元するのに必要な情報を返す
   *
   * @return {Object}
   */
  jsonize() {
    return {
      magnification: this.magnification,
      doubleBackMargin: this.doubleBackMargin,
    };
  }

  /**
   * draw - Splineの描画
   *
   * @param  {Drawer} drawer 描画対象のDrawer instance
   * @return {null}
   */
  draw(drawer) {
    // log('spline path');
    drawer.addPolyline(
      this.points.splice(0, Math.ceil(this.points.length / 2)),
      null,
      null,
      "spline"
    );
  }

  /**
   * drawVertexes - 特徴点（this.vertexes）を描画する
   *
   * @param  {Drawer} drawer 描画対象のDrawer instance
   * @return {null}
   */
  drawVertexes(drawer) {
    // log('spline path and vertexes');
    drawer.addPoints(this.vertexes, "rgba(0, 255, 0, 0.8)", 4, "spline");
  }

  /**
   * interpolate - basePointsを元にSpline補完する
   *
   * @param  {Point[]} basePoints Pointの配列
   * @return {null}
   */
  interpolate(basePoints) {
    if (basePoints.length === 1) {
      this.points.push(basePoints[0]);
      return;
    }
    if (basePoints.length === 2) {
      this.points.push(basePoints[0]);
      this.points.push(basePoints[1]);
      return;
    }

    this.points = [];
    const vertexishes = rdp(basePoints, 1);
    const { vertexes, indexes } = getVertexes(vertexishes, basePoints);
    this.vertexes = vertexes;
    const curvatures = getCurvatures(basePoints, indexes);
    const sections = indexes.map((idx, i, idxs) =>
      basePoints.slice(idx, idxs[i + 1] + 1)
    );
    sections.pop();
    const interpolatedPoints = [].concat(
      ...sections.map((section, i) =>
        isCurve(curvatures[i])
          ? this.getSplinePoints(section)
          : Point.linearInterpolate(section, this.magnification)
      )
    );
    //this.points = Spline.doubleBackCircle(
    //  Point.thinOut(interpolatedPoints, 0.3),
    //  this.doubleBackMargin
    //);
    this.points = Spline.doubleBack(Point.thinOut(interpolatedPoints, 0.3));
  }

  // PRIVATE METHODS

  /**
   * getSplinePoints - 与えられた点を元にSpline補間する
   * @private
   *
   * @param  {Point[]} points       ベースになるPointの配列
   * @return {Point[]}              補間されたPointの配列
   */
  getSplinePoints(points) {
    const xs = cubicSpline(
      points.map((p) => p.x),
      this.magnification
    );
    const ys = cubicSpline(
      points.map((p) => p.y),
      this.magnification
    );
    const zs = cubicSpline(
      points.map((p) => p.z),
      this.magnification
    );
    return Point.raise({ xs, ys, zs });
  }

  /**
   * @static Spline.doubleBack - もとのspline曲線のpointsに対して0->n->n->0となるように点を追加する
   *
   * @param  {Point[]} points Pointの配列
   * @return {Point[]}        Pointの配列
   */
  static doubleBack(points) {
    const doubleBackPoints = points;
    const halfLength = points.length;
    for (let i = 0; i < halfLength; i += 1) {
      // 0 < t <= PI
      // 行って返ってくるように配置するので、反対側から書く
      doubleBackPoints[2 * halfLength - 1 - i] = points[i];
    }
    return doubleBackPoints;
  }

  /**
   * @static Spline.doubleBackLineSymmetry - もとのspline曲線の端点を結ぶ直線に対して、もとのspline曲線と線対称な点を追加する
   *
   * @param  {Point[]} points Pointの配列
   * @return {Point[]}        Pointの配列
   */
  static doubleBackLineSymmetry(points) {
    const doubleBackPoints = points;
    const halfLength = points.length;
    const p0 = points[0].x;
    const q0 = points[0].y;
    const p1 = points[halfLength - 1].x;
    const q1 = points[halfLength - 1].y;

    const m = (q0 - q1) / (p0 - p1);
    const n = q0 - m * p0;
    for (let i = 0; i < halfLength; i += 1) {
      const a = points[i].x;
      const b = points[i].y;
      const X = (2 * b * m - a * m * m - 2 * n * m + a) / (m * m + 1);
      const Y = (a - X) / m + b;
      doubleBackPoints[halfLength * 2 - 1 - i] = new Point(X, Y);
    }

    return doubleBackPoints;
  }

  /**
   * @static Spline.doubleBackCircle - もとのspline曲線の端点からもう一方の端点まで、半円を描くようにもとのspline曲線と同じ数だけ点を追加する
   * ただし、補完の最初からN点と最後のN点は、それぞれspline曲線の最初の2点と最後の2点をむすぶベクトル上に点を置く。
   * Nは2の累乗の形にする
   * 点が2*N個以下の場合には、Nを1/2にしていく
   *
   * @param  {Point[]} points Pointの配列
   * @param  {Number} doubleBackMargin
   * @return {Point[]}        Pointの配列
   */
  static doubleBackCircle(points, doubleBackMargin) {
    const half = points.length;
    const margin = (length, defaultMargin) => {
      if (length >= defaultMargin * 2) return defaultMargin;
      return margin(length, defaultMargin / 2);
    };
    const N = margin(half, doubleBackMargin);
    const P0s = [];
    const Pls = [];
    for (let i = 1; i < N + 1; i += 1) {
      P0s.push(
        new Point(
          points[0].x + i * (points[0].x - points[1].x),
          points[0].y + i * (points[0].y - points[1].y)
        )
      );
      Pls.push(
        new Point(
          points[half - 1].x + i * (points[half - 1].x - points[half - 2].x),
          points[half - 1].y + i * (points[half - 1].y - points[half - 2].y)
        )
      );
    }
    P0s.reverse();
    const Q0 = P0s[0];
    const Ql = Pls[N - 1];
    const center = new Point((Q0.x + Ql.x) / 2, (Q0.y + Ql.y) / 2);
    const radius = Math.hypot(Ql.x - Q0.x, Ql.y - Q0.y) / 2;
    const radian = Math.atan2(Ql.y - Q0.y, Ql.x - Q0.x) + Math.PI * 2;

    const doubleBackPoints = points.concat(Pls);
    const len = half - 2 * N;
    for (let i = 0; i < len; i += 1) {
      const denominator = len > 1 ? len - 1 : 1;
      const theta = radian + i * (Math.PI / denominator);

      const X = center.x + radius * Math.cos(theta);
      const Y = center.y + radius * Math.sin(theta);
      const z = 0.5;
      doubleBackPoints.push(new Point(X, Y, { z }));
    }
    return doubleBackPoints.concat(P0s);
  }

  /**
   * @static doubleBackPointSymmetry - ※未実装。
   * もとのspline曲線の端点を結ぶ直線に対して、もとのspline曲線と線対称な点を追加する
   * @ignore
   *
   * @param  {Point[]} points Pointの配列
   * @return {Point[]}        Pointの配列
   */
  static doubleBackPointSymmetry(points) {
    // console.log('Spline.doubleBackPointSymmetry is not implemented yet.');
    return points;
    // const doubleBackPoints = points;
    // const halfLength = points.length;
    // const p0 = points[0].x;
    // const q0 = points[0].y;
    // const p1 = points[1].x;
    // const q1 = points[1].y;
    // const p2 = points[halfLength - 2].x;
    // const q2 = points[halfLength - 2].y;
    // const p3 = points[halfLength - 1].x;
    // const q3 = points[halfLength - 1].y;
  }
}

export default Spline;
