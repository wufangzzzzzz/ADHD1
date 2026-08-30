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
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const container = document.getElementById('grid-container');
    const cr = container.getBoundingClientRect();
    const bars = [...document.querySelectorAll('.pattern11-bar')];
    const rects = bars.map(b => {
      const r2 = b.getBoundingClientRect();
      return { n: b.dataset.number, x: Math.round(r2.left), y: Math.round(r2.top), w: Math.round(r2.width), h: Math.round(r2.height),
               gc: b.style.gridColumn, gr: b.style.gridRow, v: b.classList.contains('p11-v') };
    });
    // 重叠检测
    let overlap = 0;
    for (let i = 0; i < rects.length; i++) for (let j = i+1; j < rects.length; j++) {
      const a = rects[i], b2 = rects[j];
      if (Math.abs(a.x - b2.x) < 4 && Math.abs(a.y - b2.y) < 4) overlap++;
    }
    const cs = getComputedStyle(container);
    return {
      container: { w: Math.round(cr.width), h: Math.round(cr.height), x: Math.round(cr.left), y: Math.round(cr.top) },
      gridCols: cs.gridTemplateColumns, gridRows: cs.gridTemplateRows, display: cs.display,
      aspect: container.style.aspectRatio, width: container.style.width, height: container.style.height,
      rects, overlap, barCount: rects.length
    };
  });
  console.log('容器:', JSON.stringify(r.container), ' display:', r.display, ' cols:', r.gridCols, ' rows:', r.gridRows);
  console.log('内联 width:', r.width, ' height:', r.height, ' aspect:', r.aspect);
  console.log('条数:', r.barCount, ' 重叠对数(期望0):', r.overlap);
  r.rects.slice(0, 18).forEach(x => console.log(`  n=${x.n} (${x.x},${x.y}) ${x.w}x${x.h} gc=${x.gc} gr=${x.gr} ${x.v?'竖':''}`));
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
