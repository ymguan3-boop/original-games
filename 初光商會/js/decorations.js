import {tierDefinition} from './tier-designs.js?v=20261114-v46';
export const decorTypes=[
 {id:'lantern',name:'守夜工藝立燈',group:'decor',level:4,cost:320,height:1.25,description:'柔和燈光・顧客耐心 +4 秒',effect:{patience:4}},
 {id:'crystal-art',name:'晶礦收藏雕塑',group:'decor',level:7,cost:850,height:1.15,description:'收藏藝術・成交價 +3%',effect:{premium:.03}},
 {id:'sun-art',name:'天曜日輪藝術座',group:'decor',level:10,cost:2400,height:1.65,description:'神話藝術・來客速度 +20%、成交價 +6%',effect:{traffic:.20,premium:.06}},
 {id:'clock',name:'橡木報時鐘',group:'furniture',level:1,cost:160,height:.70,wall:true,description:'牆面專用・顧客耐心 +2 秒',effect:{patience:2}},
 {id:'painting',name:'中幅晨光山谷畫',group:'furniture',level:2,cost:200,height:.58,wall:true,size:'medium',description:'牆面專用・中幅・滿意度緩慢提升',effect:{satisfaction:.005}},{id:'painting-large',name:'大幅初光鎮全景畫',group:'furniture',level:3,cost:360,height:.84,wall:true,size:'large',description:'牆面專用・大幅・滿意度與來客速度 +3%',effect:{satisfaction:.008,traffic:.03}},
 {id:'couplet',name:'小幅花草掛畫',group:'furniture',level:1,cost:100,height:.42,wall:true,size:'small',description:'牆面專用・小幅・來客速度 +2%',effect:{traffic:.02}},
 {id:'fern',name:'青羽波士頓蕨',group:'decor',level:1,cost:130,height:.85,outdoor:true,description:'室內或門外花園・滿意度緩慢提升',effect:{satisfaction:.008}},
 {id:'lavender',name:'暮紫薰衣草盆',group:'decor',level:2,cost:170,height:.95,outdoor:true,description:'室內或門外花園・顧客耐心 +3 秒',effect:{patience:3}},
 {id:'citrus',name:'金果小柑橘樹',group:'decor',level:3,cost:240,height:1.12,outdoor:true,description:'室內或門外花園・來客速度 +4%',effect:{traffic:.04}},
 {id:'carpet',name:'初光迎賓織毯',group:'furniture',level:1,cost:180,height:.055,ground:true,span:1.8,description:'來客速度 +4% · 隨商會等級升級織紋',effect:{traffic:.04}},
 {id:'sofa',name:'苔綠休憩沙發',group:'furniture',level:2,cost:220,height:.85,description:'舒適的等候座位',effect:{rest:.5}},
 {id:'plant',name:'朝露琴葉植栽',group:'decor',level:1,cost:120,height:1.45,outdoor:true,description:'營業時每分鐘滿意度 +0.6',effect:{satisfaction:.01}},
 {id:'lucky-cat',name:'招財貓銅鈴座',group:'decor',level:5,cost:380,height:1.05,description:'來客速度 +12%',effect:{traffic:.12}},
 {id:'fountain',name:'月泉石雕噴泉',group:'furniture',level:6,cost:700,height:1.35,description:'顧客耐心 +8 秒',effect:{patience:8}},
 {id:'artwork',name:'初光谷藝術屏風',group:'decor',level:8,cost:1100,height:1.85,description:'商品成交價 +5%',effect:{premium:.05}},
 {id:'phoenix',name:'金曜鳳羽藝術座',group:'decor',level:9,cost:1800,height:1.95,description:'來客速度 +18% · 成交價 +5%',effect:{traffic:.18,premium:.05}}
];
export const decorDefinition=item=>{const base=decorTypes.find(t=>t.id===item.type);return base&&item.tier?tierDefinition(base,item.tier):base;};
export const decorForLevel=level=>decorTypes.filter(t=>t.level<=level).map(t=>tierDefinition(t,level));
export const decorModel=(type,level=1)=>['clock','painting','painting-large','couplet','fern','lavender','citrus'].includes(type)?'@decor/'+type:type==='carpet'?'@carpet/'+Math.min(level,5):'@shop/assets/art-v6/decor/'+(type==='phoenix'?'phoenix-fit-v2':type)+'.glb';
export const decorLimit=level=>4+Math.max(1,Math.floor(Number(level)||1))*2;
export function decorEffects(s){const effects={traffic:0,rest:0,patience:0,satisfaction:0,premium:0},seen=new Set();for(const item of s.decorations||[]){if(seen.has(item.type))continue;seen.add(item.type);const d=decorDefinition(item);for(const [key,value]of Object.entries(d?.effect||{}))effects[key]+=value;}effects.traffic=Math.min(effects.traffic,.15);effects.premium=Math.min(effects.premium,.15);return effects;}
export const obstacles=s=>[...s.shelves,...(s.decorations||[]).filter(d=>!decorDefinition(d)?.ground&&!decorDefinition(d)?.wall&&!d.garden)];

/* 同一份分類數量供布置入口及清單使用；收納與實際擺放分開。 */
export function decorCounts(s,group){const placed=(s.decorations||[]).filter(d=>!group||decorDefinition(d)?.group===group).length,stored=(s.decorStorage||[]).filter(d=>!group||decorDefinition(d)?.group===group).length;return {placed,stored,total:placed+stored};}
