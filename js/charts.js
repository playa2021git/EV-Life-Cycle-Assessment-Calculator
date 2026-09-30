(() => {
'use strict';
const NS='http://www.w3.org/2000/svg';
function el(name,attrs={},text=''){
  const n=document.createElementNS(NS,name);
  for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
  n.textContent=text;return n;
}
function geometry(result,width=760){
  const height=360,p={left:64,right:24,top:36,bottom:48};
  const max=Math.max(1000,...Object.values(result.components).map(c=>c.total))*1.1;
  return {width,height,max,x:year=>p.left+(width-p.left-p.right)*year/result.years,
    y:value=>p.top+(height-p.top-p.bottom)*(1-value/max),p};
}
function cumulative(svg,result,width=760){
  const g=geometry(result,width),{height,max,p,x,y}=g;
  svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+width+' '+height);
  svg.append(el('title',{},'使い始めからの温室効果ガス排出量（t-CO₂e）'),
    el('desc',{},'実線はガソリン車、破線はEV。電池交換を行う場合、10年でEVの線が上に跳ねます。数値は下の表でも確認できます。'));
  for(let i=0;i<=4;i++){
    const value=max*i/4;
    svg.append(el('line',{x1:p.left,x2:width-p.right,y1:y(value),y2:y(value),class:'grid'}),
      el('text',{x:p.left-8,y:y(value)+5,'text-anchor':'end',class:'axis'},(value/1000).toFixed(1)));
  }
  svg.append(el('text',{x:p.left,y:18,class:'axis'},'t-CO₂e'));
  const ticks=[...new Set([0,Math.round(result.years/2),result.years])];
  for(const year of ticks)svg.append(el('text',{x:x(year),y:height-15,'text-anchor':'middle',class:'axis'},year+'年'));
  if(result.replacementActive){
    svg.append(el('line',{x1:x(10),x2:x(10),y1:p.top,y2:height-p.bottom,class:'replacement-guide'}),
      el('text',{x:Math.min(x(10)+5,width-82),y:p.top+16,class:'axis'},'電池交換'));
  }
  for(const [type,points] of Object.entries(LCA.cumulativeSeries(result))){
    svg.append(el('path',{d:points.map((pt,i)=>(i?'L':'M')+x(pt.year)+' '+y(pt.value)).join(' '),
      class:'line '+type}));
  }
  for(const event of LCA.comparisons(result).events.filter(e=>e.kind==='equal'))
    svg.append(el('circle',{cx:x(event.year),cy:y(event.value),r:5,class:'marker'}));
  return g;
}
globalThis.LCACharts=Object.freeze({geometry,cumulative});
})();
