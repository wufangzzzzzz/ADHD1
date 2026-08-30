const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    g.setArithOp('all'); g.setArithDigit('ones');
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const bars = [...document.querySelectorAll('.pattern11-bar')];
    const c = document.getElementById('grid-container');
    return {
      count: bars.length,
      p11Count: g._p11Count,
      size: g._p11GridSize(),
      gridSize: g.gridSize,
      datasetNums: bars.map(b => +b.dataset.number).join(','),
      exprs: bars.map(b => b.textContent).join(' | '),
      dupNums: (() => { const a = bars.map(b=>+b.dataset.number); return a.filter((n,i)=>a.indexOf(n)!==i); })(),
      rects: bars.slice(0, 6).map(b => { const r2 = b.getBoundingClientRect(); return `${b.dataset.number}:${b.textContent}=${Math.round(r2.width)}x${Math.round(r2.height)}`; }).join(' | '),
      containerW: Math.round(c.getBoundingClientRect().width)
    };
  });
  console.log('size:', r.size, ' gridSize:', r.gridSize, ' _p11Count:', r.p11Count, ' bars数量:', r.count);
  console.log('前6条尺寸:', r.rects);
  console.log('container宽:', r.containerW);
  console.log('dataset数字(去重前):', r.datasetNums);
  console.log('重复数字:', r.dupNums.length ? r.dupNums : '无');
  console.log('算式:', r.exprs);
  await browser.close();
})();
