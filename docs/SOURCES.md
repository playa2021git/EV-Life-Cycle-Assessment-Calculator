# 出典と仮定 v4

## 電源構成

[自然エネルギー財団・国際比較](https://www.renewable-ei.org/statistics/international/) の2025年発電量、2026年3月24日更新の表を転記。IEA Monthly Electricity Statisticsを基に財団が編集した統計。元表の整数丸めにより合計は99～101%。
順序は石炭/石油/天然ガス/原子力/自然エネルギー/その他。

|国|元表の割合（%）|
|---|---|
|日本|27/2/31/10/25/4|
|米国|17/1/39/17/26/0|
|カナダ|4/1/16/13/66/0|
|英国|0/0/31/13/54/2|
|フランス|0/0/3/68/29/1|
|ドイツ|21/1/17/0/59/1|
|イタリア|5/4/42/0/49/1|
|中国|54/0/3/5/39/0|

## 車両の参考値

- スポーツカー8、非ハイブリッド乗用車14、軽22 km/Lは依頼に基づく学習用設定。
- [トヨタ・プリウス2023年発表](https://global.toyota/en/newsroom/toyota/38482540.html)：1.8L U・2WD・17インチ WLTC32.6 km/L。
- [日産サクラ主要諸元](https://www2.nissan.co.jp/SP/SAKURA/DIGITALCATALOG/PDF/sakura_equipment.pdf)：124 Wh/km、20 kWh。
- [日産リーフ2021年主要諸元](https://www3.nissan.co.jp/content/dam/Nissan/jp/vehicles/leaf/2109/pdf/leaf_specsheet.pdf)：ZE1国内40 kWhモデル155 Wh/km。最新型の値ではない。
- [Tesla米国設計ページ](https://www.tesla.com/cybertruck/design)：41 kWh/100 mileを換算。[カナダ仕様ページ](https://www.tesla.com/en_CA/cybertruck)：電池123 kWh。WLTCと試験条件未統一。

## 排出係数と製造仮定

[IPCC AR5 WGIII Annex III 表A.III.2](https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf) (2014)：石炭820、天然ガス490、原子力12 g-CO₂e/kWhの中央値。
石油700、自然エネルギー50、その他500は学習用仮定。自然エネルギーの技術別内訳を再現せず、国別実測原単位ではない。

[IEA Methodology 2024](https://iea.blob.core.windows.net/assets/4559e539-d8c4-41c1-b5e6-2a65d1e0cc50/EVLifeCycleAssessmentCalculatorMethodology.pdf)：燃焼2.3 kg-CO₂/L、電池製造90 kg-CO₂e/kWhを参考に使用。90は2022年販売構成に基づく参考値で個別車種の値ではない。
v4では旧版の車種別固定製造値を廃止し、公表LCAと諸元から再計算しています。詳細は[MANUFACTURING.md](MANUFACTURING.md)。
写真はjs/data.jsに個別の作者・原ページ・ライセンスを記録。追加EX30写真はVauxford、CC BY-SA4.0、2024 Volvo EX30 Front.jpg。写真の電池仕様は未判別。
