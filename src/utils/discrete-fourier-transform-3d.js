import {
  discreteFourierTransform,
  inverseDiscreteFourierTransform,
} from "./discrete-fourier-transform.js";
import Point from "../point.js";

/**
 * @typedef {Object} Equation - DFTの方程式の係数
 * @property {Number[]} reX - 方程式の実部
 * @property {Number[]} imX - 方程式の虚部
 * @property {Number[]} reY - 方程式の実部
 * @property {Number[]} imY - 方程式の虚部
 * @property {Number[]} reZ - 方程式の実部
 * @property {Number[]} imZ - 方程式の虚部
 * @property {Number} aX - DFTの拡張部。入力が2つの場合はここに傾きが入る。
 * @property {Number} aY - DFTの拡張部。入力が2つの場合はここに傾きが入る。
 * @property {Number} aZ - DFTの拡張部。入力が2つの場合はここに傾きが入る。
 */

/**
 * discreteFourierTransform3D - 3変数(x, y, z)の離散フーリエ変換
 *
 * @param  {Point[]} points equally-spaced samples
 * @param  {Number} degree  degree of the equation
 * @return {Equation}       coeffients of complex-valued funtion of frequency
 */
function discreteFourierTransform3D(points, degree) {
  const eqX = discreteFourierTransform(
    points.map((p) => p.x),
    degree
  );
  const eqY = discreteFourierTransform(
    points.map((p) => p.y),
    degree
  );
  const eqZ = discreteFourierTransform(
    points.map((p) => p.z),
    degree
  );
  return {
    reX: eqX.real,
    reY: eqY.real,
    reZ: eqZ.real,
    imX: eqX.imag,
    imY: eqY.imag,
    imZ: eqZ.imag,
    aX: eqX.a,
    aY: eqY.a,
    aZ: eqZ.a,
  };
}

/**
 * inverseDiscreteFourierTransform2D - 3変数(x, y, z)の逆離散フーリエ変換
 *
 * @param  {Equation} equation    coeffients of complex-valued funtion of frequency
 * @param  {Number} length        description
 * @param  {Number} maxDegree     description
 * @param  {Number} threshold     description
 * @return {Point[]}              description
 */
function inverseDiscreteFourierTransform3D({
  equation,
  length,
  maxDegree,
  threshold,
}) {
  const [xs, ys, zs] = [
    { real: equation.reX, imag: equation.imX, a: equation.aX },
    { real: equation.reY, imag: equation.imY, a: equation.aY },
    { real: equation.reZ, imag: equation.imZ, a: equation.aZ },
  ].map((eq) =>
    inverseDiscreteFourierTransform({
      equation: eq,
      length,
      maxDegree,
      threshold,
    })
  );

  return Point.raise({ xs, ys, zs });
}

export { discreteFourierTransform3D, inverseDiscreteFourierTransform3D };
