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
    g.setArithOp('all'); g.setArithDigit('tens');   // 十位档保证出现两位数
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const out = {};

    // ===== A. 竖条 token 布局 =====
    let hasTwoDigit = false, tokenOk = true, twoDigitWide = false, sample = '';
    document.querySelectorAll('.pattern11-bar.p11-v').forEach(b => {
      const tks = [...b.querySelectorAll('.p11-v-token')];
      if (!tks.length) { tokenOk = false; return; }
      const orig = tks.map(t => t.textContent).join('');
      // 数字 token 横排检查：token 宽 > 高（横着写）
      for (const t of tks) {
        if (/\d+/.test(t.textContent) && t.textContent.length >= 2) {
          hasTwoDigit = true;
          const r2 = t.getBoundingClientRect();
          if (r2.width > r2.height) twoDigitWide = true;
          if (!sample) sample = t.textContent;
        }
      }
    });
    out.hasTwoDigit = hasTwoDigit;
    out.twoDigitWide = twoDigitWide;      // 期望 true：两位数整体横着写
    out.tokenOk = tokenOk;                // 期望 true：每个竖条都拆了 token
    out.sample = sample;

    // ===== B. 竖条文字块方向（从上到下：块高 > 宽）=====
    const vb = document.querySelector('.pattern11-bar.p11-v');
    const range = document.createRange();
    range.selectNodeContents(vb);
    const tr = range.getBoundingClientRect();
    out.vTall = tr.height > tr.width;     // 期望 true

    // ===== C. 居中 + 字号统一 =====
    let offMax = 0;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      const br = b.getBoundingClientRect();
      const r2 = document.createRange(); r2.selectNodeContents(b);
      const tr2 = r2.getBoundingClientRect();
      const off = Math.hypot((tr2.left+tr2.width/2)-(br.left+br.width/2), (tr2.top+tr2.height/2)-(br.top+br.height/2));
      if (off > offMax) offMax = off;
    }
    out.centerOff = Math.round(offMax);
    const sizes = new Set([...document.querySelectorAll('.pattern11-bar')].map(b => b.style.fontSize));
    out.fontSizes = [...sizes].join(',');

    // ===== D. 功能 =====
    let bad = 0;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      const txt = b.textContent;
      const js = txt.replace(/×/g,'*').replace(/÷/g,'/');
      if (eval(js) !== +b.dataset.number) bad++;
    }
    out.badExpr = bad;
    out.count = document.querySelectorAll('.pattern11-bar').length;
    return out;
  });
  console.log('A. 两位数出现:', r.hasTwoDigit, ' 数字token横着写(宽>高):', r.twoDigitWide, ' 样本:', r.sample, ' 竖条均拆token:', r.tokenOk);
  console.log('B. 竖条文字块从上到下(高>宽):', r.vTall);
  console.log('C. 居中偏移:', r.centerOff, 'px  字号统一:', r.fontSizes);
  console.log('D. 块数:', r.count, ' 算式错误(期望0):', r.badExpr);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
