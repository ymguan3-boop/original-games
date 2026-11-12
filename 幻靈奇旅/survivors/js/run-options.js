/* 進場前選的怪物數量倍率：×1／×2／×3，掉落率跟著 ×1／×1.5／×2。洞穴與草原分開記住。 */
import {isMerchantMeadow} from './merchant-meadow.js?v=20261111-meadow-v3';
const KEY='firstlight-cave-monster-mult'+(isMerchantMeadow?'-meadow':'');
export const MONSTER_MULTS=[1,2,3];
export const dropMultOf=n=>({1:1,2:1.5,3:2})[n]||1;
export function getMonsterMult(){try{const n=Number(localStorage.getItem(KEY));return MONSTER_MULTS.includes(n)?n:1;}catch{return 1;}}
export function setMonsterMult(n){n=MONSTER_MULTS.includes(Number(n))?Number(n):1;try{localStorage.setItem(KEY,String(n));}catch{}return n;}
