const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(() => {
    const menu = document.getElementById('arithmetic-menu');
    const btn = document.getElementById('arith-mode-btn');
    const res = {};
    res.menuHTML = menu ? menu.innerHTML.slice(0, 400) : 'NO_MENU';
    res.opCount = menu ? menu.querySelectorAll('.arith-op-btn').length : -1;
    const divBtn = menu ? menu.querySelector('.arith-op-btn[data-op="div"]') : null;
    res.divBtnFound = !!divBtn;
    // 展开后再查
    if (btn) btn.click();
    const divBtn2 = menu ? menu.querySelector('.arith-op-btn[data-op="div"]') : null;
    res.divBtnFoundAfterClick = !!divBtn2;
    res.allOps = menu ? [...menu.querySelectorAll('.arith-op-btn')].map(x => x.getAttribute('data-op')).join(',') : 'NONE';
    return res;
  });
  console.log('菜单HTML:', r.menuHTML);
  console.log('算子项数:', r.opCount, ' div项(前):', r.divBtnFound, ' div项(展开后):', r.divBtnFoundAfterClick);
  console.log('全部算子data-op:', r.allOps);
  await browser.close();
})();
