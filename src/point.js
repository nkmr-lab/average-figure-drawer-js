import { sum } from "./utils/array_calc.js";
import linearInterpolatedArray from "./utils/linear_interpolated_array.js";

/**
 * @classdesc Point
 */
class Point {
  x;
  y;
  z;
  time;

  /**
   * constructor
   *
   * @param  {Number} x x座標
   * @param  {Number} y y座標
   * @return {Point}
   */
  constructor(x, y, { z, time } = {}) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.time = time || new Date().getTime();
  }

  /**
   * jsonize - pointをjson化可能なオブジェクトして返す
   *
   * @return {Object}
   */
  jsonize() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      time: this.time,
    };
  }

  /**
   * load -
   *
   * @param  {Number} x x座標
   * @param  {Number} y y座標
   * @param  {Number} z z座標
   * @param  {Number} time unixtime
   * @return {Point}
   */
  load({ x = this.x, y = this.y, z = this.z, time = this.time }) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.time = time || new Date().getTime();
    return this;
  }

  /**
   * set - 座標を設定する
   *
   * @param  {Number} x x座標
   * @param  {Number} y y座標
   * @return {null}
   */
  set(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * isEqualTo - Check if the coordinates of the two points are equal
   * just x and y
   *
   * @param  {Point} point 比較対象のPoint
   * @return {boolean}     双方の座標が等しければtrue/そうでなければfalse
   */
  isEqualTo(point) {
    return this.x === point.x && this.y === point.y;
  }

  /**
   * distance - 与えられた点との距離を返す
   *
   * @param  {Point} point 距離を測る対象の点
   * @return {Number}      2点間の距離
   */
  distance(point) {
    if (point === undefined) return 0;
    return Math.hypot(this.x - point.x, this.y - point.y);
  }

  /**
   * distanceToLine - start-endの2点を通る直線との距離を返す
   * @typedef {{Point, Point}} Line
   * @param  {Line} 2点を通る直線
   * @return {Number}               直線との距離
   */
  distanceToLine({ start, end }) {
    if (start.isEqualTo(end)) return this.distance(start);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const n = Math.abs(
      dy * this.x + end.x * start.y - (dx * this.y + end.y * start.x)
    );
    const d = Math.hypot(dx, dy);
    return n / d;
  }

  /**
   * dot - 2点の内積を返す
   * @param p1
   * @param p2
   * @returns {number} 内積の値
   */
  static dot(p1, p2) {
    return p1.x * p2.x + p1.y * p2.y;
  }

  /**
   * @static flatten - pointの配列を[x0,y0,x1,...]の形に変形する
   *
   * @param  {Point[]} points Pointの配列
   * @return {Array}         1次元のpointの配列([x0,y0,x1,y1...])
   */
  static flatten(points) {
    return points
      .map((point) => [point.x, point.y])
      .reduce((a, b) => a.concat(b), []);
  }

  /**
   * getRadians - point1を中心とした3点から角度を求める
   * @param point0
   * @param point1
   * @param point2
   * @returns {number} 角度
   */
  static getRadians(point0, point1, point2) {
    const vec0 = new Point(point1.x - point0.x, point1.y - point0.y);
    const vec1 = new Point(point2.x - point1.x, point2.y - point1.y);
    return Math.acos(Point.getCosineValue(vec0, vec1));
  }

  /**
   * @static getCosineValue - 2つのベクトルのなす角のコサインの値を返す
   *
   * @param  {Point} vec0
   * @param  {Point} vec1
   * @return {Number}      vec0, vec1のなす角のコサインの値
   */
  static getCosineValue(vec0, vec1) {
    return (
      (vec0.x * vec1.x + vec0.y * vec1.y) /
      (Math.hypot(vec0.x, vec0.y) * Math.hypot(vec1.x, vec1.y))
    );
  }

  /**
   * @static distance - 点列の点間距離の和を返す
   *
   * @param  {Point[]} points 点列
   * @return {Numebr}         点列の点間距離の和
   */
  static distance(points) {
    return points
      .map((p, i, ps) => p.distance(ps[i + 1]))
      .reduce((a, b) => a + b, 0);
  }

  /**
   * @static smoothen - 点列を滑らかにする
   * 具体的には、与えられた点列を走査して、連続する3点(ps)のなす角が
   * [3/4π, 5/4π]の間に収まらない場合、ps[0], ps[2]の2点を使って平滑化する
   * 平滑化された点を返す
   *
   * @param  {Point[]} points Pointの配列
   * @return {Point[]}        Pointの配列
   */
  static smoothen(points) {
    if (points.length <= 2) return points;
    const smoothPoints = [points[0]];
    let x;
    let y;
    let z;
    const gravities = [1, 1, 1];

    const isAlmostStraight = (ps) => {
      const vec0 = new Point(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const vec1 = new Point(ps[2].x - ps[1].x, ps[2].y - ps[1].y);
      const cosValue = Point.getCosineValue(vec0, vec1);
      const threshold = -1 / Math.sqrt(2);
      return threshold > cosValue;
    };

    const gravitySum = sum(gravities);
    let tmpPoints;
    for (let i = 1; i < points.length - 1; i += 1) {
      tmpPoints = points.slice(i - 1, i + 2);
      if (isAlmostStraight(tmpPoints)) {
        z = sum(tmpPoints, (p, index) => p.z * gravities[index]) / gravitySum;
        smoothPoints.push(
          new Point(tmpPoints[1].x, tmpPoints[1].y, {
            z,
            time: tmpPoints[1].time,
          })
        );
      } else {
        x = sum(tmpPoints, (p, index) => p.x * gravities[index]) / gravitySum;
        y = sum(tmpPoints, (p, index) => p.y * gravities[index]) / gravitySum;
        z = sum(tmpPoints, (p, index) => p.z * gravities[index]) / gravitySum;
        smoothPoints.push(new Point(x, y, { z, time: tmpPoints[1].time }));
      }
    }

    const lastPoint = points[points.length - 1];
    const zz = 2 * points[points.length - 2].z - points[points.length - 3].z;
    z = zz > 0 ? zz : points[points.length - 2].z;
    smoothPoints.push(
      new Point(lastPoint.x, lastPoint.y, { z, time: lastPoint.time })
    );
    return smoothPoints;
  }

  /**
   * @static raise - xの座標列と, yの座標列から点列を作って返す
   * @typedef {{Array, Array}} XsYs
   * @param  {XsYs} xsys xの座標列とy座標列
   * @return {Array<Point>} Pointの配列
   */
  static raise({ xs, ys, zs = [], times = [] }) {
    return xs.map((x, i) => new Point(x, ys[i], { z: zs[i], time: times[i] }));
  }

  /**
   * linearInterpolate - 2つのPoint間を、magnification個に線形補間した点列を返す
   *
   * @param  {Point} point          最後の点
   * @param  {Number} magnification 最終的に返す点の個数
   * @return {Array<Point>}         線形補間された点列
   */
  linearInterpolate(point, magnification) {
    if (!point) return undefined;
    const xs = linearInterpolatedArray({
      start: this.x,
      end: point.x,
      length: magnification,
    });
    const ys = linearInterpolatedArray({
      start: this.y,
      end: point.y,
      length: magnification,
    });
    const zs = linearInterpolatedArray({
      start: this.z,
      end: point.z,
      length: magnification,
    });
    return Point.raise({
      xs,
      ys,
      zs,
    });
  }

  /**
   * @static linearInterpolate - 各Point間を、(magnification - 1)個に線形補間した点列を返す
   * 1. 最終的に返す配列をA, points = [p0, p1, p2, p3, ..., pn]としてpointsの各点について、
   * 1.1. pk〜pk+1を線形補間した配列aを作成する
   * 1.2. pk+1をaから取り除く（ただし、k+1 = nのとき、つまり k = n-1 のときを除く）
   * 1.3. 最終的に返す配列Aにaを追加する
   * 2. Aを返す
   *
   * @param  {Array<Point>} points  点列
   * @param  {Number} magnification 点間の補間の倍率
   * @return {Array<Point>}         線形補間された点列
   */
  static linearInterpolate(points, magnification) {
    if (points.length === 1) return points;
    let interpolatedPoints = [];
    points.forEach((_p, i) => {
      if (i !== points.length - 1) {
        const ps = points[i].linearInterpolate(points[i + 1], magnification);
        if (i !== points.length - 2) ps.pop();
        interpolatedPoints = interpolatedPoints.concat(ps);
      }
    });
    return interpolatedPoints;
  }

  /**
   * @static thinOut - Pointの配列内の連続する点のうち、閾値よりも近い場所にある点を取り除いた点列を返す
   *
   * @param  {Array<Point>} points          Pointの配列
   * @param  {Number} threshold = 0.3 距離の閾値
   * @return {Array<Point>}                 点が取り除かれたPointの配列
   */
  static thinOut(points, threshold = 0.3) {
    if (points.length === 0) {
      return [];
    }
    const thinnedPoints = [points[0]];
    let skipFrom = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (points[skipFrom].distance(points[i]) >= threshold) {
        skipFrom = i;
        thinnedPoints.push(points[i]);
      }
    }
    const lastPoint = points[points.length - 1];
    if (!thinnedPoints[thinnedPoints.length - 1].isEqualTo(lastPoint))
      thinnedPoints.push(lastPoint);
    return thinnedPoints;
  }

  /**
   * @static average - 2つのPointを平均したPointを返す
   *
   * @param  {Point} point0 1つめのPoint
   * @param  {Point} point1 2つめのPoint
   * @return {Point}        2つのPointを平均したPoint
   */
  static average(point0, point1) {
    return new Point((point0.x + point1.x) / 2, (point0.y + point1.y) / 2, {
      z: (point0.z + point1.z) / 2,
    });
  }
}

export default Point;
