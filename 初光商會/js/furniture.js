export const shelfTypes=[
 {id:'apothecary',name:'草木藥櫃',description:'藥水與補給道具',sku:'potion',color:'#70a48b',level:1,cost:160,capacity:30,premium:1,top:1.46},
 {id:'orbs',name:'星藍靈核櫃',description:'球形展示櫃・各式靈核球',sku:'ball-basic',color:'#648fc6',level:1,cost:160,capacity:30,premium:1,top:1.44,productLayout:'orb-v3',productMaxSize:.09},
 {id:'armory',name:'赤銅武器架',description:'武器商品專用',sku:'sword-starter',color:'#ae6248',level:1,cost:240,capacity:36,premium:1.08,top:1.43,productLayout:'weapon-rack',productMaxSize:.34},
 {id:'limited-armory',name:'星冠限定武器櫃',description:'限定武器商品專用・限購一座',sku:'guns-critical-merchant-elite',color:'#7e56a5',level:2,cost:1200,capacity:48,premium:1.5,top:1.8,productLayout:'weapon-rack',productMaxSize:.32,unique:true},
 {id:'materials',name:'蜜金素材櫃',description:'礦石、木材與採集素材',sku:'shop-iron',color:'#ccaa61',level:2,cost:240,capacity:36,premium:1.08,top:1.44},
 {id:'arcane',name:'月桂秘藥櫃',description:'道具與靈核球',sku:'potion',color:'#9b7bc5',level:5,cost:480,capacity:45,premium:1.15,top:1.64,rows:3,columns:5,depth:3,spacing:.51},
 {id:'relic',name:'琥珀珍品櫃',description:'武器與素材',sku:'shop-iron',color:'#be8844',level:7,cost:850,capacity:60,premium:1.25,top:1.77,rows:4,columns:5,depth:3,spacing:.39},
 {id:'royal',name:'星穹皇家寶櫃',description:'所有商品',sku:'ball-basic',color:'#577d9e',level:9,cost:1400,capacity:90,premium:1.4,top:2.04,rows:5,columns:6,depth:3,spacing:.35}
];
export function shelfKind(shelf){return shelf.type&&shelf.type!=='general'?shelf.type:/^ball-/.test(shelf.sku)?'orbs':/^shop-|berry|stone/.test(shelf.sku)?'materials':/sword|knife|blade|guns/.test(shelf.sku)?'armory':'apothecary';}
export const shelfDefinition=sh=>shelfTypes.find(t=>t.id===shelfKind(sh))||shelfTypes[0];
export const shelfCapacity=sh=>sh.type&&sh.type!=='general'?shelfDefinition(sh).capacity:30;
export const shelfLimit=level=>2+Math.max(1,Math.floor(level))*2;
export const isLimitedWeapon=item=>item?.category==='weapon'&&(['elite','boss'].includes(item.merchantGrade)||/-merchant-(elite|boss)$/.test(item.sku));
export const ownsUniqueShelf=(s,type)=>[...(s.shelves||[]),...(s.shelfStorage||[])].some(sh=>shelfKind(sh)===type);
export function accepts(shelf,item){const kind=shelfKind(shelf);if(isLimitedWeapon(item)||kind==='limited-armory')return kind==='limited-armory'&&isLimitedWeapon(item);if(!shelf.type||shelf.type==='general')return true;return kind==='royal'?true:kind==='arcane'?item.category==='item':kind==='relic'?['weapon','material'].includes(item.category):kind==='orbs'?/^ball-/.test(item.sku):kind==='armory'?item.category==='weapon':kind==='materials'?item.category==='material':item.category==='item'&&!/^ball-/.test(item.sku);}
export const shelfModel=type=>['armory','limited-armory','materials','arcane','relic','royal'].includes(type)?'procedural:'+type:type==='orbs'?'@shop/assets/art-v8/pilots-v3/orb-spherical-pilot-v3.glb':'@shop/assets/'+(['arcane','relic','royal'].includes(type)?'art-v6/racks/':'art-v4/furniture/')+type+'.glb';
