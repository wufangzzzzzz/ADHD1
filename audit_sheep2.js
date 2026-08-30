const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    g.setPatternSub(10);
    await new Promise(r => setTimeout(r, 400));
    const cells = [...document.querySelectorAll('.pattern10-cell')];
    // 强制所有相邻对面对面：偶数格朝右、奇数格朝左（0↔1, 2↔3, … 都头对头）
    cells.forEach((c,i)=>{
      const f = c.querySelector('.pattern10-face');
      if (i % 2 === 0) f.classList.add('p10-face-r'); else f.classList.remove('p10-face-r');
    });
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 300));
    const pos1 = cells.map(c=>c.dataset.number);
    // 直接连续触发换位逻辑 40 次（绕过定时器，验证面对面判定+互换）
    let swaps = 0;
    for (let t = 0; t < 40; t++) {
      const before = cells.map(c=>c.dataset.number).join(',');
      if (typeof g._p10SwapOnce === 'function') g._p10SwapOnce();
      const after = cells.map(c=>c.dataset.number).join(',');
      if (before !== after) swaps++;
    }
    const pos2 = cells.map(c=>c.dataset.number);
    return { cells: cells.length, pos1, swapped: swaps > 0, swaps, pos2 };
  });
  console.log('格子数:', r.cells);
  console.log('初始(强制0朝右/1朝左 面对面):', r.pos1.join(','));
  console.log('发生面对面互换:', r.swapped, r.swapped ? '→ ' + r.pos2.join(',') : '');
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
