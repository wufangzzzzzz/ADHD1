const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/G2-echo.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 768, height: 1024 });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 等初始化完成（loadingOverlay 隐藏）
  try {
    await page.waitForFunction(() => {
      const o = document.getElementById('loadingOverlay');
      return o && o.style.display === 'none';
    }, { timeout: 25000 });
  } catch (e) { console.log('[warn] loadingOverlay 未隐藏'); }

  // 进入输入态的辅助：等 canInput 为 true，超时则手动跳过朗读
  async function ensureInput() {
    const ok = await page.waitForFunction(() => state.currentQuestion !== '' && state.canInput === true, { timeout: 25000 }).catch(() => false);
    if (!ok) {
      await page.evaluate(() => {
        if (window.stopAllAudio) window.stopAllAudio();
        state.isListening = false;
        state.canInput = true;
        setInputEnabled(true);
        replayBtn.disabled = false;
      });
    }
  }

  // 关闭首次「玩法说明」遮罩（真实用户会点掉它）
  await page.evaluate(() => closeRules());

  // 选难度 + 开始
  await page.click('.level-btn[data-level="primary"]');
  await page.click('#startGameBtn');
  await ensureInput();

  const q1 = await page.evaluate(() => state.currentQuestion);
  const correct = q1.split('').reverse().join('');
  const wrong = correct.slice(0, -1) + (correct.slice(-1) === '1' ? '2' : '1');
  console.log('题目=', q1, ' 正确倒序=', correct, ' 故意输错=', wrong);

  // 输入错误答案
  for (const d of wrong) {
    await page.click('.key-btn[data-digit="' + d + '"]');
    await sleep(50);
  }
  await sleep(1100); // 自动提交(400ms) + 判错 + 重试恢复

  const afterWrong = await page.evaluate(() => ({
    canInput: state.canInput, questionIndex: state.questionIndex, wrongAttempts: state.wrongAttempts,
    hasWrong: document.querySelectorAll('.answer-digit.wrong-answer').length,
    statusText: document.getElementById('statusText').textContent, userAnswer: state.userAnswer
  }));
  console.log('判错后:', JSON.stringify(afterWrong));
  const test1 = afterWrong.canInput === true && afterWrong.questionIndex === 0 && afterWrong.hasWrong >= 1;
  console.log('  [判错后可重试(标红+可输入+未跳题)]', test1 ? 'PASS' : 'FAIL');

  // 删除一位 + 重输正确位
  await page.click('.btn-clear');
  await sleep(120);
  await page.click('.key-btn[data-digit="' + correct.slice(-1) + '"]');
  await sleep(1300);

  const afterCorrect = await page.evaluate(() => ({
    questionIndex: state.questionIndex, correctCount: state.correctCount, totalAnswered: state.totalAnswered,
    dotClass: document.getElementById('dot-0') ? document.getElementById('dot-0').className : null
  }));
  console.log('重输正确后:', JSON.stringify(afterCorrect));
  const test2 = afterCorrect.questionIndex === 1 && afterCorrect.correctCount === 1 && afterCorrect.totalAnswered === 1;
  console.log('  [删除重输正确后跳下一关]', test2 ? 'PASS' : 'FAIL');

  // 游戏中点「开始游戏」立即重启
  const beforeRestart = await page.evaluate(() => state.questionIndex);
  await page.click('#startGameBtn');
  await sleep(900);
  const afterRestart = await page.evaluate(() => ({
    questionIndex: state.questionIndex, isPlaying: state.isPlaying, score: state.score, correctCount: state.correctCount, totalAnswered: state.totalAnswered
  }));
  console.log('游戏中点开始: qIndex', beforeRestart, '->', JSON.stringify(afterRestart));
  const test3 = afterRestart.isPlaying === true && afterRestart.questionIndex === 0 && afterRestart.score === 0 && afterRestart.correctCount === 0;
  console.log('  [游戏中可立即重启新局]', test3 ? 'PASS' : 'FAIL');

  // 连错3次自动跳过
  const r4 = await page.evaluate(() => {
    const q = state.currentQuestion;
    const cr = q.split('').reverse().join('');
    state.wrongAttempts = 0;
    const idxBefore = state.questionIndex;
    handleWrong(cr); const a1 = state.questionIndex;
    handleWrong(cr); const a2 = state.questionIndex;
    handleWrong(cr); const a3 = state.questionIndex;
    return { idxBefore, a1, a2, a3, wrongAttempts: state.wrongAttempts };
  });
  console.log('连错3次:', JSON.stringify(r4));
  const test4 = (r4.a1 === r4.idxBefore) && (r4.a2 === r4.idxBefore) && (r4.a3 === r4.idxBefore + 1) && r4.wrongAttempts === 0;
  console.log('  [前2次错不跳题、第3次错跳过]', test4 ? 'PASS' : 'FAIL');

  console.log('\n=== JS 运行异常(pageerror) ===');
  console.log(pageErrors.length ? pageErrors.join('\n') : '（无）');

  await browser.close();
  console.log('\n汇总: 判错可重试=', test1, ' 重输跳关=', test2, ' 游戏重启=', test3, ' 连错跳过=', test4);
})();
