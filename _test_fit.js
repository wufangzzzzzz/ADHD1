const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/专注力项目/math-sheep.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VIEWS = [
  { name: '手机竖屏 390x844', w: 390, h: 844 },
  { name: '手机横屏 844x390', w: 844, h: 390 },
  { name: '平板竖屏 768x1024', w: 768, h: 1024 },
  { name: '平板横屏 1024x768', w: 1024, h: 768 },
  { name: 'PC 1280x800', w: 1280, h: 800 },
  { name: '小窗 360x640', w: 360, h: 640 }
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const out = [];

  for (const v of VIEWS) {
    await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(450);
    // 开局（会让出题区/结算区文案变化）后再测一次
    await page.click('#ms-start');
    await sleep(450);

    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const vw = window.innerWidth, vh = window.innerHeight;
      const app = document.querySelector('.ms-app');
      const tf = getComputedStyle(app).transform;
      let scale = 1;
      if (tf && tf !== 'none') {
        const m = tf.match(/matrix\(([-\d.]+)/);
        if (m) scale = parseFloat(m[1]);
      }
      function box(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) };
      }
      const parts = { head: box('.ms-head'), ctrl: box('.ms-ctrl'), play: box('.ms-play'), result: box('.ms-result'), pasture: box('#ms-pasture') };
      const cellEl = document.querySelector('#ms-pasture .ms-cell');
      const cb = cellEl ? cellEl.getBoundingClientRect() : null;
      return {
        vw, vh,
        docScrollH: de.scrollHeight, docScrollW: de.scrollWidth,
        bodyScrollH: document.body.scrollHeight, bodyScrollW: document.body.scrollWidth,
        canScrollY: de.scrollHeight > vh + 1,
        canScrollX: de.scrollWidth > vw + 1,
        scale: +scale.toFixed(4),
        parts,
        cell: cb ? { w: +cb.width.toFixed(1), h: +cb.height.toFixed(1), square: Math.abs(cb.width - cb.height) < 1.5 } : null,
        allInside: Object.keys(parts).every(k => parts[k] && parts[k].top >= -1 && parts[k].bottom <= vh + 1 && parts[k].left >= -1 && parts[k].right <= vw + 1)
      };
    });
    out.push({ view: v.name, ...r });
  }

  console.log(JSON.stringify({ views: out, ERRORS: errors }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
