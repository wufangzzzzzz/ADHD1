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
    const ops = ['all','add','sub','mul','div','addsub','muldiv'];
    const digs = ['ones','tens'];
    const bad = [];
    let totalCalls = 0;
    for (const op of ops) {
      for (const dg of digs) {
        for (let target = 1; target <= 50; target++) {
          for (let k = 0; k < 60; k++) {
            totalCalls++;
            const e = g._p11GenExpr(target, op, dg);
            const val = eval(e.replace(/×/g,'*').replace(/÷/g,'/'));
            if (val !== target) {
              bad.push({ op, dg, target, expr: e, got: val });
              if (bad.length > 10) break;
            }
          }
          if (bad.length > 10) break;
        }
        if (bad.length > 10) break;
      }
      if (bad.length > 10) break;
    }
    return { totalCalls, bad: bad.slice(0, 10) };
  });
  console.log('genExpr 全量测试（' + r.totalCalls + ' 次调用）:');
  if (!r.bad.length) console.log('  全部返回正确（结果==目标数字）—— 生成器无 bug');
  r.bad.forEach(b => console.log(`  错误: 算子${b.op} 位数${b.dg} target=${b.target} → "${b.expr}" = ${b.got}`));
  await browser.close();
})();
