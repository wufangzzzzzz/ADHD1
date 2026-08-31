const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve('D:/专注力项目/visual-match.html');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const viewports = [
  { name: 'pc',        w: 1280, h: 800 },
  { name: 'ipad_p',    w: 768,  h: 1024 },
  { name: 'ipad_l',    w: 1024, h: 768 },
  { name: 'android_p', w: 800,  h: 1280 },
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let allPass = true;

  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(FILE, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    // 无滚动条检测
    const dims = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      iw: window.innerWidth,
      ih: window.innerHeight,
      opts: document.querySelectorAll('.opt-card').length,
      taskSvg: !!document.querySelector('#task svg'),
    }));
    const noScroll = dims.sw === dims.iw && dims.sh === dims.ih;
    const gridOk = dims.opts === 18 && dims.taskSvg;
    const pass = noScroll && gridOk;
    allPass = allPass && pass;
    console.log(`[${vp.name} ${vp.w}x${vp.h}] ${pass ? 'PASS' : 'FAIL'} | scrollW=${dims.sw}/${dims.iw} scrollH=${dims.sh}/${dims.ih} opts=${dims.opts} taskSvg=${dims.taskSvg}`);

    await page.screenshot({ path: `shot_vm_${vp.name}_${vp.w}x${vp.h}.png` });
  }

  // 交互检测：点正确项 -> 分数+1 且换新题；点错误项 -> 出现 wrong 类
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const before = await page.$eval('#score', e => e.textContent);
  // 找正确项并点击
  const correctHandle = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('.opt-card')].find(c => c.dataset.ans === '1');
  });
  await correctHandle.asElement().click();
  await new Promise(r => setTimeout(r, 1000)); // 等自动换题
  const afterScore = await page.$eval('#score', e => e.textContent);
  const afterOpts = await page.$$eval('.opt-card', els => els.length);

  // 点错误项检测红框
  const wrongHandle = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('.opt-card')].find(c => c.dataset.ans === '0');
  });
  await wrongHandle.asElement().click();
  await new Promise(r => setTimeout(r, 150));
  const wrongClass = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.opt-card')].find(x => x.dataset.ans === '0');
    return c.classList.contains('wrong');
  });

  console.log(`[interaction] score ${before}->${afterScore} (expect +1), newOpts=${afterOpts}, wrongFlash=${wrongClass}`);
  const interPass = (parseInt(afterScore) === parseInt(before)+1) && afterOpts === 18 && wrongClass;
  allPass = allPass && interPass;
  console.log(`[interaction] ${interPass ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log(allPass ? '\nALL PASS' : '\nSOME FAIL');
  process.exit(allPass ? 0 : 1);
})();
