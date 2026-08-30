function topOf(col){return col.length?col[col.length-1]:Infinity;}
function canMoveOld(state,from,to){
  if(from===to)return false;
  if(state[from].length===0)return false;
  return topOf(state[to])>state[from][state[from].length-1];
}
function canMoveNew(state,from,to){
  if(from===to)return false;
  if(state[from].length===0)return false;
  if(state[to].length===0)return true;
  return topOf(state[from])>topOf(state[to]);
}
const cases = [
  ['球3(小)放到球2(大)上 [应允许]', [[3],[2],[]], 0, 1],
  ['球2(大)放到球3(小)上 [应拒绝]', [[2],[3],[]], 0, 1],
  ['球3放到空柱 [应允许]',          [[3],[],[]], 0, 1],
  ['球1(最大)放到球5(最小) [应拒绝]', [[1],[5],[]], 0, 1],
  ['球5(最小)放到球1(最大) [应允许]', [[5],[1],[]], 0, 1],
  ['球4放到球1(大) [应允许]',        [[4],[1],[]], 0, 1],
];
console.log('=== canMove 方向对比（球编号越小=球越大）===');
cases.forEach(([name,s,f,t])=>{
  console.log(name.padEnd(34), 'old=', canMoveOld(s,f,t), ' new=', canMoveNew(s,f,t));
});
