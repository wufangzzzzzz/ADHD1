const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/number-focus.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 768, height: 1024 });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof buildKeypad === 'function' && typeof keypadInput === 'function', { timeout: 10000 });

  // 测试1：数字模式，生成键盘 + 光标定位到 cell0
  const r1 = await page.evaluate(() => {
    contentType = 'number';
    generateItems();
    canInput = true;
    buildKeypad();
    setCursor(0);
    return {
      keyCount: document.querySelectorAll('#keypad .key-btn').length,
      hasClear: !!document.querySelector('#keypad .key-clear'),
      cursorOn0: document.getElementById('cell0').classList.contains('cursor'),
      keypadHasContent: document.getElementById('keypad').children.length > 0
    };
  });
  console.log('测试1 键盘生成:', JSON.stringify(r1));
  const t1 = r1.keyCount === 10 && r1.hasClear === true && r1.cursorOn0 === true;
  console.log('  [数字键盘9键+清除键+光标在cell0]', t1 ? 'PASS' : 'FAIL');

  // 测试2：键盘输入填格 + 光标自动跳下一个
  const r2 = await page.evaluate(() => {
    keypadInput(5);  // cell0=5，光标跳 cell1
    keypadInput(3);  // cell1=3，光标跳 cell2
    return {
      cell0: userInputs[0], cell1: userInputs[1],
      cursorOn2: document.getElementById('cell2').classList.contains('cursor'),
      cursorOn1: document.getElementById('cell1').classList.contains('cursor'),
      cell0Text: document.getElementById('cell0').textContent
    };
  });
  console.log('测试2 连续输入:', JSON.stringify(r2));
  const t2 = r2.cell0 === 5 && r2.cell1 === 3 && r2.cursorOn2 === true && r2.cursorOn1 === false && r2.cell0Text === '5';
  console.log('  [填格+光标自动跳转]', t2 ? 'PASS' : 'FAIL');

  // 测试3：点击已填格移动光标 + 清除
  const r3 = await page.evaluate(() => {
    cellClick(0);   // 光标移回 cell0
    const c0 = document.getElementById('cell0').classList.contains('cursor');
    clearCurrent(); // 清空 cell0
    return {
      cursorMovedTo0: c0,
      cell0AfterClear: userInputs[0],
      cell0Text: document.getElementById('cell0').textContent,
      cell0Filled: document.getElementById('cell0').classList.contains('filled'),
      cell0StillCursor: document.getElementById('cell0').classList.contains('cursor')
    };
  });
  console.log('测试3 撤销:', JSON.stringify(r3));
  const t3 = r3.cursorMovedTo0 === true && r3.cell0AfterClear === 0 && r3.cell0Text === '' && r3.cell0Filled === false && r3.cell0StillCursor === true;
  console.log('  [点已填格移光标+清除归零]', t3 ? 'PASS' : 'FAIL');

  // 测试4：连续填满 1-9 自动判分（数字模式）
  const r4 = await page.evaluate(() => {
    contentType = 'number';
    generateItems();
    userInputs = [0,0,0,0,0,0,0,0,0];
    canInput = true;
    setCursor(0);
    // 连续输入 1-9，填满后应自动触发 checkAnswer（600ms 后 gameStarted=false）
    for (var n = 1; n <= 9; n++) { keypadInput(n); }
    return { canInputAfterFill: canInput, gameStarted: gameStarted };
  });
  await sleep(700);
  const r4b = await page.evaluate(() => ({ gameStarted: gameStarted, canInput: canInput }));
  console.log('测试4 填满自动判分:', JSON.stringify({ immediate: r4, after700ms: r4b }));
  const t4 = r4b.gameStarted === false; // 判分后 gameStarted 被置 false
  console.log('  [填满9格自动触发判分]', t4 ? 'PASS' : 'FAIL');

  // 测试5：颜色/形状模式键盘
  const r5 = await page.evaluate(() => {
    contentType = 'color'; buildKeypad();
    const colorKeys = document.querySelectorAll('#keypad .key-btn').length;
    contentType = 'shape'; buildKeypad();
    const shapeKeys = document.querySelectorAll('#keypad .key-btn').length;
    return { colorKeys: colorKeys, shapeKeys: shapeKeys };
  });
  console.log('测试5 颜色/形状键盘:', JSON.stringify(r5));
  const t5 = r5.colorKeys === 8 && r5.shapeKeys === 7; // 7色+清除=8，6形+清除=7
  console.log('  [颜色7键/形状6键 + 清除键]', t5 ? 'PASS' : 'FAIL');

  console.log('\n=== JS 运行异常(pageerror) ===');
  console.log(pageErrors.length ? pageErrors.join('\n') : '（无）');

  await browser.close();
  console.log('\n汇总: 键盘生成=', t1, ' 连续输入=', t2, ' 撤销=', t3, ' 自动判分=', t4, ' 颜色形状=', t5);
})();
