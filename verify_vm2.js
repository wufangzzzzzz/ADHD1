const puppeteer = require('puppeteer-core');
const path = require('path');

const FILE = 'file://' + path.resolve('D:/专注力项目/visual-match.html');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const viewports = [
  { name: 'pc',        w: 1280, h: 800 },
  { name: 'ipad_p',    w: 768,  h: 1024 },
  { name: 'ipad_l',    w: 1024, h: 768 },
  { name: 'android_p', w: 800,  h: 1280 },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let allPass = true;

  // 1) 四端默认无滚动条 + 18 选项
  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(FILE, { waitUntil: 'networkidle0' });
    await sleep(250);
    const d = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      sh: document.documentElement.scrollHeight, ih: window.innerHeight,
      opts: document.querySelectorAll('.opt-card').length,
      taskSvg: !!document.querySelector('#task svg'),
    }));
    const pass = d.sw === d.iw && d.sh === d.ih && d.opts === 18 && d.taskSvg;
    allPass = allPass && pass;
    console.log(`[${vp.name} ${vp.w}x${vp.h}] ${pass?'PASS':'FAIL'} | scroll ${d.sw}/${d.iw},${d.sh}/${d.ih} opts=${d.opts}`);
    await page.screenshot({ path: `shot_vm_${vp.name}_${vp.w}x${vp.h}.png` });
  }

  // 2) 切换到 9 大方块 (3x3=36 三角)，四端无滚动条 + 题目 polygon=36
  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(FILE, { waitUntil: 'networkidle0' });
    await sleep(200);
    await page.click('#set-btn');
    await sleep(100);
    await page.click('.seg[data-key="gridN"] button[data-v="3"]');
    await page.click('#set-apply');
    await sleep(250);
    const d = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      sh: document.documentElement.scrollHeight, ih: window.innerHeight,
      polys: document.querySelectorAll('#task svg polygon').length,
      opts: document.querySelectorAll('.opt-card').length,
    }));
    const pass = d.sw === d.iw && d.sh === d.ih && d.polys === 36 && d.opts === 18;
    allPass = allPass && pass;
    console.log(`[9block ${vp.name} ${vp.w}x${vp.h}] ${pass?'PASS':'FAIL'} | scroll ${d.sw}/${d.iw},${d.sh}/${d.ih} polys=${d.polys} opts=${d.opts}`);
  }

  // 3) 彩色模式 + 默认4方块：题目有彩色 polygon
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await sleep(200);
  await page.click('#set-btn');
  await sleep(80);
  await page.click('.seg[data-key="colorMode"] button[data-v="color"]');
  await page.click('#set-apply');
  await sleep(250);
  const colorInfo = await page.evaluate(() => {
    const polys = [...document.querySelectorAll('#task svg polygon')];
    const filled = polys.filter(p => p.getAttribute('fill') !== '#fff');
    const fills = filled.map(p => p.getAttribute('fill'));
    const isColorful = fills.some(f => f !== '#000000' && f !== '#fff');
    return { total: polys.length, filledCount: filled.length, fills, isColorful };
  });
  const colorPass = colorInfo.filledCount === 2 && colorInfo.isColorful;
  allPass = allPass && colorPass;
  console.log(`[color mode] ${colorPass?'PASS':'FAIL'} | filled=${colorInfo.filledCount} fills=${JSON.stringify(colorInfo.fills)} colorful=${colorInfo.isColorful}`);

  // 4) 交互：点正确 +1；点错误红框
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await sleep(200);
  const before = await page.$eval('#score', e => e.textContent);
  const correct = await page.evaluateHandle(() => [...document.querySelectorAll('.opt-card')].find(c => c.dataset.ans === '1'));
  await correct.asElement().click();
  await sleep(950);
  const afterScore = await page.$eval('#score', e => e.textContent);
  const afterOpts = await page.$$eval('.opt-card', els => els.length);
  const wrong = await page.evaluateHandle(() => [...document.querySelectorAll('.opt-card')].find(c => c.dataset.ans === '0'));
  await wrong.asElement().click();
  await sleep(120);
  const wrongClass = await page.evaluate(() => [...document.querySelectorAll('.opt-card')].find(x => x.dataset.ans === '0').classList.contains('wrong'));
  const interPass = (parseInt(afterScore) === parseInt(before)+1) && afterOpts === 18 && wrongClass;
  allPass = allPass && interPass;
  console.log(`[interaction] ${interPass?'PASS':'FAIL'} | score ${before}->${afterScore} newOpts=${afterOpts} wrongFlash=${wrongClass}`);

  await browser.close();
  console.log(allPass ? '\nALL PASS' : '\nSOME FAIL');
  process.exit(allPass ? 0 : 1);
})();
