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

    // ===== 1. 菜单：百位已删 =====
    const menu = document.getElementById('arithmetic-menu');
    out.digitItems = menu.querySelectorAll('.arith-digit-btn').length;   // 期望 2
    out.noHundreds = !menu.querySelector('[data-digit="hundreds"]');

    // ===== 2. 样式：白底黑字 + 细黑体 =====
    g.setArithDigit('ones');   // 进入模式
    await new Promise(r => setTimeout(r, 300));
    const b0 = document.querySelector('.pattern11-bar');
    const cs = getComputedStyle(b0);
    out.bg = cs.backgroundColor;      // 期望 rgb(255,255,255)
    out.color = cs.color;             // 期望 rgb(0,0,0)
    out.weight = cs.fontWeight;       // 期望 600
    out.font = cs.fontFamily;
    out.hasYh = /YaHei|雅黑/i.test(cs.fontFamily);   // 黑体

    // ===== 3. 个位档：尽量 1 位数 =====
    let twoDigitCount = 0, total = 0;
    for (let rd = 0; rd < 4; rd++) {
      g.renderGrid();
      await new Promise(r => setTimeout(r, 120));
      document.querySelectorAll('.pattern11-bar').forEach(b => {
        total++;
        const nums = b.textContent.match(/\d+/g) || [];
        if (nums.some(x => +x >= 10)) twoDigitCount++;
      });
    }
    out.onesTwoDigitPct = Math.round(twoDigitCount / total * 100);   // 期望较低（尽量1位数）

    // ===== 4. 十位档：最多 2 位数 =====
    g.setArithDigit('tens');
    await new Promise(r => setTimeout(r, 200));
    let has3digit = false, ok = true;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      const nums = b.textContent.match(/\d+/g) || [];
      if (nums.some(x => +x >= 100)) has3digit = true;
    }
    out.tens3digit = has3digit;   // 期望 false（无3位数）

    // ===== 5. 竖条 token 行距紧凑 =====
    const vb = document.querySelector('.pattern11-bar.p11-v');
    const vcs = getComputedStyle(vb);
    out.vGap = vcs.rowGap || vcs.gap;      // 期望 0px
    out.vLineH = vcs.lineHeight;           // 期望 1（紧凑）

    // ===== 6. 功能回归：算式全对 + 18块 =====
    let bad = 0;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      const js = b.textContent.replace(/×/g,'*').replace(/÷/g,'/');
      if (eval(js) !== +b.dataset.number) bad++;
    }
    out.badExpr = bad;
    out.count = document.querySelectorAll('.pattern11-bar').length;
    return out;
  });
  console.log('① 菜单位数项(期望2):', r.digitItems, ' 无百位:', r.noHundreds);
  console.log('② 白底黑字: bg', r.bg, ' color', r.color, ' weight', r.weight, ' 黑体', r.hasYh, ' font:', (r.font||'').slice(0,50));
  console.log('③ 个位档出现两位数算式占比(期望较低):', r.onesTwoDigitPct + '%');
  console.log('④ 十位档出现3位数(期望false):', r.tens3digit);
  console.log('⑤ 竖条 gap:', r.vGap, ' line-height:', r.vLineH);
  console.log('⑥ 块数:', r.count, ' 算式错误(期望0):', r.badExpr);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
