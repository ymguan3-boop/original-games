import {passiveDefinition,effectText} from './passive-rules.js?v=20261025-v17';
import {passiveAt} from './growth.js?v=20261025-v19';
import {STATUS} from './combat-status.js?v=20261025-v22';
export function statusPassives(spec,level=1,definitions){if(!spec)return[];const defs=definitions||{[spec.id]:passiveDefinition(spec)},power=defs[spec.id]?.tierPower||1;return passiveAt(spec.id,defs,level).effects.filter(e=>e.effect.startsWith('proc-')).map(e=>{const type=e.effect.slice(5),chance=Math.min(.65,e.value);return{type,chance,power,name:STATUS[type].name,description:effectText({...e,value:chance}),short:STATUS[type].name+' '+ +(chance*100).toFixed(2)+'%',duration:STATUS[type].duration};});}
export function statusPassive(spec,level=1,definitions){return statusPassives(spec,level,definitions)[0]||null;}
export function passiveSummary(passive){return passive?.effects?.map(effectText).join(' · ')||passive?.description||'無被動能力';}
