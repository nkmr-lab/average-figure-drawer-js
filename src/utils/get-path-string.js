import Point from "../point.js";

// based on http://hg.hatenablog.jp/entry/2016/02/08/210906
function getPointsOfContanct(p0, p1, strokeWidth) {
  const x0 = p0.x;
  const x1 = p1.x;
  const y1 = p1.y;
  const y0 = p0.y;

  const r0 = p0.z * strokeWidth;
  const r1 = p1.z * strokeWidth;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const dr = r0 - r1;
  const denominator = dx ** 2 + dy ** 2;
  const constant = r0 * Math.sqrt(dx ** 2 + dy ** 2 - dr ** 2);
  const alpha = [
    (dx * r0 * dr + dy * constant) / denominator,
    (dx * r0 * dr - dy * constant) / denominator,
  ];
  const beta = [
    (dy * r0 * dr - dx * constant) / denominator,
    (dy * r0 * dr + dx * constant) / denominator,
  ];

  // [0]: go
  // [1]: back
  return [
    [
      new Point(x0 + alpha[0], y0 + beta[0], { z: p0.z }),
      new Point(x1 + (r1 / r0) * alpha[0], y1 + (r1 / r0) * beta[0], {
        z: p1.z,
      }),
    ],
    [
      new Point(x1 + (r1 / r0) * alpha[1], y1 + (r1 / r0) * beta[1], {
        z: p1.z,
      }),
      new Point(x0 + alpha[1], y0 + beta[1], { z: p0.z }),
    ],
  ];
}

export function getPointOfContactArray(points, strokeWidth) {
  const contactPointsArray = points.map((p, i) =>
    i < points.length - 1
      ? getPointsOfContanct(p, points[i + 1], strokeWidth)
      : null
  );
  contactPointsArray.pop();
  return contactPointsArray
    .map((ps) => ps[0])
    .flat()
    .concat(
      contactPointsArray
        .map((ps) => ps[1])
        .reverse()
        .flat()
    );
}

function moveTo(x, y) {
  return `M ${x} ${y}`;
}

function lineTo(x, y) {
  return `L ${x} ${y}`;
}

// https://developer.mozilla.org/ja/docs/Web/SVG/Tutorial/Paths#%E5%86%86%E5%BC%A7
function ellipticalArc(r, x, y) {
  return `A ${r} ${r} 0 0 1 ${x} ${y}`;
}

function pointOfContactArrayToPath(pointOfContactArray, strokeWidth) {
  return pointOfContactArray.reduce((prev, p, i, ps) => {
    let path = "";
    if (i === 0) {
      path = moveTo(p.x, p.y);
    } else if (i === ps.length - 1) {
      const r = ps[i].z * strokeWidth;
      path = `${lineTo(p.x, p.y)} ${ellipticalArc(r, ps[0].x, ps[0].y)} Z`;
    } else if (i % 2 === 0) {
      const r = ps[i].z * strokeWidth;
      path = ellipticalArc(r, p.x, p.y);
    } else {
      path = lineTo(p.x, p.y);
    }
    return `${prev} ${path}`;
  }, "");
}

export default function getPathString(points, strokeWidth) {
  const pointsOfContactArray = getPointOfContactArray(
    points.filter((p) => p.z > 0),
    strokeWidth
  ).filter((p) => p.x > 0 && p.y > 0);
  return pointOfContactArrayToPath(pointsOfContactArray, strokeWidth);
}
