const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/G2-echo.html';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const views = [
    { name: '手机竖屏', w: 375, h: 720 },
    { name: '平板竖屏', w: 768, h: 1024 },
    { name: '平板横屏', w: 1024, h: 768 },
    { name: '桌面', w: 1280, h: 800 },
  ];
  for (const v of views) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width: v.w, height: v.h });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 400));
    const r = await page.evaluate(() => {
      const container = document.querySelector('.container');
      const left = document.querySelector('.land-left');
      const right = document.querySelector('.land-right');
      const keypad = document.getElementById('keypad');
      const keyBtn = document.querySelector('.key-btn');
      const cs = container ? getComputedStyle(container) : null;
      const ls = left ? getComputedStyle(left) : null;
      const rs = right ? getComputedStyle(right) : null;
      return {
        containerDir: cs ? cs.flexDirection : 'none',
        containerW: container ? Math.round(container.getBoundingClientRect().width) : -1,
        leftW: left ? Math.round(left.getBoundingClientRect().width) : -1,
        rightW: right ? Math.round(right.getBoundingClientRect().width) : -1,
        keypadW: keypad ? Math.round(keypad.getBoundingClientRect().width) : -1,
        keyBtnW: keyBtn ? Math.round(keyBtn.getBoundingClientRect().width) : -1,
        bodyScrollW: document.body.scrollWidth,
        innerW: window.innerWidth,
      };
    });
    const realErrors = errors.filter(e => !e.includes('fonts.googleapis') && !e.includes('Failed to load resource') && !e.includes('404'));
    console.log(`\n[${v.name} ${v.w}x${v.h}]`);
    console.log('  container方向=' + r.containerDir + ' 容器宽=' + r.containerW + ' 左栏宽=' + r.leftW + ' 右栏宽=' + r.rightW + ' 键盘宽=' + r.keypadW + ' 按键宽=' + r.keyBtnW);
    console.log('  innerW=' + r.innerW + ' bodyScrollW=' + r.bodyScrollW + ' 水平溢出=' + (r.bodyScrollW > r.innerW));
    console.log('  报错=' + (realErrors.length ? realErrors.join(' | ') : '无'));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
