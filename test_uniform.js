const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 800, height: 800 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const r = await p.evaluate(() => {
    document.querySelector('#grpSpiral .seg-btn[data-shape="2"]').click();
    const C = window.__csc;
    const obs = () => C.getPts().filter(x=>!x.isTarget);
    const cols = a => [...new Set(a.map(x=>x.color))];
    const colorful = cols(obs());
    // 点"统一色"按钮
    document.querySelector('#grpObsColor .seg-btn[data-obs="uniform"]').click();
    const uni1 = obs();
    const uni1set = cols(uni1);
    // 选蓝色
    const pick = document.getElementById('obsColorPick');
    pick.value = '#3498db'; pick.dispatchEvent(new Event('input', {bubbles:true}));
    const uni2 = obs();
    const uni2set = cols(uni2);
    return {
      colorfulSet: colorful,
      uni1Count: uni1.length, uni1Set: uni1set, uni1Sample: uni1.slice(0,4).map(x=>x.color),
      uni2Count: uni2.length, uni2Set: uni2set, uni2Sample: uni2.slice(0,4).map(x=>x.color),
      targetColor: C.getPts().filter(x=>x.isTarget)[0].color
    };
  });
  console.log('默认彩色 色集:', r.colorfulSet.join(','));
  console.log('切统一色: 干扰数', r.uni1Count, ' 色集:', JSON.stringify(r.uni1Set), ' 样例:', r.uni1Sample.join(','));
  console.log('选蓝后: 干扰数', r.uni2Count, ' 色集:', JSON.stringify(r.uni2Set), ' 样例:', r.uni2Sample.join(','));
  console.log('目标球色:', r.targetColor);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await b.close();
})();
