(function(root){
'use strict';
const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
const softplus=x=>Math.max(x,0)+Math.log1p(Math.exp(-Math.abs(x)));
function sample(n,beta,seed){
 let state=seed>>>0;const uniform=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 const data=[];for(let i=0;i<n;i++){const x=Math.sqrt(-2*Math.log(Math.max(uniform(),1e-15)))*Math.cos(2*Math.PI*uniform());data.push({x,y:uniform()<sigmoid(beta*x)?1:0});}return data;
}
function stats(data,beta){let ll=0,score=0,info=0;for(const {x,y} of data){const eta=x*beta,p=sigmoid(eta);ll+=y*eta-softplus(eta);score+=(y-p)*x;info+=p*(1-p)*x*x;}return {beta,ll,score,info};}
function run(data,start,tol=1e-8,max=50){
 const path=[];let beta=start;
 for(let t=0;t<=max;t++){
  const s={...stats(data,beta),t};s.done=Math.abs(s.score)/data.length<=tol;s.failed=false;s.delta=s.done?0:s.score/s.info;s.next=beta+s.delta;
  if(!s.done&&(s.info<1e-12||!Number.isFinite(s.next)||Math.abs(s.next)>100)){s.failed=true;s.reason='Fisher 信息量过小或更新过大，迭代未收敛。请换一个更接近 0 的初值。';}
  if(!s.done&&!s.failed&&t===max){s.failed=true;s.reason='达到最大迭代次数，尚未满足停止条件。';}
  path.push(s);if(s.done||s.failed)break;beta=s.next;
 }
 return path;
}
const api={sigmoid,softplus,sample,stats,run};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FisherCore=api;
})(typeof window==='undefined'?globalThis:window);
