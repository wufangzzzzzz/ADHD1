const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/number-focus.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 400 });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof buildKeypad === 'function', { timeout: 10000 });
  await page.evaluate(() => { contentType='number'; generateItems(); canInput=true; hideItems(); buildKeypad(); setCursor(0); });
  await new Promise(r => setTimeout(r, 300));
  const m = await page.evaluate(() => {
    const kp = document.getElementById('keypad').getBoundingClientRect();
    const grid = document.getElementById('gridContainer').getBoundingClientRect();
    return { vh: window.innerHeight, keypadTop: Math.round(kp.top), keypadBottom: Math.round(kp.bottom), gridBottom: Math.round(grid.bottom), overflow: kp.bottom > window.innerHeight };
  });
  console.log('[landscape 800x400]', JSON.stringify(m));
  await browser.close();
})();
