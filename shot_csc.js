const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8123/color-spiral-connect.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const shapes = [['0','circle'], ['1','triangle'], ['2','square']];
  for (const [dataShape, name] of shapes) {
    await page.evaluate((ds) => {
      const btn = document.querySelector(`#grpSpiral .seg-btn[data-shape="${ds}"]`);
      if (btn) btn.click();
    }, dataShape);
    await new Promise(r => setTimeout(r, 500));
    // screenshot just the canvas box
    const el = await page.$('#canvasBox');
    if (el) {
      await el.screenshot({ path: `D:/专注力项目/shot_${name}.png` });
    } else {
      await page.screenshot({ path: `D:/专注力项目/shot_${name}.png` });
    }
    console.log('saved', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
