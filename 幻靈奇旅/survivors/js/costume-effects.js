// Cave adapters for the wardrobe saved by the town. No unlocks or town data are written.
export const COSTUMES={
 trainer:{id:'trainer',name:'初光旅人',description:'原始服裝，沒有額外能力。'},
 adventure:{id:'adventure',name:'博士贈送冒險服',description:'每 10 秒吸引場上所有掉落物，飛近主角後拾取；包含點數、經驗、補給、武器與技能書。'},
 electric:{id:'electric',name:'鹹蛋超人變身套裝',description:'寵物普攻與大絕威力 +20%；普通靈核球的基礎捕捉率 ×4/3（原版信任傷害 24／18 的比例，成功率上限仍為96%）。'},
 mist:{id:'mist',name:'小飯團同行',speed:1.2,description:'主角移動速度 +20%；每波結束時，存活寵物恢復最大生命20%（將原版每回合回血轉為每波，不會復活倒下寵物）。'},
 sound:{id:'sound',name:'小山蝴蝶套裝',speed:1.2,description:'主角移動速度 +20%，移動時漂浮前傾、蝴蝶環繞。'},
 healing:{id:'healing',name:'冒險套裝',description:'主角與寵物普攻、大絕威力 +20%；主角攻擊與靈核球捕捉距離 +20%。'}
};
export function costumeFor(value){const id=typeof value==='string'?value:value?.costume||value?.heroCostume;return COSTUMES[id]||COSTUMES.trainer;}
export const costumeAttack=(costume,source='hero')=>costume.id==='healing'||costume.id==='electric'&&source==='pet'?1.2:1;
export const costumeReach=costume=>costume.id==='healing'?1.2:1;
export const costumeBall=(costume,ball)=>costume.id==='electric'&&ball==='ball-basic'?24/18:1;
