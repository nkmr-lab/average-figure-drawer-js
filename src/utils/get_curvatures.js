import Point from "../point.js";

/**
 * getCurvatures - 点列からなる線の曲率を返す。
 * indexesで特徴点（端点およびカーブの先端の点）のインデックスを与える。
 * (線の曲率) = (実際の線の長さ) / (特徴点同士を結んだ直線の長さの和)
 *
 * @param  {Array<Point>} basePoints 線の点列
 * @param  {Array}        indexes    特徴点のインデックス
 * @return {Array}                   点列からなる線の曲率
 */

function getCurvatures(basePoints, indexes) {
  const basePointsArray = indexes.reduce((result, idx, i, idxs) => {
    result.push(basePoints.slice(idx, idxs[i + 1] + 1));
    return result;
  }, []);
  basePointsArray.pop();
  const curvatures = basePointsArray.map(
    (points) =>
      Point.distance(points) / points[0].distance(points[points.length - 1])
  );
  return curvatures;
}

/**
 * isCurve - 曲率でカーブか否かを返す
 *
 * @param  {Number} curvature 曲率
 * @return {Boolean}          カーブならtrue、それ以外はfalse
 * @todo 閾値を動的に変えられるようにする
 */
function isCurve(curvature) {
  return curvature > 1.01;
}

export { getCurvatures, isCurve };
