/* Simulation kernels shared by the worker, density preview and numerical checks. */
(function (root) {
  'use strict';
  const js = root.jStat || (typeof require === 'function' ? require('./vendor/jstat.min.js') : null);
  const names = {normal:'正态',contamination:'污染正态',student:'重尾 t₃',gamma:'右偏 Gamma'};
  const methods = {t:{name:'t 检验',color:'#236aa0'},bootstrap:{name:'Bootstrap-t',color:'#bb741f'},wilcoxon:{name:'Wilcoxon',color:'#208579'}};
  function rng(seed) { let a=seed>>>0; return () => { a=(a+0x6D2B79F5)>>>0; let t=Math.imul(a^(a>>>15),1|a); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
  function sampler(c, random) {
    let spare=null;
    const u=()=>Math.max(Number.EPSILON,random());
    function normal() { if(spare!==null){const z=spare;spare=null;return z;} const r=Math.sqrt(-2*Math.log(u())),a=2*Math.PI*u();spare=r*Math.sin(a);return r*Math.cos(a); }
    const scale=c.sigma/(c.family==='contamination'&&c.match?Math.sqrt(c.p+(1-c.p)*c.k*c.k):1);
    return () => {
      let z;
      if(c.family==='normal') z=normal();
      else if(c.family==='contamination') z=normal()*(u()<c.p?1:c.k);
      else if(c.family==='student') {const a=normal(),b=normal(),d=normal();z=normal()/Math.sqrt(a*a+b*b+d*d);}
      else z=(-Math.log(u())-Math.log(u())-2)/Math.SQRT2;
      return scale*z;
    };
  }
  function moments(x) {let mean=0,m2=0;for(let i=0;i<x.length;i++){const d=x[i]-mean;mean+=d/(i+1);m2+=d*(x[i]-mean);}return {mean,sd:Math.sqrt(m2/(x.length-1))};}
  function populationSD(c){return c.sigma*(c.family==='contamination'&&!c.match?Math.sqrt(c.p+(1-c.p)*c.k*c.k):1);}
  function density(x,mu,c){
    const z=(x-mu)/c.sigma;
    if(c.family==='normal')return js.normal.pdf(z,0,1)/c.sigma;
    if(c.family==='student')return js.studentt.pdf(z*Math.sqrt(3),3)*Math.sqrt(3)/c.sigma;
    if(c.family==='gamma'){const v=z*Math.SQRT2+2;return v>0?v*Math.exp(-v)*Math.SQRT2/c.sigma:0;}
    const k=c.match?Math.sqrt(c.p+(1-c.p)*c.k*c.k):1;
    return k*(c.p*js.normal.pdf(z*k,0,1)+(1-c.p)*js.normal.pdf(z*k,0,c.k))/c.sigma;
  }
  function wilson(successes,total){const p=successes/total,z=1.95996398454005,d=1+z*z/total,mid=(p+z*z/(2*total))/d,h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;return [Math.max(0,mid-h),Math.min(1,mid+h)];}
  function signedRank(x,offset){
    const pairs=[];for(const v of x){const d=v+offset;if(d!==0)pairs.push([Math.abs(d),d>0]);}
    pairs.sort((a,b)=>a[0]-b[0]);let w=0,ties=0;
    for(let i=0;i<pairs.length;){let j=i+1;while(j<pairs.length&&pairs[j][0]===pairs[i][0])j++;const rank=(i+1+j)/2;for(let k=i;k<j;k++)if(pairs[k][1])w+=rank;const t=j-i;ties+=t*t*t-t;i=j;}
    return {w,n:pairs.length,ties};
  }
  const rankCache=new Map();
  function rankCritical(n,alpha){const key=n+':'+alpha;if(rankCache.has(key))return rankCache.get(key);const sum=n*(n+1)/2,prob=new Float64Array(sum+1);prob[0]=1;let top=0;for(let rank=1;rank<=n;rank++){for(let s=top+rank;s>=0;s--)prob[s]=.5*((s<=top?prob[s]:0)+(s>=rank&&s-rank<=top?prob[s-rank]:0));top+=rank;}let tail=0,critical=sum+1;for(let s=sum;s>=0;s--){tail+=prob[s];if(tail<=alpha+1e-14)critical=s;else break;}rankCache.set(key,critical);return critical;}
  function rejectRank(stat,alpha){if(!stat.n)return false;if(stat.n<=50&&!stat.ties)return stat.w>=rankCritical(stat.n,alpha);const mean=stat.n*(stat.n+1)/4,variance=stat.n*(stat.n+1)*(2*stat.n+1)/24-stat.ties/48;return variance>0&&(stat.w-mean-.5)/Math.sqrt(variance)>=js.normal.inv(1-alpha,0,1);}
  function bootstrapCritical(x,mean,B,alpha,random){const out=new Float64Array(B),n=x.length;for(let b=0;b<B;b++){let m=0,m2=0;for(let i=0;i<n;i++){const v=x[Math.floor(random()*n)],d=v-m;m+=d/(i+1);m2+=d*(v-m);}const se=Math.sqrt(m2/(n-1)/n);out[b]=se>0?(m-mean)/se:0;}out.sort();return out[Math.min(B-1,Math.ceil((B+1)*(1-alpha))-1)];}
  function grid(c){const offsets=Array.from({length:41},(_,i)=>c.low+(c.high-c.low)*i/40);if(!offsets.some(x=>Math.abs(x)<1e-10*(c.high-c.low)))offsets.push(0);return offsets.map(x=>Math.abs(x)<1e-10*(c.high-c.low)?0:x).sort((a,b)=>a-b);}
  function validate(c){
    for(const k of ['mu0','sigma','p','k','n','alpha','low','high','m','B'])if(!Number.isFinite(c[k]))throw Error('请填写有效的数值。');
    if(!(c.family in names)||!Array.isArray(c.methods)||!c.methods.length||c.methods.some(k=>!(k in methods)))throw Error('请至少选择一种检验方法。');
    if(c.family==='gamma'&&c.methods.includes('wilcoxon'))throw Error('偏态分布不满足本实验中 Wilcoxon 检验的对称假设。');
    if(c.sigma<.01||c.sigma>1000||Math.abs(c.mu0)>10000)throw Error('标准差应在 0.01 到 1000 之间，均值绝对值不超过 10000。');
    if(c.low>0||c.high<=0||c.low>=c.high||Math.max(Math.abs(c.low),Math.abs(c.high))>1e5)throw Error('均值偏移范围须包含 0 和正值，且下限小于上限。');
    if(![20,30,50,100,200].includes(c.n)||![500,1000,3000].includes(c.m)||![199,499].includes(c.B)||![.01,.05,.1].includes(c.alpha)||c.p<.5||c.p>1||![3,5,10].includes(c.k))throw Error('模拟参数超出支持范围。');
    return c;
  }
  function simulate(c,seed,onProgress){
    validate(c);const random=rng(seed^0x9E3779B9),draw=sampler(c,rng(seed)),offsets=grid(c),counts=Object.fromEntries(c.methods.map(k=>[k,new Uint32Array(offsets.length)]));
    const tCrit=js.studentt.inv(1-c.alpha,c.n-1),x=new Float64Array(c.n),rootN=Math.sqrt(c.n);
    for(let j=0;j<c.m;j++){
      for(let i=0;i<c.n;i++)x[i]=draw();const {mean,sd}=moments(x),se=sd/rootN;
      // Studentized bootstrap is translation-invariant: resample once per dataset,
      // then reuse its null critical value across the entire mean grid.
      const bCrit=c.methods.includes('bootstrap')?bootstrapCritical(x,mean,c.B,c.alpha,random):0;
      for(let i=0;i<offsets.length;i++){const t=(mean+offsets[i])/se;if(counts.t&&t>=tCrit)counts.t[i]++;if(counts.bootstrap&&t>bCrit)counts.bootstrap[i]++;if(counts.wilcoxon&&rejectRank(signedRank(x,offsets[i]),c.alpha))counts.wilcoxon[i]++;}
      if(onProgress&&(j+1)%50===0)onProgress((j+1)/c.m);
    }
    return {config:c,seed,offsets,mu:offsets.map(d=>c.mu0+d),curves:Object.fromEntries(c.methods.map(k=>[k,Array.from(counts[k],v=>({p:v/c.m,se:Math.sqrt(v/c.m*(1-v/c.m)/c.m),ci:wilson(v,c.m),count:v}))]))};
  }
  const api={names,methods,rng,sampler,moments,populationSD,density,wilson,signedRank,rankCritical,rejectRank,bootstrapCritical,grid,validate,simulate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PowerLabStats=api;
})(typeof self!=='undefined'?self:globalThis);
