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
    const out = [];
    g.setMode('arithmetic');
    const labels = { 3: '入门', 4: '初级', 5: '中级', 6: '高级', 7: '专家', 10: '极限' };
    for (const d of [3, 4, 5, 6, 7, 10]) {
      g.setDifficulty(d);
      await new Promise(r => setTimeout(r, 200));
      const bars = [...document.querySelectorAll('.pattern11-bar')];
      const nums = bars.map(b => +b.dataset.number).sort((a,b)=>a-b);
      out.push({
        label: labels[d], dataSize: d, gridSize: g.gridSize,
        size: g._p11GridSize(), count: g._p11Count,
        bars: bars.length,
        min: nums[0], max: nums[nums.length - 1],
        unique: new Set(nums).size
      });
    }
    return out;
  });
  r.forEach(x => console.log(
    `${x.label}(data-size=${x.dataSize}): gridSize=${x.gridSize} → 算数网格=${x.size}×${x.size} _p11Count=${x.count} 实际条数=${x.bars} 数字范围 ${x.min}..${x.max} 去重后=${x.unique}`
  ));
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
