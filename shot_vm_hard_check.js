const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const fileUrl = 'file:///D:/专注力项目/visual-match.html';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  for (let i=0; i<3; i++) {
    await page.evaluate(() => {
      CFG.difficulty='hard'; CFG.gridN=2; CFG.fillCount=2; CFG.transform='none'; CFG.shapeColor='black';
      newRound();
    });
    await new Promise(r=>setTimeout(r,120));
    await page.screenshot({ path: `D:/专注力项目/shot_hard_check_${i}.png` });
  }

  // 9 方块硬模式也截一张
  await page.evaluate(() => { CFG.gridN=3; CFG.fillCount=2; newRound(); });
  await new Promise(r=>setTimeout(r,120));
  await page.screenshot({ path: 'D:/专注力项目/shot_hard_check_g3.png' });

  await browser.close();
  console.log('done');
})();
