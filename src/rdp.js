/**
 * rdp - Ramer-Douglas-Peucker algorithm
 * The Ramer-Douglas-Peucker algorithm roughly ported from the pseudo-code provided
 * by http://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
 *
 * this code is ported from the python code provided by
 * https://github.com/nkrode/RedisLive/blob/master/src/api/util/RDP.py
 *
 * @param  {Array<Point>} points  点列
 * @param  {Number} epsilon       点と直線間の距離の最大値（閾値）
 * @return {Array<Point>}         特徴点の点列
 * @todo 何回再帰的に掘っていくか変更できるようにする
 */
export default function rdp(points, epsilon) {
  let distanceMax = 0;
  let index = 0;
  let results = [];
  for (let i = 1; i <= points.length - 1; i += 1) {
    const d = points[i].distanceToLine({
      start: points[0],
      end: points[points.length - 1],
    });
    if (d > distanceMax) {
      index = i;
      distanceMax = d;
    }
  }
  if (distanceMax >= epsilon) {
    const firstHalfPoints = rdp(points.slice(0, index + 1), epsilon);
    firstHalfPoints.pop();
    const lastHalfPoints = rdp(points.slice(index), epsilon);
    results = firstHalfPoints.concat(lastHalfPoints);
  } else {
    results = [points[0], points[points.length - 1]];
  }
  return results;
}
