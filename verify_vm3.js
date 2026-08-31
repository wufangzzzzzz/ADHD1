const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file://' + path.resolve('visual-match.html');

const VIEWPORTS = [
  ['pc', 1280, 800],
  ['ipad_p', 768, 1024],
  ['ipad_l', 1024, 768],
  ['android_p', 800, 1280],
];

function noScroll(page) {
  return page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: window.innerWidth, h: document.documentElement.scrollHeight, ih: window.innerHeight }));
}

async function applySettings(page, mode, fillCount, gridN, colorVals) {
  await page.evaluate(() => document.getElementById('set-btn').click());
  await new Promise(r => setTimeout(r, 120));
  await page.evaluate((m) => { document.querySelector(`.seg[data-key="colorMode"] button[data-v="${m}"]`).click(); }, mode);
  if (fillCount) await page.evaluate((f) => { document.querySelector(`.seg[data-key="fillCount"] button[data-v="${f}"]`).click(); }, String(fillCount));
  if (gridN) await page.evaluate((g) => { document.querySelector(`.seg[data-key="gridN"] button[data-v="${g}"]`).click(); }, String(gridN));
  await new Promise(r => setTimeout(r, 120));
  if (mode === 'same' && colorVals) {
    await page.evaluate((c) => { const el = document.getElementById('sameColor'); el.value = c; el.dispatchEvent(new Event('input',{bubbles:true})); }, colorVals[0]);
  }
  if (mode === 'diff' && colorVals) {
    for (let i=0;i<colorVals.length;i++){
      await page.evaluate((idx,c) => { const el = document.querySelector(`#color-extra input[data-di="${idx}"]`); if(el){ el.value = c; el.dispatchEvent(new Event('input',{bubbles:true})); } }, i, colorVals[i]);
    }
  }
  await new Promise(r => setTimeout(r, 120));
  await page.evaluate(() => document.getElementById('set-apply').click());
  await new Promise(r => setTimeout(r, 200));
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  const logs = [];
  const ok = (n,c) => logs.push((c?'PASS':'FAIL')+' '+n);

  // 1) 默认(黑,4方块) 四端无滚动条 + 18选项
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  for (const [n,w,h] of VIEWPORTS) {
    await page.setViewport({ width: w, height: h });
    await new Promise(r=>setTimeout(r,150));
    const s = await noScroll(page);
    const cnt = await page.$$eval('.opt-card', els => els.length);
    ok(`default ${n} no-scroll (${s.w}x${s.h}/${s.iw}x${s.ih}, opts=${cnt})`, s.w===s.iw && s.h===s.ih && cnt===18);
  }

  // 2) 同色自定义：设红色 #ff0000，验证题目已填三角 fill=该色
  await applySettings(page, 'same', 2, 2, ['#ff0000']);
  const sameFills = await page.evaluate(() => {
    const polys = [...document.querySelectorAll('#task svg polygon')];
    return [...new Set(polys.filter(p=>p.getAttribute('fill')!=='#fff').map(p=>p.getAttribute('fill')))];
  });
  ok('same mode uses custom color #ff0000', sameFills.length===1 && sameFills[0]==='#ff0000');
  await page.screenshot({ path: 'shot_vm_same.png' });

  // 3) 异色每三角自定义：填2个不同色，验证题目有2种不同填充色
  await applySettings(page, 'diff', 2, 2, ['#00ff00','#0000ff']);
  const diffFills = await page.evaluate(() => {
    const polys = [...document.querySelectorAll('#task svg polygon')];
    return [...new Set(polys.filter(p=>p.getAttribute('fill')!=='#fff').map(p=>p.getAttribute('fill')))];
  });
  ok('diff mode two distinct custom colors', diffFills.length===2 && diffFills.includes('#00ff00') && diffFills.includes('#0000ff'));
  await page.screenshot({ path: 'shot_vm_diff.png' });

  // 4) 9方块(36三角) 四端无滚动条
  await applySettings(page, 'black', 2, 3, null);
  const triCount = await page.evaluate(() => document.querySelectorAll('#task svg polygon').length);
  ok('9 blocks -> 36 triangles', triCount===36);
  for (const [n,w,h] of VIEWPORTS) {
    await page.setViewport({ width: w, height: h });
    await new Promise(r=>setTimeout(r,150));
    const s = await noScroll(page);
    ok(`9block ${n} no-scroll`, s.w===s.iw && s.h===s.ih);
  }

  // 5) 打印区：调用 buildPrint，验证生成 18 个 .p-cell 且含题目
  await page.evaluate(() => buildPrint());
  const printInfo = await page.evaluate(() => {
    const pa = document.getElementById('print-area');
    return { cells: pa.querySelectorAll('.p-cell').length, hasTask: !!pa.querySelector('.p-task svg'), hasOpts: !!pa.querySelector('.p-opts'), len: pa.innerHTML.length };
  });
  ok('print area 18 cells + task + opts', printInfo.cells===18 && printInfo.hasTask && printInfo.hasOpts && printInfo.len>0);

  // 6) 交互：点正确项得分+1
  await page.evaluate(() => { window.CFG.colorMode='black'; newRound(); });
  const before = await page.$eval('#score', e=>e.textContent);
  const correctIdx = await page.evaluate(() => [...document.querySelectorAll('.opt-card')].findIndex(c=>c.dataset.ans==='1'));
  await page.evaluate((i)=>document.querySelectorAll('.opt-card')[i].click(), correctIdx);
  await new Promise(r=>setTimeout(r,150));
  const after = await page.$eval('#score', e=>e.textContent);
  ok('click correct increments score', Number(after)===Number(before)+1);

  await browser.close();
  console.log(logs.join('\n'));
  console.log(logs.every(l=>l.startsWith('PASS')) ? '\nALL PASS' : '\nSOME FAILED');
})().catch(e => { console.error(e); process.exit(1); });
