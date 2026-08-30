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
    const ops = ['all','add','sub','mul','div','addsub','muldiv'];
    const digs = ['ones','tens'];
    const diffs = [3,4,5,6,7,10];
    const out = [];
    const total = { rendered: 0, dup: 0 };
    g.setMode('arithmetic');
    for (const d of diffs) {
      g.setDifficulty(d);
      for (const o of ops) {
        g.setArithOp(o);
        for (const dg of digs) {
          g.setArithDigit(dg);
          for (let rd = 0; rd < 20; rd++) {   // 每组合 20 局
            g.renderGrid();
            await new Promise(r => setTimeout(r, 30));
            total.rendered++;
            const bars = [...document.querySelectorAll('.pattern11-bar')];
            const nums = bars.map(b => +b.dataset.number);
            const dupNums = nums.filter((n, i) => nums.indexOf(n) !== i);
            if (dupNums.length) {
              total.dup++;
              out.push({ diff: d, op: o, digit: dg, bars: bars.length, dup: [...new Set(dupNums)].join(','),
                         exprs: bars.map(b=>b.dataset.number+'='+b.textContent).join(' | ') });
            }
          }
        }
      }
    }
    out.push({ total: total });
    return out;
  });
  console.log('高频扫描（6难度×7算子×2位数 × 每组合20局）完成:');
  if (!r.length) console.log('  无输出');
  r.forEach(x => {
    if (x.total) console.log('  共渲染 ' + x.total.rendered + ' 局，重复 ' + x.total.dup + ' 局');
    else console.log('  难度' + x.diff + ' 算子' + x.op + ' 位数' + x.digit + ' bars=' + x.bars + ' 重复数字=' + x.dup + '\n    算式: ' + x.exprs);
  });
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
