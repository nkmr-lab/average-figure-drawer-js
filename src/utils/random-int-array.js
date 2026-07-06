import randomInt from "./random-int.js";

function randomIntWithExeception(min, max, exception = []) {
  const v = randomInt(min, max);
  return exception.includes(v)
    ? randomIntWithExeception(min, max, exception)
    : v;
}

export default function randomIntArray(min, max, length) {
  if (max - min + 1 < length) {
    console.error("max - min + 1 should be larger than length");
    return [];
  }
  return new Array(length)
    .fill(0)
    .map((_v, _i, array) => randomIntWithExeception(min, max, array));
}
