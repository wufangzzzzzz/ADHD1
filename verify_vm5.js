const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('visual-match.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  await page.goto(FILE, { waitUntil: 'networkidle0' });

  const configs = [];
  ['normal','hard'].forEach(diff => ['2','3'].forEach(g =>
    ['none','rot90','rot270','flipV','flipH'].forEach(t =>
      configs.push({diff, g, t}))));
  const viewports = [[1280,800],[768,1024],[1024,768],[800,1280]];

  let pass = 0, fail = 0;
  const failLog = [];

  // ---- 1) 纯逻辑：变换可逆 + 唯一正确项 ----
  for (const c of configs) {
    const r = await page.evaluate((c) => {
      CFG.difficulty = c.diff; CFG.gridN = +c.g; CFG.transform = c.t; CFG.fillCount = 3;
      const inv = { rot90:'rot270', rot270:'rot90', flipV:'flipV', flipH:'flipH', none:'none' }[c.t];
      const p = generatePuzzle();
      const correct = transformFilled(p.answer, c.t);
      const back = transformFilled(correct, inv);
      const eq = (a,b)=> a.length===b.length && a.every((v,i)=>v===b[i]);
      // 选项里等于 correct 的数量
      let cnt = 0; p.options.forEach(o => { if (eq(o, correct)) cnt++; });
      return { reversible: eq(back, p.answer), cntOne: cnt === 1, fill: p.answer.length, correctLen: correct.length };
    }, c);
    if (!r.reversible) { fail++; failLog.push(`[逻辑] ${c.diff} g${c.g} ${c.t}: 变换不可逆`); }
    else pass++;
    if (!r.cntOne) { fail++; failLog.push(`[逻辑] ${c.diff} g${c.g} ${c.t}: 正确项数量=${r.cntOne}`); }
    else pass++;
  }

  // ---- 2) 渲染 + 无滚动条 + 超难几何 ----
  for (const vp of viewports) {
    for (const c of configs) {
      await page.setViewport({ width: vp[0], height: vp[1] });
      await page.evaluate((c) => {
        CFG.difficulty = c.diff; CFG.gridN = +c.g; CFG.transform = c.t; CFG.fillCount = 3;
        newRound();
      }, c);
      const res = await page.evaluate(() => {
        const de = document.documentElement;
        const noScroll = (de.scrollWidth <= window.innerWidth + 1) && (de.scrollHeight <= window.innerHeight + 1);
        const task = document.getElementById('task').innerHTML;
        const pathCount = (task.match(/<path/g) || []).length;
        const circleCount = (task.match(/<circle/g) || []).length;
        const polyCount = (task.match(/<polygon/g) || []).length;
        const optCount = document.querySelectorAll('.opt-card').length;
        return { noScroll, pathCount, circleCount, polyCount, optCount };
      });
      let ok = res.noScroll && res.optCount === 18;
      if (c.diff === 'hard') ok = ok && res.circleCount >= 1 && res.polyCount === 0 && res.pathCount === 3;
      else ok = ok && res.polyCount >= 1; // normal uses polygons
      if (!ok) { fail++; failLog.push(`[渲染] ${vp[0]}x${vp[1]} ${c.diff} g${c.g} ${c.t}: ${JSON.stringify(res)}`); }
      else pass++;
    }
  }

  // ---- 3) 交互：点正确项得分+1 ----
  await page.setViewport({ width: 1280, height: 800 });
  const inter = await page.evaluate(() => {
    CFG.difficulty='hard'; CFG.gridN=2; CFG.transform='rot90'; CFG.fillCount=2;
    newRound();
    const before = +document.getElementById('score').textContent;
    const card = [...document.querySelectorAll('.opt-card')].find(c => c.dataset.ans === '1');
    card.click();
    return { before, after: +document.getElementById('score').textContent, hasCorrect: card.classList.contains('correct') };
  });
  if (inter.after === inter.before + 1 && inter.hasCorrect) pass++;
  else { fail++; failLog.push(`[交互] 点正确项: ${JSON.stringify(inter)}`); }

  await browser.close();
  console.log(`PASS=${pass}  FAIL=${fail}`);
  if (failLog.length) console.log(failLog.join('\n'));
  if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exit(fail ? 1 : 0);
})();
