import Point from "../point.js";

/**
 * isPointInCurveOrOnEdge - points[index]のPointが前後の点となす角を調べ、曲線にあるか否かBooleanで返す
 * 現状、cosineの値を閾値として使っている
 * - -√2/2以上(in radians: 0 ~ 3/4 * PI || 5/4 * PI ~ 2*PI)ならtrue
 * - それ以外はfalse
 * TODO: 閾値を設定可能にする
 * TODO: 引数をObjectにする
 *
 * @param  {Array<Point>}   points 線を構成する点列
 * @param  {Array<Number>}  index  特徴点のindex
 * @return {Array<Boolean>}        指定した特徴点が、線の端点もしくはカーブの中にあるか
 */
function isPointInCurveOrOnEdge(points, index) {
  if (index === 0 || index === points.length - 1) return true; // 端点は true
  if (index - 2 < 0 || index + 2 >= points.length) return false; // 端点の隣の2点は false

  for (let i = 0; i < 2; i += 1) {
    const vec0 = new Point(
      points[index + i].x - points[index].x,
      points[index + i].y - points[index].y
    );
    const vec1 = new Point(
      points[index].x - points[index - i].x,
      points[index].y - points[index - i].y
    );
    const cos = Point.getCosineValue(vec0, vec1);
    // TODO: check boundary value
    if (-(Math.sqrt(2) / 2) <= cos) return true;
  }

  return false;
}

/**
 * isCorrectIndex - ある特徴点のindexについて、その前の特徴点のindexとの関係を調査し、採用するか否かを返す
 * context:
 * rdpで与えられる点列のindex列は、index同士が近すぎる場合が多い
 * index間の距離が小さすぎる場合（間に1-2点しかない場合）、スプライン補間が機能しない
 * よって、index間の距離に応じて、頂点を間引くことが、この関数の目的
 *
 * @param  {Number} index        特徴点の入力点内のindex
 * @param  {Array} indexes       特徴点の入力点内のindex列
 * @param  {Boolean} isFirstOrLast index が 0 か basePoints.length - 1 に等しいかどうか
 * @return {Boolean}               このindexを採用する場合は true。それ以外は false
 * @todo 5を変数にする
 */
function isCorrectIndex(index, indexes, isFirstOrLast) {
  return isFirstOrLast || index - indexes[indexes.length - 1] > 5;
}

/**
 * isLastIndexCorrect - 最後の点かどうかを返す
 *
 * @param  {Array} indexes    特徴点の入力点内のindex列
 * @param  {Number} lastIndex 最後のindex
 * @return {Boolean}          最後の点ならtrue。それ以外はfalse
 */
function isLastIndexCorrect(indexes, lastIndex) {
  return indexes[indexes.length - 1] === lastIndex;
}

/**
 * extractVertexesAndIndexes - 特徴点らしき点列を幾何的に検査し、より特徴点らしい点列を抽出、そのindexと共に返す
 *
 * @param  {Array<Point>} vertexishes 入力点の中の特徴点らしき点列
 * @param  {Array<Point>} basePoints  元の入力点
 * @typedef {{Array<Point>, Array<Number>}} VertexesAndIndexes
 * @return {VertexesAndIndexes}
 */
function extractVertexesAndIndexes(vertexishes, basePoints) {
  const vertexes = [];
  const indexes = [];

  vertexishes.forEach((vertexish, i) => {
    const idx = basePoints.indexOf(vertexish);
    const index = idx >= 0 ? idx : 0; // 点がなければ最初の点を追加
    const isFirstOrLast = i === 0 || i === basePoints.length - 1;
    if (
      isCorrectIndex(index, indexes, isFirstOrLast) &&
      isPointInCurveOrOnEdge(basePoints, index)
    ) {
      vertexes.push(vertexish);
      indexes.push(index);
    }
  });
  return { vtxs: vertexes, idxs: indexes };
}

/**
 * correctVertexesAndIndexes - 最初の点と最後の点について確認し、問題があれば変更する
 *
 * @param  {Array<Point>} vertexes   入力点の中の特徴点の点列
 * @param  {Array} indexes           特徴点のbasePoints内のindex列
 * @param  {Array<Point>} basePoints 元の入力点列
 * @typedef {{Array<Point>, Array<Number>}} VertexesAndIndexes
 * @return {VertexesAndIndexes}

 */
function correctVertexesAndIndexes(vertexes, indexes, basePoints) {
  // correct first vertex
  if (indexes[0] !== 0) {
    vertexes.unshift(basePoints[0]);
    indexes.unshift(0);
  }

  // correct last vertex
  const basePointsLastIndex = basePoints.length - 1;
  if (!isLastIndexCorrect(indexes, basePointsLastIndex)) {
    vertexes.push(basePoints[basePointsLastIndex]);
    indexes.push(basePointsLastIndex);
  }

  // adjust vertex in last - 1
  const lastIndex = indexes.length - 1;
  if (
    indexes[lastIndex] - indexes[lastIndex - 1] < 3 &&
    indexes[lastIndex - 1] !== 0
  ) {
    indexes[lastIndex - 1] -= 1;
    vertexes[lastIndex - 1] = basePoints[indexes[lastIndex - 1]];
  }

  return { vertexes, indexes };
}

/**
 * getVertexes - 特徴点と思しき点列（vertexishes）について、点列の前後の点となす角を計算し、直線に近いものを省いて返す
 * その際、特徴点と認めらた点列自体と共に、特徴点を含む点列全体(basePoints)の中のindexも返す
 *
 * @param  {Array<Point>} vertexishes 特徴点と思しき点列
 * @param  {Array<Point>} basePoints  線を構成する点列全体（特徴点を含む）
 * @typedef {{Array<Point>, Array<Number>}} VertexesAndIndexes
 * @return {VertexesAndIndexes}
 */
export default function getVertexes(vertexishes, basePoints) {
  const { vtxs, idxs } = extractVertexesAndIndexes(vertexishes, basePoints);
  const { vertexes, indexes } = correctVertexesAndIndexes(
    vtxs,
    idxs,
    basePoints
  );
  return { vertexes, indexes };
}
