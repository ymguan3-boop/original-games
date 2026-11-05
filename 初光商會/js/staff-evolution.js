/* The shop's evolution thresholds come from existing data/evolution.json.
 * Reaching a level unlocks a player-confirmed, one-stage permanent evolution.
 * This helper is read-only so it is safe for every HUD refresh and old saves. */
export function staffEvolutionInfo(data,employee){
 if(!employee||!data)return {eligible:false,required:0,next:[]};
 const rule=data.evolution?.[employee.spiritId];
 const next=(Array.isArray(rule?.next)?rule.next:[]).filter(id=>data.spirits?.some(sp=>sp.id===id));
 const required=Number(rule?.level)||0;
 const eligible=required>0&&next.length>0&&employee.workLevel>=required;
 return {eligible,required,next,branch:rule?.branch||'linear',current:employee.spiritId};
}
export function readyStaffEvolutions(data,employees){
 return (employees||[]).filter(e=>staffEvolutionInfo(data,e).eligible);
}
export function evolveStaffOnce(game,s,employee){
 const info=staffEvolutionInfo(game.data,employee);
 if(!info.eligible)throw Error(info.next.length?'熟練度尚未達到進化門檻':'此幻靈已是最終形態或沒有可用的進化路線');
 const selected=info.next[Math.floor(game.random(s)*info.next.length)];
 const sp=game.data.spirits.find(item=>item.id===selected);
 if(!sp)throw Error('進化後模型資料不存在，未更動員工');
 const before=employee.name,oldId=employee.spiritId;
 employee.evolutionHistory??=[];
 employee.evolutionHistory.push({from:oldId,to:selected,day:s.day,seed:s.seed});
 employee.spiritId=selected;
 employee.name=sp.name;
 employee.efficiency=game.efficiency(employee);
 game.log(s,`${before} → ${sp.name} 完成永久進化！熟練 Lv.${employee.workLevel} 保留。`);
 game.notice(s,employee.id,'✨ 進化成功','level');
 return `${before} 進化成 ${sp.name}！`;
}
