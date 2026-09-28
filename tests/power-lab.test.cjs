// Run with Node; no package installation or browser is required.
const assert=require('node:assert/strict');
const S=require('../power-lab-core.js');
const base={family:'normal',p:.9,k:10,match:true,mu0:0,sigma:1,n:30,alpha:.05,low:-.5,high:1.5,m:3000,B:199,methods:['t','bootstrap','wilcoxon']};
const near=(x,y,tol)=>assert.ok(Math.abs(x-y)<tol,`${x} differs from ${y}`);
// Independently checked using R qsignrank(.95, n) + 1.
assert.deepEqual([20,30,50].map(n=>S.rankCritical(n,.05)),[150,314,809]);
const x=[-2,-1,.5,1,2,3,4,5,6,8],v=S.moments(x);
near(v.mean/(v.sd/Math.sqrt(x.length)),2.649632,1e-6);
assert.equal(S.signedRank(x,0).w,48);
assert.equal(S.rejectRank(S.signedRank(x,0),.05),true);
assert.equal(S.rejectRank(S.signedRank(x,0),.01),false);
// All generating families have mean zero before adding the chosen mean.
for(const family of Object.keys(S.names)){
  const c={...base,family},draw=S.sampler(c,S.rng(8371)),values=Float64Array.from({length:150000},draw),m=S.moments(values);
  near(m.mean,0,.025);near(m.sd,1,family==='student'?.12:.025);
}
near(S.populationSD({...base,family:'contamination',match:false}),Math.sqrt(10.9),1e-12);
// Bootstrap calibration must be invariant to translating all observations.
near(S.bootstrapCritical(x,v.mean,499,.05,S.rng(72)),S.bootstrapCritical(x.map(a=>a+100),v.mean+100,499,.05,S.rng(72)),1e-10);
const run=S.simulate(base,1234),zero=run.offsets.indexOf(0),half=run.offsets.indexOf(.5);
for(const values of Object.values(run.curves)){
  near(values[zero].p,.05,.02);
  for(let i=1;i<values.length;i++)assert.ok(values[i].p>=values[i-1].p);
  for(const a of values)assert.ok(a.ci[0]>=0&&a.ci[1]<=1&&a.ci[0]<=a.ci[1]);
}
// R noncentral-t power: pt(qt(.95,29),29,ncp=.5*sqrt(30),lower.tail=FALSE).
near(run.curves.t[half].p,.8482542,.025);
// Changing enabled methods must not change the underlying generated datasets.
const onlyT=S.simulate({...base,methods:['t']},1234);
assert.deepEqual(onlyT.curves.t,run.curves.t);
assert.ok(S.grid({...base,low:-.7,high:1.13}).includes(0));
assert.throws(()=>S.validate({...base,family:'gamma'}),/对称/);
console.log('PASS: R critical values, generators, bootstrap translation invariance, null rejection rates, normal theoretical power, and shared datasets.');
console.log(Object.fromEntries(Object.entries(run.curves).map(([k,a])=>[k,{null:a[zero].p,powerAtHalf:a[half].p}])));
