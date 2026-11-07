export const decorTypes=[
 {id:'carpet',name:'初光迎賓織毯',group:'furniture',level:1,cost:180,height:.055,ground:true,span:1.8,description:'來客速度 +4% · 隨商會等級升級織紋',effect:{traffic:.04}},
 {id:'sofa',name:'苔綠休憩沙發',group:'furniture',level:2,cost:220,height:.85,description:'舒適的等候座位',effect:{rest:.5}},
 {id:'plant',name:'朝露琴葉植栽',group:'decor',level:1,cost:120,height:1.45,description:'營業時每分鐘滿意度 +0.6',effect:{satisfaction:.01}},
 {id:'lucky-cat',name:'招財貓銅鈴座',group:'decor',level:5,cost:380,height:1.05,description:'來客速度 +12%',effect:{traffic:.12}},
 {id:'fountain',name:'月泉石雕噴泉',group:'furniture',level:6,cost:700,height:1.35,description:'顧客耐心 +8 秒',effect:{patience:8}},
 {id:'artwork',name:'初光谷藝術屏風',group:'decor',level:8,cost:1100,height:1.85,description:'商品成交價 +5%',effect:{premium:.05}},
 {id:'phoenix',name:'金曜鳳羽藝術座',group:'decor',level:9,cost:1800,height:1.95,description:'來客速度 +18% · 成交價 +5%',effect:{traffic:.18,premium:.05}}
];
export const decorDefinition=item=>decorTypes.find(t=>t.id===item.type);
export const decorModel=(type,level=1)=>type==='carpet'?'@carpet/'+Math.min(level,5):'@shop/assets/art-v6/decor/'+(type==='phoenix'?'phoenix-fit-v2':type)+'.glb';
export const decorLimit=level=>2+Math.min(level,5)*2;
export function decorEffects(s){const effects={traffic:0,rest:0,patience:0,satisfaction:0,premium:0},seen=new Set();for(const item of s.decorations||[]){if(seen.has(item.type))continue;seen.add(item.type);const d=decorDefinition(item);for(const [key,value]of Object.entries(d?.effect||{}))effects[key]+=value;}effects.traffic=Math.min(effects.traffic,.15);effects.premium=Math.min(effects.premium,.15);return effects;}
export const obstacles=s=>[...s.shelves,...(s.decorations||[]).filter(d=>!decorDefinition(d)?.ground)];
