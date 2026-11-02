(function(){
'use strict';
const C=window.FisherCore,$=id=>document.getElementById('fs-'+id),blue='#176b9a',teal='#008875',orange='#c86b30',muted='#607681';
let data=[],path=[],options,pos=0,timer=null,grid=[],bounds;
const fmt=x=>!Number.isFinite(x)?'—':Math.abs(x)>0&&Math.abs(x)<1e-4?x.toExponential(2):Number(x.toFixed(6)).toString();
const max=()=>3*(path.length-1);
function pause(){clearInterval(timer);timer=null;$('play').textContent='▶ 自动播放';}
function apply(){pause();try{
 const o={n:+$('n').value,truth:+$('truth').value,start:+$('start').value,seed:+$('seed').value};
 if(![100,300,1000].includes(o.n)||!Number.isFinite(o.truth)||Math.abs(o.truth)>3||!Number.isFinite(o.start)||Math.abs(o.start)>10||!Number.isInteger(o.seed)||o.seed<0||o.seed>4294967295)throw Error('请取 −3 ≤ 真实 β ≤ 3，−10 ≤ 初值 ≤ 10，以及非负整数种子。');
 if(['truth','start','seed'].some(k=>$(k).value.trim()===''))throw Error('请填写完整的参数。');
 options=o;data=C.sample(o.n,o.truth,o.seed);path=C.run(data,o.start);pos=0;
 const vals=path.map(s=>s.beta);let lo=Math.min(-2,...vals),hi=Math.max(2,...vals),pad=(hi-lo)*.08;lo-=pad;hi+=pad;
 grid=Array.from({length:241},(_,i)=>{const b=lo+(hi-lo)*i/240;return [b,C.stats(data,b).ll/o.n];});
 let low=Math.min(...grid.map(p=>p[1])),high=Math.max(...grid.map(p=>p[1]));const yp=(high-low)*.14;bounds={lo,hi,low:low-yp,high:high+yp};render();
 }catch(e){$('error').textContent=e.message;}}
function frame(id,title,xmin,xmax,ymin,ymax,xlabel,ylabel){
 const W=640,H=370,L=100,R=24,T=30,B=72;
 const px=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),py=y=>H-B-(y-ymin)/(ymax-ymin)*(H-T-B);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-title"><title id="${id}-title">${title}</title><defs><clipPath id="${id}-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath></defs>`;
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;svg+=`<path d="M${px(x)} ${T}V${H-B}M${L} ${py(y)}H${W-R}" fill="none" stroke="#e2eaed"/><text x="${px(x)}" y="${H-B+30}" text-anchor="middle" font-size="21" fill="${muted}">${x.toFixed(2)}</text><text x="${L-12}" y="${py(y)+7}" text-anchor="end" font-size="21" fill="${muted}">${y.toFixed(2)}</text>`;}
 svg+=`<text x="${(L+W-R)/2}" y="${H-9}" text-anchor="middle" font-size="23" fill="#173343">${xlabel}</text><text transform="translate(27 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" font-size="23" fill="#173343">${ylabel}</text><g clip-path="url(#${id}-clip)">`;
 return {svg,px,py,W,H,L,R,T,B};
}
const curve=(pts,px,py,color,dash='',width=3)=>`<path d="${pts.map(([x,y],i)=>`${i?'L':'M'}${px(x).toFixed(2)} ${py(y).toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
function likelihood(s,phase,view){
 const b=bounds,f=frame('fs-ll-svg','平均对数似然曲线和 Fisher 二次近似',b.lo,b.hi,b.low,b.high,'参数 β','ℓ(β) / n'),{px,py}=f;
 let svg=f.svg+curve(grid,px,py,blue);
 const preview=phase===1&&!s.done&&!s.failed;
 if(preview){
  const q=grid.map(([x])=>[x,(s.ll+s.score*(x-s.beta)-.5*s.info*(x-s.beta)**2)/options.n]);
  svg+=curve(q,px,py,teal,'8 5',2);
  svg+=`<path d="M${px(s.next)} ${f.T}V${f.H-f.B}" stroke="${teal}" stroke-dasharray="5 5"/><circle cx="${px(s.next)}" cy="${py(C.stats(data,s.next).ll/options.n)}" r="5" fill="${teal}"/><text x="${px(s.next)+10}" y="${f.T+20}" font-size="20" fill="${teal}">β⁽ᵗ⁺¹⁾</text>`;
 }
 svg+=`<circle cx="${px(view.beta)}" cy="${py(view.ll/options.n)}" r="6" fill="${orange}" stroke="white" stroke-width="2"/>`;
 $('quadratic-legend').hidden=!preview;$('likelihood').innerHTML=svg+'</g></svg>';
}
function render(){
 const t=Math.floor(pos/3),phase=pos%3,s=path[t],view=phase===2&&!s.done&&!s.failed?C.stats(data,s.next):s;
 $('error').textContent=s.failed?s.reason:'';
 $('phase').textContent=s.failed?'迭代未收敛':s.done?'满足停止条件':['计算概率、得分与信息量','构造二次近似并计算更新','更新 β'][phase];
 $('iteration').textContent=`第 ${s.t} 次迭代`;
 $('beta').textContent=fmt(view.beta);$('score').textContent=fmt(view.score);$('info').textContent=fmt(view.info);
 $('update').textContent=s.failed?'当前初值下的完整 Fisher 步未能收敛。':s.done?`β̂ = ${fmt(s.beta)}，|U(β̂)| / n = ${fmt(Math.abs(s.score)/options.n)}`:phase===0?`β⁽ᵗ⁺¹⁾ = β⁽ᵗ⁾ + U(β⁽ᵗ⁾) / I(β⁽ᵗ⁾)`:`β⁽ᵗ⁺¹⁾ = ${fmt(s.beta)} + (${fmt(s.score)}) / ${fmt(s.info)} = ${fmt(s.next)}`;
 $('back').disabled=pos===0;$('next').disabled=pos===max();$('scrub').max=max();$('scrub').value=pos;$('progress').textContent=`${pos+1} / ${max()+1}`;
 $('history').innerHTML=path.slice(0,t+1).map((r,i)=>`<tr data-t="${i}" tabindex="0" aria-label="查看第 ${r.t} 次迭代"><td>${r.t}</td><td>${fmt(r.beta)}</td><td>${fmt(r.score)}</td><td>${fmt(r.info)}</td><td>${r.done||r.failed?'—':fmt(r.next)}</td><td>${fmt(r.ll/options.n)}</td></tr>`).join('');
 likelihood(s,phase,view);if(pos===max())pause();
}
function move(to){pause();pos=Math.max(0,Math.min(max(),to));render();}
$('apply').onclick=apply;$('next').onclick=()=>move(pos+1);$('back').onclick=()=>move(pos-1);$('reset').onclick=()=>move(0);$('scrub').oninput=()=>move(+$('scrub').value);
$('play').onclick=()=>{if(timer){pause();return;}if(pos===max()){pos=0;render();}if(max()===0)return;$('play').textContent='Ⅱ 暂停';timer=setInterval(()=>{pos=Math.min(pos+1,max());render();},1100);};
$('history').onclick=e=>{const row=e.target.closest('tr[data-t]');if(row)move(+row.dataset.t*3);};
$('history').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('tr[data-t]');if(row){e.preventDefault();move(+row.dataset.t*3);}}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});apply();
})();
