const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = 'D:/专注力项目/visual-match.html';

const edgeCandidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  (process.env.LOCALAPPDATA || '') + '/Microsoft/Edge/Application/msedge.exe'
];
const exe = edgeCandidates.find(p => p && fs.existsSync(p));

function urlOf(p){ return 'file:///' + p.replace(/\\/g, '/'); }

(async () => {
  if (!exe) { console.log('NO_EDGE_FOUND'); process.exit(2); }
  console.log('EDGE:', exe);
  const browser = await puppeteer.launch({
    executablePath: exe, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'pc_1280x800',  w: 1280, h: 800 },
    { name: 'ipad_p_768x1024',  w: 768,  h: 1024 },
    { name: 'ipad_l_1024x768',  w: 1024, h: 768 },
    { name: 'android_p_800x1280', w: 800, h: 1280 }
  ];

  let allPass = true;
  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(urlOf(path), { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 350));
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      return {
        sw: de.scrollWidth, sh: de.scrollHeight,
        iw: window.innerWidth, ih: window.innerHeight,
        optCount: document.querySelectorAll('#grid .opt').length,
        gridDisplay: getComputedStyle(document.getElementById('grid')).display,
        gridCols: getComputedStyle(document.getElementById('grid')).gridTemplateColumns.split(' ').length
      };
    });
    const noH = m.sw <= m.iw + 1;
    const noV = m.sh <= m.ih + 1;
    const pass = noH && noV && m.optCount === 18 && m.gridCols === 6;
    if (!pass) allPass = false;
    console.log(`[${vp.name}] viewport=${m.iw}x${m.ih} content=${m.sw}x${m.sh} opt=${m.optCount} cols=${m.gridCols} ${pass ? 'PASS' : 'FAIL'}${noH ? '' : ' HSCROLL'}${noV ? '' : ' VSCROLL'}`);
    await page.screenshot({ path: 'D:/专注力项目/shot_vm_' + vp.name + '.png' });
    await page.close();
  }

  // 交互测试：在 iPad 横屏下找到正确项并点击，验证计分+下一题
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(urlOf(path), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 350));
  const idx = await page.evaluate(() => {
    const qps = [...document.querySelectorAll('#question svg polygon')]
      .filter(p => p.getAttribute('fill') === '#FF7043')
      .map(p => p.getAttribute('points')).sort().join('|');
    const opts = [...document.querySelectorAll('#grid .opt')];
    for (let i = 0; i < opts.length; i++) {
      const ps = [...opts[i].querySelectorAll('polygon')]
        .filter(p => p.getAttribute('fill') === '#FF7043')
        .map(p => p.getAttribute('points')).sort().join('|');
      if (ps === qps) return i;
    }
    return -1;
  });
  console.log('correctIndex=', idx);
  let interOk = idx < 0;
  if (idx >= 0) {
    await page.click(`#grid .opt:nth-child(${idx + 1})`);
    await new Promise(r => setTimeout(r, 200));
    const res = await page.evaluate(() => ({
      nextShown: !document.getElementById('next').hidden,
      score: document.getElementById('score').textContent,
      correctMarked: !!document.querySelectorAll('#grid .opt.correct').length
    }));
    interOk = res.nextShown && res.score === '1' && res.correctMarked;
    console.log('after correct click:', JSON.stringify(res), interOk ? 'INTER_OK' : 'INTER_FAIL');
  } else {
    console.log('INTER_FAIL: correct option not found');
  }

  await browser.close();
  console.log(allPass && interOk ? 'ALL_PASS' : 'HAS_FAIL');
})().catch(e => { console.error('ERR', e); process.exit(1); });
