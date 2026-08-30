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
    const out = {};
    // 1. 普通模式
    g.setDifficulty(4);
    g.setMode('offset');   // 退出任何特殊模式 → 普通
    await new Promise(r => setTimeout(r, 200));
    out.normal = document.querySelectorAll('.grid-cell').length;   // 4x4=16
    // 2. 图案1（基础图案）
    g.setPatternSub(1);
    await new Promise(r => setTimeout(r, 250));
    out.p1cells = document.querySelectorAll('.grid-cell').length;   // 4x4=16
    out.p1notArith = !document.querySelector('.pattern11-bar');
    // 3. 图案10（羊群）
    g.setPatternSub(10);
    await new Promise(r => setTimeout(r, 250));
    out.p10cells = document.querySelectorAll('.pattern10-cell').length;  // 16
    // 4. 羊群数字镜像检查（快照→互换→数字不镜像）
    const cells = [...document.querySelectorAll('.pattern10-cell')];
    out.p10mirror = cells.every(c => { const nm = c.querySelector('.pattern10-num'); return nm && !/[0-9]/.test(nm.getBoundingClientRect().width < 0); });
    // 5. 算数模式
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 250));
    out.arith = document.querySelectorAll('.pattern11-bar').length;  // 18
    // 6. 退出算数 → 普通模式正常
    g.setMode('offset');
    await new Promise(r => setTimeout(r, 200));
    out.exitNormal = document.querySelectorAll('.grid-cell').length; // 16
    out.exitNoArith = !document.querySelector('.pattern11-bar');
    // 7. 圆形模式（特殊模式代表性回归）
    g.setMode('circular');
    await new Promise(r => setTimeout(r, 250));
    out.circular = document.querySelectorAll('#circular-svg .sector-group').length > 0;
    g.setMode('offset');
    await new Promise(r => setTimeout(r, 150));
    out.circularExit = !g.isCircularMode;
    return out;
  });
  console.log('① 普通模式格子(期望16):', r.normal);
  console.log('② 图案1(期望16格+无算数残留):', r.p1cells, r.p1notArith);
  console.log('③ 图案10羊群(期望16格):', r.p10cells);
  console.log('④ 算数模式(期望18条):', r.arith);
  console.log('⑤ 退出算数回普通(期望16格+无残留):', r.exitNormal, r.exitNoArith);
  console.log('⑥ 圆形模式正常+退出:', r.circular, r.circularExit);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
