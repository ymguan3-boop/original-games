/* Daily targets are deterministic, persistent, and based on actual sales/revenue.
 * Targets do not award invented currency and do not replace chapter main quests. */
import {chapterObjectives} from './shop-chapters.js?v=20261110-shop-pk-r1';
export function generateDailyGoals(s,levels){
 const chapter=chapterObjectives(s,levels),day=s.day||1,level=s.level||1,base=level*2+Math.min(3,Math.floor((day-1)/3));
 const revenue=80+level*125+Math.floor((day-1)*35);
 const satisfaction=Math.max(60,Math.min(94,70+level*3));
 return {id:'day-'+day,day,level,chapter:chapter.title,createdAt:s.totalTime||0,
  targets:{sales:base,revenue,satisfaction},initialSatisfaction:s.satisfaction};
}
export function ensureDailyGoals(s,levels){
 if(s.dailyGoals?.day!==s.day)s.dailyGoals=generateDailyGoals(s,levels);
 return s.dailyGoals;
}
export function dailyProgress(s,levels){
 const goals=s.dailyGoals?.day===s.day?s.dailyGoals:generateDailyGoals(s,levels),stats=s.phase==='report'&&s.report?s.report:s.stats;
 return {day:s.day,level:s.level,chapter:goals.chapter,
   metrics:[
   {id:'sales',label:'完成成交',value:Number(stats.sales)||0,target:goals.targets.sales,unit:'筆'},
   {id:'revenue',label:'營業收入',value:Number(stats.revenue)||0,target:goals.targets.revenue,unit:'G'},
   {id:'satisfaction',label:'顧客滿意度',value:Number(s.phase==='report'?s.report?.satisfaction:s.satisfaction)||0,target:goals.targets.satisfaction,unit:'%'}
  ].map(x=>({...x,done:x.value>=x.target})),
   goals};
}
export function dailyClosing(s,levels){
 const progress=dailyProgress(s,levels),r=s.report||s.stats,n=k=>Number(r[k])||0;
 return {...progress,netProfit:Number(r.netProfit)||0,grossProfit:n('revenue')-n('cogs'),
  figures:[
   {label:'營業收入',value:n('revenue')},
   {label:'商品成本',value:-n('cogs')},
   {label:'員工薪資',value:-n('wages')},
   {label:'其他費用',value:-n('expenses')},
   {label:'家具售出',value:n('furnitureSales')},
   {label:'淨利',value:Number(r.netProfit)||0}
  ],complete:progress.metrics.filter(m=>m.done).length,total:progress.metrics.length,
  gold:Number(s.gold)||0,lost:n('lost'),served:n('served'),unpaid:n('unpaid')};
}
