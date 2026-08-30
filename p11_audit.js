const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--force-color-profile=srgb']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 920, height: 920, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8123/schulte-grid.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));

  // 进入图案11
  await page.click('#pattern-mode-btn');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const items = document.querySelectorAll('#pattern-menu .mode-menu-item');
    for (const it of items) { if (it.dataset.sub === '11') { it.click(); break; } }
  });
  await new Promise(r => setTimeout(r, 700));

  const info = await page.evaluate(() => {
    const container = document.getElementById('grid-container');
    const cellEls = container.querySelectorAll('.p11-cell');
    const bs = container.querySelectorAll('.p11-b');
    const DELAY = [0.5, 0.4, 0.3, 0.185, 0.0];
    const T = 3.4;
    const gridSize = window.game ? window.game.gridSize : null;
    let phaseOK = true; const detail = [];
    if (gridSize) {
      let i = 0;
      for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) {
        const phase = (r + c) % 5;
        const expected = (-DELAY[phase] * T);
        const got = parseFloat(bs[i].style.animationDelay);
        if (Math.abs(got - expected) > 0.01) { phaseOK = false; detail.push('(' + r + ',' + c + ') got=' + got + ' exp=' + expected.toFixed(3)); }
        i++;
      }
    }
    return {
      cellCount: cellEls.length,
      aCount: container.querySelectorAll('.p11-a').length,
      bCount: bs.length,
      numCount: container.querySelectorAll('.p11-num').length,
      gridSize: gridSize,
      phaseOK: phaseOK,
      detail: detail,
      bg: container.style.background,
      firstNum: container.querySelector('.p11-num') ? container.querySelector('.p11-num').textContent : null,
      btnText: (document.getElementById('pattern-mode-btn') || {}).textContent
    };
  });

  // 验证点击反馈（临时置 isPlaying 并点当前目标数字）
  const cur = await page.evaluate(() => window.game ? window.game.currentNumber : null);
  await page.evaluate((cur) => {
    window.game.isPlaying = true;
    const nums = document.querySelectorAll('.p11-num');
    for (const n of nums) { if (parseInt(n.textContent, 10) === cur) { n.closest('.p11-cell').click(); break; } }
  }, cur);
  await new Promise(r => setTimeout(r, 250));
  const clickInfo = await page.evaluate(() => ({
    doneCount: document.querySelectorAll('.p11-cell.p11-done').length,
    doneBg: (() => { const d = document.querySelector('.p11-cell.p11-done .p11-a'); return d ? getComputedStyle(d).backgroundColor : null; })(),
    numColor: (() => { const d = document.querySelector('.p11-cell.p11-done .p11-num'); return d ? getComputedStyle(d).color : null; })()
  }));

  await page.screenshot({ path: 'D:/专注力项目/p11_check.png' });
  console.log('INFO=' + JSON.stringify(info));
  console.log('CLICK=' + JSON.stringify(clickInfo));
  console.log('ERRORS=' + JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
