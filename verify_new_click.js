const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const out = {};
    // 模拟真实点击：展开算数菜单 → 点"加减乘除"进模式
    document.getElementById('arith-mode-btn').click();
    await new Promise(r => setTimeout(r, 100));
    document.querySelector('#arithmetic-menu .arith-op-btn[data-op="all"]').click();
    await new Promise(r => setTimeout(r, 200));
    // 点"专家"难度按钮
    const diffBtns = [...document.querySelectorAll('.difficulty-btn')];
    const zhuanjia = diffBtns.find(b => b.textContent.includes('专家'));
    zhuanjia.click();
    await new Promise(r => setTimeout(r, 300));
    const bars = [...document.querySelectorAll('.pattern11-bar')];
    const nums = bars.map(b => +b.dataset.number);
    out.expertClicked = zhuanjia.textContent;
    out.gridSize = window.game.gridSize;
    out.size = window.game._p11GridSize();
    out.count = window.game._p11Count;
    out.bars = bars.length;
    out.maxNum = Math.max(...nums);
    out.minNum = Math.min(...nums);
    out.unique = new Set(nums).size;
    out.dup = nums.filter((n,i)=>nums.indexOf(n)!==i);
    out.verMark = (document.getElementById('ver-mark')||{}).textContent || '无';
    return out;
  });
  console.log('版本标记:', r.verMark);
  console.log('点"专家"难度按钮 → gridSize=' + r.gridSize + ' 算数网格=' + r.size + '×' + r.size + ' _p11Count=' + r.count);
  console.log('实际条数:', r.bars, ' 数字范围:', r.minNum + '..' + r.maxNum, ' 去重后:', r.unique, ' 重复:', r.dup.length ? r.dup : '无');
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
