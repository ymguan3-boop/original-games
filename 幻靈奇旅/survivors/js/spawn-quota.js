/* 普通怪物的分波配額與分批生成（Boss、寶箱、書本不在這裡）。
 * 草原：固定 10 波、總配額 404，同時存活上限依波次；沒在時限內生成完的配額延續到下一波，確保總數正確。
 * 洞穴：以原本的生成率換算成每波配額再乘 4；同場上限 36 不變；每波沒生成完的部分不延續，記錄在 caveQuotaShortfall。 */
import {spawnInterval} from './difficulty.js?v=20261117-v67';
export const MEADOW_QUOTA=[12,20,24,28,32,40,48,56,64,80];
export const MEADOW_CAP=[6,7,8,9,10,11,12,14,16,18];
export const MEADOW_TOTAL=MEADOW_QUOTA.reduce((a,b)=>a+b,0);
export const CAVE_MULTIPLIER=4,CAVE_CAP=36;
/* 原本洞穴每 24 秒波次的等效生成數（舊程式每 spawnInterval/2.5 秒生成一隻） */
export const caveBaseQuota=(wave,waveSeconds=24)=>Math.round(waveSeconds/(spawnInterval(wave)/2.5));
export const caveQuota=(wave,waveSeconds=24,mult=1)=>Math.round(caveBaseQuota(wave,waveSeconds)*CAVE_MULTIPLIER*mult);
export const meadowTarget=(wave,mult=1)=>MEADOW_QUOTA.slice(0,Math.min(10,wave)).reduce((a,b)=>a+b,0)*mult;
export const meadowCap=(wave,mult=1)=>Math.min(CAVE_CAP,Math.round(MEADOW_CAP[Math.min(10,wave)-1]*Math.max(1,mult)));
/* 回傳這一刻要生成幾隻（0 表示等下一次檢查） */
export function quotaStep(r,{meadow,wave,alive,random,mult=1,waveSeconds=24,waveClock=0}){
 /* 舊戰局續玩：已經過的波次當作已生成，不一次補出積欠 */
 if(!r.spawnQuota)r.spawnQuota={wave:0,spawned:0,total:meadow?meadowTarget(wave-1,mult):0,nextAt:0};const q=r.spawnQuota;
 if(meadow){const target=meadowTarget(wave,mult),cap=meadowCap(wave,mult);q.target=target;if(q.wave!==wave){q.wave=wave;q.fresh=true;}
  if(q.total>=target||alive>=cap||r.time<q.nextAt)return 0;/* 每批 1–3 隻；後段波次配額較多時，依剩餘時間加大批量才補得完 */const left=Math.max(1,waveSeconds-waveClock),need=Math.ceil((target-q.total)/Math.max(1,left/1.15)),want=q.fresh?Math.max(3+Math.floor(random()*3),need):Math.max(1+Math.floor(random()*3),need);q.fresh=false;q.nextAt=r.time+.8+random()*.7;return Math.max(0,Math.min(want,target-q.total,cap-alive));}
 if(q.wave!==wave){if(q.wave)r.caveQuotaShortfall=(r.caveQuotaShortfall||0)+Math.max(0,(q.target||0)-q.spawned);q.wave=wave;q.spawned=0;q.target=caveQuota(wave,waveSeconds,mult);q.fresh=true;}
 if(q.spawned>=q.target||alive>=CAVE_CAP||r.time<q.nextAt)return 0;
 /* 要在一波內補滿配額，每批數量依剩餘時間調整；仍受同場上限限制 */
 const left=Math.max(1,waveSeconds-waveClock),need=Math.ceil((q.target-q.spawned)/Math.max(1,left/1.1));const want=q.fresh?3+Math.floor(random()*3):Math.max(1+Math.floor(random()*3),need);q.fresh=false;q.nextAt=r.time+.8+random()*.7;return Math.max(0,Math.min(want,q.target-q.spawned,CAVE_CAP-alive));
}
export function countSpawn(r,n){const q=r.spawnQuota;if(!q)return;q.spawned+=n;q.total=(q.total||0)+n;q.byWave||={};q.byWave[q.wave]=(q.byWave[q.wave]||0)+n;}
