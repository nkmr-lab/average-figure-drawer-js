/**
 * 配列を平坦にしてコンソール出力する
 * @param {Array} array
 * @return {null}
 */
const arrayLog = (array) => {
  if (array.length === 0) return;
  console.log(array.reduce((a, b) => `${a} ${b}`, ""));
};

export default arrayLog;
