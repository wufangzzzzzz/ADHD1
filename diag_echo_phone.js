const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/G2-echo.html';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 375, height: 720 });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 400));

  const r = await page.evaluate(() => {
    const left = document.querySelector('.land-left');
    const right = document.querySelector('.land-right');
    const keypad = document.getElementById('keypad');
    const startBtn = document.getElementById('startGameBtn');
    const lr = left.getBoundingClientRect();
    const rr = right.getBoundingClientRect();
    const kr = keypad.getBoundingClientRect();
    return {
      leftTop: Math.round(lr.top), leftH: Math.round(lr.height), leftBottom: Math.round(lr.bottom),
      rightTop: Math.round(rr.top), rightH: Math.round(rr.height), rightBottom: Math.round(rr.bottom),
      keypadTop: Math.round(kr.top), keypadBottom: Math.round(kr.bottom),
      startBtnVisible: startBtn ? (startBtn.getBoundingClientRect().top < window.innerHeight) : null,
      containerScrollH: document.querySelector('.container').scrollHeight,
      containerClientH: document.querySelector('.container').clientHeight,
      vh: window.innerHeight,
    };
  });
  console.log('手机竖屏 375x720 详情:', JSON.stringify(r, null, 2));
  console.log('键盘完整可见:', r.keypadBottom <= r.vh ? '是' : '否(被裁切)');
  const realErrors = errors.filter(e => !e.includes('fonts.googleapis') && !e.includes('Failed to load resource') && !e.includes('404'));
  console.log('报错:', realErrors.length ? realErrors.join(' | ') : '无');

  await page.screenshot({ path: 'D:/专注力项目/echo_phone.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
