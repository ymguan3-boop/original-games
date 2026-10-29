// Cave adapters use the same wardrobe descriptions as the town, without modifying its save.
import '../../js/wardrobe-effects.js?v=20261029-reaper-v1';
export const COSTUMES=globalThis.PhantomWardrobe.costumes;
export function costumeFor(value){const id=typeof value==='string'?value:value?.costume||value?.heroCostume;return COSTUMES[id]||COSTUMES.trainer;}
export const costumeAttack=(costume,source='hero')=>source==='hero'?costume.heroAttack||1:source==='pet'?costume.petAttack||1:1;
export const costumeReach=costume=>costume.reach||1;
export const costumeBall=(costume,ball)=>ball==='ball-basic'?costume.basicBallMultiplier||1:1;
