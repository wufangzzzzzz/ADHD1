// 三圆交叠面积的独立数值积分（不依赖我的解析公式），用于判定
//   「实测白区 61.6% vs 解析式 70.3%」到底是渲染问题还是解析式算错。
// 口径：格内 100×100 坐标系，中心 (50,50)，三圆半径 R、圆心各距中心 D、互隔 120°。
const R = 40, D = 7.6, CX = 50, CY = 50;
const S3 = Math.sqrt(3) / 2;
const cs = [
  [CX + D, CY],
  [CX - D / 2, CY + D * S3],
  [CX - D / 2, CY - D * S3]
];
const inside = (x, y, c) => Math.hypot(x - c[0], y - c[1]) <= R;

const N = 6000;                       // 6000×6000 网格
const cell = 100 / N;
const unit = cell * cell;             // 每个格点代表的面积（格内单位²）
let c3 = 0, c2 = 0, c1 = 0, cAll = 0;
for (let i = 0; i < N; i++) {
  const x = (i + 0.5) * cell;
  for (let j = 0; j < N; j++) {
    const y = (j + 0.5) * cell;
    let k = 0;
    for (let t = 0; t < 3; t++) if (inside(x, y, cs[t])) k++;
    if (k === 3) c3++;
    else if (k === 2) c2++;
    else if (k === 1) c1++;
    if (k > 0) cAll++;
  }
}
const ball = Math.PI * R * R;
const A3 = c3 * unit, A2 = c2 * unit, A1 = c1 * unit, AU = cAll * unit;
console.log('R=' + R + '  D=' + D + '  D/R=' + (D / R).toFixed(3));
console.log('单球面积          = ' + ball.toFixed(1));
console.log('三交(白)   面积   = ' + A3.toFixed(1) + '   占单球 ' + (A3 / ball * 100).toFixed(1) + '%');
console.log('两两交叠   面积   = ' + A2.toFixed(1) + '   占单球 ' + (A2 / ball * 100).toFixed(1) + '%');
console.log('单色独占   面积   = ' + A1.toFixed(1) + '   占单球 ' + (A1 / ball * 100).toFixed(1) + '%');
console.log('三球并集   面积   = ' + AU.toFixed(1));
console.log('');
console.log('--- 与实测 3x 截图（360×360 CSS=120px 格，1 格内单位 = 3.6 设备像素）对照 ---');
const k = 3.6 * 3.6;                  // 格内单位² → 设备像素²
const meas = { white: 40133, yel: 5751, mag: 5759, cyn: 5721, red: 7823, green: 7895, blue: 7879 };
console.log('白区  实测 ' + meas.white + ' px² = ' + (meas.white / k).toFixed(1) + ' 格内单位²   vs 数值积分 ' + A3.toFixed(1) +
  '  → 实测/理论 = ' + (meas.white / k / A3 * 100).toFixed(1) + '%');
console.log('两两  实测 ' + (meas.yel + meas.mag + meas.cyn) + ' px² = ' + ((meas.yel + meas.mag + meas.cyn) / k).toFixed(1) +
  ' 格内单位²   vs 数值积分 ' + A2.toFixed(1) + '  → 实测/理论 = ' + ((meas.yel + meas.mag + meas.cyn) / k / A2 * 100).toFixed(1) + '%');
console.log('单色  实测 ' + (meas.red + meas.green + meas.blue) + ' px² = ' + ((meas.red + meas.green + meas.blue) / k).toFixed(1) +
  ' 格内单位²   vs 数值积分 ' + A1.toFixed(1) + '  → 实测/理论 = ' + ((meas.red + meas.green + meas.blue) / k / A1 * 100).toFixed(1) + '%');
console.log('');
console.log('--- 反推：要让白区占单球 70%，D 应为多少 ---');
for (const dd of [7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.4, 9.0]) {
  const cc = [[CX + dd, CY], [CX - dd / 2, CY + dd * S3], [CX - dd / 2, CY - dd * S3]];
  let n3 = 0;
  const NN = 2000;
  const cl = 100 / NN;
  for (let i = 0; i < NN; i++) {
    const x = (i + 0.5) * cl;
    for (let j = 0; j < NN; j++) {
      const y = (j + 0.5) * cl;
      let kk = 0;
      for (let t = 0; t < 3; t++) if (Math.hypot(x - cc[t][0], y - cc[t][1]) <= R) kk++;
      if (kk === 3) n3++;
    }
  }
  const a3 = n3 * cl * cl;
  console.log('  D=' + dd.toFixed(2) + ' (D/R=' + (dd / R).toFixed(3) + ')  白区占单球 = ' + (a3 / ball * 100).toFixed(1) + '%');
}
