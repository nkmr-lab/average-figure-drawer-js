// detector パッケージの置換。
// 元は `detector.browser.name === "firefox" && detector.os.name === "macosx"` を返すだけ
// だったので、依存を足さず navigator.userAgent で同じ判定を行う。

const isFirefoxInMac = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Firefox/.test(ua) && /Macintosh|Mac OS X/.test(ua);
};

export default isFirefoxInMac;
