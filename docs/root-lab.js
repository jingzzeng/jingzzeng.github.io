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
    const W=800,H=460,L=116,R=32,T=44,B=84, blue='#176b9a',orange='#c86b30',teal='#008875';
    let lo=options.left,hi=options.right;
    if(method==='newton'){
      const xs=paths.newton.flatMap(v=>[v.y,v.next]).filter(Number.isFinite);
      lo=Math.min(0,...xs);hi=Math.max(...xs);
    }
    const span=Math.max(hi-lo,1e-5);
    lo-=span*.03;hi+=span*.08;
    if(hi-lo<1e-5){lo-=5e-6;hi+=5e-6;}
    let bottom=0,top=0;const points=[];
    for(let i=0;i<=300;i++){const y=lo+(hi-lo)*i/300,f=C.g(y,options.a,options.n);bottom=Math.min(bottom,f);top=Math.max(top,f);points.push([y,f]);}
    const pad=Math.max((top-bottom)*.12,1e-12);bottom-=pad;top+=pad;
    const px=y=>L+(y-lo)/(hi-lo)*(W-L-R),py=f=>T+(top-f)/(top-bottom)*(H-T-B),zero=py(0);
    let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="rt-svg-title"><title id="rt-svg-title">${method==='bis'?'二分法区间与中点':'牛顿法函数曲线与切线'}，当前迭代 ${s.t}</title><defs><clipPath id="rt-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath></defs>`;
    for(let i=0;i<=4;i++){
      const x=L+(W-L-R)*i/4,y=T+(H-T-B)*i/4;
      out+=line(x,T,x,H-B,'#e2eaed')+line(L,y,W-R,y,'#e2eaed');
      out+=`<text x="${x}" y="${H-B+32}" text-anchor="middle" fill="#607681" font-size="22">${(lo+(hi-lo)*i/4).toFixed(2)}</text><text x="${L-10}" y="${y+7}" text-anchor="end" fill="#607681" font-size="22">${(top-(top-bottom)*i/4).toFixed(2)}</text>`;
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
    const label=(x,y,text,color)=>`<text x="${x}" y="${y}" fill="${color}" text-anchor="middle" font-size="24" font-weight="600">${text}</text>`;
    if(method==='bis'){
      out+=label(px(s.l),22,'L',teal)+label(px(s.r),22,'R',teal);
      if(phase>=1)out+=label(px(s.c),22,'c = (L + R) / 2',orange);
    }else{out+=label(px(s.y),22,'yₜ',orange);if(phase>=1&&Math.abs(px(s.next)-px(s.y))>40)out+=label(px(s.next),H-B+45,'yₜ₊₁',teal);}
    out+=`<text x="${(L+W-R)/2}" y="${H-5}" text-anchor="middle" fill="#173343" font-size="26">候选值 y</text><text transform="translate(25 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" fill="#173343" font-size="26">g(y)</text></svg>`;
    $('chart').innerHTML=out;
  }
  function render(){
    const t=Math.floor(position/3),phase=position%3,s=paths[method][t],isBis=method==='bis';
    $('error').textContent=s.failed?s.reason:'';
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
  $('play').onclick=()=>{
    if(timer){pause();return;}if(position===maxPosition())position=0;
    $('play').textContent='Ⅱ 暂停';timer=setInterval(()=>{position=Math.min(position+1,maxPosition());render();},900);
  };
  $('original').onclick=()=>{$('left').value=0;$('right').value=100;$('start').value=20;apply();};
  $('near').onclick=()=>{$('left').value=0;$('right').value=10;$('start').value=8;apply();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  if(location.hash==='#newton'){method='newton';$('method').value='newton';}
  apply();
})();
