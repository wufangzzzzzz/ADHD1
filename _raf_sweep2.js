// 全站扫描 v2：剥掉注释后再判定，消除"注释里出现 draw()"造成的误报
const fs = require('fs');
const path = require('path');
const DIR = 'D:/专注力项目';
const files = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.html') && f.indexOf('_') !== 0);

function stripComments(s) {
  // 去块注释与行注释（够用即可；字符串里的 // 极少见，可接受）
  s = s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  s = s.replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p1) => p1 + ' ');
  return s;
}
function bodyOf(src, openIdx) {
  let d = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (d === 0) return src.slice(openIdx, i + 1); }
  }
  return null;
}

const rows = [];
for (const f of files) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const src = stripComments(raw);
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const body = bodyOf(src, m.index + m[0].length - 1);
    if (!body || body.indexOf('requestAnimationFrame') < 0) continue;
    const rafIdx = body.indexOf('requestAnimationFrame');
    const before = body.slice(0, rafIdx);
    const drawHit = /(^|[^\w$.])(draw|render|paint)\s*\(/.exec(before);
    const line = raw.slice(0, m.index).split('\n').length;
    // 每帧 += 数值常量：排除含 dt / * / if( 归一化的行
    const incs = [];
    body.split('\n').forEach((ln, i) => {
      const t = ln.trim();
      if (!/[\w$.]+\s*\+=\s*0?\.?\d/.test(t)) return;
      if (/\bdt\b|\*|if\s*\(|\/\//.test(t)) return;
      incs.push(t.slice(0, 60));
    });
    const timeDriven = /\bdt\b|deltaTime|nowT|performance\.now\(\)|\bnow\b\s*-/.test(body);
    const hasTry = /try\s*\{/.test(body);
    rows.push({ file: f, fn: m[1], line, rafAfterDraw: !!drawHit, incs, timeDriven, hasTry });
  }
}

const d1 = rows.filter(r => r.rafAfterDraw);
const d2 = rows.filter(r => r.incs.length && !r.timeDriven);
console.log('=== v2 扫描：' + files.length + ' 个 HTML / ' + rows.length + ' 个 rAF 循环（已剥注释）===\n');
console.log('【缺陷1】rAF 注册在绘制之后 → ' + d1.length + ' 处：');
d1.forEach(r => console.log('  ' + r.file.padEnd(30) + r.fn.padEnd(18) + '第' + String(r.line).padStart(5) + '行'));
if (!d1.length) console.log('  （无）');
console.log('\n【缺陷2】每帧 += 常量且无时间驱动 → ' + d2.length + ' 处：');
d2.forEach(r => console.log('  ' + r.file.padEnd(30) + r.fn.padEnd(18) + '第' + String(r.line).padStart(5) + '行  ' + r.incs[0]));
if (!d2.length) console.log('  （无）');
console.log('\n【对照】已加 try/catch 保护的 rAF 循环：');
rows.filter(r => r.hasTry).forEach(r => console.log('  ' + r.file.padEnd(30) + r.fn.padEnd(18) + '第' + String(r.line).padStart(5) + '行'));
