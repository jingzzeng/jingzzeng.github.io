(function () {
  'use strict';
  const C=window.RootLabCore,$=id=>document.getElementById('rt-'+id);
  let options,paths,method='bis',position=0,timer=null;
  const fmt=v=>!Number.isFinite(v)?'—':Math.abs(v)>0&&(Math.abs(v)<1e-4||Math.abs(v)>1e6)?v.toExponential(3):Number(v.toPrecision(7)).toString();
  const maxPosition=()=>paths[method].length*3-1;
  function pause(){if(timer)clearInterval(timer);timer=null;$('play').textContent='▶ 自动播放';}
  function apply(){
    pause();
    const candidate={a:+$('a').value,n:+$('n').value,left:+$('left').value,right:+$('right').value,start:+$('start').value,tolerance:+$('tol').value};
    try {
      if(candidate.a<0||candidate.a>1||candidate.n<4||candidate.n>100||!Number.isInteger(candidate.n))throw Error('本实验请取 0 ≤ a ≤ 1，整数 4 ≤ n ≤ 100。');
      const result=C.run(candidate);options=candidate;paths=result;position=0;$('error').textContent='';render();
    }catch(e){$('error').textContent=e.message;}
  }
  function line(x1,y1,x2,y2,color,width=1,dash=''){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;}
  function plot(s,phase){
    const W=900,H=400,L=76,R=26,T=34,B=62, blue='#176b9a',orange='#c86b30',teal='#008875';
    let lo=options.left,hi=options.right;
    if($('follow').checked){
      if(method==='bis'){lo=s.l;hi=s.r;}else {lo=Math.min(s.y,s.next);hi=Math.max(s.y,s.next);}
      const span=Math.max(hi-lo,1e-5);lo-=span*.18;hi+=span*.18;
    }else if(method==='newton'){lo=Math.min(lo,s.y,s.next);hi=Math.max(hi,s.y,s.next);}
    if(hi-lo<1e-5){lo-=5e-6;hi+=5e-6;}
    let bottom=0,top=0;const points=[];
    for(let i=0;i<=300;i++){const y=lo+(hi-lo)*i/300,f=C.g(y,options.a,options.n);bottom=Math.min(bottom,f);top=Math.max(top,f);points.push([y,f]);}
    const pad=Math.max((top-bottom)*.12,1e-12);bottom-=pad;top+=pad;
    const px=y=>L+(y-lo)/(hi-lo)*(W-L-R),py=f=>T+(top-f)/(top-bottom)*(H-T-B),zero=py(0);
    let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="rt-svg-title"><title id="rt-svg-title">${method==='bis'?'二分法区间与中点':'牛顿法函数曲线与切线'}，当前迭代 ${s.t}</title><defs><clipPath id="rt-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath></defs>`;
    for(let i=0;i<=4;i++){
      const x=L+(W-L-R)*i/4,y=T+(H-T-B)*i/4;
      out+=line(x,T,x,H-B,'#e2eaed')+line(L,y,W-R,y,'#e2eaed');
      out+=`<text x="${x}" y="${H-B+25}" text-anchor="middle" fill="#607681" font-size="13">${fmt(lo+(hi-lo)*i/4)}</text><text x="${L-10}" y="${y+4}" text-anchor="end" fill="#607681" font-size="12">${fmt(top-(top-bottom)*i/4)}</text>`;
    }
    out+=`<g clip-path="url(#rt-clip)">`;
    if(method==='bis'){
      let a=s.l,b=s.r;if(phase===2&&!s.done){if(s.keepLeft)b=s.c;else a=s.c;}
      out+=`<rect x="${px(a)}" y="${T}" width="${px(b)-px(a)}" height="${H-T-B}" fill="#008875" opacity=".08"/>`;
      out+=line(px(s.l),T,px(s.l),H-B,teal,1.5,'5 4')+line(px(s.r),T,px(s.r),H-B,teal,1.5,'5 4');
      if(phase>=1)out+=line(px(s.c),T,px(s.c),H-B,orange,1.5,'4 3');
    }else if(phase>=1&&!s.failed){out+=line(px(lo),py(s.f+s.slope*(lo-s.y)),px(hi),py(s.f+s.slope*(hi-s.y)),teal,2,'7 4')+line(px(s.y),zero,px(s.y),py(s.f),orange,1.2,'4 4');}
    out+=line(L,zero,W-R,zero,'#8397a0',1.5);
    out+=`<path d="${points.map((p,i)=>`${i?'L':'M'}${px(p[0])},${py(p[1])}`).join(' ')}" fill="none" stroke="${blue}" stroke-width="3"/>`;
    const point=(x,f,color)=>`<circle cx="${px(x)}" cy="${py(f)}" r="6" fill="${color}" stroke="white" stroke-width="2"/>`;
    if(method==='bis'){
      out+=point(s.l,s.fl,teal)+point(s.r,s.fr,teal);
      if(phase>=1)out+=point(s.c,s.fc,orange);
    }else{out+=point(s.y,s.f,orange);if(phase>=1&&!s.failed)out+=point(s.next,0,teal);if(phase===2&&!s.failed)out+=point(s.next,C.g(s.next,options.a,options.n),orange);}
    out+='</g>';
    const label=(x,y,text,color)=>`<text x="${x}" y="${y}" fill="${color}" text-anchor="middle" font-size="14" font-weight="600">${text}</text>`;
    if(method==='bis'){
      out+=label(px(s.l),22,'L',teal)+label(px(s.r),22,'R',teal);
      if(phase>=1)out+=label(px(s.c),22,'c = (L + R) / 2',orange);
    }else{out+=label(px(s.y),22,'yₜ',orange);if(phase>=1&&Math.abs(px(s.next)-px(s.y))>40)out+=label(px(s.next),H-B+45,'yₜ₊₁',teal);}
    out+=`<text x="${(L+W-R)/2}" y="${H-5}" text-anchor="middle" fill="#173343" font-size="16">候选值 y</text><text transform="translate(18 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" fill="#173343" font-size="16">g(y)</text></svg>`;
    $('chart').innerHTML=out;
  }
  function render(){
    const t=Math.floor(position/3),phase=position%3,s=paths[method][t],isBis=method==='bis';
    $('step-label').textContent=`${isBis?'二分法':'牛顿法'} · 第 ${t} 次迭代 · 步骤 ${phase+1}/3`;
    let title,explain;
    if(isBis){
      if(phase===0){title='观察当前区间';explain=`L = ${fmt(s.l)}，R = ${fmt(s.r)}。g(L) = ${fmt(s.fl)}，g(R) = ${fmt(s.fr)}。两端异号，连续曲线在区间内有根。`;}
      if(phase===1){title='取中点，计算函数值';explain=`c = (L + R) / 2 = ${fmt(s.c)}，g(c) = ${fmt(s.fc)}。橙色点标出本次候选值；接下来判断哪一半区间仍然异号。`;}
      if(phase===2){title=s.done?'满足停止条件':s.keepLeft?'更新右端点 R ← c':'更新左端点 L ← c';explain=s.done?`${s.reason}，本次返回 c = ${fmt(s.c)}。`:`g(L) × g(c) ${s.keepLeft?'≤ 0':'> 0'}，因此保留 ${s.keepLeft?'[L, c]，将右端点移到中点':'[c, R]，将左端点移到中点'}。绿色背景标出保留的区间，下一次迭代将在这里继续。`;}
      $('rule').innerHTML='<strong>二分法</strong><br>c = (L + R) / 2<br>若 g(L)g(c) ≤ 0，令 R = c；否则令 L = c。<br>每次将区间宽度减半。';
    }else{
      if(phase===0){title='在当前点计算函数与导数';explain=`yₜ = ${fmt(s.y)}，g(yₜ) = ${fmt(s.f)}，g′(yₜ) = ${fmt(s.slope)}。此处 g′(y) = 2y + 2a / (n − 1)。`;}
      if(phase===1){title=s.done?'检查停止条件':'画切线，找横轴交点';explain=s.done?s.reason:`绿色虚线为当前点的切线。令切线高度为 0，得到 yₜ₊₁ = yₜ − g(yₜ) / g′(yₜ) = ${fmt(s.next)}。`;}
      if(phase===2){title=s.done?(s.failed?'本次迭代无法继续':'满足停止条件'):'移动到新点';explain=s.done?s.reason:`将横轴交点 ${fmt(s.next)} 作为下一次迭代点。橙色点回到函数曲线上，再在新位置作切线。新的残差为 ${fmt(Math.abs(C.g(s.next,options.a,options.n)))}。`;}
      $('rule').innerHTML='<strong>牛顿法求根</strong><br>yₜ₊₁ = yₜ − g(yₜ) / g′(yₜ)<br>一阶 Taylor 近似：用切线代替曲线，再求切线的零点。';
    }
    $('phase-title').textContent=title;$('explain').textContent=explain;
    $('badge').textContent=s.done&&phase===2?(s.failed?'请调整初值':'已停止'):'逐步观察';
    const value=isBis?s.c:(phase===2?s.next:s.y);
    $('value').textContent=fmt(value);$('residual').textContent=fmt(Math.abs(C.g(value,options.a,options.n)));
    $('width-label').textContent=isBis?'区间宽度 R − L':'本次步长 |yₜ₊₁ − yₜ|';$('width').textContent=fmt(isBis?(s.r-s.l)/(phase===2&&!s.done?2:1):Math.abs(s.next-s.y));
    $('aux-legend').textContent=isBis?'保留区间 / 端点':'当前点的切线';
    $('back').disabled=position===0;$('next').disabled=position===maxPosition();
    $('scrub').max=maxPosition();$('scrub').value=position;$('progress').textContent=`${position+1} / ${maxPosition()+1}`;
    $('thead').innerHTML=isBis?'<tr><th>t</th><th>L</th><th>R</th><th>c</th><th>g(c)</th></tr>':'<tr><th>t</th><th>yₜ</th><th>g(yₜ)</th><th>yₜ₊₁</th></tr>';
    $('tbody').innerHTML=paths[method].slice(0,t+1).map(v=>'<tr>'+ (isBis?[v.t,fmt(v.l),fmt(v.r),fmt(v.c),fmt(v.fc)]:[v.t,fmt(v.y),fmt(v.f),fmt(v.next)]).map(x=>`<td>${x}</td>`).join('')+'</tr>').join('');
    plot(s,phase);
    if(position===maxPosition())pause();
  }
  $('apply').onclick=apply;
  $('method').onchange=()=>{pause();method=$('method').value;position=0;render();};
  $('next').onclick=()=>{pause();position=Math.min(position+1,maxPosition());render();};
  $('back').onclick=()=>{pause();position=Math.max(position-1,0);render();};
  $('reset').onclick=()=>{pause();position=0;render();};
  $('scrub').oninput=()=>{pause();position=+$('scrub').value;render();};
  $('follow').onchange=render;
  $('speed').onchange=pause;
  $('play').onclick=()=>{
    if(timer){pause();return;}if(position===maxPosition())position=0;
    $('play').textContent='Ⅱ 暂停';timer=setInterval(()=>{position=Math.min(position+1,maxPosition());render();},+$('speed').value);
  };
  $('original').onclick=()=>{$('left').value=0;$('right').value=100;$('start').value=20;apply();};
  $('near').onclick=()=>{$('left').value=0;$('right').value=10;$('start').value=8;apply();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  if(location.hash==='#newton'){method='newton';$('method').value='newton';}
  apply();
})();
