import {addInventory,WEAPONS} from './inventory.js?v=20261027-v29';
export const DRAW_COST=100;
export const DUPLICATE_POINTS=Object.freeze({yellow:50,purple:100,red:500});
const EXCLUDED_SPIRITS=new Set(['mewtwo']);
function filterPool(pool){const excluded=new Set([...EXCLUDED_SPIRITS,...(pool.excludedIds||[])]);return {...pool,...Object.fromEntries(['yellow','purple','red','starter'].filter(key=>Array.isArray(pool[key])).map(key=>[key,pool[key].filter(id=>!excluded.has(id))])),excludedIds:[...excluded]};}
export const RATES={yellow:.12,purple:.06,red:.02,weapon:.1,item:.2,material:.2,skill:.15,ability:.15};
let cumulative=0;const BANDS=Object.entries(RATES).map(([kind,rate])=>[kind,cumulative=Math.round((cumulative+rate)*1e12)/1e12]);
export const WEAPON_POOL=Object.keys(WEAPONS).filter(id=>WEAPONS[id].price>0&&!WEAPONS[id].bossOnly);
export const REWARD_ITEMS={item:['potion','revive','battery','ball-basic','ball-great','ball-ultra'],skill:['buff-skill','buff-cooldown','pet-xp-double'],ability:['buff-attack','buff-range','buff-defense','buff-capture','buff-pickup','vacuum-orb']};
/** Read-only original progression supplied by caller; never writes the original save. */
export function eligiblePool(pool,original={},options={}) {
  pool=filterPool(pool);
  const progress=original.state || original;
  const locked=new Set(pool.requiresOriginalUnlock||[]);
  const allowed=id=>!(pool.excludedIds||[]).includes(id)&&(!locked.has(id)||options.standalone&&(pool.standaloneUnlocked||[]).includes(id)||!!progress.pokedexUnlocks?.[id]||progress.captureCounts?.[id]>0);
  return {...pool,...Object.fromEntries(['yellow','purple','red'].map(color=>[color,(pool[color]||[]).filter(allowed)])),starter:(pool.starter||pool.yellow||[]).filter(allowed)};
}
function random(rng) {const x=rng(); if(!Number.isFinite(x)||x<0||x>=1) throw new Error('亂數來源無效。'); return x;}
const pick=(array,rng)=>array[Math.floor(random(rng)*array.length)];
export function validatePool(pool) {
  for(const color of ['yellow','purple','red']) if(!Array.isArray(pool[color]) || !pool[color].length || pool[color].some(id=>typeof id!=='string'||!id)) throw new Error(`轉蛋資格或配置不足：${color} 基礎池為空。請先在原探索收錄對應色階幻靈。`);
  const all=[...pool.yellow,...pool.purple,...pool.red];
  if(all.some(id=>EXCLUDED_SPIRITS.has(id)||(pool.excludedIds||[]).includes(id)))throw new Error('寶箱、書本與水蛟龍王不屬於可抽取幻靈');
  if(new Set(all).size!==all.length) throw new Error('轉蛋配置錯誤：跨色階重複 ID。');
  return all;
}
export function rollCategory(rng=Math.random,pity=0) {
  const x=random(rng);
  if(pity>=99) return x<0.6?'yellow':x<0.9?'purple':'red';
  return BANDS.find(([,end])=>x<end)[0];
}
export function claimStarter(store,pool,rng=Math.random) {
  pool=filterPool(pool);
  const all=[...new Set(pool.starter || [...(pool.yellow||[]),...(pool.purple||[]),...(pool.red||[])])];
  if(all.length<3) throw new Error('基礎幻靈不足三種。');
  return store.transact('starter-v1',s=> {
    if(s.starterClaimed) return [];
    if(s.run) throw new Error('請先結束當局。');
    const candidates=[...all],rewards=[];
    for(let i=0;i<3;i++) {
      const id=candidates.splice(Math.floor(random(rng)*candidates.length),1)[0];
      if(!s.owned.includes(id)) s.owned.push(id);
      rewards.push({kind:'spirit',id,color:Object.keys(pool).find(c=>Array.isArray(pool[c])&&pool[c].includes(id)),starter:true});
    }
    s.team=rewards.map(r=>r.id);s.starterClaimed=true;
    addInventory(s,'ball-basic',20);addInventory(s,'potion',3);
    s.history.unshift(...rewards);
    return rewards;
  });
}
export function draw(store,pool,count=1,rng=Math.random,txId=store.newId('gacha'),cost=DRAW_COST) {
  pool=filterPool(pool);
  validatePool(pool);
  if(![1,10].includes(count) || !Number.isSafeInteger(cost) || cost<1) throw new Error('抽數或價格設定無效。');
  return store.transact(txId,s=> {
    if(s.run) throw new Error('請在戰前大廳使用轉蛋機。');
    if(s.points<count*cost) throw new Error('轉蛋點數不足。');
    const rewards=[];
    for(let i=0;i<count;i++) {
      const guaranteed=s.pity>=99,kind=rollCategory(rng,s.pity);
      let reward;
      if(['yellow','purple','red'].includes(kind)) {
        const id=pick(pool[kind],rng),duplicate=s.owned.includes(id);
        const refund=duplicate?DUPLICATE_POINTS[kind]:0;
        if(duplicate) s.points+=refund;
        else s.owned.push(id);
        s.pity=0; reward={kind:'spirit',color:kind,id,duplicate,guaranteed,refund};
      } else {
        s.pity++;
        if(kind==='weapon'){const id=pick(WEAPON_POOL,rng),duplicate=s.weapons.includes(id),price=WEAPONS[id].price;if(duplicate){s.weaponUpgrades??={};s.weaponUpgrades[id]=(s.weaponUpgrades[id]||0)+1;}else s.weapons.push(id);reward={kind:'weapon',id,price,color:price>=1000?'red':'purple',duplicate,refund:0,attackBonus:duplicate?1:0,upgrade:s.weaponUpgrades?.[id]||0,quantity:1};}
        else if(kind==='material') {s.materials.ore=(s.materials.ore||0)+1;reward={kind,id:'ore',quantity:1};}
        else {const id=pick(REWARD_ITEMS[kind],rng);addInventory(s,id);reward={kind:'item',category:kind,id,quantity:1,message:'已入背包，可於戰鬥中使用'};}
      }
      rewards.push(reward);
    }
    s.points-=count*cost;s.history.unshift(...rewards);s.history=s.history.slice(0,100);
    return rewards;
  });
}
