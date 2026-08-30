const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const msgs = [];
  page.on('console', m => { if (m.type() === 'error') msgs.push(m.text()); });
  await page.goto('http://127.0.0.1:8124/schulte-grid.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const defaultState = await page.evaluate(() => {
    const tb = document.querySelector('.top-bar');
    const group = document.querySelector('.mode-group');
    return {
      topBarMaxWidth: getComputedStyle(tb).maxWidth,
      topBarScrollW: tb.scrollWidth,
      topBarClientW: tb.clientWidth,
      overflow: tb.scrollWidth - tb.clientWidth,
      btnCount: group.querySelectorAll('button').length,
    };
  });

  // 展开图案菜单
  await page.click('#pattern-mode-btn');
  await new Promise(r => setTimeout(r, 400));
  const menuState = await page.evaluate(() => {
    const menu = document.getElementById('pattern-menu');
    const r = menu.getBoundingClientRect();
    return {
      menuVisible: getComputedStyle(menu).display !== 'none',
      menuRight: Math.round(r.right),
      menuLeft: Math.round(r.left),
      viewportW: window.innerWidth,
      menuOverflowRight: Math.round(r.right - window.innerWidth),
    };
  });

  await page.screenshot({ path: 'D:/专注力项目/menu_check.png' });

  console.log('DEFAULT:', JSON.stringify(defaultState));
  console.log('PATTERN MENU:', JSON.stringify(menuState));
  console.log('CONSOLE ERRORS:', JSON.stringify(msgs));
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
