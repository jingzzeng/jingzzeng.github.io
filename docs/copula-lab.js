/* Copula lab. Distribution functions: locally bundled jStat 1.9.6 (MIT). */
(() => {
'use strict';
const $ = id => document.getElementById('cp-' + id), J = window.jStat;
if (!$('lab')) return;
if (!J) {$('error').textContent='计算库未加载，请刷新页面。';return;}
const clamp = u => Math.max(1e-12, Math.min(1-1e-12,u));
function rng(seed) {return () => {seed |= 0;seed = seed + 0x6D2B79F5 | 0;let t = Math.imul(seed ^ seed >>> 15, 1 | seed);t ^= t + Math.imul(t ^ t >>> 7, 61 | t);return ((t ^ t >>> 14) >>> 0) / 4294967296;};}
function freshSeed(previous=0) {let value;do {const numbers=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){globalThis.crypto.getRandomValues(numbers);value=numbers[0]%2147483647+1;}else{value=Math.floor(Math.random()*2147483647)+1;}} while(value===previous);return value;}
function sample(n,f,p,df,seed) {
 const random=rng(seed), unif=()=>clamp(random()), normal=()=>Math.sqrt(-2*Math.log(unif()))*Math.cos(2*Math.PI*unif());
 const gamma=a=>{if(a<1)return gamma(a+1)*unif()**(1/a);const d=a-1/3,c=1/Math.sqrt(9*d);for(;;){const z=normal(),v=(1+c*z)**3;if(v<=0)continue;const u=unif();if(u<1-.0331*z**4||Math.log(u)<.5*z*z+d*(1-v+Math.log(v)))return d*v;}};
 return Array.from({length:n},()=>{
  let u=unif(), v=unif();
  if(f==='gaussian'||f==='t'){const z=normal(),w=p*z+Math.sqrt(1-p*p)*normal();if(f==='gaussian'){u=J.normal.cdf(z,0,1);v=J.normal.cdf(w,0,1);}else{const s=Math.sqrt(2*gamma(df/2)/df);u=J.studentt.cdf(z/s,df);v=J.studentt.cdf(w/s,df);}}
  if(f==='clayton'){v=(1+u**(-p)*(v**(-p/(1+p))-1))**(-1/p);}
  if(f==='gumbel'&&p>1){const a=-Math.log(u),target=Math.log(v);let lo=1e-14,hi=1-1e-14;for(let k=0;k<48;k++){const mid=(lo+hi)/2,b=-Math.log(mid),s=a**p+b**p;const logConditional=-(s**(1/p))+(1/p-1)*Math.log(s)+(p-1)*Math.log(a)-Math.log(u);if(logConditional<target)lo=mid;else hi=mid;}v=(lo+hi)/2;}
  return [clamp(u),clamp(v)];
 });
}
const quantile=(u,m)=>({uniform:()=>u,normal:()=>J.normal.inv(u,0,1),t:()=>J.studentt.inv(u,4),exponential:()=>-Math.log1p(-u),lognormal:()=>Math.exp(J.normal.inv(u,0,1)),beta:()=>J.beta.inv(u,2,5)})[m]();
const marginMath=m=>({uniform:'\\operatorname{Uniform}(0,1)',normal:'\\mathcal{N}(0,1)',t:'t_4',exponential:'\\operatorname{Exp}(1)',lognormal:'\\operatorname{Lognormal}(0,1)',beta:'\\operatorname{Beta}(2,5)'})[m];
function plot(canvas,data,uv,uniform){
 const size=Math.max(280,canvas.getBoundingClientRect().width),dpr=window.devicePixelRatio||1;canvas.width=size*dpr;canvas.height=size*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);const l=60,t=62,r=size-58,b=size-56,w=r-l,h=b-t;
 const ranges=[0,1].map(k=>{if(uniform)return [0,1];let lo=Infinity,hi=-Infinity;for(const p of data){lo=Math.min(lo,p[k]);hi=Math.max(hi,p[k]);}const pad=(hi-lo)*.04||1;return [lo-pad,hi+pad];});
 const pos=(v,k)=> (v-ranges[k][0])/(ranges[k][1]-ranges[k][0]);
 c.font='14px system-ui';c.lineWidth=1;
 for(let i=0;i<=4;i++){const f=i/4,x=l+w*f,y=b-h*f;c.strokeStyle='#e6edf2';c.beginPath();c.moveTo(x,t);c.lineTo(x,b);c.moveTo(l,y);c.lineTo(r,y);c.stroke();c.fillStyle='#627587';c.textAlign='center';c.fillText((ranges[0][0]+f*(ranges[0][1]-ranges[0][0])).toFixed(uniform?2:1),x,b+22);c.textAlign='right';c.fillText((ranges[1][0]+f*(ranges[1][1]-ranges[1][0])).toFixed(uniform?2:1),l-8,y+5);}
 for(let k=0;k<2;k++){const bins=Array(22).fill(0);data.forEach(p=>bins[Math.min(21,Math.max(0,Math.floor(pos(p[k],k)*22)))]++);const max=Math.max(...bins);c.fillStyle='#bad7e9';bins.forEach((v,i)=>{if(k===0)c.fillRect(l+i*w/22,t-8-v/max*35,w/22-1,v/max*35);else c.fillRect(r+8,b-(i+1)*h/22,v/max*30,h/22-1);});}
 data.forEach((p,i)=>{const f=uv[i][0];c.fillStyle=`hsla(${212-184*f},65%,45%,0.5)`;c.beginPath();c.arc(l+pos(p[0],0)*w,b-pos(p[1],1)*h,data.length>3000?1.4:2,0,2*Math.PI);c.fill();});
 c.strokeStyle='#8094a4';c.strokeRect(l,t,w,h);c.fillStyle='#263e51';c.font='16px system-ui';c.textAlign='center';c.fillText(uniform?'U':'X',l+w/2,size-8);c.save();c.translate(16,t+h/2);c.rotate(-Math.PI/2);c.fillText(uniform?'V':'Y',0,0);c.restore();
}
let uv=[],xy=[],seed=freshSeed();
function familySetup(){const f=$('family').value,arch=['clayton','gumbel'].includes(f);$('dependence').hidden=f==='independent';$('df-wrap').hidden=f!=='t';$('param').min=arch?(f==='gumbel'?1:.1):-.95;$('param').max=arch?8:.95;$('param').step=arch?.1:.05;$('param').value=arch?2:.5;$('param-label').textContent=arch?'依赖参数 θ':'相关参数 ρ';$('family-note').textContent={gaussian:'对称依赖；ρ 可为负。',t:'对称的上下尾依赖；ν 越小，尾部依赖通常越强。',clayton:'本实验使用 θ > 0：θ 越大，正依赖越强，具有下尾依赖。',gumbel:'θ = 1 时独立；θ > 1 时具有上尾依赖。',independent:'U 与 V 相互独立。'}[f];}
function update(regenerate=true){
 if(!$('df').checkValidity()){$('error').textContent='请输入有效的自由度整数（2–50）。';return;}$('error').textContent='';
 const f=$('family').value,p=+$('param').value,df=+$('df').value,n=+$('n').value,mx=$('x').value,my=$('y').value;
 $('param-value').textContent=p.toFixed(2);
 if(regenerate)uv=sample(n,f,p,df,seed);xy=uv.map(([u,v])=>[quantile(u,mx),quantile(v,my)]);
 if(!xy.every(p=>p.every(Number.isFinite))){$('error').textContent='数值计算失败，请调整模型参数。';return;}
 const marginTitle=$('margin-title');
 marginTitle.textContent=`\\(X\\sim ${marginMath(mx)},\\qquad Y\\sim ${marginMath(my)}\\)`;
 if(window.MathJax?.typesetPromise){window.MathJax.typesetClear?.([marginTitle]);window.MathJax.typesetPromise([marginTitle]);}
 plot($('uniform'),uv,uv,true);plot($('transformed'),xy,uv,false);
}
$('family').addEventListener('change',()=>{familySetup();update();});
for(const id of ['param','df','n'])$(id).addEventListener('input',()=>update());
for(const id of ['x','y'])$(id).addEventListener('change',()=>update(false));
$('resample').addEventListener('click',()=>{seed=freshSeed(seed);update();});
function preset(name){$('family').value='gaussian';familySetup();$('param').value=name==='normal'?.9:.5;$('x').value=name==='uniform'?'uniform':name==='mixed'?'t':'normal';$('y').value=name==='uniform'?'uniform':'normal';$('n').value='1000';$('df').value='4';seed=freshSeed(seed);update();}
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset)));$('reset').addEventListener('click',()=>preset('default'));
let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>update(false),100);});
familySetup();update();
// Expose pure numerical operations for reproducible validation.
window.CopulaLab={sample,quantile};
})();
