/* 幻靈奇旅｜共用規則單一來源：圖鑑、NPC、教學、旅行指南、挑戰塔文案。 */
(()=>{'use strict';
 const mainSpeciesCount=58; // 目前一般幻靈圖鑑筆數；跨頁挑戰塔讀取此值，驗證程式會核對資料檔。
 const thresholds=Object.freeze({lab:.25,yellow:.45,greenBat:.75,tutorialArena:.30,tutorialTower:.50,complete:1});
 const quest=Object.freeze({requiredSpecies:5,eachBallReward:30});
 const arena=Object.freeze({partySize:3});
 const tower=Object.freeze({baseCardChance:.04,cardChancePerWin:.05});
 const pond=Object.freeze({respawnMs:60*60*1000});
 // Only apply to wild actors in the open town (not arena, card previews, gym, or followers).
 // Stage III dog and bear use 1.5x instead of multiplying 1.3x by 1.5x.
 const wildFamilyMultipliers=Object.freeze({'water-dog':1.3,'cat-girl':1.3,'fire-bear':1.3});
 const wildScaleFor=spirit=>{
  const family=spirit?.family;
  if(!Object.prototype.hasOwnProperty.call(wildFamilyMultipliers,family))return 1;
  return Number(spirit.stage)===3&&family!=='cat-girl'?1.5:wildFamilyMultipliers[family];
 };
 // HUD display cap only: inventory/save can hold unlimited balls.
 // The three gym guardians below are reduced only after appearing as wild actors,
 // never inside gym/arena battles, portrait previews or the persistent companion.
 const guardianOverworldScale=spirit=>['pikachu','mew','wigglytuff'].includes(spirit?.id)?.5:1;
 // Reuse the same unlimited-stock display rule for capture balls and star berries.
 const ballHudValue=value=>{const actual=Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;return{display:Math.min(actual,99),overflow:actual>99,actual};};
 const evolutionOnlyWild=Object.freeze(['zapdos','moltres','suicune','raichu','palkia']);
 const progress=(all,owned)=>{const list=all.filter(s=>s?.acquisition!=='tower'&&s?.category!=='tower'&&!['chimchar','monferno','infernape'].includes(s.id));return{owned:list.filter(s=>owned(s.id)).length,total:list.length};};
 const countAt=(total,percent)=>Math.ceil(total*percent);
 const towerCardChance=defeated=>Math.min(1,tower.baseCardChance+tower.cardChancePerWin*Math.max(0,Number(defeated)||0));
 const pct=n=>Math.round(n*100)+'%';
 const towerDropNotice=()=>`一般三種魔物的代表卡片首戰掉落率 ${pct(tower.baseCardChance)}，每擊敗相同魔物一次，下次增加 ${pct(tower.cardChancePerWin)}（${[0,1,2].map(n=>pct(towerCardChance(n))).join('、')}…，最高 100%）；阿宏牛仔、藍金星輝法師、官胖三名獨立首領每次擊敗後保證掉落對應卡牌 1 張，均須完成拾取。`;
 const npcReplacements=Object.freeze({
  PATROL_REQUIRED:()=>String(quest.requiredSpecies),
  PATROL_BALL_REWARD:()=>String(quest.eachBallReward),
  TOWER_BASE_CHANCE:()=>pct(tower.baseCardChance),
  TOWER_CHANCE_STEP:()=>pct(tower.cardChancePerWin)
 });
 const formatNpcText=value=>String(value??'').replace(/\{\{(PATROL_REQUIRED|PATROL_BALL_REWARD|TOWER_BASE_CHANCE|TOWER_CHANCE_STEP)\}\}/g,(_,name)=>npcReplacements[name]());
 const specialNotice=()=>`圖鑑達 ${pct(thresholds.lab)}（研究所三選一未選的兩隻）、${pct(thresholds.yellow)}（小黃）、${pct(thresholds.greenBat)}（綠眼蝙怪）時，可在初光鎮找到對應特殊幻靈；尚未收錄完圖鑑前，成功捕捉後不再重生。`;
 const pondNotice=()=>`大眼蛙與水毛蟲未完成全圖鑑時，野外捕捉後不再出現；完成全 ${mainSpeciesCount} 種一般幻靈圖鑑後，每次捕捉才解鎖 60 分鐘的再次出現冷卻。`;
 window.PhantomGameRules=Object.freeze({mainSpeciesCount,thresholds,quest,arena,tower,pond,evolutionOnlyWild,progress,countAt,towerCardChance,towerDropNotice,specialNotice,pondNotice,formatNpcText,wildScaleFor,guardianOverworldScale,ballHudValue,pct});
})();