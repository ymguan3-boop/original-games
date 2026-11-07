import {dailyTasks,managementAction} from './management.js?v=20261107-fixes-r1';
import {activeCommissions,commissionProgress,commissionAction} from './commissions.js?v=20261107-fixes-r1';
import {chapterObjectives,awardSideChapter} from './shop-chapters.js?v=20261107-fixes-r1';
export function claimAllRewards(g,s){
 let count=0;const before=s.gold;
 for(const q of g.questList(s))if(q.done&&!s.quests[q.id]){s.quests[q.id]=true;s.gold+=q.reward;s.stats.rewards+=q.reward;count++;}
 for(const q of dailyTasks(g,s).tasks)if(q.done&&!q.claimed){managementAction(g,s,'claimDaily',{id:q.id});count++;}
 const daily=dailyTasks(g,s);if(!daily.bonus&&daily.tasks.every(q=>q.claimed)){managementAction(g,s,'claimDailyBonus',{});count++;}
 for(const q of chapterObjectives(s,g.data.levels).side)if(q.done&&!q.claimed){awardSideChapter(g,s,q.id);count++;}
 for(const q of activeCommissions(s))if(commissionProgress(s,q)>=q.qty){commissionAction(g,s,'claimCommission',{id:q.id});count++;}
 if(!count)throw Error('目前沒有可領取的獎勵');
 if(s.phase==='report'&&s.report){Object.assign(s.report,{rewards:s.stats.rewards,gold:s.gold});if(s.history.at(-1)?.day===s.day)s.history[s.history.length-1]={...s.report};}
 g.log(s,`一次領取 ${count} 項獎勵，共 ${s.gold-before} G。`);return `已領取 ${count} 項獎勵，共 ${s.gold-before} G`;
}
