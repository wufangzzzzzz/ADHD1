const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/G2-echo.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 768, height: 1024 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 等 loadingOverlay 隐藏（preloadAllAudio 完成）
  try {
    await page.waitForFunction(() => {
      const o = document.getElementById('loadingOverlay');
      return o && o.style.display === 'none';
    }, { timeout: 25000 });
    console.log('loadingOverlay 已隐藏');
  } catch (e) {
    console.log('loadingOverlay 未在25s内隐藏，当前状态:', await page.evaluate(() => {
      const o = document.getElementById('loadingOverlay');
      return o ? o.style.display : '无此元素';
    }));
  }

  const initState = await page.evaluate(() => ({
    dots: document.querySelectorAll('.progress-dot').length,
    level: state.level,
    questions: state.questions.length,
    statusText: document.getElementById('statusText').textContent,
    loadingDisplay: (() => { const o = document.getElementById('loadingOverlay'); return o ? o.style.display : 'none'; })()
  }));
  console.log('初始状态:', JSON.stringify(initState));

  // 直接调 startNewGame 绕过点击
  const callResult = await page.evaluate(() => {
    try {
      startNewGame();
      return { ok: true, questions: state.questions.length, isPlaying: state.isPlaying, q0: state.questions[0] };
    } catch (e) {
      return { ok: false, err: e.message };
    }
  });
  console.log('startNewGame 结果:', JSON.stringify(callResult));

  await sleep(600);
  const afterStart = await page.evaluate(() => ({
    currentQuestion: state.currentQuestion,
    canInput: state.canInput,
    isListening: state.isListening,
    questionIndex: state.questionIndex,
    statusText: document.getElementById('statusText').textContent
  }));
  console.log('600ms后:', JSON.stringify(afterStart));

  await browser.close();
})();
