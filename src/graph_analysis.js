import arrayLog from "./utils/array_log.js";

class GraphAnalysis {
  shortestDistance;
  shortestFirstPath;
  shortestTargetPath;
  orderToReorder;

  /**
   * constructor
   *
   * @return {GraphAnalysis}
   */
  constructor() {
    this.shortestDistance = -1;
    this.shortestFirstPath = [];
    this.shortestTargetPath = [];
    this.orderToReorder = []; // 2重配列
  }

  /**
   * showResults - 結果を一覧表示
   *
   * @return {null}
   */
  showResults() {
    console.log("shortest path pairs");
    arrayLog(this.shortestFirstPath);
    arrayLog(this.shortestTargetPath);
  }

  /**
   * showTables - 2次元配列を以下のようにコンソール出力する
   * a0 a1 a2
   * b0 b1 b2
   * @static
   * @param  {Array} distances    2次元配列
   * @param  {Array} distanceRevs 2次元配列
   * @return {null}
   */
  static showTables(distances, distanceRevs) {
    if (distances.length === 0) return;
    console.log("distances");
    for (let i = 0; i < distances.length; i += 1) {
      arrayLog(distances[i]);
    }
    if (distanceRevs.length === 0) return;
    console.log("distanceRevs");
    for (let i = 0; i < distanceRevs.length; i += 1) {
      arrayLog(distanceRevs[i]);
    }
  }

  /**
   * isNeededToReorder - strokeの並べ替えが必要かを判定する
   *
   * @return {Boolean}
   */
  isNeededToReorder() {
    return this.shortestFirstPath.some(
      (path, i) => path !== this.shortestTargetPath[i]
    );
  }

  /**
   * replaceRowCol - 2つのstroke間距離の表（2次元配列）の距離が最小となる組み合わせを探す
   *
   * @param  {Array[]} distances
   * @param  {Array[]} distanceRevs
   * @return {null}
   */
  replaceRowCol(distances, distanceRevs) {
    const getDistance = (r, c) => {
      if (r <= 0) return 0;
      if (c > 0) return distances[r - 1][c - 1];
      return distanceRevs[r - 1][-c - 1];
    };

    const tryReplace = (i, j, r0, c0, r1, c1) => {
      const original =
        getDistance(this.shortestFirstPath[i], this.shortestTargetPath[i]) +
        getDistance(this.shortestFirstPath[j], this.shortestTargetPath[j]);
      const swapped = getDistance(r0, c0) + getDistance(r1, c1);

      if (swapped < original) {
        this.shortestFirstPath[i] = r0;
        this.shortestTargetPath[i] = c0;
        this.shortestFirstPath[j] = r1;
        this.shortestTargetPath[j] = c1;
        // console.log(`Replaced (${i},${j})`);
      }
    };

    for (let i = 0; i < distances.length; i++) {
      for (let j = i + 1; j < distances.length; j++) {
        const r1 = this.shortestFirstPath[i];
        const c1 = this.shortestTargetPath[i];
        const r2 = this.shortestFirstPath[j];
        const c2 = this.shortestTargetPath[j];

        tryReplace(i, j, r1, c2, r2, c1); // swap cols
        tryReplace(i, j, r1, -c2, r2, c1); // reversed second
        tryReplace(i, j, r1, c2, r2, -c1); // reversed first
        tryReplace(i, j, r1, -c2, r2, -c1); // both reversed
      }
    }
  }

  /**
   * findShortestPathStart - グラフ理論に基づく最小経路探索のスタート部分
   * 各行の最小値を発見し，その度にその最小値に該当する行と段に-1をセット
   * すべての行と段が-1になったら終了
   * 局所解に陥ってしまうことがあるので，すべての行について1位を発見し，そこからスタート
   * なお，これでも局所解に陥ることはある
   * あと，最も出現頻度が高いであろう全部の順序があっているものは初期値としてセット
   *
   * @param  {Array[]} distances
   * @param  {Array[]} distanceRevs
   * @return {null}
   */
  findShortestPathStart(distances, distanceRevs) {
    this.shortestDistance = Infinity;
    this.shortestFirstPath = [];
    this.shortestTargetPath = [];

    const n = distances.length;

    // 各行の最小値セルを起点に探索
    for (let i = 0; i < n; i++) {
      let bestJ = 0;
      let bestVal = Infinity;
      let reversed = false;

      for (let j = 0; j < n; j++) {
        const d = distances[i][j];
        const dr = distanceRevs[i][j];
        if (d > 0 && d < bestVal) {
          bestVal = d;
          bestJ = j;
          reversed = false;
        }
        if (dr > 0 && dr < bestVal) {
          bestVal = dr;
          bestJ = j;
          reversed = true;
        }
      }

      const firstPath = [i + 1];
      const targetPath = [reversed ? -(bestJ + 1) : bestJ + 1];

      const dCopy = distances.map((a) => a.slice());
      const rCopy = distanceRevs.map((a) => a.slice());
      for (let k = 0; k < n; k++) {
        dCopy[i][k] = -1;
        dCopy[k][bestJ] = -1;
        rCopy[i][k] = -1;
        rCopy[k][bestJ] = -1;
      }

      this.findShortestPath(dCopy, rCopy, firstPath, targetPath, bestVal);
    }

    if (!isFinite(this.shortestDistance)) {
      console.warn("No valid path found");
    } else {
      console.log(`→ Best path distance: ${this.shortestDistance.toFixed(4)}`);
    }
  }

  /**
   * findShortestPath - 最短経路探索のアルゴリズム
   * (1) 行段の中で-1を除く最小値を発見する
   * (2) 最小値に該当する行と段を-1で埋め，最小値を距離に足す（この行と段をパスに入れていく）
   * (3) すべてが-1になるまで(1)に戻る．すべてが-1になると距離を返す
   * @private
   *
   * @param  {Array[]} distances
   * @param  {Array[]} distanceRevs
   * @param  {Array} firstPath
   * @param  {Array} targetPath
   * @param  {Number} totalDistance
   * @return {null}
   */
  findShortestPath(
    distances,
    distanceRevs,
    firstPath,
    targetPath,
    totalDistance
  ) {
    const n = distances.length;
    let minVal = Infinity;
    let minI = -1;
    let minJ = -1;
    let reversed = false;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const d = distances[i][j];
        const dr = distanceRevs[i][j];
        if (d > 0 && d < minVal) {
          minVal = d;
          minI = i;
          minJ = j;
          reversed = false;
        }
        if (dr > 0 && dr < minVal) {
          minVal = dr;
          minI = i;
          minJ = j;
          reversed = true;
        }
      }
    }

    if (!isFinite(minVal) || minVal === Infinity) {
      // 探索完了 → 最短距離更新
      if (totalDistance < this.shortestDistance) {
        this.shortestDistance = totalDistance;
        this.shortestFirstPath = [...firstPath];
        this.shortestTargetPath = [...targetPath];
      }
      return;
    }

    const nextFirst = [...firstPath, minI + 1];
    const nextTarget = [...targetPath, reversed ? -(minJ + 1) : minJ + 1];
    const nextDist = totalDistance + minVal;

    const dCopy = distances.map((a) => a.slice());
    const rCopy = distanceRevs.map((a) => a.slice());
    for (let k = 0; k < n; k++) {
      dCopy[minI][k] = -1;
      dCopy[k][minJ] = -1;
      rCopy[minI][k] = -1;
      rCopy[k][minJ] = -1;
    }

    this.findShortestPath(dCopy, rCopy, nextFirst, nextTarget, nextDist);
  }
}

export default GraphAnalysis;
