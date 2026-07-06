/**
 * @typedef {Object} Equation - DFTの方程式の係数
 * @property {Number[]} real - 方程式の実部
 * @property {Number[]} imag - 方程式の虚部
 * @property {Number} a - DFTの拡張部。入力が2つの場合はここに傾きが入る。
 */

/**
 * discreteFourierTransform - 1変数の離散フーリエ変換
 *
 * @param  {Number[]} values equally-spaced samples
 * @param  {Number} degree   degree of the equation
 * @return {Equation}        coefficients of complex-valued funtion of frequency
 */
function discreteFourierTransform(values, degree) {
  const equation = {
    real: new Array(degree).fill(0),
    imag: new Array(degree).fill(0),
    a: 0,
  };

  if (values.length <= 2) {
    if (values.length === 1) {
      equation.real = [values[0] * 2];
    } else if (values.length === 2) {
      equation.real = [values[0] * 2];
      equation.a = (values[1] - values[0]) / -Math.PI;
    }
    return equation;
  }

  const size = values.length;
  const halfSize = size / 2.0;

  for (let d = 0; d <= degree; d += 1) {
    for (let i = 0; i < size; i += 1) {
      // t: [-PI~PI)の媒介変数
      // t = (2.0 * Math.PI / size ) * i - Math.PI;
      const t = Math.PI * (i / halfSize - 1);
      const cos = Math.cos(d * t);
      const sin = -Math.sin(d * t);
      equation.real[d] += values[i] * cos;
      equation.imag[d] += values[i] * sin;
    }
    equation.real[d] /= halfSize;
    equation.imag[d] /= -halfSize;
  }

  return equation;
}

/**
 * inverseDiscreteFourierTransform - description
 *
 * @param  {Equation} equation  coefficients of complex-valued funtion of frequency
 * @param  {Number}   length    array length of reuslt
 * @param  {Number}   maxDegree max degree of equation when you use coefficients value
 * @param  {Number}   threshold minimum value of coefficients when you calclurate
 * @return {Number[]}           original values compressed by DFT equation
 */
function inverseDiscreteFourierTransform({
  equation,
  length,
  maxDegree,
  threshold,
}) {
  return new Array(length).fill(equation.real[0] / 2).map((v, i) => {
    let result = v + equation.a;
    // t: 0 -> -PI
    const t = length > 0 ? -(2.0 * Math.PI * i) / (length * 2) : -Math.PI;
    for (let d = 1; d <= maxDegree; d += 1) {
      if (Math.abs(equation.real[d]) > threshold)
        result += equation.real[d] * Math.cos(d * t);
      if (Math.abs(equation.imag[d]) > threshold)
        result += equation.imag[d] * Math.sin(d * t);
    }
    return result;
  });
}

export { discreteFourierTransform, inverseDiscreteFourierTransform };
