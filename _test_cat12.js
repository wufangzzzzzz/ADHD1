const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/专注力项目/schulte-grid.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 700));

  // 进入图案12·猫猫
  await page.evaluate(() => { window.game.setPatternSub(12); });
  await new Promise(r => setTimeout(r, 500));

  const s1 = await page.evaluate(() => {
    const g = window.game;
    return {
      sub: g.patternSub,
      isPatternMode: !!g.isPatternMode,
      hasCanvas: !!document.querySelector('#grid-container canvas'),
      p12: !!g._p12,
      balls: g._p12 ? g._p12.balls.length : 0,
      gridSize: g.gridSize,
      W: g._p12 ? g._p12.W : 0,
      catImgLoaded: !!(g._p12 && g._p12.catImg && g._p12.catImg.naturalWidth)
    };
  });

  // 点开始
  await page.evaluate(() => {
    const b = document.getElementById('start-btn');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 300));

  const snap = () => page.evaluate(() => {
    const p = window.game._p12;
    if (!p) return null;
    let one = null;
    for (const b of p.balls) { if (b.num === 1 && !b.flying) { one = { x: b.x, y: b.y }; break; } }
    return { catX: p.cat.x, catY: p.cat.y, caught: p.caught, balls: p.balls.length, one: one };
  });

  const t0 = await snap();
  await new Promise(r => setTimeout(r, 2000));
  const t1 = await snap();

  const catMoved = t0 && t1 && (Math.abs(t1.catX - t0.catX) > 1 || Math.abs(t1.catY - t0.catY) > 1);
  const caughtGrew = t0 && t1 && t1.caught > t0.caught;
  const ballsAlive = t1 ? t1.balls : 0;

  // 离开图案12 → 检查清理
  await page.evaluate(() => { window.game.setPatternSub(1); });
  await new Promise(r => setTimeout(r, 500));
  const clean = await page.evaluate(() => ({
    p12: !!window.game._p12,
    canvasGone: !document.querySelector('#grid-container canvas'),
    sub: window.game.patternSub
  }));

  console.log('--- 图案12·猫猫 无头实测 ---');
  console.log('patternSub =', s1.sub, '| isPatternMode =', s1.isPatternMode, '| canvas =', s1.hasCanvas);
  console.log('gridSize =', s1.gridSize, '| 球数 =', s1.balls, '| 区域边长 =', s1.W, '| 猫图已加载 =', s1.catImgLoaded);
  console.log('猫移动 =', catMoved, '| 抓到#1次数 =', (t0 ? t0.caught : '?'), '->', (t1 ? t1.caught : '?'), '| 增长 =', caughtGrew);
  console.log('2秒后场上球数 =', ballsAlive, '（应等于难度球数，被抓的补新#1）');
  console.log('切走后清理: _p12 =', clean.p12, '| canvas已移除 =', clean.canvasGone, '| 当前sub =', clean.sub);
  console.log('ERRORS(' + errors.length + ')');
  errors.slice(0, 10).forEach(e => console.log('   ', e));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
