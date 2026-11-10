import {dailyTasks,managementAction} from './management.js?v=20261110-chibi3';
import {activeCommissions,commissionProgress,commissionAction} from './commissions.js?v=20261110-chibi3';
import {chapterObjectives,awardSideChapter} from './shop-chapters.js?v=20261110-chibi3';
/* 各分類目前可領幾項，任務頁的標示與一鍵領取按鈕都用這個 */
export function pendingRewards(g,s){
 const quests=g.questList(s).filter(q=>q.done&&!s.quests[q.id]).length,daily=dailyTasks(g,s),dailyN=quests+daily.tasks.filter(q=>q.done&&!q.claimed).length+(!daily.bonus&&daily.tasks.every(q=>q.done)?1:0);
 const chapter=chapterObjectives(s,g.data.levels).side.filter(q=>q.done&&!q.claimed).length,orders=activeCommissions(s).filter(q=>commissionProgress(s,q)>=q.qty).length;
 return {daily:dailyN,orders,chapter,total:dailyN+orders+chapter};
}
export function claimAllRewards(g,s){
 let count=0;const before=s.gold,got=[],tickets0=s.xpTickets||0;let mark=s.gold;const note=name=>{got.push({name,gold:s.gold-mark});mark=s.gold;};
 for(const q of g.questList(s))if(q.done&&!s.quests[q.id]){s.quests[q.id]=true;s.gold+=q.reward;s.stats.rewards+=q.reward;count++;note(q.name);}
 for(const q of dailyTasks(g,s).tasks)if(q.done&&!q.claimed){managementAction(g,s,'claimDaily',{id:q.id});count++;note(q.label);}
 const daily=dailyTasks(g,s);if(!daily.bonus&&daily.tasks.every(q=>q.claimed)){managementAction(g,s,'claimDailyBonus',{});count++;note('全勤獎勵');}
 for(const q of chapterObjectives(s,g.data.levels).side)if(q.done&&!q.claimed){awardSideChapter(g,s,q.id);count++;note(q.title);}
 for(const q of activeCommissions(s))if(commissionProgress(s,q)>=q.qty){commissionAction(g,s,'claimCommission',{id:q.id});count++;note(q.client||'商會委託');}
 if(!count)throw Error('目前沒有可領取的獎勵');
 if(s.phase==='report'&&s.report){Object.assign(s.report,{rewards:s.stats.rewards,gold:s.gold});if(s.history.at(-1)?.day===s.day)s.history[s.history.length-1]={...s.report};}
 s.lastClaim={items:got,gold:s.gold-before,tickets:(s.xpTickets||0)-tickets0,at:s.totalTime};g.log(s,`一次領取 ${count} 項獎勵，共 ${s.gold-before} G。`);return `已領取 ${count} 項獎勵，共 ${s.gold-before} G`;
}
