const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const fileUrl = 'file:///D:/专注力项目/visual-match.html';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  const res = await page.evaluate(() => {
    CFG.transform = 'flipV';
    newRound();
    const bar = document.getElementById('hint-bar');
    const em = bar.querySelector('.hint-em');
    const cs = em ? getComputedStyle(em) : null;
    return {
      html: bar.innerHTML,
      color: cs ? cs.color : null,
      weight: cs ? cs.fontWeight : null,
      shown: bar.classList.contains('show')
    };
  });

  await page.screenshot({ path: 'D:/专注力项目/shot_hint_red.png' });
  await browser.close();
  console.log(JSON.stringify(res, null, 2));
})();
