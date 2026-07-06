import log from "./utils/log.js";
import isFirefoxInMac from "./utils/browser_detection.js";
import Point from "./point.js";
import DefaultConfig from "./default-config.js";

/**
 * @classdesc MouseTrackerクラスは、drawAreaSketchに内包される。
 * drawAreaSketch内部の点列の入力を管理する。
 *
 */
class MouseTracker {
  isTracking;
  buffers;
  bufferTime;
  callbacks;
  thresholdOfDistance;
  svg;

  /**
   * constructor - description
   *
   * @param  {String} id MouseTrackerの対象となるNodeのid
   * @return {MouseTracker}
   */
  constructor(el, thresholdOfDistance = 200) {
    this.isTracking = false;
    this.buffers = []; // Array of Point
    this.bufferTime = [];
    this.callbacks = {
      onDown: null,
      onMove: null,
      onUp: null,
    };
    this.thresholdOfDistance = thresholdOfDistance;
    this.svg = el;
    this.svg.setAttribute("touch-action", "none");
    this.svg.style.userSelect = "none";
    this.svg.style.webkitUserSelect = "none";
    this.setupEventListeners(this);
  }

  /**
   * start - 描画トラッキングの開始
   *
   * @param  {Function} callback onMoveイベント用のコールバック関数
   * @return {null}
   */
  start(callback) {
    log("start");
    if (typeof callback === "undefined") {
      callback = null;
    }
    this.isTracking = true;
    this.callbacks.onDown = callback;
    this.callbacks.onMove = callback;
  }

  /**
   * @typedef {Object} MouseTrackerBuffer
   * @param {Point[]} points - 入力した点列
   * @param {Number[]} times - 点の入力時刻列
   *
   */

  /**
   * stop - 描画トラッキングを停止。入力した点列と点の入力時刻列を返し、内部の点列、時刻列をクリアする。
   *
   * @return {MouseTrackerBuffer} 入力した点列と描画の時刻列
   */
  stop() {
    log("stop");
    this.isTracking = false;
    const points = this.buffers;
    // ios safariで指で描くとｚが全て0になるので0.5になおす
    if (points.every((p) => p.z === 0)) {
      points.forEach((p) => (p.z = 0.5));
    }

    const time = this.bufferTime;
    this.buffers = [];
    this.bufferTime = [];

    return {
      points,
      time,
    };
  }

  /**
   * latestPoint - 最後の点を返す
   *
   * @return {Point} 最後に入力された点
   */
  latestPoint() {
    return this.buffers.length > 0
      ? this.buffers[this.buffers.length - 1]
      : null;
  }

  /**
   * latestPointPair - 最後の点を2つ返す
   *
   * @return {Point[]} 最後に入力された2点
   */
  latestPointPair() {
    return this.buffers.length > 1
      ? [
          this.buffers[this.buffers.length - 2],
          this.buffers[this.buffers.length - 1],
        ]
      : null;
  }

  /**
   * setupEventListeners - MouseTrackerにEventListnerを付与する
   * @private
   *
   * @param  {MouseTracker} mt 対象となるMouseTracker
   * @return {null}
   */
  setupEventListeners(mt) {
    const handlePoint = (e, mouseTracker, type) => {
      if (e.type === "mousedown") return;
      // 設定にある操作は除外
      if (DefaultConfig.ignoreInputs.includes(e.pointerType)) return;
      const t = new Date().getTime();
      // 普通はあるNode内のマウスイベントでは、e.targetがそのNodeを指すが、
      // svg内に既存のNodeがあった場合、そちらがe.targetになる。
      // これにより対象Nodeが変化し, offsetXの基準値がsvg nodeではなく、svg内のpolylineやrectになってしまう。
      // よってsvgのエリアあらかじめ計算して基準とし、x,yを計算する
      const box = mouseTracker.svg.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      const z = e.pressure;
      if (x + y === 0) return;
      const last = mouseTracker.buffers.length - 1;
      const point = new Point(x, y, { z });
      // TODO: 点間距離で弾く処理は、mouseup時にまとめてfilteringしたほうが軽くて良い
      // TODO: 条件文を関数にして、意味がわかるようにする
      if (
        type === "pointerdown" ||
        type === "pointerup" ||
        (last >= 0 &&
          !point.isEqualTo(mouseTracker.buffers[last]) &&
          point.distance(mouseTracker.buffers[last]) <
            mouseTracker.thresholdOfDistance)
      ) {
        mouseTracker.buffers.push(point);
        mouseTracker.bufferTime.push(t);
      }
    };

    // according to https://www.thecssninja.com/javascript/handleevent
    const startEventHandler = {
      handleEvent(e) {
        log("start event handler");
        handlePoint(e, this.mt, "pointerdown");
        if (typeof this.mt.callbacks.onDown === "function") {
          this.mt.callbacks.onDown(e);
        }
      },
      mt,
    };

    const moveEventHandler = {
      handleEvent(e) {
        log("move");
        // 設定にある操作は除外
        if (DefaultConfig.ignoreInputs.includes(e.pointerType)) return;
        if (this.mt.isTracking) {
          handlePoint(e, this.mt, "pointermove");
          if (this.mt.callbacks.onMove !== null) {
            this.mt.callbacks.onMove(e);
          }
        }
        // e.preventDefault();
      },
      mt,
    };

    const endEventHandler = {
      handleEvent(e) {
        log("end event handler");
        handlePoint(e, this.mt, "pointerup");
        if (this.mt.callbacks.onUp !== null) {
          this.mt.callbacks.onUp(e);
        }
      },
      mt,
    };

    if (isFirefoxInMac())
      this.svg.addEventListener("mousedown", startEventHandler);

    this.svg.addEventListener("pointerdown", startEventHandler);
    this.svg.addEventListener("pointermove", moveEventHandler);
    this.svg.addEventListener("pointerup", endEventHandler);
    this.svg.addEventListener("pointercancel", endEventHandler);
  }
}

export default MouseTracker;
