import {STATUS} from './combat-status.js?v=20261025-v21';
const traits={sword:'前方範圍斬擊；大絕攻擊全場，最後一擊震動',knife:'高威力單體斬擊，命中可震退',blades:'快速周身範圍連斬，可同時攻擊鄰近魔物',guns:'普攻與大絕皆可貫穿直線上的魔物'};
export function weaponPassiveText(w){const hit=w.onHit,proc=hit?'；命中 '+Math.round(hit.chance*100)+'% 機率'+(STATUS[hit.type]?.name||hit.type)+(hit.type==='freeze'?' '+STATUS.freeze.duration+' 秒（冰凍目標減傷80%）':hit.type==='slow'?' '+STATUS.slow.duration+' 秒（移速減半）':hit.type==='knockback'?'':(' '+(hit.duration||STATUS[hit.type]?.duration||0)+' 秒')):'';return(traits[w.type]||'一般攻擊')+proc;}
