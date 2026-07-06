const defaultConfig = {
  pointRadius: {
    originalPoint: 2,
    spline: 2,
    dft: 2,
  },
  strokeWidth: {
    originalPath: 2,
    spline: 2,
    dft: 4,
  },
  colors: {
    originalPoint: "rgb(255, 0, 0)",
    originalPath: "rgb(150, 150, 200)",
    point: "rgb(0, 0, 255)",
    spline: "rgb(0, 0, 0)",
    dft: "rgb(255, 0, 0)",
    onion: {
      current: "rgba(230, 100, 100, 0.1)",
      others: "rgba(100, 100, 100, 0.05)",
    },
  },
  ignoreInputs: [], // "mouse", "touch", "pen" // 無視する入力を指定する
  drawer: {
    type: "plain",
    lines: {
      color: "#C8C8C8",
      padding: {
        top: 70,
        bottom: 10,
        left: 50,
        right: 50,
      },
      strokeWidth: 2,
      margin: 120,
    },
    backgroundColor: "rgb(240, 248, 255)",
  },
};

export default defaultConfig;
