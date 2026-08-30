const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/B10-tower-of-london.html';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  const result = await page.evaluate(() => {
    const out = {};
    const snap = () => JSON.parse(JSON.stringify(state.current));
    state.goal = [[],[],[]]; // 防止误触发 onSolve
    state.running = true; state.solved = false; state.steps = 0;

    // 测试1：柱0顶球3 移到 柱1顶球2（球3更小，应成功，柱1变[2,3]）
    state.current = [[1,2,3],[2],[]]; state.selected = null;
    onTowerClick(0); const sel1 = state.selected;
    onTowerClick(1);
    out.t1 = { selectedAfterFirstTap: sel1, current: snap(), steps: state.steps };

    // 测试2：柱0顶球3 移到 柱1顶球1（球1更大，球3应能放，柱1变[1,3]）
    state.current = [[1,2,3],[1],[]]; state.selected = null; state.steps = 0;
    onTowerClick(0); onTowerClick(1);
    out.t2 = { current: snap(), feedback: document.getElementById('feedback').textContent };

    // 测试3：柱0顶球1(最大) 移到 柱1顶球3(更小)——应拒绝，柱1保持[3]
    state.current = [[1],[3],[]]; state.selected = null; state.steps = 0;
    onTowerClick(0); onTowerClick(1);
    out.t3 = {
      current: snap(),
      feedback: document.getElementById('feedback').textContent,
      invalidVisibleAfterRender: document.querySelector('.tower.invalid') !== null,
    };
    return out;
  });

  console.log('T1 球3→球2(应成功,柱1=[2,3]):', JSON.stringify(result.t1));
  console.log('T2 球3→球1(应成功,柱1=[1,3]):', JSON.stringify(result.t2));
  console.log('T3 球1→球3(应拒绝,柱1=[3]):', JSON.stringify(result.t3));
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
