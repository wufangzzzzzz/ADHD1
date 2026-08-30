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
    const N = g.gridSize;
    const dir = c => c.querySelector('.pattern10-face').classList.contains('p10-face-r') ? 1 : -1;  // 1右 -1左
    // 统计水平相邻面对面对（30% 随机应有约几对）
    let facePairs = 0;
    for (let i = 0; i < cells.length; i++) {
      const r1 = Math.floor(i/N), c1 = i % N;
      if (c1 + 1 < N) {
        const a = dir(cells[i]), b = dir(cells[i+1]);
        if (a === 1 && b === -1) facePairs++;   // 左朝右 右朝左 = 面对面
      }
    }
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 300));
    // 连续触发换位，检测是否发生（含斜向）+ FLIP transition
    let swaps = 0, flipSeen = false;
    for (let t = 0; t < 40; t++) {
      const before = cells.map(c=>c.dataset.number).join(',');
      g._p10SwapOnce();
      const after = cells.map(c=>c.dataset.number).join(',');
      if (before !== after) {
        swaps++;
        // 检测是否有 face 处于 FLIP 过渡（transition 含 transform）
        for (const c of cells) {
          const f = c.querySelector('.pattern10-face');
          if (f && f.style.transition && f.style.transition.indexOf('transform') >= 0) { flipSeen = true; break; }
        }
      }
    }
    return { cells: cells.length, facePairs, swaps, flipSeen };
  });
  console.log('格子:', r.cells, ' 水平面对面相邻对:', r.facePairs, '(随机30%左右)');
  console.log('40次触发发生互换:', r.swaps, '次  检测到FLIP移动过渡:', r.flipSeen);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
