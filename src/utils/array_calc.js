/**
 * arrayの和を返す。
 * fnが定義されている場合は、arrayの各値にfnを適応した上で和を返す
 * @param {Array} array 足し合わせる要素の配列
 * @param {Function} fn 要素を足し合わせるまえに、array.map()で適応する関数
 * @return {Number}
 */
const sum = (array, fn) =>
  fn ? sum(array.map(fn)) : array.reduce((prev, current) => prev + current, 0);

/**
 * arrayの平均値を返す。
 * fnが定義されている場合は、arrayの各値にfnを適応した上での平均値を返す
 * @param {Array} array 平均値を求める要素の配列
 * @param {Function} fn 要素を足し合わせるまえに、array.map()で適応する関数
 * @return {Number}
 */
const average = (array, fn) => sum(array.map(fn)) / array.length;

/**
 * 割合(proportions)の和が1.0になるように値を変換して返す
 * lengthは望ましい配列の長さ
 * @param {Number[]} proportions それぞれの割合
 * @param {Number} length 返り値として望ましい配列の長さ
 * @return {Number[]}
 */
const normalizeProportions = (proportions, length) => {
  if (length === 0) return [];
  if (proportions.length < length) return new Array(length).fill(1.0 / length);
  if (proportions.filter((elm) => elm !== 0).length === 0)
    return new Array(length).fill(1.0 / length);

  const tmpPropotions =
    proportions.length > length ? proportions.slice(0, length) : proportions;

  let propotionSum = sum(tmpPropotions);

  // TODO: この処理は根拠に乏しいので変更する
  if (propotionSum === 0.0) {
    const plusSum = sum(tmpPropotions.filter((val) => val > 0));
    const minusSum = sum(tmpPropotions.filter((val) => val < 0));
    propotionSum = Math.abs(minusSum) > plusSum ? Math.abs(minusSum) : plusSum;
  }

  return propotionSum === 1.0
    ? tmpPropotions
    : tmpPropotions.map((propotion) => propotion / propotionSum);
};

export { sum, average, normalizeProportions };
