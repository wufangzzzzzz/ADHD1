// 全站扫描：找出所有"同款缺陷"的游戏 HTML
// 缺陷1（致命）：requestAnimationFrame 注册在 draw()/render() 之后 → 任一帧抛异常即永久冻结
// 缺陷2（变慢）：rAF 回调里 "每帧 += 常量" 的动画推进（硬编码假设 60fps）
// 缺陷3（隐患）：ctx.arc 半径来自乘法/递减量（可能变负 → IndexSizeError）
const fs = require('fs');
const path = require('path');

const DIR = 'D:/专注力项目';
const files = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.html') && f.indexOf('_') !== 0);

function bodyOf(src, openIdx) {          // openIdx 指向 '{'
  let d = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return { start: openIdx, end: i, text: src.slice(openIdx, i + 1) }; }
  }
  return null;
}

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const fns = [];
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const b = bodyOf(src, m.index + m[0].length - 1);
    if (!b) continue;
    if (b.text.indexOf('requestAnimationFrame') < 0) continue;
    const name = m[1];
    const body = b.text;
    const rafIdx = body.indexOf('requestAnimationFrame');
    // 找 rAF 之前是否已有绘制调用
    const before = body.slice(0, rafIdx);
    const drawHit = /(^|[^\w$.])(draw|render|paint|update)\s*\(/.exec(before);
    // 每帧 += 数值常量
    const constInc = body.match(/[A-Za-z_$][\w$.]*\s*\+=\s*0?\.?\d+(?![\w.])/g) || [];
    // 时间驱动痕迹
    const timeDriven = /dt\s*\*|deltaTime|nowT|performance\.now\(\)|timestamp/.test(body);
    rows.push({ file: f, fn: name, rafAfterDraw: !!drawHit, drawCall: drawHit ? drawHit[0].trim() : '', constInc: constInc.slice(0, 4), timeDriven, line: src.slice(0, m.index).split('\n').length });
  }
}

const bad1 = rows.filter(r => r.rafAfterDraw && !/try\s*\{/.test(''));
const bad2 = rows.filter(r => r.constInc.length > 0 && !r.timeDriven);

console.log('=== 扫描 ' + files.length + ' 个游戏 HTML，其中 ' + rows.length + ' 个含 rAF 循环 ===\n');

console.log('【缺陷1】rAF 注册在绘制调用之后（>任意一帧抛异常=永久冻结<） 共 ' + rows.filter(r => r.rafAfterDraw).length + ' 处：');
rows.filter(r => r.rafAfterDraw).sort((a, b) => a.file < b.file ? -1 : 1).forEach(r => {
  console.log('  ' + r.file.padEnd(34) + ' ' + r.fn.padEnd(20) + ' 第' + String(r.line).padStart(4) + '行   rAF 之前先调用了 ' + r.drawCall.replace(/\s+/g, ''));
});
if (!rows.filter(r => r.rafAfterDraw).length) console.log('  （无）');

console.log('\n【缺陷2】每帧 += 常量、且无时间驱动痕迹（慢设备上动画会变慢/像停止）：');
bad2.sort((a, b) => a.file < b.file ? -1 : 1).forEach(r => {
  console.log('  ' + r.file.padEnd(34) + ' ' + r.fn.padEnd(20) + ' 第' + String(r.line).padStart(4) + '行   每帧推进: ' + r.constInc.join(' , '));
});
if (!bad2.length) console.log('  （无）');

console.log('\n【正常】已含时间驱动的 rAF 循环（供对照）：');
rows.filter(r => r.timeDriven && !r.constInc.length).sort((a, b) => a.file < b.file ? -1 : 1).forEach(r => {
  console.log('  ' + r.file.padEnd(34) + ' ' + r.fn.padEnd(20) + ' 第' + String(r.line).padStart(4) + '行');
});
