const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

// 1) 验证 symbol-maze 修复后的 fallback 路径几何正确性
function check(name, path) {
  const keys = path.map(p => p.row + ',' + p.col);
  const unique = new Set(keys).size === keys.length;
  const len = path.length;
  const last = path[path.length - 1];
  const isDivEnd = (len - 1) % 4 === 3;
  let adjacent = true;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) !== 1) adjacent = false;
  }
  const oob = path.some(p => p.row < 0 || p.row > 9 || p.col < 0 || p.col > 9);
  console.log(name.padEnd(6), '长度=' + len, '无重复=' + unique, '终点col9=' + (last.col === 9), '终点符号÷=' + isDivEnd, '每步相邻=' + adjacent, '无越界=' + !oob);
}
const pathCF = [
  {row:0,col:0},{row:1,col:0},{row:1,col:1},{row:2,col:1},
  {row:2,col:2},{row:3,col:2},{row:3,col:3},{row:4,col:3},
  {row:4,col:4},{row:5,col:4},{row:5,col:5},{row:6,col:5},
  {row:6,col:6},{row:7,col:6},{row:7,col:7},{row:8,col:7},
  {row:8,col:8},{row:9,col:8},{row:9,col:9},{row:8,col:9}
];
const pathH = [
  {row:0,col:0},{row:1,col:0},{row:2,col:0},{row:3,col:0},
  {row:4,col:0},{row:5,col:0},{row:6,col:0},{row:7,col:0},
  {row:8,col:0},{row:9,col:0},{row:9,col:1},{row:9,col:2},
  {row:9,col:3},{row:9,col:4},{row:9,col:5},{row:9,col:6},
  {row:9,col:7},{row:9,col:8},{row:8,col:8},{row:8,col:9}
];
check('C/F', pathCF);
check('H', pathH);

// 2) 验证 G7 语法（domcontentloaded 即可，避免音频预加载超时）
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('http://127.0.0.1:8155/G7-story-detective.html', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => errors.push('GOTO: ' + e.message));
  await new Promise(r => setTimeout(r, 500));
  const real = errors.filter(e => !e.includes('fonts.googleapis') && !e.includes('Failed to load resource') && !e.includes('404'));
  console.log('G7 语法/运行时:', real.length === 0 ? 'OK 无报错' : 'ERR: ' + real.join(' | '));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
