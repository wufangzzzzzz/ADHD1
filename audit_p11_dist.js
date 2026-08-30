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
    // 统计 addsub 和 muldiv 在 3 个难度下的算子占比
    const stat = async (opMode, rounds) => {
      g.setArithOp(opMode);
      const cnt = {};
      for (let i = 0; i < rounds; i++) {
        g.renderGrid();
        await new Promise(r => setTimeout(r, 15));
        document.querySelectorAll('.pattern11-bar').forEach(b => {
          const m = b.textContent.match(/[+\-×÷]/);
          if (m) cnt[m[0]] = (cnt[m[0]] || 0) + 1;
        });
      }
      return cnt;
    };
    const out = {};
    out.addsub_ones = await stat('addsub', 30);
    out.muldiv_ones = await stat('muldiv', 30);
    g.setDifficulty(7);   // 专家
    out.addsub_expert = await stat('addsub', 30);
    out.muldiv_expert = await stat('muldiv', 30);
    // 正确性（专家 all 模式 50 块）
    g.setArithOp('all'); g.setArithDigit('ones');
    g.renderGrid();
    await new Promise(r => setTimeout(r, 200));
    let bad = 0;
    document.querySelectorAll('.pattern11-bar').forEach(b => {
      if (+b.dataset.number === 1) { if (b.textContent !== '1') bad++; return; }
      const js = b.textContent.replace(/×/g,'*').replace(/÷/g,'/');
      if (eval(js) !== +b.dataset.number) bad++;
    });
    out.bad = bad;
    out.expertBars = document.querySelectorAll('.pattern11-bar').length;
    return out;
  });
  const pct = (c) => { const p = c['+']||0, m = c['-']||0, x = c['×']||0, d = c['÷']||0; return `加=${p} 减=${m} | 乘=${x} 除=${d}（共${p+m+x+d}）`; };
  console.log('【个位·初级】加减模式:', pct(r.addsub_ones));
  console.log('【个位·初级】乘除模式:', pct(r.muldiv_ones));
  console.log('【个位·专家】加减模式:', pct(r.addsub_expert));
  console.log('【个位·专家】乘除模式:', pct(r.muldiv_expert));
  console.log('专家all算式错误(期望0):', r.bad, ' 条数:', r.expertBars);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
