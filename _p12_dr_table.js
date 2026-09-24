// 三个等半径(1)的圆，圆心互隔 120°、距原点 dr，数值积分求「三圆公共交叠面积 / π」
const N = 4000, cell = 3 / N, unit = cell * cell;
function ratio(dr) {
  const cs = [0, 1, 2].map(k => {
    const a = k * 2 * Math.PI / 3;
    return [dr * Math.cos(a), dr * Math.sin(a)];
  });
  let c = 0;
  for (let i = 0; i < N; i++) {
    const x = -1.5 + (i + 0.5) * cell;
    for (let j = 0; j < N; j++) {
      const y = -1.5 + (j + 0.5) * cell;
      if (cs.every(p => Math.hypot(x - p[0], y - p[1]) <= 1)) c++;
    }
  }
  return (c * unit) / Math.PI;
}
console.log('dr     白区/单球   等效白区半径(单位, R=42)  球外径 R+D  (须<50)');
for (const dr of [0.155, 0.160, 0.165, 0.170, 0.175, 0.180, 0.185, 0.190, 0.195, 0.200, 0.205, 0.210, 0.212]) {
  const r = ratio(dr);
  const Reff = 42 * 0.925;
  const D = dr * Reff;
  console.log(dr.toFixed(3) + '   ' + (r * 100).toFixed(1) + '%      ' +
    (Math.sqrt(r) * Reff).toFixed(1) + '                   ' + (42 + D).toFixed(2));
}
