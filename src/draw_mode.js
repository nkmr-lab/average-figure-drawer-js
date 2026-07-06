/**
 * 何を描画するかをコントロールするための定数
 * @typedef {Object} drawMode - 何を描画するかをコントロールするための定数
 * @property {Symbol} DFT - DFTを描画する
 * @property {Symbol} DFT_SPLINE - DFT,Splineを描画を描画する
 * @property {Symbol} DFT_SPLINE_POINT - DFT,Spline,オリジナルの入力点を描画する
 * @property {Symbol} DFT_SPLINE_POINT_ORIGINAL_PATH - DFT,Spline,オリジナルの入力点,オリジナルの入力パスを描画する
 * @property {Symbol} POINT - オリジナルの入力点を描画する
 * @property {Symbol} SPLINE - Splineを描画する
 * @property {Symbol} ORIGINAL_PATH - オリジナルの入力パスを描画する
 * @property {Symbol} DEBUG - デバッグ用。DFT, Spline, Splineの特徴点を描画する
 */

const drawMode = {
  DFT: Symbol("dft"),
  DFT_SPLINE: Symbol("dft_spline"),
  DFT_SPLINE_POINT: Symbol("dft_spline_point"),
  DFT_SPLINE_POINT_ORIGINAL_PATH: Symbol("dft_spline_point_original_path"),
  POINT: Symbol("point"),
  SPLINE: Symbol("spline"),
  ORIGINAL_PATH: Symbol("original_path"),
  DEBUG: Symbol("debug"),
};

export { drawMode as default };
