// average-figure-drawer-js/src/svg-helper.js
// @svgdotjs/svg.js の置き換え。
// average-figure-drawer が実際に使っている API だけを、素の createElementNS で実装した
// 依存ゼロ・ビルド不要の軽量ラッパー。npm パッケージを一切必要としない。

const NS = "http://www.w3.org/2000/svg";

/**
 * SvgElement - 生成した個々の SVG 要素のラッパー
 * svg.js の element が持っていた .attr() / .move() / .remove() / .animate() のうち、
 * average-figure-drawer が使うものだけを再現する。生の DOM ノードは .node で参照できる。
 */
class SvgElement {
  constructor(node) {
    this.node = node;
  }

  /**
   * attr - 属性の getter / setter（svg.js 互換）
   *  - attr("d")                → 値を返す (getter)
   *  - attr("d", "M 0 0 ...")   → 単一属性をセット
   *  - attr({ fill: "#000", ... }) → 複数属性をまとめてセット
   * @return {SvgElement|string} setter 時は自身、getter 時は属性値
   */
  attr(name, value) {
    if (name !== null && typeof name === "object") {
      Object.keys(name).forEach((key) => {
        this.node.setAttribute(key, String(name[key]));
      });
      return this;
    }
    if (value === undefined) {
      return this.node.getAttribute(name);
    }
    this.node.setAttribute(name, String(value));
    return this;
  }

  /**
   * move - svg.js の move() 相当。要素の bounding box の左上を (x, y) に合わせる。
   *  - circle : 中心を (x + r, y + r) に置く
   *  - それ以外 (rect 等) : x, y 属性をセット
   * @return {SvgElement}
   */
  move(x, y) {
    if (this.node.nodeName === "circle") {
      const r = parseFloat(this.node.getAttribute("r")) || 0;
      this.node.setAttribute("cx", String(x + r));
      this.node.setAttribute("cy", String(y + r));
    } else {
      this.node.setAttribute("x", String(x));
      this.node.setAttribute("y", String(y));
    }
    return this;
  }

  /**
   * remove - DOM から取り除く
   * @return {SvgElement}
   */
  remove() {
    if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
    return this;
  }

  /**
   * animate - svg.js の animate() の最小互換。
   * このライブラリでは Stroke.animate() だけが使用する。
   * 依存を増やさないため実アニメーションは行わず、最終状態を即時反映して callback を呼ぶ。
   * （モーフィング表現が必要になったら Web Animations API 等で拡張する）
   * @return {SvgElement}
   */
  animate(attrs, _duration, callback) {
    if (attrs !== null && typeof attrs === "object") this.attr(attrs);
    if (typeof callback === "function") callback();
    return this;
  }
}

/**
 * SvgRoot - ルートの <svg> 要素のラッパー。svg.js の SVG(el) 相当。
 * 図形生成メソッド (circle/rect/polyline/path/line) と clear() を提供する。
 */
class SvgRoot {
  constructor(el) {
    this.node = el;
  }

  /** create - name の SVG 要素を作って <svg> 直下に追加し、ラッパーを返す */
  create(name) {
    const node = document.createElementNS(NS, name);
    this.node.appendChild(node);
    return new SvgElement(node);
  }

  /**
   * circle - svg.js は circle(diameter) なので r = diameter / 2 とする。
   * 生成直後は bounding box 左上が原点になるよう cx = cy = r に置く。
   */
  circle(diameter) {
    const r = diameter / 2;
    const el = this.create("circle");
    el.node.setAttribute("r", String(r));
    el.node.setAttribute("cx", String(r));
    el.node.setAttribute("cy", String(r));
    return el;
  }

  /** rect - 幅・高さを指定して <rect> を作る（位置は move() で決める） */
  rect(width, height) {
    const el = this.create("rect");
    el.node.setAttribute("width", String(width));
    el.node.setAttribute("height", String(height));
    return el;
  }

  /** polyline - [[x, y], ...] の配列から <polyline> を作る */
  polyline(points) {
    const el = this.create("polyline");
    const str = points.map((p) => `${p[0]},${p[1]}`).join(" ");
    el.node.setAttribute("points", str);
    return el;
  }

  /** path - d 文字列から <path> を作る */
  path(d) {
    const el = this.create("path");
    el.node.setAttribute("d", d);
    return el;
  }

  /** line - 2 点から <line> を作る */
  line(x1, y1, x2, y2) {
    const el = this.create("line");
    el.node.setAttribute("x1", String(x1));
    el.node.setAttribute("y1", String(y1));
    el.node.setAttribute("x2", String(x2));
    el.node.setAttribute("y2", String(y2));
    return el;
  }

  /** clear - 子要素をすべて削除する */
  clear() {
    while (this.node.firstChild) this.node.removeChild(this.node.firstChild);
    return this;
  }
}

/**
 * SVG - svg.js の SVG() 相当。既存の <svg> 要素をラップして返す。
 * @param {SVGElement|HTMLElement} el
 * @return {SvgRoot}
 */
export function SVG(el) {
  return new SvgRoot(el);
}

export default SVG;
