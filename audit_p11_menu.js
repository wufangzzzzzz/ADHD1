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

    // ===== 1. 按钮位置与菜单结构 =====
    const btn = document.getElementById('arith-mode-btn');
    out.btnText = btn.textContent;                                    // 加减乘除 ▾
    out.btnInEffectsRow = btn.closest('.effects-row') !== null;       // 期望 false（不在右边效果栏）
    const menu = document.getElementById('arithmetic-menu');
    out.menuExists = !!menu;
    out.opItems = menu.querySelectorAll('.arith-op-btn').length;      // 期望 7
    out.digitItems = menu.querySelectorAll('.arith-digit-btn').length;// 期望 3
    out.hasSep = !!menu.querySelector('.mode-menu-sep');
    // 效果栏无 arithmetic 控件
    out.noArithInEffects = !document.querySelector('.effects-row .arith-op-btn') &&
                           !document.querySelector('.effects-row #arith-mode-btn');

    // ===== 2. 点击展开 =====
    btn.click();
    await new Promise(r => setTimeout(r, 120));
    out.menuShown = menu.classList.contains('show');                 // 期望 true
    out.modeNotEnteredYet = !g.isArithMode;                          // 只开菜单不进模式（期望 true）

    // ===== 3. 点"除" → 进入模式 + 菜单关闭 =====
    const divBtn = menu.querySelector('.arith-op-btn[data-op="div"]');
    divBtn.click();
    await new Promise(r => setTimeout(r, 250));
    out.enteredDiv = g.isArithMode && g.arithmeticOp === 'div';
    out.menuClosed = !menu.classList.contains('show');
    out.btnActive = btn.classList.contains('active');
    out.bars = document.querySelectorAll('.pattern11-bar').length;   // 18

    // ===== 4. 点位数"十位" → 重渲染 =====
    const hBtn = menu.querySelector('.arith-digit-btn[data-digit="tens"]');
    btn.click();   // 重新展开菜单
    await new Promise(r => setTimeout(r, 80));
    hBtn.click();
    await new Promise(r => setTimeout(r, 250));
    out.digitHundreds = g.arithmeticDigit === 'tens';
    let hundredsHas3 = false;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      const m2 = b.textContent.match(/\d{3}/);
      if (m2) { hundredsHas3 = true; break; }
    }
    out.hundreds3digit = hundredsHas3;                               // 期望 false（已无百位/3位数）

    // ===== 5. 退出（点偏移）→ 按钮去激活 =====
    g.setMode('offset');
    await new Promise(r => setTimeout(r, 150));
    out.exited = !g.isArithMode && !btn.classList.contains('active');

    // ===== 6. 算式正确性 =====
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 250));
    let bad = 0;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      const js = b.textContent.replace(/×/g,'*').replace(/÷/g,'/');
      if (eval(js) !== +b.dataset.number) bad++;
    }
    out.badExpr = bad;
    return out;
  });
  console.log('① 按钮文字:', r.btnText, ' 不在效果栏:', r.btnInEffectsRow, ' 菜单存在:', r.menuExists, ' 算子项:', r.opItems, ' 位数项:', r.digitItems, ' 分隔线:', r.hasSep, ' 效果栏无残留:', r.noArithInEffects);
  console.log('② 点击展开菜单:', r.menuShown, ' 未进模式:', r.modeNotEnteredYet);
  console.log('③ 点"除": 进模式', r.enteredDiv, ' 菜单关闭', r.menuClosed, ' 按钮高亮', r.btnActive, ' 条数', r.bars);
  console.log('④ 点"十位": 生效', r.digitHundreds, ' 出现3位数(期望false):', r.hundreds3digit);
  console.log('⑤ 退出偏移: 清模式', r.exited);
  console.log('⑥ 算式错误(期望0):', r.badExpr);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
