/* 商會經濟 v2：顧客類型、價格彈性、市場事件與聲譽。2D 與 3D 共用，只在購買決策與每日切換時計算。
 * 所有數值集中在這裡，方便調整平衡。 */
export const CUSTOMER_TYPES={
 commoner:{name:'平民',elasticity:2.0,likes:['food','supply','general'],budget:[60,260],weight:5},
 rich:{name:'富豪',elasticity:.5,likes:['premium','weapon'],budget:[400,1400],weight:1.4},
 adventurer:{name:'冒險者',elasticity:1.1,likes:['supply','weapon','material'],budget:[150,600],weight:3},
 mage:{name:'魔法師',elasticity:.9,likes:['magic','pet'],budget:[200,800],weight:2}
};
/* 商品分類標籤；文件提到但商品不存在的類別（雨具、糖果）直接略過 */
const TAGS={'ball-basic':['pet','general'],'ball-great':['pet'],'ball-ultra':['pet','premium'],potion:['supply','general'],revive:['supply','premium'],battery:['magic'],'vacuum-orb':['magic','premium'],'pet-xp-double':['pet','magic'],'buff-attack':['supply','armor'],'buff-defense':['supply','armor'],'buff-capture':['magic'],'buff-pickup':['supply'],'sword-starter':['weapon','general'],'knife-starter':['weapon'],'blades-starter':['weapon'],'guns-starter':['weapon'],'sword-flame':['weapon','premium'],'knife-tide':['weapon','premium'],'blades-forest':['weapon','premium'],'guns-thunder':['weapon','premium'],berry:['food','general'],'shop-iron':['material','general'],'shop-wood':['material','general'],'shop-crystal':['material','magic']};
export const tagsOf=sku=>TAGS[sku]||['general'];
/* 文件中的 12 項市場事件。demand：需求倍率；cost：進貨成本倍率；traffic：人流倍率 */
export const MARKET_EVENTS=[
 {id:'caravan',title:'神秘商隊',days:2,weight:1,cost:{all:.8},demand:{general:.85},text:'一支掛滿鈴鐺的商隊駛進初光鎮，帶來便宜的貨源，但也搶走了一些一般商品的客人。',shout:'商隊的貨又便宜又多，快去補貨！',tone:'mixed'},
 {id:'festival',title:'初光鎮慶典',days:3,weight:1,demand:{food:1.5},traffic:1.3,text:'彩旗掛滿街道，燈籠一路亮到廣場。慶典期間大家都想買點吃的，人潮也比平常多。',shout:'慶典開始囉！人潮湧進來了！',tone:'good'},
 {id:'adventurers',title:'冒險者湧入',days:2,weight:1,demand:{supply:1.6},elasticity:{adventurer:.8},text:'公會發出大型委託，冒險者成群結隊進鎮。他們急著補給，對價格也不太計較。',shout:'冒險者來了，藥水準備好！',tone:'good'},
 {id:'storm',title:'暴風雨',days:1,weight:.8,traffic:.65,weather:'storm',text:'烏雲壓頂，雷聲一陣接一陣。出門的人變少了，但真的進門的客人都很需要東西。',shout:'外面風雨好大，大家小心！',tone:'bad'},
 {id:'demon',title:'魔王出沒',days:2,weight:.8,demand:{armor:1.7,supply:1.7},text:'遠方山頭出現魔王的剪影，警鐘響個不停。鎮民紛紛搶購防具和藥水備用。',shout:'魔王出沒！防具藥水要備足！',tone:'mixed'},
 {id:'breeding',title:'幻靈繁殖季',days:3,weight:1,demand:{pet:1.5},text:'幻靈們成雙成對出現在草原上，空氣中飄著愛心泡泡。靈核球和幻靈用品特別好賣。',shout:'繁殖季到了，幻靈用品熱賣！',tone:'good'},
 {id:'harvest',title:'豐收季',days:3,weight:1,cost:{food:.75},text:'果園大豐收，果實一籃籃送進鎮上。食品的進貨成本降低不少，正是補貨的好時機。',shout:'豐收了！食品進貨超便宜！',tone:'good'},
 {id:'shortage',title:'物資短缺',days:2,weight:.8,costPick:1.4,text:'運貨的路被落石擋住，某一類商品的貨源變少，進貨價格跟著上漲。',shout:'有些貨進不來，進價變貴了！',tone:'bad'},
 {id:'tourists',title:'富豪觀光團',days:1,weight:.7,demand:{premium:1.8},types:{rich:3},text:'華麗的馬車停在廣場，一群富豪下車觀光。他們只看高級貨，出手非常大方。',shout:'富豪觀光團到了，高級貨擺出來！',tone:'good'},
 {id:'rival',title:'競爭商店促銷',days:2,weight:.9,demand:{general:.7},text:'對街的商店掛出大大的折扣旗，一般商品的客人被吸走不少。',shout:'對面在打折，我們要想辦法！',tone:'bad'},
 {id:'research',title:'魔法研究突破',days:3,weight:.9,demand:{magic:1.6},types:{mage:2},text:'學院宣布重大研究突破，魔法師們興奮地四處採購材料和魔法用品。',shout:'研究突破！魔法用品大賣！',tone:'good'},
 {id:'viral',title:'商會人氣爆紅',days:2,weight:.7,traffic:1.5,text:'有人把商會畫成圖寫進旅遊誌，大家都想來朝聖。門口排起長長的隊伍。',shout:'我們紅了！客人排到門外了！',tone:'good'}
];
export const marketEvent=id=>MARKET_EVENTS.find(e=>e.id===id)||null;
export const DAILY_EVENT_CHANCE=.55,ANCHOR=2.4;
export function ensureMarket(s){s.market||={event:null,lastId:null,history:[],reputation:50,loyalty:50,announced:null};s.market.reputation??=50;s.market.loyalty??=50;s.market.competition??=100;return s.market;}
export function activeEvent(s){const m=ensureMarket(s),e=m.event;return e&&s.day>=e.startDay&&s.day<=e.endDay?{...marketEvent(e.id),...e}:null;}
/* 每天開店前抽一次；進行中的長期事件不重抽，也不連續出同一件 */
export function rollMarket(g,s){
 const m=ensureMarket(s);if(m.event&&s.day<=m.event.endDay)return activeEvent(s);
 m.event=null;if(g.random(s)>DAILY_EVENT_CHANCE)return null;
 const pool=MARKET_EVENTS.filter(e=>e.id!==m.lastId),total=pool.reduce((n,e)=>n+e.weight,0);let r=g.random(s)*total,pick=pool[0];for(const e of pool){r-=e.weight;if(r<=0){pick=e;break;}}
 const tags=['supply','weapon','material','magic','pet','food'],picked=pick.costPick?tags[Math.floor(g.random(s)*tags.length)]:null;
 m.event={id:pick.id,startDay:s.day,endDay:s.day+pick.days-1,pickedTag:picked};m.lastId=pick.id;m.history.push({id:pick.id,day:s.day});m.history=m.history.slice(-20);
 g.log(s,`市場消息：${pick.title}（${pick.days} 天）`);return activeEvent(s);
}
const TAG_NAMES={supply:'補給',weapon:'武器',material:'素材',magic:'魔法用品',pet:'幻靈用品',food:'食品',armor:'防具',premium:'高級品',general:'一般商品',all:'全部商品'};
export const tagName=t=>TAG_NAMES[t]||t;
export function eventEffects(ev){if(!ev)return [];const out=[];for(const[k,v]of Object.entries(ev.demand||{}))out.push(`${tagName(k)}需求 ${v>1?'+':''}${Math.round((v-1)*100)}%`);for(const[k,v]of Object.entries(ev.cost||{}))out.push(`${tagName(k)}進價 ${v>1?'+':''}${Math.round((v-1)*100)}%`);if(ev.costPick)out.push(`${tagName(ev.pickedTag)}進價 +${Math.round((ev.costPick-1)*100)}%`);if(ev.traffic)out.push(`人流 ${ev.traffic>1?'+':''}${Math.round((ev.traffic-1)*100)}%`);return out;}
export function demandFactor(s,sku){const ev=activeEvent(s);if(!ev?.demand)return 1;return tagsOf(sku).reduce((f,t)=>f*(ev.demand[t]||1),1);}
export function costFactor(s,sku){const ev=activeEvent(s);if(!ev)return 1;let f=ev.cost?.all||1;for(const t of tagsOf(sku))f*=ev.cost?.[t]||1;if(ev.costPick&&tagsOf(sku).includes(ev.pickedTag))f*=ev.costPick;return f;}
export function competitionIndex(s){const m=ensureMarket(s);if(m.competitionDay!==s.day){const ev=activeEvent(s);m.competition=Math.max(70,Math.min(140,Math.round(100+(50-m.reputation)*.2+(ev?.id==='rival'?25:0))));m.competitionDay=s.day;}return m.competition;}
export function trafficFactor(s){return (activeEvent(s)?.traffic||1)*Math.max(.75,Math.min(1.15,1-(competitionIndex(s)-100)/200));}
/* 依類型權重抽顧客；事件可以提高特定類型的比例 */
export function pickCustomerType(g,s){const ev=activeEvent(s),entries=Object.entries(CUSTOMER_TYPES).map(([id,t])=>[id,t.weight*(ev?.types?.[id]||1)*(id==='rich'?1+Math.min(4,s.level-1)*.15:1)]),total=entries.reduce((n,e)=>n+e[1],0);let r=g.random(s)*total;for(const[id,w]of entries){r-=w;if(r<=0)return id;}return 'commoner';}
export function customerBudget(g,type){const[a,b]=CUSTOMER_TYPES[type].budget;return {type,min:a,max:b};}
/* 購買機率：文件公式。ref 為參考售價（已含貨架與裝潢加成），預算不足一律不買 */
export function purchaseChance(s,{type,sku,price,ref,quality=1}){
 const t=CUSTOMER_TYPES[type]||CUSTOMER_TYPES.commoner,ev=activeEvent(s),m=ensureMarket(s);
 const elasticity=t.elasticity*(ev?.elasticity?.[type]||1),pref=tagsOf(sku).some(x=>t.likes.includes(x))?1.25:.85,rep=.8+.4*(m.reputation/100);
 const ratio=Math.max(.05,price/Math.max(1,ref)),anchor=ratio>1.3?Math.exp(-ANCHOR*(ratio-1.3)):1;/* 超過參考價 1.3 倍後，連富豪也會覺得被坑，避免一律定最高價 */
 const p=.6*pref*demandFactor(s,sku)*quality*rep*Math.pow(ratio,-elasticity)*anchor;
 return Math.max(.02,Math.min(.98,Number.isFinite(p)?p:.02));
}
/* 每日聲譽：售價合理、少缺貨、滿意度高會上升；每天變動有上限 */
export function settleReputation(g,s){
 const m=ensureMarket(s),st=s.stats||{},served=Math.max(1,(st.served||0)+(st.lost||0)),lostRate=(st.lost||0)/served,ratios=Object.entries(s.prices||{}).map(([sku,p])=>{const c=g.data.catalog.find(x=>x.sku===sku);return c?p/c.suggestedRetail:1;}),avg=ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:1;
 const delta=Math.max(-4,Math.min(3,((s.satisfaction||70)-70)/12-lostRate*6-Math.max(0,avg-1.2)*5+(avg<1?.6:0)));
 m.reputation=Math.max(0,Math.min(100,Math.round((m.reputation+delta)*10)/10));m.loyalty=Math.max(0,Math.min(100,Math.round((m.loyalty+delta*.6+(lostRate<.1?.4:-.4))*10)/10));return delta;
}
