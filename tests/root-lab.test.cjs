const assert=require('node:assert/strict');
const C=require('../root-lab-core.js');
for(const a of [0,.5,1])for(const n of [4,20,100])for(const tolerance of [1e-3,1e-6,1e-8])for(const start of [.1,20,100]){
 const o={a,n,left:0,right:100,start,tolerance};const r=C.run(o),root=C.positiveRoot(a,n);
 for(let i=0;i<r.bis.length;i++){
  const s=r.bis[i];assert(s.fl*s.fr<=0);assert(root>=s.l-1e-12&&root<=s.r+1e-12);
  if(i)assert(Math.abs((s.r-s.l)*2-(r.bis[i-1].r-r.bis[i-1].l))<1e-12);
 }
 const b=r.bis.at(-1);assert(b.done);assert(Math.abs(b.fc)<=tolerance||(b.r-b.l)/2<=tolerance);
 const w=r.newton.at(-1);assert(w.done&&!w.failed);assert(Math.abs(w.f)<=tolerance);
 for(const s of r.newton.filter(s=>!s.done))assert(Math.abs(C.g(s.y,a,n)+s.slope*(s.next-s.y))<1e-9);
}
assert.throws(()=>C.run({a:.5,n:20,left:6,right:10,start:8,tolerance:1e-6}),/异号/);
const f=C.run({a:0,n:20,left:0,right:100,start:0,tolerance:1e-6}).newton[0];assert(f.failed);
console.log('81 parameter cases passed: bracket invariants, halving, root accuracy, tangent intersections, invalid bracket and zero derivative.');
