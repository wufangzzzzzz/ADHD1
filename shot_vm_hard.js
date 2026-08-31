const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('visual-match.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1180, height: 820 });
  await page.goto(FILE, { waitUntil: 'networkidle0' });

  const shots = [
    { name: 'shot_hard_g2_none',  diff:'hard', g:2, t:'none',     f:2 },
    { name: 'shot_hard_g3_none',  diff:'hard', g:3, t:'none',     f:3 },
    { name: 'shot_hard_g2_rot90', diff:'hard', g:2, t:'rot90',    f:2 },
    { name: 'shot_normal_g2',     diff:'normal', g:2, t:'none',   f:2 },
  ];
  for (const s of shots) {
    await page.evaluate((s) => {
      CFG.difficulty=s.diff; CFG.gridN=s.g; CFG.transform=s.t; CFG.fillCount=s.f;
      newRound();
    }, s);
    await new Promise(r => setTimeout(r, 120));
    await page.screenshot({ path: s.name + '.png' });
    console.log('shot', s.name);
  }
  await browser.close();
})();
