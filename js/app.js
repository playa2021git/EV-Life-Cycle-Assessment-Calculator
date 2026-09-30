(() => {
'use strict';
const $=s=>document.querySelector(s);
const form=$('#conditions'),fields=Object.keys(LCA.ranges);
let latest=null;
const labels={ICEV:'ガソリン車',BEV:'EV',equal:'同じ'};
const fmt=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:1,minimumFractionDigits:1});

let countryKey='japan';
for(const type of ['ice','ev']){
 const img=$('#'+type+'-photo');
 const warning=document.createElement('p');warning.className='hint';warning.hidden=true;warning.setAttribute('role','status');
 warning.textContent='写真を読み込めませんでした。配布フォルダー内のassetsを一緒に保存してください。';
 img.after(warning);
 img.addEventListener('error',()=>{warning.hidden=false;});
 img.addEventListener('load',()=>{warning.hidden=true;});
}
function link(url,text){
 const a=document.createElement('a');a.href=url;a.textContent=text;
 a.target='_blank';a.rel='noopener noreferrer';return a;
}
for(const [key,country] of Object.entries(Classroom.countries)){
 const button=document.createElement('button');button.type='button';button.dataset.country=key;
 button.textContent=country.flag+' '+country.name;button.setAttribute('aria-pressed',key===countryKey);
 button.addEventListener('click',()=>{countryKey=key;update();});
 $('#country-buttons').append(button);
}
function applyCar(type){
 const isIce=type==='ice',model=(isIce?Classroom.iceModels:Classroom.evModels)[$('#'+type+'-model').value];
 if(isIce){form.elements.petrolKmPerL.value=model.kmPerL;form.elements.iceVehicleKg.value=model.vehicleKg;form.elements.iceBatteryKg.value=model.iceBatteryKg||0;}
 else{form.elements.evKmPerKwh.value=model.kmPerKwh;form.elements.batteryKwh.value=model.batteryKwh;form.elements.evVehicleKg.value=model.vehicleKg;form.elements.batteryKgPerKwh.value=model.batteryFactor;}
}
function setDefaults(){
 for(const key of fields)form.elements[key].value=LCA.defaults[key];
 form.elements.batteryReplacement.checked=false;countryKey='japan';
 $('#ice-model').value='passenger';$('#ev-model').value='sakura';applyCar('ice');applyCar('ev');
}
function read(){
 const input=Object.fromEntries(fields.map(k=>[k,Number(form.elements[k].value)]));
 input.batteryReplacement=form.elements.batteryReplacement.checked;
 input.mix=[...Classroom.countries[countryKey].mix];return input;
}
function renderCars(r,input){
 $('#years-display').value=input.years+'年';
 for(const type of ['ice','ev']){
  const model=(type==='ice'?Classroom.iceModels:Classroom.evModels)[$('#'+type+'-model').value];
  const photo=Classroom.photos[model.photo],img=$('#'+type+'-photo');
  $('#'+type+'-name').textContent=(model.kind==='published'?'公表LCAモデル：':'推定モデル：')+model.name;
  $('#'+type+'-efficiency').textContent=fmt(type==='ice'?input.petrolKmPerL:input.evKmPerKwh);
  $('#'+type+'-note').textContent=model.note;
  $('#'+type+'-kind').textContent=model.manufactureLabel;
  $('#'+type+'-basis').textContent='参考重量 '+model.massKg+' kg（電池を含む）。'+(model.kind==='published'?'報告書の対象仕様。':'電池重量 '+fmt(model.packMassKg)+' kgは'+(type==='ice'&&model.photo!=='prius'?'0の設定。':'推定。')+'電池以外の重量 × 8.8 kg-CO₂e/kgで粗く推定。材質や工場差は再現しません。');
  const custom=Math.abs((type==='ice'?input.iceVehicleKg:input.evVehicleKg)-model.vehicleKg)>1e-6||
   (type==='ev'&&(Math.abs(input.batteryKgPerKwh-model.batteryFactor)>1e-6||Math.abs(input.batteryKwh-model.batteryKwh)>1e-6));
  if(custom)$('#'+type+'-kind').textContent='利用者が変更した製造条件';
  $('#'+type+'-range').textContent=custom?'製造の設定を変更しています。資料の値・標準推定値とは異なります。':
   model.kind==='published'?'製造値は公表資料の丸め値。誤差ゼロという意味ではありません。':
   '製造合計の感度幅：'+fmt((model.vehicleRange[0]+model.batteryRange[0])/1000)+'〜'+fmt((model.vehicleRange[1]+model.batteryRange[1])/1000)+' t-CO₂e。統計的な信頼区間ではありません。';
  if(img.dataset.key!==model.photo){
   img.dataset.key=model.photo;img.alt=model.name+'の参考写真';
   img.src=photo.src;$('#'+type+'-caption').textContent=photo.caption;
   const credit=$('#'+type+'-credit');credit.replaceChildren(
     link(photo.source,photo.author+' / Wikimedia Commons'),document.createTextNode(' · '),
     link(photo.licenseUrl,photo.license));
  }
 }
 $('#ice-battery-note').textContent=input.iceBatteryKg?'HEV電池製造（推定）：'+fmt(input.iceBatteryKg)+' kg-CO₂e。ガソリン車の合計にも加算。':'このモデルには駆動用電池を設定していません。';
 $('#ice-manufacture').textContent=fmt(input.iceVehicleKg/1000)+' t-CO₂e';
 $('#ev-manufacture').textContent=fmt(input.evVehicleKg/1000)+' t-CO₂e';
 $('#battery-manufacture').textContent=fmt(r.components.BEV.battery/1000)+' t-CO₂e';
 $('#battery-formula').textContent=input.batteryKwh+' kWh × '+fmt(input.batteryKgPerKwh)+' kg-CO₂e/kWh ≈ '+fmt(r.components.BEV.battery)+' kg-CO₂e（係数の表示は丸めています）';
 $('#ev-manufacture-total').textContent=fmt(r.initial.BEV/1000)+' t-CO₂e';
}
function renderMix(r,input){
 const country=Classroom.countries[countryKey],percent=Classroom.displayMix(input.mix);
 const names=['火力','原子力','自然エネルギー','その他'],colors=['#c26036','#7960a2','#27957c','#778790'];
 let angle=0;
 const stops=percent.map((p,i)=>{const start=angle;angle+=p;return colors[i]+' '+start+'% '+angle+'%';});
 $('#electricity-pie').style.background='conic-gradient('+stops.join(',')+')';
 $('#electricity-pie').setAttribute('aria-label',country.name+'、'+names.map((n,i)=>n+' '+percent[i].toFixed(1)+'%').join('、')+'。合計100%。');
 $('#pie-country').textContent=country.name;$('#country-title').textContent=country.flag+' '+country.name+'の電源構成';
 $('#pie-legend').replaceChildren();
 names.forEach((name,i)=>{
  const row=document.createElement('div');row.className='pie-legend-row';
  const swatch=document.createElement('i');swatch.style.background=colors[i];swatch.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.textContent=name;
  const value=document.createElement('b');value.textContent=percent[i].toFixed(1)+'%';
  row.append(swatch,label,value);$('#pie-legend').append(row);
 });
 document.querySelectorAll('[data-country]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.country===countryKey));
 $('#mix-note').textContent='元表の丸め値（合計'+input.mix.reduce((a,b)=>a+b,0)+'%）を100%へ換算。表示は小数第1位に調整し、凡例も合計100.0%です。';
 $('#electricity-factor').textContent=fmt(r.electricityKgPerKwh*1000)+' g-CO₂e / kWh';
}
function renderSources(){
 const container=$('#data-sources');
 const p=document.createElement('p');p.append(link('https://www.renewable-ei.org/statistics/international/','電源構成：自然エネルギー財団（2025年、2026年3月24日更新）'));
 container.append(p);
 for(const model of [...Object.values(Classroom.iceModels),...Object.values(Classroom.evModels)]){
  if(!model.sourceUrl)continue;
  const p=document.createElement('p');p.append(link(model.sourceUrl,model.name+'：参考資料'),document.createTextNode(' — '+model.note));
  if(model.batterySourceUrl)p.append(document.createTextNode(' / '),link(model.batterySourceUrl,'電池容量の資料'));
  container.append(p);
 }
 for(const model of [...Object.values(Classroom.iceModels),...Object.values(Classroom.evModels)]){
  if(!model.massSource)continue;
  const p=document.createElement('p');p.append(link(model.massSource,model.name+'：重量の参考資料'));container.append(p);
 }
 const refs=document.createElement('p');refs.append(link(Classroom.volvoSource,'EX30公表LCA：表1・4・9'),document.createTextNode(' / '),link(Classroom.xc40Source,'XC40 ICE・C40 LCA：表1・4'));
 container.append(refs);
 const note=document.createElement('p');note.textContent='電費の試験条件は未統一です。サクラ・リーフはWLTC、サイバートラックは米国サイトの参考値。製造推定は公開LCAと参考重量に基づくAI補助の計算です。AIによる測定ではありません。電池以外の重量×8.8 kg-CO₂e/kg。未知の電池重量は容量×390/69 kg/kWhで近似。スポーツ1600・乗用車1100・軽900 kgは仮想条件、プリウス1360・サクラ1070・リーフ1490・Cybertruck Long Range2775 kgは諸元参考。材質・工場・製造地の違いを個別再現できないため、車種固有の公式LCAとは扱いません。';container.append(note);
 const heading=document.createElement('h3');heading.textContent='同梱写真のクレジット';$('#photo-sources').append(heading);
 Object.entries(Classroom.photos).forEach(([key,photo])=>{
  const p=document.createElement('p');p.append(document.createTextNode(photo.caption+' '),link(photo.source,photo.author+' / Wikimedia Commons'),document.createTextNode(' · '),link(photo.licenseUrl,photo.license));
  $('#photo-sources').append(p);
 });
 const usage=document.createElement('p');usage.textContent='画像の内容は改変せず、表示サイズのみ調整しています。写真は各ライセンスに従い、教材コードとは別に扱います。';$('#photo-sources').append(usage);
}
function row(cells,header=false){
  const tr=document.createElement('tr');
  cells.forEach((text,i)=>{const cell=document.createElement(header||i===0?'th':'td');cell.textContent=text;
    if(i===0&&!header)cell.scope='row';tr.append(cell);});
  return tr;
}
function renderResult(r){
  const comparison=LCA.comparisons(r);
  const ice=Classroom.iceModels[$('#ice-model').value],ev=Classroom.evModels[$('#ev-model').value];
  labels.ICEV=ice.name;labels.BEV=ev.name;
  $('#ice-result-name').textContent=ice.name;$('#ev-result-name').textContent=ev.name;
  const interval=(m,type)=>m.vehicleRange.map((v,i)=>r.components[type].total-r.initial[type]+v+m.batteryRange[i]);
  const iceInterval=interval(ice,'ICEV'),evInterval=interval(ev,'BEV');
  const overlaps=iceInterval[0]<=evInterval[1]&&evInterval[0]<=iceInterval[1];
  const custom=Math.abs(Number(form.elements.iceVehicleKg.value)-ice.vehicleKg)>1e-6||Math.abs(Number(form.elements.evVehicleKg.value)-ev.vehicleKg)>1e-6||Math.abs(Number(form.elements.batteryKgPerKwh.value)-ev.batteryFactor)>1e-6||Math.abs(Number(form.elements.batteryKwh.value)-ev.batteryKwh)>1e-6;
  $('#sensitivity-note').textContent=custom?'製造の設定を変更しています。推定幅による順位判定は行いません。':overlaps?'製造の推定幅を考えると、どちらが少ないかは条件によって変わり得ます。線は標準設定の計算例です。':'この差は設定した製造感度幅より大きいですが、実車の順位を確定する結果ではありません。';
  $('#distance-total').textContent=r.totalKm.toLocaleString('ja-JP')+' km';
  for(const type of ['ICEV','BEV']){
    $('#total-'+type).textContent=fmt(r.components[type].total/1000);
    const unit=LCA.perKm(r,type);$('#perkm-'+type).textContent=unit===null?'走行0 kmのため、1 kmあたりは計算しません。':fmt(unit)+' g-CO₂e / km';
  }
  $('#result-title').textContent=comparison.end==='equal'?'使用終了時の合計は同じです':r.years+'年使ったときは、'+labels[comparison.end]+'の合計が少なくなります';
  $('#result-context').textContent='この仮定での結果です。実車・実在の国の評価ではありません。差は約'+fmt(Math.abs(r.components.ICEV.total-r.components.BEV.total)/1000)+' t-CO₂eです。';
  const events=$('#events');events.replaceChildren();
  const first=document.createElement('li');
  first.textContent=comparison.identical?'この条件では、全期間で2台の合計が同じです。':
    comparison.start==='equal'?'使い始めの製造排出量は同じです。':'使い始めは'+labels[comparison.start]+'の製造排出量が少ない設定です。';
  events.append(first);
  for(const e of comparison.events){
    const item=document.createElement('li');
    item.textContent=e.kind==='equal'?'約'+fmt(e.year)+'年（約'+Math.round(e.year*r.annualKm).toLocaleString('ja-JP')+' km）で合計が同じになります。':
      '10年後の電池交換で、'+(e.after==='equal'?'合計が同じになります。':labels[e.after]+'の合計が少ない状態になります。');
    events.append(item);
  }
  if(!comparison.identical&&!comparison.events.length){const item=document.createElement('li');item.textContent='この使用期間の途中では、大小関係は変わりません。';events.append(item);}
  $('#replacement-note').textContent=r.replacementActive?
    '10年後に交換電池の製造分 '+fmt(r.replacementKg/1000)+' t-CO₂e を追加します。交換前の値は変えません。':
    form.elements.batteryReplacement.checked?'使用が10年以内なので、交換前に使い終わる設定です。交換分は加えません。':'電池交換なし。交換は必須という意味ではなく、選べる仮定です。';
  const body=$('#breakdown-body');body.replaceChildren();
  for(const [key,name] of [['vehicle','電池以外の製造・物流'],['battery','最初の電池をつくる'],['replacement','交換電池をつくる'],['energy','燃料・電気をつくる'],['tailpipe','走行中にガソリンを燃やす'],['total','合計']])
    body.append(row([name,fmt(r.components.ICEV[key]/1000),fmt(r.components.BEV[key]/1000)]));
  const timeline=$('#timeline-body');timeline.replaceChildren();
  const years=[...new Set([0,Math.min(5,r.years),Math.min(10,r.years),r.years])].sort((a,b)=>a-b);
  for(const year of years){
    if(year===10&&r.replacementActive)timeline.append(row(['10年（交換直前）',fmt(LCA.valueAt(r,'ICEV',year)/1000),fmt(LCA.valueAt(r,'BEV',year,'before')/1000)]));
    timeline.append(row([year+'年'+(year===10&&r.replacementActive?'（交換直後）':''),fmt(LCA.valueAt(r,'ICEV',year)/1000),fmt(LCA.valueAt(r,'BEV',year)/1000)]));
  }
  draw();
}
function draw(){if(latest)LCACharts.cumulative($('#cumulative-chart'),latest,Math.max(280,Math.round($('#chart-area').getBoundingClientRect().width)));}
function update(){
  $('#error').hidden=true;
  try{
    if(!form.checkValidity())throw new Error('空欄、範囲外、刻み幅に合わない入力があります。入力欄の条件を確認してください。');
    const input=read(),r=LCA.calculate(input);latest=r;
    $('#results').hidden=false;renderCars(r,input);renderMix(r,input);renderResult(r);
  }catch(error){
    latest=null;$('#results').hidden=true;$('#error').textContent=error.message;$('#error').hidden=false;
  }
}

form.addEventListener('input',event=>{
 if(event.target.id==='ice-model')applyCar('ice');
 if(event.target.id==='ev-model')applyCar('ev');
 update();
});
form.addEventListener('submit',event=>event.preventDefault());
$('#reset').addEventListener('click',()=>{setDefaults();update();$('#reset-status').textContent='はじめの条件に戻しました。';});
window.addEventListener('resize',draw);
renderSources();setDefaults();update();
$('#boot-message').hidden=true;
})();
