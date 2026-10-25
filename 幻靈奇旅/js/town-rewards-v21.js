/* Pure reward/guide decisions. The town owns scene mutation and persistence. */
(()=>{'use strict';
const owned=(s,id)=>!!(s.pokedexUnlocks?.[id]||s.captureCounts?.[id]>0);
function queueVictory(state,id,{spirits,isSpecial,eligible,complete,random=Math.random}){
 if((state.arenaRewardIds||[]).includes(id))return null;
 const reserved=new Set((state.arenaRewardQueue||[]).map(q=>q.speciesId)),pool=spirits.filter(s=>!owned(state,s.id)&&!isSpecial(s)&&eligible(s));
 const fresh=pool.filter(s=>!reserved.has(s.id)),choices=fresh.length?fresh:pool;
 const reward=complete?{id,kind:'points',amount:100}:choices.length?{id,kind:'spirit',speciesId:choices[Math.floor(random()*choices.length)].id}:null;
 state.arenaRewardIds=[...(state.arenaRewardIds||[]),id].slice(-256);if(reward)state.arenaRewardQueue=[...(state.arenaRewardQueue||[]),reward];return reward;
}
function pendingTips(records,state){return records.filter(r=>!r.done(state)).map(r=>typeof r.text==='function'?r.text(state):r.text);}
window.PhantomTownRewards={queueVictory,pendingTips};
})();
