import {cardBase,PASSIVE_UNITS,passiveDescription} from './card-balance.js';
export const PASSIVE_SLOTS={yellow:1,purple:2,red:3};
// Explicit ultimate themes; elemental affinity alone never grants an extra passive.
const PROFILES={
 bulbasaur:['range'],ivysaur:['range'],venusaur:['reduction'],
 charmander:['attack'],charmeleon:['attack'],charizard:['attack'],
 squirtle:['heal'],wartortle:['heal'],blastoise:['reduction'],
 chikorita:['regen'],bayleef:['regen'],meganium:['heal'],
 cyndaquil:['proc-paralysis'],quilava:['proc-paralysis'],typhlosion:['proc-paralysis'],
 totodile:['hp'],croconaw:['hp'],feraligatr:['hp'],
 treecko:['proc-knockback','speed'],grovyle:['regen','attack'],sceptile:['crit','attack'],
 torchic:['proc-slow'],combusken:['proc-slow'],blaziken:['proc-freeze'],
 mudkip:['attack'],marshtomp:['proc-knockback'],swampert:['attack'],
 turtwig:['crit'],grotle:['crit'],torterra:['crit'],
 chimchar:['crit','attack','projectileSpeed'],monferno:['proc-slow','range','attack'],infernape:['proc-knockback','hp','hp'],
 piplup:['speed'],prinplup:['speed'],empoleon:['speed'],
 articuno:['proc-slow','projectileSpeed'],zapdos:['attack','crit'],moltres:['proc-knockback','range'],
 raikou:['attack','range'],entei:['proc-paralysis','proc-slow'],suicune:['proc-freeze','heal'],
 kyogre:['projectileSpeed'],groudon:['attack'],rayquaza:['heal'],
 dialga:['proc-poison','proc-paralysis','attack'],palkia:['proc-knockback','attack'],giratina:['proc-paralysis','speed'],
 pikachu:['proc-paralysis','attack','projectileSpeed'],mew:['proc-slow','attack','cooldown'],
 wigglytuff:['proc-knockback','hp','defense'],blissey:['crit','attack','range'],raichu:['proc-paralysis','attack'],
 caterpie:['pickup'],metapod:['pickup'],butterfree:['pickup'],weedle:['petXp'],kakuna:['petXp'],beedrill:['petXp'],
 mewtwo:['proc-freeze','attack','range'],jigglypuff:['regen','heal','hp'],
 forest:['proc-poison','defense'],ice:['proc-freeze','reduction'],fire:['attack','range','hp']
};
const STATUS_NAMES={poison:'中毒',paralysis:'麻痺',freeze:'冰凍',slow:'緩速',knockback:'震退'};
export function effectText(e){return e.effect.startsWith('proc-')?'命中 '+ +(e.value*100).toFixed(2)+'% '+STATUS_NAMES[e.effect.slice(5)]:passiveDescription(e.effect,e.value);}
export function mergeEffects(effects){const map=new Map();for(const e of effects||[]){const key=e.effect;if(!key)continue;const old=map.get(key)||{effect:key,value:0,count:0};old.value=Math.round((old.value+e.value)*1e9)/1e9;old.count++;map.set(key,old);}return [...map.values()];}
export function scalarTotals(effects){return Object.fromEntries(mergeEffects(effects).filter(e=>!e.effect.startsWith('proc-')).map(e=>[e.effect,e.value]));}
export function passiveDefinition(spec){const frame=spec.cardFrame||'yellow',count=PASSIVE_SLOTS[frame]||1,power=cardBase(spec).power,profile=PROFILES[spec.id];if(!profile||profile.length!==count)throw Error('缺少大絕被動配置：'+spec.id);const effects=profile.map(effect=>({effect,value:+(PASSIVE_UNITS[effect]*power).toFixed(6)}));return{name:spec.name,ultimateName:spec.skills?.[1]?.name||spec.name+'共鳴',cardFrame:frame,stage:spec.stage||1,tierPower:power,slotCount:count,effects,effect:effects[0].effect,value:effects[0].value,description:mergeEffects(effects).map(effectText).join(' · '),scope:'自身能力；存活備戰提供隊伍數值加成；命中效果僅出戰本人觸發',balanceNote:'同培育與投入比較黃3階≤紫2階≤紅卡；每10級只強化既有欄位，重複能力加總。'};}
