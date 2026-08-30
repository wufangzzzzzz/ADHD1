const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(async () => {
    const g = window.game;
    g.setArithOp('all'); g.setArithDigit('ones');
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const c = document.getElementById('grid-container');
    c.style.margin = '20px auto';
    // 统计
    const bars = [...document.querySelectorAll('.pattern11-bar')];
    const nums = bars.map(b => +b.dataset.number);
    const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
    window.__shotInfo = { count: bars.length, dupNums: [...new Set(dup)], nums: nums.join(',') };
  });
  await new Promise(r => setTimeout(r, 200));
  const info = await page.evaluate(() => window.__shotInfo);
  await page.screenshot({ path: 'D:/专注力项目/算数模式_当前版本.png', fullPage: true });
  console.log('块数:', info.count, ' 重复数字:', info.dupNums.length ? info.dupNums : '无', ' 数字:', info.nums);
  console.log('截图已保存');
  await browser.close();
})();
