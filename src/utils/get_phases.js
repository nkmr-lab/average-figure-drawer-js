/**
 * getPhases - 区間[-π, π]をlength個に均等に分割して、配列として返す
 *
 * @param  {Number} length 配列の長さ
 * @return {Array}         [-π, π]をlength個に分割した配列
 */
export default function getPhases(length) {
  return new Array(length)
    .fill(0)
    .map((_v, i) => (2 * Math.PI * i) / (length - 1) - Math.PI);
  // TODO: なぜ phases: [-π, π) だとダメなのか明らかにする
  // return new Array(length).fill(0).map((v, i) => ((2 * Math.PI * i) / length) - Math.PI);
}
