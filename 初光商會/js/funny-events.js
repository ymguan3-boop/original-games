/* Original comic shop incidents; no external models, scripts or paid animations. */
const sketches=[
 // cashier: opening-level events are reachable with the initial two employees.
 ['cashier','硬幣長腳逃跑','收銀台的硬幣滾出一條小隊，大家竟然追著它排隊！','🪙','🏃','🧾','chase','checkout',26,1,'any'],
 ['cashier','找零找出一顆樹果','小芝麻把樹果當成找零，客人差點拿去種在錢包裡。','🫐','💰','😳','bounce','reputation',3,1,'any'],
 ['cashier','收銀機突然唱生日歌','今天沒人生日，但收銀機唱了三遍，連隊伍都打拍子。','🎂','🎵','🧾','dance','patience',25,1,'queue'],
 ['stocker','紙箱裡跳出一隻紙箱','補貨紙箱打開後竟然還有小紙箱，連續套娃到大家笑翻。','📦','📦','😂','stack','stock',6,1,'any'],
 ['stocker','補貨推車變漂移賽車','推車轉彎甩尾，差點把藥水排成漂亮的彩虹弧線。','🛒','💨','🌈','chase','logistics',24,1,'any'],
 ['stocker','貨架突然打起噴嚏','店裡的魔法貨架哈啾一聲，商品像爆米花一樣抖三下。','🤧','🧴','✨','jelly','stock',4,1,'inventory'],
 ['sales','客人把折扣聽成折紙','推銷員喊出八折，結果客人把宣傳單折成一整排紙鶴。','🏷️','🕊️','🤣','flutter','reputation',3,2,'any'],
 ['sales','試用藥水變成大頭照','推銷時魔法藥水冒泡，客人嚷著自己變成了海報明星。','🧪','🫧','🤳','pop','sales',25,2,'any'],
 ['sales','超熱情招呼跳起探戈','推銷員和顧客不小心同時退一步，直接跳成雙人舞。','🕺','💃','🛒','dance','traffic',25,2,'crowd'],
 ['smith','鐵鎚說今天想休假','鐵鎚敲第一下就打了哈欠，鍛造師開始跟鐵鎚談加班費。','🔨','😴','🔥','wobble','forge',25,3,'any'],
 ['smith','鍛爐冒出棉花糖雲','鍛爐的煙居然是棉花糖形狀，大家開始猜口味。','☁️','🍬','⚒️','float','rest',10,3,'any'],
 ['smith','神劍被磨成湯匙','磨刀磨得太認真，一把劍看起來像能用來喝湯。','⚔️','🥄','😅','spin','morale',7,3,'any'],
 ['warehouse','倉庫箱子玩躲貓貓','倉管員找一個箱子找了半天，結果它一直在背後。','🫣','📦','👀','sneak','storage',25,3,'any'],
 ['warehouse','盤點單自己摺成飛機','剛做完的盤點表飛過整個庫房，最後準確停在架子上。','📄','✈️','😵','flutter','stock',8,3,'inventory'],
 ['warehouse','庫房標籤全部長鬍子','商品標籤像是偷偷貼上了小鬍子，看起來全是老闆。','🏷️','🥸','📦','pop','reputation',3,3,'any'],
 ['security','保全追捕自己的影子','影子比本人還早到門口，保全以為有個神秘小偷。','🕵️','👤','💨','chase','patience',25,2,'any'],
 ['security','小偷其實是掃地機器人','警報響了好半天，犯人只是卡在角落的掃地小幫手。','🚨','🤖','😂','wobble','morale',5,2,'any'],
 ['security','門口立牌突然敬禮','保全站崗太認真，連寫著歡迎光臨的立牌都向他敬禮。','🪧','🫡','⭐','bounce','reputation',4,2,'any'],
 ['cleaner','拖把滑成花式溜冰','清潔員踩到泡泡打滑，卻漂亮地轉了一個三百六十度。','🧹','🫧','⛸️','spin','clean',4,2,'any'],
 ['cleaner','掃把和灰塵展開追逐','灰塵團假裝有腳，在桌腳間繞圈圈躲掃把。','🌪️','🧹','😆','chase','rest',8,2,'any'],
 ['cleaner','地板乾淨到能照鏡子','顧客低頭看到自己，對著地板整理髮型整理了十分鐘。','✨','🪞','😎','sparkle','clean',4,2,'any'],
 ['host','歡迎口號突然變饒舌','招待員喊歡迎光臨時一路押韻，客人忍不住跟著拍手。','🎤','🎶','👏','dance','traffic',26,2,'any'],
 ['host','迎賓鞠躬太用力','招待員彎腰太深，帽子飛起來剛好落在客人頭上。','🎩','🙇','😆','flutter','reputation',4,2,'any'],
 ['host','吉祥物與客人比鬼臉','招待員不甘示弱，比鬼臉比到全場都笑出聲。','😜','👻','🤣','jelly','morale',8,2,'crowd']
];
export const funnyEvents=sketches.map(([role,title,dialogue,emojiA,emojiB,emojiC,animation,effect,effectValue,minLevel,condition],i)=>({
 id:`comic-${i+1}`,role,title,description:dialogue,dialogue,
 emoji:[emojiA,emojiB,emojiC],animation,funny:true,effect,effectValue,minLevel,condition,
 effectText:({checkout:'收銀速度加快',reputation:'人氣提升',stock:'快速補貨',logistics:'搬貨效率提升',sales:'促銷效果提升',traffic:'商店人氣更旺',forge:'鍛造工作加速',rest:'員工恢復體力',morale:'員工士氣提升',storage:'倉儲效率提升',patience:'排隊耐心提升',clean:'店面滿意度提升'})[effect]||'全店獲得鼓勵',
 cooldown:85,choices:[
  {id:'act',label:'加入這場鬧劇 · 35 G，士氣 +10、滿意 +3',cost:35,mood:10,satisfaction:3,xp:8},
  {id:'smile',label:'幽默化解 · 免費，士氣 +4、滿意 +1',cost:0,mood:4,satisfaction:1,xp:3}
 ]
}));
export function comicEventEligible(s,ev){
 if(!ev.funny)return true;
 if((s.level||1)<(ev.minLevel||1))return false;
 const condition=ev.condition||'any';
 if(condition==='queue')return s.customers.some(c=>['Cart','Queue','Checkout'].includes(c.state));
 if(condition==='inventory')return s.shelves.some(sh=>sh.stock>0);
 if(condition==='crowd')return s.customers.length>=2;
 return true;
}
