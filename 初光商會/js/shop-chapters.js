import{trayOffers,salesShelves,saleShelf,returnShelfStock,migrateMaterialTrays,isMaterialTray}from'./material-tray.js?v=20261114-v47';
import {shelfDefinition} from './furniture.js?v=20261114-v47';
import {decorDefinition} from './decorations.js?v=20261114-v47';
/* Five self-contained shop chapters. Main objectives gate automatic construction.
 * Side quests grant optional gold but never silently bypass the original level fee. */
const LEVELS={
 1:{title:'初光開張',story:'讓冒險者安心找到第一件補給，完成第一天營業。',sales:1,sides:[['patrol','完成一次主管巡店',s=>s.patrols||0,1,120],['staff','擁有兩位夥伴',s=>s.employees.length,2,100]]},
 2:{title:'冒險者的採購站',story:'服務更多冒險者，打造有口碑的商品供應。',sales:25,sides:[['staff','聘用三位員工',s=>s.employees.length,3,280],['stock','庫房存貨至少20件',s=>Object.values(s.inventory).reduce((a,n)=>a+n,0),20,180]]},
 3:{title:'工匠與夥伴',story:'讓工匠、補貨員與收銀夥伴合作，擴大商會交易。',sales:70,sides:[['staff','擁有四位員工',s=>s.employees.length,4,420],['incident','解決三件員工事件',s=>s.incidentHistory?.length||0,3,350]]},
 4:{title:'星穹裝備展',story:'使裝備館成為傳奇旅人的熱門補給地。',sales:140,sides:[['training','一位員工熟練達到Lv.5',s=>Math.max(0,...s.employees.map(e=>e.workLevel)),5,650],['stock','庫房存貨至少60件',s=>Object.values(s.inventory).reduce((a,n)=>a+n,0),60,480]]},
 5:{title:'傳奇初光商會',story:'成為所有幻靈與冒險者都知道的傳奇商會。',sales:250,revenue:100000,satisfaction:88,days:8,sides:[['staff','僱用八位員工',s=>s.employees.length,8,1500],['incident','解決十件商會事件',s=>s.incidentHistory?.length||0,10,1200]]},
 6:{title:'繁榮的街角',story:'讓更多夥伴上工，商會開始熱鬧起來。',sales:400,sides:[['staff','擁有十位員工',s=>s.employees.length,10,2500],['evolved','完成兩次員工進化',s=>s.employees.reduce((n,e)=>n+(e.evolutionHistory?.length||0),0),2,2000]]},
 7:{title:'高級的待客之道',story:'用更好的服務留住挑剔的客人。',sales:600,sides:[['training','一位員工熟練達到 Lv.8',s=>Math.max(0,...s.employees.map(e=>e.workLevel)),8,3500],['incident','解決十五件商會事件',s=>s.incidentHistory?.length||0,15,3000]]},
 8:{title:'魔法百貨開幕',story:'讓旅人在這裡買到所有冒險需要的東西。',sales:900,sides:[['staff','擁有十二位員工',s=>s.employees.length,12,5000],['evolved','完成六次員工進化',s=>s.employees.reduce((n,e)=>n+(e.evolutionHistory?.length||0),0),6,4500]]},
 9:{title:'皇家的認可',story:'連皇家都指定向初光商會採購。',sales:1300,sides:[['evolved','完成十次員工進化',s=>s.employees.reduce((n,e)=>n+(e.evolutionHistory?.length||0),0),10,8000],['incident','解決二十五件商會事件',s=>s.incidentHistory?.length||0,25,6000]]},
 10:{title:'傳說商會',story:'成為整片大陸都傳頌的商會。',sales:1800,revenue:1200000,satisfaction:92,days:20,sides:[['staff','擁有十五位員工',s=>s.employees.length,15,12000],['evolved','完成十五次員工進化',s=>s.employees.reduce((n,e)=>n+(e.evolutionHistory?.length||0),0),15,12000]]}
};
export const chapterConfig=LEVELS;
export function chapterObjectives(s,levels){
 const top=levels.length,chapter=LEVELS[s.level]||LEVELS[top],next=levels[s.level],last=s.level===top;
 const revenue=last?chapter.revenue:next.revenue,satisfaction=last?chapter.satisfaction:next.satisfaction,days=last?chapter.days:next.days;
 const goals=[
  {id:'sales',title:'完成真實顧客成交',value:s.totals.sales||0,target:chapter.sales},
  {id:'revenue',title:'累計營業額（G）',value:s.totals.revenue||0,target:revenue},
  {id:'satisfaction',title:'顧客滿意度（%）',value:s.satisfaction||0,target:satisfaction},
  {id:'days',title:'完成營業日結',value:s.totals.days||0,target:days}
 ];
 if(!last)goals.push({id:'funds',title:'升級工程預算（G）',value:s.gold||0,target:next.cost});
 for(const goal of goals)goal.done=goal.value>=goal.target;
 const side=chapter.sides.map(([id,title,read,target,reward],i)=>({id:`lv${s.level}-${id}`,title,value:read(s),target,reward,done:read(s)>=target,claimed:!!s.chapterRewards?.[`lv${s.level}-${id}`]}));
 const ready=goals.every(g=>g.done),cost=last?0:next.cost;
 return {level:s.level,title:chapter.title,story:chapter.story,goals,side,ready,last,cost,canConstruct:ready&&!last&&!s.layoutPause&&!s.upgradeProject&&s.gold>=cost,construction:!!s.upgradeProject};
}
export function autoChapterConstruction(){return false;}
export function upgradeRefund(s){const racks=[...(s.shelves||[]),...(s.shelfStorage||[])],decor=[...(s.decorations||[]),...(s.decorStorage||[])];const items=[...racks.map(x=>({id:x.id,name:shelfDefinition(x).name,refund:Math.floor((x.purchasePrice??shelfDefinition(x).cost)/2)})),...decor.map(x=>({id:x.id,name:decorDefinition(x)?.name||x.type,refund:Math.floor((x.purchasePrice??decorDefinition(x)?.cost??0)/2)}))];return {items,count:items.length,gold:items.reduce((n,x)=>n+x.refund,0)};}
export function beginChapterConstruction(g,s,info=chapterObjectives(s,g.data.levels)){
 if(!info.canConstruct)throw Error('升級條件尚未達成。');const from=s.level,next=g.data.levels[from],refund=upgradeRefund(s);
 g.pay(s,next.cost);s.stats.expenses=(s.stats.expenses||0)+next.cost;
 if(s.phase==='open')g.close(s);
 for(const e of s.employees){if(e.workTask?.phase==='carry')s.inventory[e.workTask.sku]=(s.inventory[e.workTask.sku]||0)+e.workTask.qty;e.workTask=null;e.path=[];}
 for(const sh of s.shelves)returnShelfStock(s,sh);
 s.gold+=refund.gold;s.stats.furnitureSales=(s.stats.furnitureSales||0)+refund.gold;s.shelves=[];s.shelfStorage=[];s.decorations=[];s.decorStorage=[];s.undo=null;s.patrolShelf=null;s.customers=[];
 s.level=next.level;s.upgradeProject=null;s.lastUpgradeRefund={...refund,from,to:s.level,cost:next.cost};
 if(s.report){Object.assign(s.report,{gold:s.gold,expenses:s.stats.expenses,furnitureSales:s.stats.furnitureSales,netProfit:s.stats.revenue+(s.stats.furnitureSales||0)+(s.stats.promoterBonus||0)-s.stats.cogs-s.stats.expenses});for(const r of s.history)if(r.day===s.report.day)Object.assign(r,s.report);}
 finishChapterConstruction(g,s,from);g.log(s,`升級完成！已回收 ${refund.count} 件舊擺設，半價返還 ${refund.gold} G；架上商品保留於倉庫。`);return true;
}
export function awardSideChapter(g,s,id){
 const mission=chapterObjectives(s,g.data.levels).side.find(x=>x.id===id);
 if(!mission||!mission.done||mission.claimed)throw Error('支線任務尚未完成或獎勵已領取');
 s.chapterRewards??={};s.chapterRewards[id]=true;
 s.gold+=mission.reward;s.stats.rewards=(s.stats.rewards||0)+mission.reward;
 g.log(s,`支線完成：${mission.title}，獲得 ${mission.reward} G`);
 return `支線完成：獲得 ${mission.reward} G`;
}
export function finishChapterConstruction(g,s,from){
 const name=g.data.levels[s.level-1]?.name||'新商會';
 s.chapterClear={id:`chapter-${from}-${s.level}`,from,level:s.level,title:name,day:s.day};
 g.log(s,`恭喜通過第 ${from} 章！新的 Lv.${s.level} ${name} 已完成。`);
}
