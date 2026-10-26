(function (scope) {
  'use strict';
  function g(y, a, n) { return a*a+y*y+2*a*y/(n-1)-(n-2); }
  function derivative(y,a,n) { return 2*y+2*a/(n-1); }
  function positiveRoot(a,n) { const d=a/(n-1); return -d+Math.sqrt(d*d+n-2-a*a); }
  function run(o) {
    const {a,n,left,right,start,tolerance}=o;
    if (![a,n,left,right,start,tolerance].every(Number.isFinite)||n<=2||tolerance<=0||left>=right) throw Error('请输入有效参数，左端点须小于右端点。');
    if (g(left,a,n)*g(right,a,n)>0) throw Error('二分法要求左右端点的函数值异号，请调整区间。');
    const bis=[],newton=[]; let l=left,r=right;
    for(let t=0;t<80;t++) {
      const c=(l+r)/2, fl=g(l,a,n), fc=g(c,a,n), fr=g(r,a,n);
      const done=Math.abs(fc)<=tolerance || (r-l)/2<=tolerance;
      const keepLeft=fl*fc<=0;
      bis.push({t,l,r,c,fl,fc,fr,keepLeft,done,reason:Math.abs(fc)<=tolerance?'函数残差达到容差':'区间半宽达到容差'});
      if(done) break;
      if(keepLeft)r=c;else l=c;
    }
    let y=start;
    for(let t=0;t<80;t++) {
      const f=g(y,a,n), slope=derivative(y,a,n);
      if(Math.abs(f)<=tolerance) {newton.push({t,y,f,slope,next:y,done:true,reason:'函数残差达到容差'});break;}
      if(Math.abs(slope)<1e-12) {newton.push({t,y,f,slope,next:y,done:true,failed:true,reason:'导数接近零，无法继续求根'});break;}
      const next=y-f/slope;
      if(!Number.isFinite(next)||Math.abs(next)>1e8) {newton.push({t,y,f,slope,next:y,done:true,failed:true,reason:'迭代点过大，请调整初值'});break;}
      newton.push({t,y,f,slope,next,done:false});y=next;
    }
    return {bis,newton};
  }
  const api={g,derivative,positiveRoot,run};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.RootLabCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
