// 用 fp32（Math.fround）复算着色器里的 hash1 / hash2，检查它们在真实整数输入域上的分布
// 目的：判断 hash 本身是否对这批输入存在系统性偏小
function f(x) { return Math.fround(x); }
function fr(x) { var v = f(x); return f(v - Math.floor(v)); }

function hash1(px, py) {
  var p3 = [fr(f(px) * 0.1031), fr(f(py) * 0.1031), fr(f(px) * 0.1031)];
  p3 = [fr(p3[0] - Math.floor(p3[0])), fr(p3[1] - Math.floor(p3[1])), fr(p3[2] - Math.floor(p3[2]))];
  var d = fr(fr(fr(p3[1] + 33.33) * p3[0]) + fr(fr(fr(p3[2] + 33.33) * p3[1]) + fr(fr(p3[0] + 33.33) * p3[2])));
  p3 = [fr(p3[0] + d), fr(p3[1] + d), fr(p3[2] + d)];
  var prod = fr(fr(p3[0] + p3[1]) * p3[2]);
  return fr(prod - Math.floor(prod));
}

function hash2(px, py) {
  var p3 = [fr(f(px) * 0.1031), fr(f(py) * 0.1030), fr(f(px) * 0.0973)];
  p3 = [fr(p3[0] - Math.floor(p3[0])), fr(p3[1] - Math.floor(p3[1])), fr(p3[2] - Math.floor(p3[2]))];
  var d = fr(fr(fr(p3[1] + 33.33) * p3[0]) + fr(fr(p3[2] + 33.33) * p3[1]) + fr(fr(p3[0] + 33.33) * p3[2]));
  p3 = [fr(p3[0] + d), fr(p3[1] + d), fr(p3[2] + d)];
  var prod = fr(fr(p3[0] + p3[1]) * p3[2]);
  return fr(prod - Math.floor(prod));
}

const lines = [];
function log(s) { lines.push(s); console.log(s); }

// 真实用到的 n 范围：n.x ∈ 0..3, n.y = 0 ；g ∈ {-1,0,1}
log('=== 实测过的三个输入（对照 GPU 读数 5 / 0 / 9）===');
[['-4,3', -4, 3], ['0,0', 0, 0], ['2,-1', 2, -1]].forEach(function (it) {
  var v = hash1(it[1], it[2]);
  log('  hash1(' + it[0] + ') = ' + v.toFixed(6) + '  -> 8bit ' + Math.round(v * 255));
});

log('');
log('=== hash1 在真实整数输入域 (-4..4)^2 的分布 ===');
var vals = [], buckets = new Array(10).fill(0);
for (var x = -4; x <= 4; x++) {
  for (var y = -4; y <= 4; y++) {
    var v = hash1(x, y);
    vals.push(v);
    buckets[Math.min(9, Math.floor(v * 10))]++;
  }
}
vals.sort(function (a, b) { return a - b; });
log('  样本数 = ' + vals.length + '  最小 = ' + vals[0].toFixed(4) + '  中位 = ' + vals[Math.floor(vals.length / 2)].toFixed(4) + '  最大 = ' + vals[vals.length - 1].toFixed(4));
log('  10 分桶: ' + buckets.join(' / '));
var tiny = vals.filter(function (v) { return v < 0.01; }).length;
log('  <0.01 的样本数 = ' + tiny + ' / ' + vals.length);
log('  -> hash1 若在整数输入上分布均匀，则 id 不该恒为 0');

log('');
log('=== hash2 在真实整数输入域 (-4..4)^2 的分布（对照） ===');
var v2 = [], b2 = new Array(10).fill(0);
for (var x2 = -4; x2 <= 4; x2++) {
  for (var y2 = -4; y2 <= 4; y2++) {
    var w = hash2(x2, y2);
    v2.push(w);
    b2[Math.min(9, Math.floor(w * 10))]++;
  }
}
v2.sort(function (a, b) { return a - b; });
log('  样本数 = ' + v2.length + '  最小 = ' + v2[0].toFixed(4) + '  中位 = ' + v2[Math.floor(v2.length / 2)].toFixed(4) + '  最大 = ' + v2[v2.length - 1].toFixed(4));
log('  10 分桶: ' + b2.join(' / '));

log('');
log('=== 关键对照：n.x=0..3, n.y=0（实测 n 的范围）时 hash1(n+g) 的全部取值 ===');
for (var gx = -1; gx <= 1; gx++) {
  var row = [];
  for (var nx = 0; nx <= 3; nx++) row.push(hash1(nx + gx, 0 + (-1)).toFixed(3));
  log('  g=(' + gx + ',-1): ' + row.join(', '));
}
log('  ^ 若这些值散布在 0~1，则「id 恒为 0」不可能来自 hash1');

require('fs').writeFileSync('D:/专注力项目/_hashcalc_out.txt', lines.join('\n'), 'utf8');
