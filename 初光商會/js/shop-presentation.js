import {traitOf,passiveValue} from './management.js?v=20261112-v31d';
export const visibleStaff=employees=>employees.filter(e=>e.role&&e.role!=='standby');
export function rewardState(done,claimed=false){return claimed?'claimed':done?'ready':'pending';}
export const rewardLabels={pending:'尚未完成',ready:'可領獎',claimed:'已完成・已領取',complete:'已完成',urgent:'突發委託'};
export function passiveDescription(game,employee){
 const trait=traitOf(game,employee);if(!trait)return '沒有專屬被動';
 const resting=employee.role==='standby',value=resting?0:passiveValue(game,employee);
 return `${trait.name}｜${trait.text} +${Number((value*100).toFixed(1))}%${resting?'（休息中，未生效）':''}`;
}
export function chasePose(elapsed){const progress=Math.max(0,Math.min(1,elapsed/1.8));return {active:elapsed>=0&&elapsed<1.8,hop:Math.abs(Math.sin(progress*Math.PI*3))*.22*(1-progress),lean:Math.sin(progress*Math.PI*4)*.12*(1-progress),progress};}
