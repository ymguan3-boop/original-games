/* Shared, idempotent merchant gift entitlement. All scenes read the primary save. */
(function(global){'use strict';
 const KEY='phantom_journey_v1',weaponId='sword-starlight-scythe',costumeId='reaper',digest='f12eb165d9fc9237560f1361c7e2e3d882ff972e90ab4af94afaa2a827170794';
 function owns(state){return state?.reaperGift?.claimed===true;}
 function read(storage=global.localStorage){const raw=storage.getItem(KEY);if(raw===null)return {};const s=JSON.parse(raw);if(!s||typeof s!=='object'||Array.isArray(s))throw Error('主遊戲存檔格式異常，未覆寫');return s;}
 async function redeem(state,password){const bytes=await global.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(password)));const value=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');if(value!==digest)throw Error('密碼不正確，請重新輸入。');if(owns(state))return false;state.reaperGift={claimed:true,claimedAt:Date.now(),version:1};state.unlockedCostumes=[...new Set([...(state.unlockedCostumes||['trainer']),costumeId])];state.costume=costumeId;return true;}
 function cave(state,root){if(!owns(root))return false;state.weapons||=[];if(state.weapons.includes(weaponId))return false;state.weapons.push(weaponId);state.equipped=[weaponId,...(state.equipped||[]).filter(id=>id!==weaponId)].slice(0,4);return true;}
 function tower(state,root=read()){state.weaponsOwned||={};state.equipped||={};if(!owns(root)){delete state.weaponsOwned[weaponId];if(state.equipped[0]===weaponId)delete state.equipped[0];return false;}if(state.weaponsOwned[weaponId])return false;state.weaponsOwned[weaponId]=true;state.equipped[0]=weaponId;state.activeWeapon=0;return true;}
 global.PhantomReaperEvent=Object.freeze({KEY,weaponId,costumeId,owns,read,redeem,cave,tower});
})(globalThis);
