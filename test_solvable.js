const LEVELS={
  entry :{name:'入门',goal:[[1],[2],[3]],        moves:2},
  easy  :{name:'初级',goal:[[1,2],[3],[]],        moves:3},
  medium:{name:'中级',goal:[[1,2],[3,4],[]],      moves:5},
  hard  :{name:'高级',goal:[[1,2,3],[4,5],[]],    moves:6},
  expert:{name:'专家',goal:[[1],[2,3],[4,5]],     moves:8},
};
const DIFF_ORDER=['entry','easy','medium','hard','expert'];
function clone(s){return s.map(c=>c.slice());}
function topOf(col){return col.length?col[col.length-1]:Infinity;}
function canMove(state,from,to){
  if(from===to)return false;
  if(state[from].length===0)return false;
  if(state[to].length===0)return true;
  return topOf(state[from])>topOf(state[to]);
}
function legalMoves(state){const m=[];for(let f=0;f<3;f++)for(let t=0;t<3;t++){if(canMove(state,f,t))m.push({from:f,to:t});}return m;}
function applyMove(state,m){state[m.to].push(state[m.from].pop());}
function isSame(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++){if(a[i].length!==b[i].length)return false;for(let j=0;j<a[i].length;j++)if(a[i][j]!==b[i][j])return false;}return true;}
function genProblem(level){
  const cfg=LEVELS[level];const goal=clone(cfg.goal);const cur=clone(goal);let prev=null;
  for(let i=0;i<cfg.moves;i++){let ms=legalMoves(cur);if(prev)ms=ms.filter(m=>!(m.from===prev.to&&m.to===prev.from));if(ms.length===0)break;const m=ms[Math.floor(Math.random()*ms.length)];applyMove(cur,m);prev=m;}
  if(isSame(cur,goal)){let ms=legalMoves(cur);if(prev)ms=ms.filter(m=>!(m.from===prev.to&&m.to===prev.from));if(ms.length)applyMove(cur,ms[0]);}
  return {start:cur,goal:goal,refSteps:cfg.moves};
}
function key(s){return s.map(c=>c.join(',')).join('|');}
function bfs(start,goal,maxDepth){
  const q=[[start,0]];const seen=new Set([key(start)]);const gk=key(goal);
  while(q.length){const s=q.shift(),d=s[1];if(d>maxDepth)continue;if(key(s[0])===gk)return d;
    for(const m of legalMoves(s[0])){const ns=clone(s[0]);applyMove(ns,m);const k=key(ns);if(!seen.has(k)){seen.add(k);q.push([ns,d+1]);}}
  }
  return -1;
}
console.log('=== 修复后关卡可解性验证（每难度 500 局 BFS）===');
let allOK=true;
for(const k of DIFF_ORDER){
  const cfg=LEVELS[k];let reach=0,min=999,max=0,sum=0,bad=0;
  for(let i=0;i<500;i++){
    const p=genProblem(k);
    const d=bfs(p.start,p.goal,cfg.moves+6);
    if(d<0){bad++;allOK=false;}
    else{reach++;if(d<min)min=d;if(d>max)max=d;sum+=d;}
  }
  const avg=(sum/reach).toFixed(2);
  console.log(k.padEnd(7)+' 参考='+cfg.moves+'  可解='+reach+'/500  不可解='+bad+'  最短步数[min='+min+',max='+max+',avg='+avg+']');
}
console.log(allOK?'\n[OK] 全部可解，修复安全':'\n[FAIL] 存在不可解关卡！');
