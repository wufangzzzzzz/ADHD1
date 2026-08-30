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
  await page.waitForFunction(() => typeof cellClick === 'function' && typeof clearCell === 'function', { timeout: 10000 });

  // 测试1：模拟 cell0 已填数字5，点击它应能重新打开选择器，且出现「清除」按钮
  const r1 = await page.evaluate(() => {
    contentType = 'number';
    canInput = true;
    userInputs = [5, 0, 0, 0, 0, 0, 0, 0, 0];
    currentCellIndex = -1;
    cellClick(0);
    return {
      currentCellIndex: currentCellIndex,
      pickerShown: document.getElementById('numberPicker').classList.contains('show'),
      hasClearBtn: !!document.querySelector('.picker-btn.picker-clear'),
      clearBtnText: (document.querySelector('.picker-btn.picker-clear') || {}).textContent
    };
  });
  console.log('测试1 点击已填格重选:', JSON.stringify(r1));
  const t1 = r1.currentCellIndex === 0 && r1.pickerShown === true && r1.hasClearBtn === true;
  console.log('  [点击已填格→重开选择器+出现清除按钮]', t1 ? 'PASS' : 'FAIL');

  // 测试2：点「清除」按钮 → cell0 清空（userInputs 归0、选择器关闭）
  const r2 = await page.evaluate(() => {
    document.querySelector('.picker-btn.picker-clear').click();
    return {
      userInput0: userInputs[0],
      pickerShown: document.getElementById('numberPicker').classList.contains('show'),
      cellText: document.getElementById('cell0').textContent,
      cellFilled: document.getElementById('cell0').classList.contains('filled')
    };
  });
  console.log('测试2 点清除后:', JSON.stringify(r2));
  const t2 = r2.userInput0 === 0 && r2.pickerShown === false && r2.cellText === '' && r2.cellFilled === false;
  console.log('  [清除后格子归零+选择器关闭]', t2 ? 'PASS' : 'FAIL');

  // 测试3：清空后重新填该格（重填），选数字7
  const r3 = await page.evaluate(() => {
    cellClick(0);               // 重新打开选择器
    selectItem(7);              // 选 7
    return {
      userInput0: userInputs[0],
      pickerShown: document.getElementById('numberPicker').classList.contains('show'),
      cellText: document.getElementById('cell0').textContent
    };
  });
  console.log('测试3 重填后:', JSON.stringify(r3));
  const t3 = r3.userInput0 === 7 && r3.pickerShown === false && r3.cellText === '7';
  console.log('  [重填格子生效]', t3 ? 'PASS' : 'FAIL');

  // 测试4：颜色模式同样支持清除（userInputs 初始 -1，清除归 -1）
  const r4 = await page.evaluate(() => {
    contentType = 'color';
    userInputs = [1, -1, -1, -1, -1, -1, -1, -1, -1];  // cell0 已填颜色索引1
    currentCellIndex = -1;
    cellClick(0);
    const hasClear = !!document.querySelector('.picker-btn.picker-clear');
    document.querySelector('.picker-btn.picker-clear').click();
    return { hasClear: hasClear, userInput0: userInputs[0] };
  });
  console.log('测试4 颜色模式清除:', JSON.stringify(r4));
  const t4 = r4.hasClear === true && r4.userInput0 === -1;
  console.log('  [颜色模式清除归 -1]', t4 ? 'PASS' : 'FAIL');

  console.log('\n=== JS 运行异常(pageerror) ===');
  console.log(pageErrors.length ? pageErrors.join('\n') : '（无）');

  await browser.close();
  console.log('\n汇总: 重选入口=', t1, ' 清除=', t2, ' 重填=', t3, ' 颜色清除=', t4);
})();
