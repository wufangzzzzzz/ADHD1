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
    const out = {};
    out.gameLoaded = !!g;
    if (!g) return out;
    if (typeof g.setPatternSub === 'function') g.setPatternSub(10);
    await new Promise(r => setTimeout(r, 400));
    const cells = document.querySelectorAll('.pattern10-cell');
    out.cells = cells.length;
    if (cells.length) {
      out.zIndexSample = [...cells].slice(0, cells.length>6?8:cells.length).map(c=>c.style.zIndex).join(',');
      out.zIndexLast = cells[cells.length-1].style.zIndex;
      const f = cells[0].querySelector('.pattern10-face');
      out.faceWidth = f ? getComputedStyle(f).width : 'none';
      const s = cells[0].querySelector('.pattern10-sheep');
      out.sheepFilter = s ? getComputedStyle(s).filter : 'none';
      out.hasFaceR = !!cells[0].querySelector('.p10-face-r');
    }
    // 尝试开始游戏（保证 isPlaying=true 让换位定时器工作）
    if (typeof g.start === 'function') g.start();
    else if (typeof g.newGame === 'function') g.newGame();
    await new Promise(r => setTimeout(r, 300));
    const pos1 = [...cells].map(c=>c.dataset.number);
    out.pos1 = pos1.join(',');
    // 等 3.2s（换位定时器 2.8s）
    await new Promise(r => setTimeout(r, 3200));
    const pos2 = [...cells].map(c=>c.dataset.number);
    out.pos2 = pos2.join(',');
    out.swapped = pos1.some((n,i)=>n!==pos2[i]);
    // 点数字1（动态 dataset）
    const c1 = [...cells].find(c=>c.dataset.number==='1');
    if (c1) { c1.click(); await new Promise(r=>setTimeout(r,150)); }
    out.correct1 = c1 ? (c1.classList.contains('p10-fly-left')||c1.classList.contains('p10-fly-right')) : 'NO_1';
    return out;
  });
  console.log('cells:', r.cells, ' zIndex前8:', r.zIndexSample, ' zIndex末:', r.zIndexLast);
  console.log('face宽(应204%≈格宽x2.04):', r.faceWidth, ' sheep投影filter:', r.sheepFilter);
  console.log('换位前:', r.pos1);
  console.log('换位后:', r.pos2, ' 发生交换:', r.swapped);
  console.log('点数字1正确:', r.correct1);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
