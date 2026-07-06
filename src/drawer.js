import { SVG } from "./svg-helper.js";

import log from "./utils/log.js";
import isFirefoxInMac from "./utils/browser_detection.js";
import mergeObjects from "./utils/merge-objects.js";
import getPathString from "./utils/get-path-string.js";
import DefaultConfig from "./default-config.js";
import drawMode from "./draw_mode.js";

import Point from "./point.js";
import Stroke from "./stroke.js";
import Figure from "./figure.js";

import MouseTracker from "./mouse_tracker.js";

class Drawer {
  svg;
  mouseTracker;
  isStroking;
  numOfStroke;
  onion;
  showOnion;
  figures;
  currentFigure;
  resultFigures;
  config;
  strokeColor;
  strokeWidth;

  /**
   * constructor
   *
   * @param  {String} id 対象DOMのid
   * @param {Object} config ユーザーコンフィグ
   * @return {Drawer}
   */
  constructor(selector, config = DefaultConfig) {
    const el =
      typeof selector === "string"
        ? document.querySelector(selector)
        : selector;

    this.svg = SVG(el);

    /**
     * mouseTracker - 描画時にマウストラッキングをするためのオブジェクト。
     */
    this.mouseTracker = new MouseTracker(el);

    /**
     * isStroking - 描画中はtrue/それ以外はfalse
     */
    this.isStroking = false;

    /**
     * numOfStroke - 現在のfigureで何ストローク書いたか
     */
    this.numOfStroke = 0;

    /**
     * onion - Onionとして描画されているSVG nodeの配列
     */
    this.onion = [];

    /**
     * showOnion - Onionを描画すべきか否か
     */
    this.showOnion = false;

    /**
     * figures - 平均化の元となるFigureの配列
     */
    this.figures = [];

    /**
     * currentFigure - 現在描かれているFigure
     */
    this.currentFigure = new Figure();

    /**
     * resultFigures - 平均化されたFigure
     */
    this.resultFigures = [];
    this.config = null;
    this.setConfig(config);

    /**
     * strokeColor - DFT描画時の線の色
     */
    this.strokeColor = this.config.colors.dft;

    /**
     * strokeWidth - DFT描画時の線幅
     */
    this.strokeWidth = this.config.strokeWidth.dft;

    this.setBackground();
    this.setupEventListeners();
    this.disableTouchGestures();
  }

  static get defaultConfig() {
    return DefaultConfig;
  }

  /**
   * addPoint - このdrawerのSVG領域に円を描画する
   * @private
   *
   * @param  {Point} point     描画する点
   * @param  {String} color    描線の色
   * @param  {Number} raidus   円の直径
   * @param  {String} _target   描画オブジェクトの種類(DFT/Spline/Onionなど)
   * @param  {Boolean} isOnion オニオンか否か
   * @return {circle}          circleオブジェクト
   */
  addPoint(point, color, raidus, _target, isOnion = false) {
    return this.svg.circle(raidus).move(point.x, point.y).attr({
      fill: color,
      stroke: color,
      "is-onion": isOnion,
      "pointer-events": "none",
    });
  }

  /**
   * addPoints - このdrawerのSVG領域に複数の正方形円を描画する
   * @private
   *
   * @param  {Point[]} points 描画する点列
   * @param  {String} color   描線の色
   * @param  {Number} raidus  円の直径
   * @return {Array}        rectオブジェクトの配列
   */
  addPoints(points, color, radius, target) {
    const pointRadius =
      radius ||
      this.config.pointRadius[target] ||
      DefaultConfig.pointRadius[target];
    return points.map((point) =>
      this.svg.rect(pointRadius, pointRadius).move(point.x, point.y).attr({
        fill: color,
        stroke: color,
        "pointer-events": "none",
      })
    );
  }

  /**
   * addPolyline - このdrawerのSVG領域にpolylineを描画する
   * @private
   *
   * @param  {Point[]} points 描画する点列
   * @param  {String} color   描線の色
   * @param  {Number} strokeWidth  描線の太さ
   * @param  {String} target  描画オブジェクトの種類(DFT/Spline/Onionなど)
   * @param  {boolean} isOnion  オニオンか否か
   * @return {polyline}     polylineオブジェクト
   */
  addPolyline(points, color, strokeWidth, target, isOnion = false) {
    return this.svg
      .polyline(points.map((p) => [p.x, p.y]))
      .attr({
        fill: "rgba(0,0,0,0)",
        stroke:
          color || this.config.colors[target] || DefaultConfig.colors[target],
        "stroke-width":
          strokeWidth ||
          this.config.strokeWidth[target] ||
          DefaultConfig.strokeWidth[target],
        "is-onion": isOnion,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "pointer-events": "none",
      });
  }

  /**
   * addPath -
   * @param  {Point []} points 描画する点列
   * @param  {String} color   描線の色
   * @param  {Number} strokeWidth  描線の太さ
   * @param  {String} target  描画オブジェクトの種類(DFT/Spline/Onionなど)
   */
  addPath(points, color, strokeWidth, target) {
    return this.svg.path(getPathString(points, strokeWidth)).attr({
      fill: color || this.config.colors[target] || DefaultConfig.colors[target],
      stroke: "transparent",
      "pointer-events": "none",
    });
  }

  /**
   * getPolylines - drawerに表示されているすべてのpolyline nodeを取得
   *
   * @return {Array}  polylineオブジェクトの配列
   */
  getPolylines() {
    return Array.from(this.svg.node.childNodes).filter(
      (el) => el.nodeName === "polyline"
    );
  }

  /**
   * getNonOnionPolylines - drawerに表示されているすべてのOnion用に描画されていないpolyline nodeを取得
   *
   * @return {Array}  polylineオブジェクトの配列
   */
  getNonOnionPolylines() {
    return this.getPolylines().filter(
      (el) => el.getAttribute("isOnion") === "false"
    );
  }

  /**
   * getPointAndPolylines - drawerに表示されているすべてのpolyline & circle nodeを取得
   *
   * @return {Array}  polylineオブジェクトの配列
   */
  getPointAndPolylines() {
    return Array.from(this.svg.node.childNodes).filter(
      (el) => el.nodeName === "polyline" || el.nodeName === "circle"
    );
  }

  /**
   * getNonOnionPolylines - drawerに表示されているすべてのOnion用に描画されていないpolyline nodeを取得
   *
   * @return {Array}  polylineオブジェクトの配列
   */
  getNonOnionPointAndPolylines() {
    return this.getPointAndPolylines().filter(
      (el) => el.getAttribute("isOnion") === "false"
    );
  }

  /**
   * getSvgRects - drawerに表示されているすべてのrect nodeを取得
   *
   * @return {Array}  rectオブジェクトの配列
   */
  getSvgRects() {
    // 生の SVG 要素を返す。呼び出し側は native な Element.remove() を使う。
    return Array.from(this.svg.node.childNodes).filter(
      (el) => el.nodeName === "rect"
    );
  }

  /**
   * getSvgLines - drawerに表示されているすべてのline nodeを取得
   *
   * @return {Array}  lineオブジェクトの配列
   */
  getSvgLines() {
    // 生の SVG 要素を返す。呼び出し側は native な Element.remove() を使う。
    return Array.from(this.svg.node.childNodes).filter(
      (el) => el.nodeName === "line"
    );
  }

  /**
   * clear - drawerの初期化
   *
   * @return {null}
   */
  clear() {
    this.figures = [];
    this.resultFigures = [];
    this.setup();
  }

  /**
   * undo - drawer内の最後のstrokeを取り除いて再描画する
   *
   * @return {null}
   */
  undo() {
    if (this.numOfStroke <= 0) return;
    this.numOfStroke -= 1;
    this.currentFigure.undo();
  }

  /**
   * reStroke - 現在描画されているfigureの領域を計算し、書き順を最初に描いたfigureに揃える。
   * その後、figureをthis.figuresに追加して、このDrawerの描画エリアを空にする
   *
   * @return {null}
   */
  reStroke() {
    this.currentFigure.calculateRect();
    if (this.figures.length > 0)
      this.currentFigure.changeStrokesOrderBasedOn(this.figures[0]);
    this.figures.push(this.currentFigure);
    this.setup();
  }

  /**
   * clearOnion - onionを消す
   *
   * @return {null}
   */
  clearOnion() {
    this.onion.map((polyline) => polyline.remove()); // Element.remove()はDOM上からのオブジェクトの削除
    this.onion = [];
  }

  /**
   * drawOnion - onionを描画する
   * @todo drawOnionをfigure.drawの1parameterで扱えないか
   * @todo よりよい関数名を考える
   *
   * @param  {Figure} figure onionとして描画されるべきFigure instance
   * @return {null}
   */
  drawOnion(figure = this.resultFigures[this.resultFigures.length - 1]) {
    if (!this.shouldDrawOnion(figure)) return;
    const colors = this.config.colors.onion;
    figure.strokes.forEach((stroke, i) => {
      const color = i === this.numOfStroke ? colors.current : colors.others;
      this.onion.push(
        this.addPolyline(stroke.DFT.pointsToDraw(), color, 3, "Onion", true)
      );
    });
  }

  /**
   * shouldDrawOnion -
   *
   * @param  {Figure} figure Onionとして描くfigure
   * @return {Boolean}
   */
  shouldDrawOnion(figure) {
    return this.showOnion && figure && figure.shouldDraw();
  }

  /**
   * setBackground - svg領域に背景を設定する
   * config.drawer.typeの値によって背景の設定が変わる
   * plain, linedが実装済み
   * @TODO: implement other types(squared, image)
   *
   * @return {null}
   */
  setBackground() {
    if (!this.config.drawer) return;
    if (!this.svg.node.style) return;
    if (
      this.config.drawer.type !== "lined" &&
      this.config.drawer.type !== "plain"
    )
      return;
    const canvas = document.createElement("canvas");
    const { width, height } = this.svg.node.getBoundingClientRect();
    canvas.setAttribute("width", `${width}px`);
    canvas.setAttribute("height", `${height}px`);
    const ctx = canvas.getContext("2d");

    // paint background
    ctx.fillStyle = this.config.drawer.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (this.config.drawer.type === "lined") {
      // draw lines
      const { color, padding, strokeWidth, margin } = this.config.drawer.lines;
      ctx.fillStyle = color;

      const w = width - padding.left - padding.right;
      for (
        let y = padding.top;
        y < height - padding.bottom;
        y += strokeWidth + margin
      ) {
        ctx.fillRect(padding.left, y, w, strokeWidth);
      }
    }

    const data = canvas.toDataURL("image/png");
    this.svg.node.style.backgroundImage = `url(${data})`;
  }

  /**
   * setStrokeColor - storke描画の色を決める
   *
   * @param  {String} color stokeの色. "rgb(0,0,0)" や "#FF0000"など
   * @return {null}
   */
  setStrokeColor(color) {
    this.strokeColor = color;
  }

  /**
   * setStrokeWidth - storke描画の線幅を決める
   *
   * @param  {Number} strokeWidth strokeの線幅
   * @return {null}
   */
  setStrokeWidth(strokeWidth) {
    this.strokeWidth = strokeWidth;
  }

  //
  // PRIVATE METHODS
  //

  /**
   * setup - 描画エリアを空にする
   * @private
   * @return {null}
   */
  setup() {
    this.numOfStroke = 0;
    this.currentFigure = new Figure();
    this.svg.clear();
  }

  /**
   * reDraw - 描画エリアに最後に描いたfigureを描画する
   *
   * @return {null}
   */
  reDraw() {
    this.svg.clear();
    const last = this.resultFigures.length - 1;
    this.drawOnion(this.resultFigures[last]);
    this.currentFigure.draw(this, drawMode.DFT);
  }

  /**
   * size - svgの領域の大きさを返す
   *
   * @return {type}  description
   */
  size() {
    return {
      x: this.svg.node.width.baseVal.value,
      y: this.svg.node.height.baseVal.value,
    };
  }

  /**
   * jsonizeAverageFigures - 平均化されたFigureのJSON Objectを返す
   *
   * @return {Object}  json化用のObject
   */
  jsonizeAverageFigures() {
    const last = this.resultFigures.length - 1;
    // 最初のfigureと画数が同じものだけ選ぶ
    // TODO: 実際に平均化のときに使われたfigureの長さを保持するようにする
    const correctFigures = this.figures.filter(
      (f) => f.strokes.length === this.figures[0].strokes.length
    );
    return this.resultFigures[last].jsonizeAverage(
      this.size(),
      correctFigures.length
    );
  }

  /**
   * loadFigures - jsonに含まれるfiguresを、resultFiguresに追加する。また追加されたfiguresを返す
   *
   * @param  {JSON} json [figure, figure, ...]の状態のjson
   * @return {Figure[]} resulFiguresに追加されたfigureの配列
   */
  loadFigures(json) {
    return json.map((figureJson) => {
      const figure = new Figure().load(figureJson);
      this.resultFigures.push(figure);
      return figure;
    });
  }

  /**
   * getBase64PngImage - svg領域をpngに変換して返す
   *
   * @return {Promise} responseとして、base64 encodeされたpngイメージを返す
   */
  getBase64PngImage() {
    const width = +this.svg.node.style.width.split("px")[0];
    const height = +this.svg.node.style.height.split("px")[0];

    const s = new XMLSerializer().serializeToString(this.svg.node);
    const encodedData = `data:image/svg+xml;base64,${window.btoa(s)}`;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const image = new Image();
    image.src = encodedData;
    return new Promise((resolve) => {
      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
    });
  }

  /**
   * setConfig - this.configに値を設定する
   *
   * @param  {Object} userConfig
   * @return {null}
   */
  setConfig(userConfig) {
    if (userConfig === DefaultConfig) {
      this.config = DefaultConfig;
      return;
    }
    this.config = userConfig;
    mergeObjects(DefaultConfig, userConfig, this.config);
  }

  /**
   * disableTouchGestures - mobileブラウザのback/forwardジェスチャを禁止する
   * pull to refreshは禁止しない
   *
   * @return {null}
   */
  disableTouchGestures() {
    if (!this.svg.node.style) return;
    // svg領域でのback/forward actionの禁止
    this.svg.node.style.touchAction = "none";
  }

  //
  // EventListner
  //

  /**
   * onMouseDown - pointerstart時の処理
   * @private
   *
   * @param  {event} _e
   * @return {null}
   */
  onMouseDown(_e) {
    // 領域をクリックしていない場合は何もしない(他のUIをいじっている場合など)
    // if (e.target !== this.svg.node) return;
    // 設定にある操作は無視
    if (this.config.ignoreInputs.includes(_e.pointerType)) return;

    log("mouseDown");
    this.svg.node.dispatchEvent(new CustomEvent("onMouseDownStart"));

    this.numOfStroke += 1; // 描き始め

    this.mouseTracker.start(() => {
      log("start callback");
      // svgの属性変更処理 + svgのpolylineへのpointの追加
      // TODO: このrectはgroupになっているべきでは?

      // 入力を点で表現する場合
      // const point = this.mouseTracker.latestPoint();
      // this.svg.rect(point.x, point.y, 1, 1).attr({ fill: this.rawPointColor, stroke: this.rawPointColor });

      // 入力を線で表現する場合
      const points = this.mouseTracker.latestPointPair();
      if (points) {
        this.svg.line(points[0].x, points[0].y, points[1].x, points[1].y).attr({
          fill: this.config.colors.originalPoint,
          stroke: this.config.colors.originalPoint,
          "stroke-width": this.config.strokeWidth.originalPath,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        });
      }
    });
    this.isStroking = true;
  }

  /**
   * onMouseUp - pointerup時の処理
   * @private
   *
   * @param  {event} _e
   * @return {null}
   */
  onMouseUp(_e) {
    // 設定にある操作は無視
    if (this.config.ignoreInputs.includes(_e.pointerType)) return;

    // 領域をクリックしていない場合は何もしない(他のUIをいじっている場合など)
    // if (!this.mouseTracker || (!this.mouseTracker.isTracking && e.target !== this.svg) || e.type === 'dragend') return;

    const data = this.mouseTracker.stop();
    this.isStroking = false;
    log("released");
    log("data:");
    log(data);

    const stroke = new Stroke(Point.smoothen(data.points), {
      color: this.strokeColor,
      strokeWidth: this.strokeWidth,
    });

    // TODO: 1点もしくは2点のStrokeが書かれていた場合に、取り除かないようにする
    // 書いていたときに表示された、点や直線を取り除く
    this.getSvgRects().forEach((rect) => rect.remove());
    this.getSvgLines().forEach((line) => line.remove());

    const last = this.resultFigures.length - 1;
    this.drawOnion(this.resultFigures[last]);
    this.currentFigure.add(stroke);
    stroke.draw(this, drawMode.DFT);

    // this.currentFigure.draw(this, drawMode.DFT);

    this.svg.node.dispatchEvent(new CustomEvent("onMouseUpEnded"));
  }

  /**
   * onHover - mouseenter時のイベント
   * @private
   * TODO: implement Drawer.onHover
   *
   * @param  {event} _e
   * @return {null}
   */
  onHover(_e) {
    log("Drawer.onHover is not implemented yet");
    log(this);
  }

  /**
   * onUnHover - mouseleave時のイベント
   * @private
   * TODO: implement Drawer.onUnHover
   *
   * @param  {event} _e
   * @return {null}
   */
  onUnHover(_e) {
    log("Drawer.onUnHover is not implemented yet");
    log(this);
  }

  /**
   * @private setupEventListeners - EventListnerの一括登録
   *
   * @return {null}
   */
  setupEventListeners() {
    if (isFirefoxInMac())
      this.svg.node.addEventListener("mousedown", (e) => this.onMouseDown(e));

    this.svg.node.addEventListener("pointerdown", (e) => this.onMouseDown(e));
    this.svg.node.addEventListener("pointerup", (e) => this.onMouseUp(e));
    this.svg.node.addEventListener("pointercancel", (e) => this.onMouseUp(e));
  }
}

export default Drawer;
