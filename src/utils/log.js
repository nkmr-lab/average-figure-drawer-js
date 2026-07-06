/**
 * window.DEBUG = true のときに msg を console.log 出力する
 */
window.DEBUG = false;

/**
 * window.DEBUG = true のときに msg を console.log 出力する
 * @param msg ログに出力する任意の値
 */
const log = (msg) => {
  if (window.DEBUG) {
    console.log(msg);
  }
};

export default log;
