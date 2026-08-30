// 分析用户涂色数据：对照方形螺旋折线，统计 G/Y 落在哪些通道段，B/R 坐标
const PAINT = {"G":[[5,19],[5,20],[5,21],[6,18],[6,19],[6,22],[6,23],[7,17],[7,23],[8,16],[8,17],[8,24],[9,15],[9,16],[9,24],[9,25],[9,26],[10,14],[10,15],[10,26],[11,13],[11,14],[11,19],[11,20],[11,21],[11,22],[11,23],[11,24],[11,26],[11,27],[12,12],[12,13],[12,17],[12,18],[12,24],[12,27],[12,28],[13,11],[13,12],[13,15],[13,16],[13,17],[13,25],[13,28],[14,9],[14,10],[14,15],[14,25],[14,29],[15,8],[15,9],[15,14],[15,20],[15,21],[15,22],[15,23],[15,25],[15,26],[15,29],[15,30],[15,31],[16,7],[16,8],[16,13],[16,14],[16,19],[16,20],[16,23],[16,26],[16,31],[16,32],[17,6],[17,7],[17,12],[17,13],[17,17],[17,18],[17,19],[17,24],[17,26],[17,27],[17,32],[17,33],[18,6],[18,12],[18,16],[18,17],[18,24],[18,27],[18,28],[18,34],[19,6],[19,12],[19,16],[19,20],[19,24],[19,28],[19,29],[19,34],[19,35],[20,6],[20,12],[20,15],[20,16],[20,20],[20,23],[20,29],[20,34],[20,35],[21,6],[21,7],[21,12],[21,16],[21,20],[21,22],[21,23],[21,29],[21,33],[21,34],[22,7],[22,12],[22,16],[22,17],[22,20],[22,21],[22,22],[22,28],[22,31],[22,32],[23,7],[23,8],[23,13],[23,17],[23,27],[23,28],[23,30],[23,31],[24,8],[24,9],[24,13],[24,14],[24,18],[24,26],[24,27],[24,29],[24,30],[25,9],[25,10],[25,14],[25,15],[25,18],[25,19],[25,24],[25,25],[25,28],[25,29],[26,10],[26,11],[26,15],[26,19],[26,20],[26,23],[26,24],[26,27],[26,28],[27,11],[27,12],[27,16],[27,20],[27,21],[27,22],[27,26],[27,27],[28,12],[28,16],[28,17],[28,26],[29,12],[29,13],[29,17],[29,18],[29,25],[30,13],[30,14],[30,18],[30,23],[30,24],[31,14],[31,18],[31,19],[31,20],[31,21],[31,22],[31,23],[32,14],[32,15],[33,15],[33,16],[34,16],[34,17],[35,17],[35,18],[36,18],[36,19]],"Y":[[5,20],[5,21],[5,22],[6,18],[6,19],[6,20],[6,22],[6,23],[7,17],[7,18],[7,23],[7,24],[8,16],[8,17],[8,24],[8,25],[9,14],[9,15],[9,25],[10,13],[10,14],[10,20],[10,21],[10,22],[10,25],[10,26],[11,12],[11,13],[11,19],[11,20],[11,23],[11,24],[11,26],[11,27],[12,11],[12,12],[12,18],[12,19],[12,24],[12,27],[12,28],[13,10],[13,11],[13,17],[13,18],[13,24],[13,25],[13,28],[13,29],[14,9],[14,10],[14,15],[14,16],[14,25],[14,26],[14,29],[14,30],[15,8],[15,9],[15,14],[15,15],[15,18],[15,19],[15,20],[15,21],[15,22],[15,23],[15,26],[15,30],[16,7],[16,8],[16,12],[16,13],[16,14],[16,17],[16,18],[16,23],[16,24],[16,26],[16,27],[16,31],[17,6],[17,7],[17,11],[17,12],[17,16],[17,17],[17,24],[17,27],[17,28],[17,31],[17,32],[18,5],[18,6],[18,10],[18,11],[18,16],[18,24],[18,28],[18,29],[18,32],[18,33],[19,5],[19,10],[19,16],[19,20],[19,21],[19,25],[19,29],[19,33],[20,5],[20,6],[20,10],[20,16],[20,20],[20,24],[20,25],[20,29],[20,33],[21,6],[21,10],[21,16],[21,20],[21,23],[21,24],[21,28],[21,29],[21,32],[21,33],[22,6],[22,7],[22,11],[22,16],[22,20],[22,21],[22,22],[22,23],[22,28],[22,32],[23,7],[23,8],[23,12],[23,16],[23,17],[23,27],[23,31],[23,32],[24,8],[24,9],[24,13],[24,14],[24,17],[24,25],[24,26],[24,27],[24,30],[24,31],[25,9],[25,10],[25,14],[25,15],[25,17],[25,18],[25,24],[25,25],[25,29],[25,30],[26,10],[26,11],[26,15],[26,16],[26,19],[26,20],[26,21],[26,22],[26,23],[26,24],[26,28],[26,29],[27,12],[27,13],[27,16],[27,17],[27,27],[27,28],[28,13],[28,14],[28,17],[28,26],[28,27],[29,15],[29,17],[29,18],[29,24],[29,25],[29,26],[30,15],[30,16],[30,18],[30,19],[30,22],[30,23],[30,24],[31,16],[31,19],[31,20],[31,21],[31,22],[32,16],[32,17],[33,17],[34,17],[34,18],[35,18],[36,19]],"B":[[36,18],[36,19]],"R":[[19,20]]};
const GRID = 15;

// 复刻方形螺旋 verts（与 paint_square drawSpiral 一致）
function spiralVerts(){
  var cx=300, cy=300, maxR=270, r0=maxR*0.12, turns=4, V=4;
  var gapPerTurn=(maxR-r0)/turns, ext=2*Math.PI/V, base=Math.PI/4;
  var dL=gapPerTurn/(2*Math.sqrt(2)), dirOff=-225*Math.PI/180, L0=dL*0.6, rotation=0;
  var phi=base+dirOff+rotation, x=0, y=0, verts=[{x:0,y:0}], total=turns*V;
  for(var s=0;s<total;s++){ var L=L0+s*dL; x+=L*Math.cos(phi); y+=L*Math.sin(phi); phi+=ext; verts.push({x:x,y:y}); }
  var o0=(turns-1)*V, P0=verts[o0+V-1], Pend=verts[o0+V], Q0=verts[o0], Q1=verts[o0+1];
  var ddx=Pend.x-P0.x, ddy=Pend.y-P0.y, eex=Q1.x-Q0.x, eey=Q1.y-Q0.y, rhsx=Q0.x-P0.x, rhsy=Q0.y-P0.y;
  var det=eex*ddy-ddx*eey, t=(-rhsx*eey+eex*rhsy)/det;
  verts[o0+V]={x:P0.x+t*ddx,y:P0.y+t*ddy};
  var minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  for(var i=0;i<verts.length;i++){ if(verts[i].x<minX)minX=verts[i].x; if(verts[i].x>maxX)maxX=verts[i].x; if(verts[i].y<minY)minY=verts[i].y; if(verts[i].y>maxY)maxY=verts[i].y; }
  var mcx=(minX+maxX)/2, mcy=(minY+maxY)/2, Rraw=0;
  for(var i2=0;i2<verts.length;i2++){ verts[i2].x-=mcx; verts[i2].y-=mcy; var rr=Math.hypot(verts[i2].x,verts[i2].y); if(rr>Rraw)Rraw=rr; }
  var oIdx=turns*V-1;
  if(oIdx>=0&&oIdx<verts.length){ var oVr=verts[oIdx], oAng=Math.atan2(oVr.y,oVr.x), rotAng=-Math.PI/2-oAng, csR=Math.cos(rotAng), snR=Math.sin(rotAng);
    for(var vr=0;vr<verts.length;vr++){ var xx=verts[vr].x, yy=verts[vr].y; verts[vr].x=xx*csR-yy*snR; verts[vr].y=xx*snR+yy*csR; } }
  var sc=maxR/Rraw;
  for(var k=0;k<verts.length;k++){ verts[k].x=cx+verts[k].x*sc; verts[k].y=cy+verts[k].y*sc; }
  return verts;
}
function buildPoly(verts){ var len=[0]; for(var i=1;i<verts.length;i++) len.push(len[i-1]+Math.hypot(verts[i].x-verts[i-1].x,verts[i].y-verts[i-1].y)); return {pts:verts,len:len}; }
function segDist(ax,ay,bx,by,px,py){var dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(l2===0)return Math.hypot(px-ax,py-ay);var t=((px-ax)*dx+(py-ay)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));}
function distToPoly(poly,px,py){var best=Infinity,bi=0;for(var i=0;i<poly.pts.length-1;i++){var d=segDist(poly.pts[i].x,poly.pts[i].y,poly.pts[i+1].x,poly.pts[i+1].y,px,py);if(d<best){best=d;bi=i;}}return {d:best,seg:bi};}

const verts = spiralVerts();
const poly = buildPoly(verts);
const totalLen = poly.len[poly.len.length-1];

// 把格子转像素中心
function cellPx(c){ return { x: c[0]*GRID+GRID/2, y: c[1]*GRID+GRID/2 }; }

// 对每色每格子，找离折线最近点的弧长 + 离线距离
function analyze(key){
  const arr = PAINT[key];
  const arcs = [], dists = [];
  arr.forEach(c => {
    const p = cellPx(c);
    const r = distToPoly(poly, p.x, p.y);
    // 该段的弧长中点
    const a = poly.len[r.seg] + Math.hypot(poly.pts[r.seg+1].x-poly.pts[r.seg].x, poly.pts[r.seg+1].y-poly.pts[r.seg].y)*0.5;
    arcs.push(a); dists.push(r.d);
  });
  return { arcs, dists, count: arr.length };
}

// 弧长分箱（按圈：每圈=totalLen/turns，4圈）
const turns=4, perTurn = totalLen/turns;
function bucket(arc){ return Math.min(turns-1, Math.floor(arc/perTurn)); } // 0..3 圈

['G','Y'].forEach(key => {
  const r = analyze(key);
  const buckets = [0,0,0,0];
  r.arcs.forEach(a => buckets[bucket(a)]++);
  const arcMin = Math.min(...r.arcs), arcMax = Math.max(...r.arcs);
  const dMin = Math.min(...r.dists), dMax = Math.max(...r.dists);
  console.log('--- '+key+' ('+r.count+'格) ---');
  console.log('  弧长范围: '+Math.round(arcMin)+' ~ '+Math.round(arcMax)+' (总'+Math.round(totalLen)+', 每圈'+Math.round(perTurn)+')');
  console.log('  各圈分布: 圈0(内)='+buckets[0]+' 圈1='+buckets[1]+' 圈2='+buckets[2]+' 圈3(外)='+buckets[3]);
  console.log('  离线距离: '+Math.round(dMin)+' ~ '+Math.round(dMax)+'px');
});

// B/R 坐标
const b = PAINT.B[0], rr = PAINT.R[0];
const bp = cellPx(b), rp = cellPx(rr);
const br = distToPoly(poly, bp.x, bp.y), rr2 = distToPoly(poly, rp.x, rp.y);
console.log('--- B 起点 ---');
console.log('  格子['+b+'] → 像素('+Math.round(bp.x)+','+Math.round(bp.y)+') 离中心'+Math.round(Math.hypot(bp.x-300,bp.y-300))+' 离线'+Math.round(br.d)+'px');
console.log('--- R 终点 ---');
console.log('  格子['+rr+'] → 像素('+Math.round(rp.x)+','+Math.round(rp.y)+') 离中心'+Math.round(Math.hypot(rp.x-300,rp.y-300))+' 离线'+Math.round(rr2.d)+'px');
console.log('--- 螺旋信息 ---');
console.log('  顶点数'+verts.length+' 总弧长'+Math.round(totalLen)+' 最外顶点idx'+(turns*V()-1));
function V(){return 4;}
console.log('  最外顶点(起点参考)像素: ('+Math.round(verts[turns*4-1].x)+','+Math.round(verts[turns*4-1].y)+')');
