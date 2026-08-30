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
    g.setArithOp('all'); g.setArithDigit('ones');
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const out = {};
    const container = document.getElementById('grid-container');
    out.bg = getComputedStyle(container).backgroundColor;   // 期望 rgb(199,199,199)
    // 收集各运算符条的颜色
    const byOp = { add: [], sub: [], mul: [], div: [] };
    let bad = 0, count = 0;
    for (const b of document.querySelectorAll('.pattern11-bar')) {
      count++;
      const e = b.textContent;
      const num = +b.dataset.number;
      if (num === 1) {
        // 数字1：直接显示 "1"、黑色、无颜色类
        if (e !== '1') { bad++; }
        if (getComputedStyle(b).color !== 'rgb(0, 0, 0)') { bad++; }
        if (b.className.includes('p11-c-')) { bad++; }
        continue;
      }
      const js = e.replace(/×/g,'*').replace(/÷/g,'/');
      if (eval(js) !== num) bad++;
      const color = getComputedStyle(b).color;
      const op = e.match(/[+\-×÷]/)[0];
      const key = op === '+' ? 'add' : op === '-' ? 'sub' : op === '×' ? 'mul' : 'div';
      byOp[key].push(color);
    }
    out.oneOK = true;   // 数字1 条检查通过（bad 不增加）
    out.count = count; out.bad = bad;
    out.colors = {};
    for (const k in byOp) {
      out.colors[k] = byOp[k].length ? byOp[k][0] : '(无此算子条)';
      // 检查同类型颜色一致
      out.colors[k + 'Same'] = byOp[k].every(c => c === byOp[k][0]);
    }
    return out;
  });
  console.log('背景(期望 rgb(199,199,199)=78%灰):', r.bg);
  console.log('条数:', r.count, ' 算式错误(期望0):', r.bad);
  console.log('加(期望红 #e53935→rgb(229,57,53)):', r.colors.add, ' 同类一致:', r.colors.addSame);
  console.log('减(期望蓝 #1e88e5→rgb(30,136,229)):', r.colors.sub, ' 同类一致:', r.colors.subSame);
  console.log('乘(期望橙 #fb8c00→rgb(251,140,0)):', r.colors.mul, ' 同类一致:', r.colors.mulSame);
  console.log('除(期望绿 #43a047→rgb(67,160,71)):', r.colors.div, ' 同类一致:', r.colors.divSame);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
