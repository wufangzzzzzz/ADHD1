const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8123/shape_match.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'D:/专注力项目/shot_shape.png' });
  await browser.close();
  console.log('shot done');
})();
