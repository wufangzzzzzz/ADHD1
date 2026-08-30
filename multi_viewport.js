const puppeteer = require('puppeteer-core');

const VIEWS = [
  { name: 'phone', w: 375, h: 720 },
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'desktop', w: 1280, h: 900 },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  for (const v of VIEWS) {
    const page = await browser.newPage();
    await page.setViewport({ width: v.w, height: v.h });
    await page.goto('http://127.0.0.1:8137/schulte-grid.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const r1 = await page.evaluate(() => {
      const tb = document.querySelector('.top-bar');
      const group = document.querySelector('.mode-group');
      const rows = Math.round(group.scrollHeight / group.clientHeight) || 1;
      return {
        topBarMaxW: getComputedStyle(tb).maxWidth,
        topBarOverflow: tb.scrollWidth - tb.clientWidth,
        btnCount: group.querySelectorAll('button').length,
        groupWrapRows: rows,
      };
    });

    // 展开图案菜单看是否越界
    await page.click('#pattern-mode-btn');
    await new Promise(r => setTimeout(r, 300));
    const r2 = await page.evaluate(() => {
      const m = document.getElementById('pattern-menu');
      const rect = m.getBoundingClientRect();
      return {
        menuVisible: getComputedStyle(m).display !== 'none',
        menuRight: Math.round(rect.right),
        menuOverflowRight: Math.round(rect.right - window.innerWidth),
      };
    });
    await page.click('#pattern-mode-btn'); // 收起
    await page.screenshot({ path: `D:/专注力项目/vp_${v.name}.png` });

    console.log(`[${v.name}] default=`, JSON.stringify(r1), 'menu=', JSON.stringify(r2));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
