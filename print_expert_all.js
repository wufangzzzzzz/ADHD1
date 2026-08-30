const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    const ops = [['all','加减乘除'],['add','加'],['sub','减'],['mul','乘'],['div','除'],['addsub','加减'],['muldiv','乘除']];
    const out = [];
    g.setMode('arithmetic');
    g.setDifficulty(7);   // 专家
    for (const [op, name] of ops) {
      g.setArithOp(op);
      g.setArithDigit('ones');
      await new Promise(r => setTimeout(r, 120));
      const bars = [...document.querySelectorAll('.pattern11-bar')].map(b => +b.dataset.number + '=' + b.textContent).sort((a,b)=>+a.split('=')[0]-+b.split('=')[0]);
      const nums = bars.map(x => +x.split('=')[0]);
      const dup = nums.filter((n,i)=>nums.indexOf(n)!==i);
      let bad = 0;
      bars.forEach(x => { const [n, e] = x.split('='); if (eval(e.replace(/×/g,'*').replace(/÷/g,'/')) !== +n) bad++; });
      out.push({ name, bars, dup: [...new Set(dup)], bad });
    }
    return out;
  });
  r.forEach(x => {
    console.log(`\n=== 专家难度 · 算子「${x.name}」：${x.bars.length}块  重复数字:${x.dup.length?x.dup:'无'}  算式错误:${x.bad} ===`);
    console.log(x.bars.join('  '));
  });
  await browser.close();
})();
