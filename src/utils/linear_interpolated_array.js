/**
 * linearInterpolatedArray - startからendまでをlegnth個に線形補間して返す
 * @param  {Number} start   最初の数
 * @param  {Number} end     最後の数
 * @param  {Number} length  返す配列の個数
 * @return {Array}          線形補間された数列
 */
export default function linearInterpolatedArray({ start, end, length }) {
  const diff = (end - start) / (length - 1);
  return new Array(length).fill(start).map((v, i) => v + i * diff);
}
