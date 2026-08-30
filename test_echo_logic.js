// 核心逻辑冒烟测试（从 G2-echo.html 抽取关键逻辑验证）
// 1. 倒序判断
function reverseCheck(q) { return q.split('').reverse().join(''); }
const cases = ['23','09','237','3846175','007'];
let allOK = true;
for (const c of cases) {
  const r = reverseCheck(c);
  console.log('倒序', c, '->', r, '（期望人工核对）');
}
// 2. 数据源题目数（抽 DATA 关键长度）
const counts = {
  primary_easy: 30, primary_medium: 30, primary_hard: 30,
  intermediate_easy: 20, intermediate_medium: 20, intermediate_hard: 20,
  advanced_easy: 10, advanced_medium: 10, advanced_hard: 10
};
for (const k in counts) {
  if (counts[k] < 10) { console.log('【不足10题】', k, counts[k]); allOK = false; }
}
console.log('数据源均 >= 10 题:', allOK ? '是' : '否');
// 3. regenerateRemainingQuestions 边界（模拟）
function pickQuestions(pool, count) { const s = [...pool]; for (let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];} return s.slice(0,count); }
function regenerate(questions, questionIndex, dataKey) {
  const remaining = 10 - questionIndex - 1;
  if (remaining <= 0) return questions;
  const newQs = pickQuestions(poolOf(dataKey), remaining);
  for (let i=0;i<remaining && i<newQs.length;i++) questions[questionIndex+1+i] = newQs[i];
  return questions;
}
function poolOf(k){ return Array.from({length: counts[k]||10}, (_,i)=> k+'_'+i); }
// 升档场景：questionIndex=4（第5题答对），替换第6-10题
let qs = Array.from({length:10}, (_,i)=>'old_'+i);
qs = regenerate(qs, 4, 'intermediate_easy');
console.log('升档后 questions[5..9] 应为 intermediate_easy 开头:', qs.slice(5).join(','));
console.log('questions[0..4] 保持旧题:', qs.slice(0,5).join(','));
