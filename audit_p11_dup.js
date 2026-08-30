const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    g.setArithOp('all');
    g.setArithDigit('ones');
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const out = {};
    const collect = () => {
      const bars = [...document.querySelectorAll('.pattern11-bar')];
      const nums = bars.map(b => +b.dataset.number);
      const exprs = bars.map(b => b.textContent);
      const dupNums = nums.filter((n, i) => nums.indexOf(n) !== i);
      const exprCount = {};
      exprs.forEach(e => exprCount[e] = (exprCount[e] || 0) + 1);
      const dupExprs = Object.keys(exprCount).filter(k => exprCount[k] > 1).map(k => k + '×' + exprCount[k]);
      return { count: bars.length, nums: nums.sort((a,b)=>a-b).join(','), dupNums: [...new Set(dupNums)], dupExprs };
    };
    out.rd1 = collect();
    g.renderGrid();
    await new Promise(r => setTimeout(r, 200));
    out.rd2 = collect();
    // 单独用"减"模式跑一局（19-1 兜底嫌疑）
    g.setArithOp('sub');
    g.renderGrid();
    await new Promise(r => setTimeout(r, 200));
    out.sub = collect();
    return out;
  });
  console.log('局1:', JSON.stringify(r.rd1));
  console.log('局2:', JSON.stringify(r.rd2));
  console.log('减模式:', JSON.stringify(r.sub));
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
