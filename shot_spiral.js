const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 700, deviceScaleFactor: 2 });
  await page.goto('file:///D:/专注力项目/shape_match.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'D:/专注力项目/shot_spiral.png' });
  await browser.close();
  console.log('shot done');
})();
