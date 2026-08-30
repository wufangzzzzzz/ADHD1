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
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 300));
    const N = g.gridSize;

    const setAll = (right) => { for (const c of cells) {
      const f = c.querySelector('.pattern10-face');
      f.classList.toggle('p10-face-r', !!right);
      c.querySelector('.pattern10-num').style.transform = right ? 'translate(-50%, -50%) scaleX(-1)' : '';
    }};

    // ===== A. 有面对面候选：单次 tick 必须互换（不再 50% 空转）=====
    // 构造唯一面对面：cells[0](0,0 边界) 朝右，其内侧候选 (1,0)/(1,1) 朝左
    setAll(false);
    cells[0].querySelector('.pattern10-face').classList.add('p10-face-r');
    cells[0].querySelector('.pattern10-num').style.transform = 'translate(-50%, -50%) scaleX(-1)';
    const o0 = cells[0].dataset.number;
    let swapA = 0;
    for (let t = 0; t < 20; t++) {
      const before = cells.map(c=>c.dataset.number).join(',');
      g._p10SwapOnce();
      if (before !== cells.map(c=>c.dataset.number).join(',')) swapA++;
    }
    // 每次 tick 后重置棋盘（避免多次链式）
    const hitCount = swapA;

    // ===== B. 无面对面候选（全同向）：tick 应跳过（不报错不换）=====
    setAll(true);   // 全部朝右 → 无面对面
    const b0 = cells.map(c=>c.dataset.number).join(',');
    let swapB = 0;
    for (let t = 0; t < 10; t++) g._p10SwapOnce();
    swapB = cells.map(c=>c.dataset.number).join(',') !== b0 ? 1 : 0;

    // ===== C. 定时器间隔 =====
    const src = document.documentElement.outerHTML;
    const has4s = /setInterval\(this\._p10SwapOnce, 4000\)/.test(src);
    const hasOld = /setInterval\(this\._p10SwapOnce, 2800\)/.test(src);
    const has050 = /Math\.random\(\) < 0\.5\)\s*\{\s*\/\/ 有概率互换/.test(src);

    return { N, hitCount, swapB, has4s, hasOld, has050 };
  });
  console.log('格子:', r.N + 'x' + r.N);
  console.log('A. 有面对面候选时 20次tick 互换次数(期望20=每次必换):', r.hitCount);
  console.log('B. 全同向无候选时是否误换(期望0):', r.swapB);
  console.log('C. 定时器 4000ms(期望true):', r.has4s, '  旧2800残留(期望false):', r.hasOld, '  旧50%概率残留(期望false):', r.has050);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
