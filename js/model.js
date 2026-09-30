/* Classroom model v4. Units: kg CO2e, km, years, litres, kWh.
   Classic script works offline; Node tests use the same implementation. */
(() => {
'use strict';
const electricitySources = Object.freeze([
 {id:'coal',name:'石炭',factor:820},
 {id:'oil',name:'石油',factor:700},
 {id:'gas',name:'天然ガス',factor:490},
 {id:'nuclear',name:'原子力',factor:12},
 {id:'renewable',name:'自然エネルギー',factor:50},
 {id:'other',name:'その他',factor:500}
].map(Object.freeze));
// Coal/gas/nuclear: IPCC 2014. Oil/renewable/other: explicit classroom assumptions.
// National shares are statistical data; this intensity is not a national measured value.
const presets = Object.freeze({
 balanced:{name:'日本',mix:[27,2,31,10,25,4]},
 fossil:{name:'中国',mix:[54,0,3,5,39,0]},
 lowCarbon:{name:'フランス',mix:[0,0,3,68,29,1]}
});
const defaults = Object.freeze({
 kmPerDay:10,years:10,petrolKmPerL:14,evKmPerKwh:1000/124,
 iceVehicleKg:9700,iceBatteryKg:0,evVehicleKg:8400,batteryKwh:20,batteryKgPerKwh:90,
 replacementKgPerKwh:90,petrolUpstreamKgPerL:0.5,
 batteryReplacement:false,mix:Object.freeze([27,2,31,10,25,4])
});
const ranges = Object.freeze({
  kmPerDay:[0,150],years:[1,30],petrolKmPerL:[5,40],evKmPerKwh:[1,12],
  iceBatteryKg:[0,10000],iceVehicleKg:[0,30000],evVehicleKg:[0,30000],batteryKwh:[1,200],
  batteryKgPerKwh:[0,200],replacementKgPerKwh:[0,200],petrolUpstreamKgPerL:[0,3]
});
function normalizeMix(mix) {
  if(!Array.isArray(mix)||mix.length!==electricitySources.length||
    mix.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>100))
    throw new RangeError('電源の重みはそれぞれ0〜100で入力してください。');
  const sum=mix.reduce((a,b)=>a+b,0);
  if(sum===0) throw new RangeError('電源を少なくとも1つ、0より大きくしてください。');
  return mix.map(x=>x/sum);
}
function validate(input) {
  for(const [key,[min,max]] of Object.entries(ranges))
    if(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<min||input[key]>max)
      throw new RangeError(key+' の入力が範囲外です。');
  if(!Number.isInteger(input.years))throw new RangeError('使用年数は整数で入力してください。');
  if(typeof input.batteryReplacement!=='boolean')throw new TypeError('交換設定が不正です。');
  normalizeMix(input.mix);
}
function calculate(input) {
  validate(input);
  const shares=normalizeMix(input.mix);
  const electricityKgPerKwh=shares.reduce((sum,p,i)=>sum+p*electricitySources[i].factor,0)/1000;
  const annualKm=input.kmPerDay*365;
  const litres=annualKm/input.petrolKmPerL;
  const electricity=annualKm/input.evKmPerKwh;
  // At exactly 10 years the car is retired before a replacement is installed.
  const replacementActive=input.batteryReplacement&&input.years>10;
  const replacementKg=replacementActive?input.batteryKwh*input.replacementKgPerKwh:0;
  const initial={
    ICEV:input.iceVehicleKg+input.iceBatteryKg,
    BEV:input.evVehicleKg+input.batteryKwh*input.batteryKgPerKwh
  };
  const annual={ICEV:litres*(2.3+input.petrolUpstreamKgPerL),BEV:electricity*electricityKgPerKwh};
  const components={
    ICEV:{vehicle:input.iceVehicleKg,battery:input.iceBatteryKg,replacement:0,
      energy:litres*input.petrolUpstreamKgPerL*input.years,tailpipe:litres*2.3*input.years},
    BEV:{vehicle:input.evVehicleKg,battery:input.batteryKwh*input.batteryKgPerKwh,
      replacement:replacementKg,energy:annual.BEV*input.years,tailpipe:0}
  };
  for(const c of Object.values(components))c.total=Object.values(c).reduce((a,b)=>a+b,0);
  return {years:input.years,shares,electricityKgPerKwh,annualKm,totalKm:annualKm*input.years,
    initial,annual,components,replacementKg,replacementActive};
}
function valueAt(result,type,year,side='after') {
  if(!['ICEV','BEV'].includes(type)||!Number.isFinite(year)||year<0||year>result.years)
    throw new RangeError('グラフの時点が範囲外です。');
  return result.initial[type]+result.annual[type]*year+
    (type==='BEV'&&result.replacementActive&&(year>10||(year===10&&side==='after'))?result.replacementKg:0);
}
function cumulativeSeries(result) {
  return Object.fromEntries(['ICEV','BEV'].map(type=>{
    const points=[];
    for(let year=0;year<=result.years;year++){
      if(type==='BEV'&&year===10&&result.replacementActive)
        points.push({year,value:valueAt(result,type,year,'before'),side:'before'});
      points.push({year,value:valueAt(result,type,year),side:'after'});
    }
    return [type,points];
  }));
}
const EPS=1e-7;
function preference(difference) {return Math.abs(difference)<EPS?'equal':difference<0?'BEV':'ICEV';}
function comparisons(result) {
  const start=result.initial.BEV-result.initial.ICEV;
  const slope=result.annual.BEV-result.annual.ICEV;
  const cuts=result.replacementActive?[0,10,result.years]:[0,result.years];
  const events=[];
  for(let j=0;j<cuts.length-1;j++){
    const lo=cuts[j],hi=cuts[j+1],intercept=start+(j?result.replacementKg:0);
    if(Math.abs(slope)>EPS){
      const year=-intercept/slope;
      if(year>lo+EPS&&year<=hi+EPS)events.push({
        kind:'equal',year:Math.min(year,hi),value:valueAt(result,'ICEV',Math.min(year,hi))
      });
    }
  }
  if(result.replacementActive){
    const before=start+slope*10,after=before+result.replacementKg;
    if(preference(before)!==preference(after))events.push({
      kind:'jump',year:10,before:preference(before),after:preference(after)
    });
  }
  return {
    start:preference(start),end:preference(start+slope*result.years+result.replacementKg),
    events:events.sort((a,b)=>a.year-b.year),
    identical:Math.abs(start)<EPS&&Math.abs(slope)<EPS&&result.replacementKg===0
  };
}
function perKm(result,type){return result.totalKm===0?null:result.components[type].total/result.totalKm*1000;}
globalThis.LCA=Object.freeze({electricitySources,presets,defaults,ranges,normalizeMix,calculate,
  valueAt,cumulativeSeries,comparisons,perKm,preference});
})();
