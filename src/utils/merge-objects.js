export default function mergeObjects(defaultObj, userObj, target) {
  Object.keys(defaultObj).forEach((key) => {
    target[key] = userObj[key] || defaultObj[key];
    if (typeof defaultObj[key] === "object")
      mergeObjects(defaultObj[key], userObj[key], target[key]);
  });
}
