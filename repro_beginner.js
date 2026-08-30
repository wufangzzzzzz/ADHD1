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
    const out = [];
    const diffs = [4, 5];   // 初级、中级
    const ops = [['addsub','加减'],['muldiv','乘除'],['all','加减乘除']];
    for (const d of diffs) {
      // 点难度按钮
      const db = [...document.querySelectorAll('.difficulty-btn')].find(b => +b.dataset.size === d);
      db.click();
      await new Promise(r => setTimeout(r, 150));
      for (const [op, name] of ops) {
        // 点算数菜单项（若不在模式先展开）
        if (!g.isArithMode) document.getElementById('arith-mode-btn').click();
        await new Promise(r => setTimeout(r, 80));
        const item = document.querySelector(`#arithmetic-menu .arith-op-btn[data-op="${op}"]`);
        item.click();
        await new Promise(r => setTimeout(r, 250));
        const bars = [...document.querySelectorAll('.pattern11-bar')];
        const nums = bars.map(b => +b.dataset.number);
        const dup = [...new Set(nums.filter((n,i)=>nums.indexOf(n)!==i))];
        let bad = 0, opsCount = { '+':0, '-':0, '×':0, '÷':0 };
        const exprList = [];
        for (const b of bars) {
          if (+b.dataset.number === 1) { if (b.textContent !== '1') bad++; continue; }
          const e = b.textContent;
          const js = e.replace(/×/g,'*').replace(/÷/g,'/');
          if (eval(js) !== +b.dataset.number) bad++;
          const m = e.match(/[+\-×÷]/);
          if (m) opsCount[m[0]]++;
          exprList.push(e);
        }
        out.push({ diff: d, op: name, bars: bars.length, min: Math.min(...nums), max: Math.max(...nums), dup, bad,
                   ops: `加${opsCount['+']} 减${opsCount['-']} 乘${opsCount['×']} 除${opsCount['÷']}`,
                   exprs: exprList.join(' | ') });
      }
    }
    return out;
  });
  r.forEach(x => {
    console.log(`难度${x.diff}·${x.op}: ${x.bars}条 数字${x.min}..${x.max} 重复[${x.dup.join(',')||'无'}] 算式错${x.bad} 分布(${x.ops})`);
    if (x.bad || x.dup.length) console.log('   ⚠ 算式:', x.exprs);
  });
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
