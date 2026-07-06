import getPhases from "./get_phases.js";

/**
 * getCoefficients - f(t) = valuesを満たす複数の3項方程式の係数を返す
 *
 * @param  {Array<Number>} arrayT        位相の値の配列
 * @param  {Array<Number>} values        補間する値の配列
 * @return {Array<Number>}               係数の配列
 */
function getCoefficients(arrayT, values) {
  // http://www.geo.titech.ac.jp/lab/ida/numexe/manual/numexetext5.pdf
  const n = arrayT.length;

  // 3項方程式の係数の表を作る
  const a = [];
  const b = [];
  const c = [];
  const d = [];

  for (let i = 1; i < n - 1; i += 1) {
    a[i] = arrayT[i] - arrayT[i - 1];
    b[i] = 2.0 * (arrayT[i + 1] - arrayT[i - 1]);
    c[i] = arrayT[i + 1] - arrayT[i];
    // d[i] = 6.0 * ((values[i+1] - values[i]) / (arrayT[i+1] - arrayT[i])
    //             - (values[i] - values[i-1]) / (arrayT[i] - arrayT[i-1]));
    d[i] =
      6.0 *
      ((values[i + 1] - values[i]) / c[i] - (values[i] - values[i - 1]) / a[i]);
  }

  // 3項方程式を解く(トーマス法)
  const g = new Array(n - 1);
  const s = new Array(n - 1);
  g[1] = b[1];
  s[1] = d[1];
  for (let i = 2; i < n - 1; i += 1) {
    g[i] = b[i] - (a[i] * c[i - 1]) / g[i - 1];
    s[i] = d[i] - (a[i] * s[i - 1]) / g[i - 1];
  }

  const z = new Array(n).fill(0);
  z[n - 2] = s[n - 2] / g[n - 2];
  for (let i = n - 3; i >= 1; i -= 1) {
    z[i] = (s[i] - c[i] * z[i + 1]) / g[i];
  }
  return z;
}

/**
 * calc - 係数の配列を元に、valuesを3次スプライン補間した値の配列を返す
 *
 * @param  {Number} t 位相
 * @param  {Array<Number>} ts 位相の値の配列
 * @param  {Array<Number>} values 補間の元となる値の配列
 * @param  {Array<Number>} coefficients 係数の配列
 * @return {Number}
 */
function calc(t, ts, values, coefficients) {
  // search target
  let k = -1;

  for (let i = 0; i < ts.length - 1; i += 1) {
    if (ts[i] <= t && t < ts[i + 1]) {
      k = i;
      break;
    }
  }

  if (k < 0) return -1;

  const dt = [ts[k + 1] - t, t - ts[k], ts[k + 1] - ts[k]];

  const a1 =
    (coefficients[k] * dt[0] ** 3 + coefficients[k + 1] * dt[1] ** 3) /
    (6.0 * dt[2]);
  const a2 = (values[k] / dt[2] - (coefficients[k] * dt[2]) / 6.0) * dt[0];
  const a3 =
    (values[k + 1] / dt[2] - (coefficients[k + 1] * dt[2]) / 6.0) * dt[1];

  return a1 + a2 + a3;
}

/**
 * cubicSpline - 位相の配列と値の配列を元に、3次スプライン補間した値を返す
 *
 * @param  {Array<Number>} values 補間する値の配列
 * @param  {Number} magnification 倍率
 * @return {Array<Number>}        補間された値の配列
 */
export default function cubicSpline(values, magnification) {
  const phases = getPhases(values.length);
  const coefficients = getCoefficients(phases, values);
  const length = values.length * magnification; // magnification倍細かく点をとる

  return new Array(length)
    .fill(0)
    .map(
      (_v, i) => (2 * Math.PI * i) / length - Math.PI // 媒介変数 t:[-π, π) で定義
    )
    .map((phase) => calc(phase, phases, values, coefficients));

  // TODO: なぜ getPhases(): t:[-π, π] だとダメなのか明らかにする
  // return getPhases(resultsLength).map(phase => (
  //   calc(phase, phases, values, coefficients)
  // ));
}
