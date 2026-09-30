import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../js/data.js';
import '../js/model.js';
import '../js/charts.js';
const M=globalThis.LCA;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7, a+' != '+b);
const input=overrides=>({...M.defaults,kmPerDay:30,years:15,petrolKmPerL:15,evKmPerKwh:5,iceVehicleKg:6000,evVehicleKg:6000,batteryKwh:40,mix:[0,0,100,0,0,0],...overrides});
test('hand-calculated independent fixture totals and individual components',()=>{
 const r=M.calculate(input());
 close(r.annualKm,10950);close(r.totalKm,164250);
 close(r.electricityKgPerKwh,.49);
 close(r.components.ICEV.vehicle,6000);close(r.components.ICEV.energy,5475);
 close(r.components.ICEV.tailpipe,25185);close(r.components.ICEV.total,36660);
 close(r.components.BEV.battery,3600);close(r.components.BEV.energy,16096.5);
 close(r.components.BEV.total,25696.5);
});
test('mixtures normalize identically at sums 99, 100, 101, 102',()=>{
 for(const total of [99,100,101,102]){
  const mix=[total/2,0,total/2,0,0,0],shares=M.normalizeMix(mix);
  close(shares.reduce((a,b)=>a+b,0),1);close(shares[0],.5);
  close(M.calculate(input({mix})).electricityKgPerKwh,.655);
 }
});
test('all-zero and malformed mixtures rejected explicitly',()=>{
 for(const mix of [[0,0,0,0,0,0],[-1,1,1,1,1,1],[NaN,1,1,1,1,1],[1,1]])
  assert.throws(()=>M.calculate(input({mix})),RangeError);
});
test('invalid numeric input never silently produces a result',()=>{
 for(const overrides of [{years:0},{years:10.5},{petrolKmPerL:0},{evKmPerKwh:0},{kmPerDay:-1},{batteryKwh:Infinity},{evVehicleKg:'6000'}])
  assert.throws(()=>M.calculate(input(overrides)),RangeError);
});
test('each pure technology uses its documented factor, with no Japanese scaling',()=>{
 M.electricitySources.forEach((source,index)=>{
  const mix=Array(6).fill(0);mix[index]=100;
  close(M.calculate(input({mix})).electricityKgPerKwh,source.factor/1000);
 });
});
test('zero distance stays finite; per-km unavailable instead of Infinity',()=>{
 const r=M.calculate(input({kmPerDay:0}));
 close(r.components.ICEV.total,6000);close(r.components.BEV.total,9600);
 assert.equal(M.perKm(r,'BEV'),null);assert.deepEqual(M.comparisons(r).events,[]);
});
test('replacement is absent at retirement at year 10',()=>{
 for(const years of [1,5,10]){
 const a=M.calculate(input({years})),b=M.calculate(input({years,batteryReplacement:true}));
 assert.deepEqual(a,b);
 }
});
test('replacement is a step at 10 and cannot alter the first 10 years',()=>{
 const a=M.calculate(input({years:15})),b=M.calculate(input({years:15,batteryReplacement:true}));
 for(const t of [0,1,5,9.9])close(M.valueAt(a,'BEV',t),M.valueAt(b,'BEV',t));
 close(M.valueAt(a,'BEV',10),M.valueAt(b,'BEV',10,'before'));
 close(M.valueAt(b,'BEV',10)-M.valueAt(b,'BEV',10,'before'),3600);
 close(b.components.BEV.total-a.components.BEV.total,3600);
 const points=M.cumulativeSeries(b).BEV.filter(p=>p.year===10);
 assert.equal(points.length,2);close(points[1].value-points[0].value,3600);
});
test('extending lifetime from 11 to 30 preserves shared history',()=>{
 const a=M.calculate(input({years:11,batteryReplacement:true}));
 const b=M.calculate(input({years:30,batteryReplacement:true}));
 for(const t of [0,5,10,11])close(M.valueAt(a,'BEV',t),M.valueAt(b,'BEV',t));
});
test('battery capacity changes initial and replacement manufacture independently',()=>{
 const a=M.calculate(input({batteryKwh:20,batteryReplacement:true}));
 const b=M.calculate(input({batteryKwh:100,batteryReplacement:true}));
 close(b.initial.BEV-a.initial.BEV,7200);close(b.replacementKg-a.replacementKg,7200);
 close(a.annual.BEV,b.annual.BEV);
});
test('crossings before and after a replacement, plus jump reversal',()=>{
 const r=M.calculate(input({kmPerDay:10,batteryReplacement:true,years:30,mix:[0,0,0,100,0,0]}));
 // annual gap = 3650*(2.8/15 - 0.012/5)
 const gap=3650*(2.8/15-.012/5);
 const c=M.comparisons(r);
 assert.equal(c.events.length,3);
 close(c.events[0].year,3600/gap);
 assert.equal(c.events[1].kind,'jump');close(c.events[1].year,10);
 close(c.events[2].year,7200/gap);
 for(const e of c.events.filter(e=>e.kind==='equal'))close(M.valueAt(r,'ICEV',e.year),M.valueAt(r,'BEV',e.year));
});
test('EV can be cheaper in emissions from the start, or become worse later',()=>{
 const a=M.calculate(input({iceVehicleKg:12000,evVehicleKg:0}));
 assert.equal(M.comparisons(a).start,'BEV');assert.equal(M.comparisons(a).end,'BEV');
 const b=M.calculate(input({iceVehicleKg:12000,evVehicleKg:0,evKmPerKwh:1,mix:[100,0,0,0,0,0]}));
 assert.equal(M.comparisons(b).start,'BEV');assert.equal(M.comparisons(b).end,'ICEV');
 assert.equal(M.comparisons(b).events.length,1);
});
test('equal stationary vehicles are identified as equal throughout',()=>{
 const r=M.calculate(input({kmPerDay:0,batteryKgPerKwh:0}));
 assert.equal(M.comparisons(r).identical,true);assert.equal(M.comparisons(r).end,'equal');
});
test('all cumulative endpoints match component totals',()=>{
 for(const batteryReplacement of [false,true]){
  const r=M.calculate(input({batteryReplacement}));
  for(const [type,points] of Object.entries(M.cumulativeSeries(r)))
   close(points.at(-1).value,r.components[type].total);
 }
});
test('actual SVG circles use precisely the curve coordinate transform',()=>{
 globalThis.document={createElementNS:(_,name)=>({name,attrs:{},children:[],
  setAttribute(k,v){this.attrs[k]=v},append(...nodes){this.children.push(...nodes)}})};
 for(const width of [280,760,1100]){
 const svg={children:[],replaceChildren(){this.children=[]},setAttribute(){},append(...nodes){this.children.push(...nodes)}};
 const r=M.calculate(input()),g=LCACharts.cumulative(svg,r,width);
 const circles=svg.children.filter(x=>x.name==='circle');
 const events=M.comparisons(r).events.filter(x=>x.kind==='equal');
 assert.equal(circles.length,events.length);
 circles.forEach((circle,i)=>{close(Number(circle.attrs.cx),g.x(events[i].year));close(Number(circle.attrs.cy),g.y(events[i].value));});
 }
});
test('supported boundary combinations have finite, nonnegative totals',()=>{
 let count=0;
 for(const years of [1,10,11,30])for(const kmPerDay of [0,30,150])
 for(const petrolKmPerL of [5,15,40])for(const evKmPerKwh of [1,5,12])
 for(const batteryKwh of [1,40,200])for(const batteryReplacement of [false,true])
 for(const p of Object.values(M.presets)){
  const r=M.calculate(input({years,kmPerDay,petrolKmPerL,evKmPerKwh,batteryKwh,batteryReplacement,mix:p.mix}));
  Object.values(r.components).forEach(c=>assert.ok(Number.isFinite(c.total)&&c.total>=0));
  count++;
 }
 assert.equal(count,1944);
});
test('entrypoint loads no remote resources or ES modules; hidden state cannot be overridden',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/<(?:script|img|link)[^>]+(?:src|href)=["']https?:/i);
 assert.doesNotMatch(html,/type=["']module/);
 assert.match(html,/connect-src 'none'/);
 const css=fs.readFileSync(new URL('../css/style.css',import.meta.url),'utf8');
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 for(const name of ['model','charts','app']){
  const code=fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8');
  assert.doesNotMatch(code,/\b(fetch|XMLHttpRequest|WebSocket|localStorage|sendBeacon)\b/);
 }
});


test('requested default scenario and EV batteries are consistent',()=>{
 assert.equal(M.defaults.kmPerDay,10);assert.equal(M.defaults.years,10);
 assert.equal(M.defaults.petrolKmPerL,14);assert.equal(M.defaults.batteryKwh,20);
 const r=M.calculate(M.defaults);
 close(r.totalKm,36500);close(r.components.ICEV.total,17000);
 close(r.initial.BEV,10200);close(r.components.BEV.battery,1800);
 close(r.electricityKgPerKwh,421/990);
 close(r.components.BEV.energy,36500*.124*421/990);
 assert.deepEqual(Object.values(Classroom.iceModels).map(x=>x.kmPerL),[8,14,22,32.6]);
 assert.deepEqual(Object.values(Classroom.evModels).map(x=>x.batteryKwh),[20,40,123,51,69]);
});
test('G7 plus China, pies and labels total exactly 100 percent',()=>{
 assert.deepEqual(Object.keys(Classroom.countries),['japan','usa','canada','uk','france','germany','italy','china']);
 for(const c of Object.values(Classroom.countries)){
  close(M.normalizeMix(c.mix).reduce((a,b)=>a+b,0),1);
  const display=Classroom.displayMix(c.mix);
  assert.equal(display.reduce((a,b)=>a+Math.round(b*10),0),1000);
  assert.ok(display.every(x=>x>=0&&x<=100));
 }
 assert.deepEqual(Classroom.displayMix(Classroom.countries.france.mix),[3,67.3,28.7,1]);
});
test('every selectable car has a local JPEG and attribution; Volvo variants share one reference photo',()=>{
 const used=new Set();
 for(const model of [...Object.values(Classroom.iceModels),...Object.values(Classroom.evModels)]){
  const photo=Classroom.photos[model.photo];
  assert.ok(photo.author&&photo.license&&photo.licenseUrl&&photo.source&&photo.caption);
  const image=fs.readFileSync(new URL('../'+photo.src,import.meta.url));
  assert.equal(image[0],255);assert.equal(image[1],216);assert.ok(image.length>10000);
  used.add(photo.src);
 }
 assert.equal(used.size,8);
});

test('Volvo reference manufacture is copied without multiplying by the shared 90 factor',()=>{
 for(const [key,battery,capacity] of [['volvo_lfp',3500,51],['volvo_nmc',7800,69]]){
  const car=Classroom.evModels[key];
  close(car.vehicleKg,11150);close(car.batteryFactor*capacity,battery);
  const r=M.calculate({...M.defaults,evVehicleKg:car.vehicleKg,batteryKwh:capacity,batteryKgPerKwh:car.batteryFactor});
  close(r.components.BEV.battery,battery);close(r.initial.BEV,11150+battery);
 }
});
test('HEV battery is separate and included in the initial total exactly once',()=>{
 const r=M.calculate(input({iceBatteryKg:81}));
 close(r.initial.ICEV,6081);close(r.components.ICEV.battery,81);
 close(r.components.ICEV.total,36741);
});
test('published and estimated labels are distinguishable and extrapolation is reproducible',()=>{
 for(const car of Object.values(Classroom.evModels))assert.ok(['published','estimate'].includes(car.kind));
 const e=Classroom.estimateManufacture(1070,20);
 close(e.vehicleKg,8400);close(e.batteryKg,1800);
 assert.ok(e.vehicleRange[0]<e.vehicleKg&&e.vehicleKg<e.vehicleRange[1]);
 assert.ok(e.batteryRange[0]<e.batteryKg&&e.batteryKg<e.batteryRange[1]);
 close(Classroom.evModels.cybertruck.vehicleKg,18300);
 assert.throws(()=>Classroom.estimateManufacture(50,123));
});
