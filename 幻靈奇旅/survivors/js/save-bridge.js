import {migrateFamilyProgress} from './family-progress.js?v=20261025-v19';
import {rememberJourney} from './journey.js';
export const SAVE_KEY = 'phantom-endless-cave-v1';
export const initialState = () => ({version:1,owned:[],team:[],points:0,autoItems:{},growth:{},training:{},pity:0,inventory:{},materials:{},loadoutVersion:9,weapons:['guns-starter'],equipped:['guns-starter'],starterClaimed:false,transactions:[],history:[],run:null});
const clone = value => JSON.parse(JSON.stringify(value));
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
export function validateState(s) {
  if (!s || s.version !== 1 || !Number.isSafeInteger(s.points) || s.points < 0 || !Number.isInteger(s.pity) || s.pity < 0 || s.pity > 99) throw new Error('洞穴存檔格式或點數異常；原存檔已保留。');
  for (const key of ['owned','team','weapons','equipped','transactions','history']) if (!Array.isArray(s[key])) throw new Error('洞穴存檔清單格式異常。');
  for (const key of ['owned','team','weapons','equipped']) if (s[key].some(v=>typeof v !== 'string') || new Set(s[key]).size !== s[key].length) throw new Error('洞穴持有清單異常。');
  if (s.team.length > 3 || s.team.some(id=>!s.owned.includes(id)) || s.equipped.some(id=>!s.weapons.includes(id))) throw new Error('編組或裝備資料異常。');
  for (const key of ['inventory','materials']) {
    if (!plain(s[key])) throw new Error('倉庫格式異常。');
    for (const n of Object.values(s[key])) if (!Number.isSafeInteger(n) || n < 0) throw new Error('倉庫數量異常。');
  }
  if (typeof s.starterClaimed !== 'boolean' || s.transactions.some(t=>!plain(t)||typeof t.id!=='string')) throw new Error('交易紀錄異常。');
  if (s.run !== null && (!plain(s.run) || typeof s.run.id!=='string' || !['active','depth-cleared','defeated'].includes(s.run.status) || !plain(s.run.hero) || !Number.isFinite(s.run.hero.hp) || !Array.isArray(s.run.pets))) throw new Error('戰局檢查點異常。');
  if(s.loadoutVersion!==9){const untouched=!s.run&&s.weapons.length===1&&s.weapons[0]==='sword-starter'&&s.equipped[0]==='sword-starter';if(!s.weapons.includes('guns-starter'))s.weapons.push('guns-starter');if(untouched)s.equipped=['guns-starter'];s.loadoutVersion=9;}
  s.training||={};if(!plain(s.training))throw Error('培育資料格式異常');for(const levels of Object.values(s.training)){if(!plain(levels)||Object.values(levels).some(n=>!Number.isInteger(n)||n<0||n>10))throw Error('培育等級異常');}
  s.growth||={};if(!plain(s.growth)||Object.values(s.growth).some(g=>!plain(g)||!Number.isInteger(g.level)||g.level<1||g.level>50||!Number.isFinite(g.xp)||g.xp<0))throw Error('培育經驗格式異常');
  migrateFamilyProgress(s);
  s.autoItems||={};if(!plain(s.autoItems)||Object.values(s.autoItems).some(c=>!plain(c)||typeof c.enabled!=='boolean'||![.2,.3,.4,.5,.6,.8].includes(c.threshold)))throw Error('自動道具設定異常');
  if(s.run)for(const p of s.run.pets){if(p.cooldownVersion!==7){if(p.ultimateMax){p.ultimateMax/=2;p.ultimateCd/=2;}p.cooldownVersion=7;}}
  return s;
}

/** Transaction store. Integrated builds inject the shared primary-save adapter. */
export function createStore(storage = globalThis.localStorage, key = SAVE_KEY) {
  let state;
  try { const raw=storage.getItem(key); state=raw===null?initialState():validateState(JSON.parse(raw)); }
  catch (error) { throw new Error(`無法讀取洞穴存檔，未覆寫原資料：${error.message}`); }
  let counter=0, lastRaw=storage.getItem(key);
  const store = {
    get state() { return state; },
    newId(prefix='tx') { return `${prefix}:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2)}`}`; },
    transact(id, mutator) {
      if (typeof id!=='string' || !id) throw new Error('缺少交易識別碼。');
      // Prevent a stale browser tab from overwriting a newer checkpoint/account.
      const raw=storage.getItem(key);
      if(raw!==lastRaw) throw new Error('另一個分頁已更新存檔，請重新整理本頁再繼續。');
      const previous=state.transactions.find(t=>t.id===id);
      if (previous) return {ok:true,replayed:true,value:clone(previous.value ?? null),state};
      const next=clone(state);
      const value=mutator(next) ?? null;
      if (value && typeof value.then==='function') throw new Error('交易必須同步完成。');
      if(!id.startsWith('checkpoint:')) next.transactions.push({id,value:clone(value),at:Date.now()});
      validateState(next);
      // One envelope: item decrement, buff, checkpoint and transaction are one write.
      try { storage.setItem(key,JSON.stringify(next)); }
      catch(error) { throw new Error(`儲存失敗，操作未生效：${error.message}`); }
      state=next; lastRaw=storage.getItem(key);
      return {ok:true,replayed:false,value,state};
    },
    checkpoint(run) {
      if (!run || !['active','depth-cleared','defeated'].includes(run.status)) throw new Error('只能保存進行中的戰局。');
      return store.transact(store.newId('checkpoint'), next=> {
        if (next.transactions.some(t=>t.id===`end:${run.id}`)) throw new Error('已結束戰局不能復原。');
        if (next.run && next.run.id!==run.id) throw new Error('尚有未結束戰局。');
        next.run=clone(run);
      });
    },
    resetForTesting({points=1000,weapons=[]}={}){if(!Number.isSafeInteger(points)||points<0||weapons.some(id=>typeof id!=='string'))throw Error('測試配置無效');const raw=storage.getItem(key);if(raw!==lastRaw)throw Error('另一分頁已更新，請先重整');const backup=key+':backup:reset:'+Date.now()+'-'+(++counter);storage.setItem(backup,JSON.stringify(state));const next=initialState();next.points=points;next.weapons=[...new Set([...next.weapons,...weapons])];if(storage.sharedBalls){next.appliedCreditTotal=state.appliedCreditTotal||0;for(const id of ['ball-basic','ball-great','ball-ultra'])if(state.inventory[id])next.inventory[id]=state.inventory[id];}try{storage.setItem(key,JSON.stringify(next));}catch(e){throw Error('重置未生效：'+e.message);}state=next;lastRaw=storage.getItem(key);return{backup,points};},
    endRun(reason='離開') {
      const run=state.run;
      if (!run) return {ok:true,replayed:true,value:null,state};
      return store.transact(`end:${run.id}`, next=> {
        if (!next.run || next.run.id!==run.id) throw new Error('戰局已變更。');
        next.history.unshift({type:'run',id:run.id,reason,time:next.run.time,depth:next.run.depth,at:Date.now()});
        next.history=next.history.slice(0,100);
        rememberJourney(next,next.run);next.run=null;
      });
    }
  };
  return store;
}
