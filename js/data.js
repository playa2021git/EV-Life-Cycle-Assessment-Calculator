(() => {
'use strict';
const commons=file=>'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file);
const image=(key,file,author,license,licenseUrl,caption)=>({src:'assets/'+key+'.jpg',source:commons(file),author,license,licenseUrl,caption});
const photos={
 volvo:image('volvo','2024 Volvo EX30 Front.jpg','Vauxford','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','写真：2024年Volvo EX30。写真だけでは電池仕様は判別できません。'),
 sports:image('sports','Lamborghini Aventador S (44554).jpg','Calreyn88','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','写真例：ランボルギーニ アヴェンタドール S。8 km/Lはこの教材の設定値。'),
 passenger:image('passenger','Toyota Yaris-1.jpg','M 93','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','写真例：2代目ヤリス（日本名ヴィッツ）。14 km/Lはこの教材の設定値。'),
 kei:image('kei','Honda N-Box in Premium Bronze Pearl, front left.jpg','Mr.choppers','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','写真例：初代ホンダ N-BOX。22 km/Lはこの教材の設定値。'),
 prius:image('prius','Toyota Prius 2.0 HEV Limited (V) – f 18112022.jpg','© M 93 / Wikimedia Commons','CC BY-SA 3.0 DE','https://creativecommons.org/licenses/by-sa/3.0/de/','写真は同世代の北米2.0L仕様。燃費の参考値は国内1.8L U・2WD。'),
 sakura:image('sakura','Nissan-Sakura-2026.jpg','Ohcock','CC0 1.0','https://creativecommons.org/publicdomain/zero/1.0/','写真：日産サクラ（2026年改良モデル）。'),
 leaf:image('leaf','2018 Nissan Leaf SV, front 12.31.19.jpg','Kevauto','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','写真は同世代の北米2018年型SV。電費は国内2021年40 kWhモデルの参考値。'),
 cybertruck:image('cybertruck','Tesla Cybertruck.jpg','Mliu92','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','写真：サイバートラックの2023年量産前車。現行仕様とは細部が異なります。')
};
const iceModels={
 sports:{name:'スポーツカー',tag:'燃費があまりよくない',kmPerL:8,vehicleKg:8000,photo:'sports',note:'8 km/Lは学習用の設定値です。'},
 passenger:{name:'乗用車（非ハイブリッド）',tag:'ふだんの乗用車',kmPerL:14,vehicleKg:6000,photo:'passenger',note:'14 km/Lは学習用の設定値です。'},
 kei:{name:'燃費のよい軽自動車',tag:'小さくて省エネ',kmPerL:22,vehicleKg:4000,photo:'kei',note:'22 km/Lは学習用の設定値です。'},
 prius:{name:'トヨタ プリウス（HEV）',tag:'とても燃費がよい',kmPerL:32.6,vehicleKg:6500,photo:'prius',note:'1.8L U・2WD・17インチ、WLTC 32.6 km/L（2023年公表）。HEVの小型電池製造は車体の仮定値に含めます。',
 sourceUrl:'https://global.toyota/en/newsroom/toyota/38482540.html'}
};
const evModels={
 sakura:{name:'日産 サクラ',tag:'街で見かける軽EV',kmPerKwh:1000/124,batteryKwh:20,vehicleKg:4000,photo:'sakura',
 note:'交流電力量消費率124 Wh/km（WLTC）、電池20 kWh。',sourceUrl:'https://www2.nissan.co.jp/SP/SAKURA/DIGITALCATALOG/PDF/sakura_equipment.pdf'},
 leaf:{name:'日産 リーフ（40 kWh）',tag:'2021年・ZE1型',kmPerKwh:1000/155,batteryKwh:40,vehicleKg:6000,photo:'leaf',
 note:'国内2021年40 kWh車：155 Wh/km（WLTC）。最新型ZE2の値ではありません。',sourceUrl:'https://www3.nissan.co.jp/content/dam/Nissan/jp/vehicles/leaf/2109/pdf/leaf_specsheet.pdf'},
 cybertruck:{name:'テスラ サイバートラック',tag:'大きなピックアップEV',kmPerKwh:160.9344/41,batteryKwh:123,vehicleKg:12000,photo:'cybertruck',
 note:'Tesla米国サイトの41 kWh/100 mileを換算。電池123 kWh。WLTCとの試験条件は未統一で、同条件の実車比較ではありません。',
 sourceUrl:'https://www.tesla.com/cybertruck/design',batterySourceUrl:'https://www.tesla.com/en_CA/cybertruck'}
};

const volvoSource='https://www.volvocars.com/images/v/-/media/Project/ContentPlatform/data/media/sustainability/volvo_ex30_carbonfootprintreport1.pdf';
const xc40Source='https://jp.volvocars.com/pressrelease/wp-content/uploads/2022/06/Volvo_C40_Recharge_LCA_report.pdf';
// Reference-based educational extrapolation, not AI measurements or manufacturer certification.
// EX30: (10,000 materials + 290 factory + 860 logistics)/(1765 - 410) = 8.23 kg/kg.
// XC40 ICE: (14,000 materials + 1,700 factory/logistics)/1690 = 9.29 kg/kg.
// Round their midpoint to 8.8; chemistry-specific production is not known for target vehicles.
const estimation=Object.freeze({vehicleFactor:8.8,packMassPerKwh:390/69,batteryFactor:90,
 batteryFactors:[3500/51,7800/69],vehicleFactorAnchors:[11150/1355,15700/1690]});
function estimateManufacture(massKg,capacityKwh=0,packMassKg=capacityKwh*estimation.packMassPerKwh){
 const baseMass=massKg-packMassKg;
 if(baseMass<=0)throw new RangeError('電池以外の重量が不正です。');
 const vehicleKg=Math.round(baseMass*estimation.vehicleFactor/100)*100;
 return {vehicleKg,batteryKg:capacityKwh*90,packMassKg,baseMass,
 vehicleRange:[vehicleKg*.7,vehicleKg*1.3],
 batteryRange:capacityKwh?estimation.batteryFactors.map(f=>capacityKwh*f):[0,0]};
}
const assumptions={sports:[1600,0],passenger:[1100,0],kei:[900,0],prius:[1360,.9,30],
 sakura:[1070,20],leaf:[1490,40],cybertruck:[2775,123]};
for(const [key,args] of Object.entries(assumptions)){
 const m=iceModels[key]||evModels[key],e=estimateManufacture(...args);
 Object.assign(m,e,{massKg:args[0],kind:'estimate',manufactureLabel:'資料に基づくAI補助の学習用推定',
 batteryCapacityForEstimate:args[1],batteryFactor:90});
 if(key==='prius')m.iceBatteryKg=e.batteryKg;
 m.massSource=key==='sakura'?'https://global.nissannews.com/ja-JP/releases/220520-02-j':
 key==='leaf'?'https://history.nissan.co.jp/ARCHIVES/PDF/LEAF/ZE1/20210419/leaf_specsheet.pdf':
 key==='prius'?'https://toyota.jp/pages/contents/request/webcatalog/prius/prius_main_202507.pdf':
 key==='cybertruck'?'https://www.tesla.com/ownersmanual/cybertruck/en_us/GUID-12A976DD-EB60-431B-AFF1-5A37E95006DB.html':null;
}
iceModels.prius.note='1.8L U・2WD・17インチ、WLTC32.6 km/L。重量1360 kgを参考。HEV電池0.9 kWh・重量30 kgは丸めた学習用仮定で、製造分を別に加算。';
evModels.cybertruck.name='テスラ サイバートラック（Long Range参考）';
for(const [key,name,capacity,battery,consumption,mass,pack] of [
 ['volvo_lfp','Volvo EX30（LFP・51 kWh）',51,3500,17.1,1765,410],
 ['volvo_nmc','Volvo EX30（NMC・69 kWh）',69,7800,17.5,1775,390]]){
 evModels[key]={name,tag:'メーカー公表LCA',kmPerKwh:100/consumption,batteryKwh:capacity,
 vehicleKg:11150,batteryFactor:battery/capacity,batteryKg:battery,photo:'volvo',massKg:mass,
 packMassKg:pack,baseMass:mass-pack,kind:'published',manufactureLabel:'メーカー公表LCAから転記',
 vehicleRange:[11150,11150],batteryRange:[battery,battery],sourceUrl:volvoSource,
 note:'2023年生産モデルの公表LCA。WLTP '+consumption+' kWh/100 km。材料10.0 t＋工場0.29 t＋物流0.86 t。電池パック'+(battery/1000)+' t。使用分は教材の電源で再計算。'};
}

// REI 2025 net generation; source table was updated 2026-03-24.
// Order: coal, oil, gas, nuclear, renewables, other. Preserve source rounding.
const countries={
 japan:{name:'日本',flag:'🇯🇵',mix:[27,2,31,10,25,4]},
 usa:{name:'アメリカ',flag:'🇺🇸',mix:[17,1,39,17,26,0]},
 canada:{name:'カナダ',flag:'🇨🇦',mix:[4,1,16,13,66,0]},
 uk:{name:'イギリス',flag:'🇬🇧',mix:[0,0,31,13,54,2]},
 france:{name:'フランス',flag:'🇫🇷',mix:[0,0,3,68,29,1]},
 germany:{name:'ドイツ',flag:'🇩🇪',mix:[21,1,17,0,59,1]},
 italy:{name:'イタリア',flag:'🇮🇹',mix:[5,4,42,0,49,1]},
 china:{name:'中国',flag:'🇨🇳',mix:[54,0,3,5,39,0]}
};
function displayMix(mix){
 const sum=mix.reduce((a,b)=>a+b,0);
 if(!sum)throw new RangeError('電源構成の合計が0です。');
 const groups=[mix[0]+mix[1]+mix[2],mix[3],mix[4],mix[5]];
 const exact=groups.map(x=>x/sum*1000),units=exact.map(Math.floor);
 const ranked=exact.map((x,i)=>({i,rest:x-units[i]})).sort((a,b)=>b.rest-a.rest||a.i-b.i);
 for(let left=1000-units.reduce((a,b)=>a+b,0),j=0;left>0;left--,j++)units[ranked[j].i]++;
 return units.map(x=>x/10);
}
globalThis.Classroom=Object.freeze({photos,iceModels,evModels,countries,displayMix,estimation,estimateManufacture,volvoSource,xc40Source});
})();
